import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import httpx
from fastapi.testclient import TestClient

from app.bench_store import DuckDBBenchStore
from app.config import settings
from app.main import app


def load_json(path: Path) -> dict:
    return json.loads(path.read_text())


def normalize(text: str) -> str:
    return text.lower().strip()


def score_response(response: str, expected: dict) -> tuple[float, dict]:
    response_norm = normalize(response)
    must_include = [normalize(x) for x in expected.get("must_include", [])]
    expected_any = [normalize(x) for x in expected.get("expected_any", [])]

    must_hits = [x for x in must_include if x in response_norm]
    any_hits = [x for x in expected_any if x in response_norm]

    if must_include:
        score = 1.0 if len(must_hits) == len(must_include) else 0.0
    elif expected_any:
        score = 1.0 if len(any_hits) > 0 else 0.0
    else:
        score = 0.0

    metrics = {
        "must_include": must_include,
        "must_hits": must_hits,
        "expected_any": expected_any,
        "any_hits": any_hits,
    }
    return score, metrics


def run_benchmark(base_url: str, scenario_path: Path, eval_path: Path) -> dict:
    scenario = load_json(scenario_path)
    probes = load_json(eval_path)["probes"]

    bench = DuckDBBenchStore(settings.trace_db_path)
    bench.init()

    run_id = bench.create_run(
        scenario_id=scenario["scenario_id"],
        title=scenario.get("title", scenario["scenario_id"]),
        provider=settings.llm_provider,
        model=
        settings.gemini_model
        if settings.llm_provider == "gemini"
        else settings.anthropic_model
        if settings.llm_provider == "anthropic"
        else settings.ollama_model,
        context_messages=settings.context_messages,
        notes="baseline",
    )

    results = {
        "run_id": run_id,
        "scenario_id": scenario["scenario_id"],
        "started_at": datetime.now(timezone.utc).isoformat(),
        "turns": [],
        "probes": [],
    }

    def run_with_client(client) -> list[tuple[str, float]]:
        client.post("/admin/sessions", json={"note": f"bench:{scenario['scenario_id']}"})

        for idx, turn in enumerate(scenario["conversation"]):
            if turn["role"] != "user":
                continue
            resp = client.post("/chat", json={"message": turn["content"]})
            resp.raise_for_status()
            data = resp.json()
            bench.add_turn(
                run_id=run_id,
                idx=idx,
                role="user",
                content=turn["content"],
                response=data.get("response"),
                trace_id=data.get("trace_id"),
            )
            results["turns"].append(
                {
                    "idx": idx,
                    "content": turn["content"],
                    "response": data.get("response"),
                    "trace_id": data.get("trace_id"),
                }
            )

        score_rows: list[tuple[str, float]] = []
        for pidx, probe in enumerate(probes):
            resp = client.post("/chat", json={"message": probe["question"]})
            resp.raise_for_status()
            data = resp.json()
            response_text = data.get("response", "")
            score, metrics = score_response(response_text, probe)

            bench.add_probe(
                run_id=run_id,
                idx=pidx,
                probe_id=probe["id"],
                probe_type=probe.get("type", "unknown"),
                question=probe["question"],
                expected=probe,
                response=response_text,
                score=score,
                metrics=metrics,
            )
            score_rows.append((probe.get("type", "unknown"), score))
            results["probes"].append(
                {
                    "id": probe["id"],
                    "type": probe.get("type", "unknown"),
                    "question": probe["question"],
                    "response": response_text,
                    "score": score,
                    "metrics": metrics,
                }
            )
        return score_rows

    if base_url == "local":
        with TestClient(app) as client:
            score_rows = run_with_client(client)
    else:
        with httpx.Client(base_url=base_url, timeout=120.0) as client:
            score_rows = run_with_client(client)

    totals = {}
    counts = {}
    for ptype, score in score_rows:
        totals[ptype] = totals.get(ptype, 0) + score
        counts[ptype] = counts.get(ptype, 0) + 1

    scores = {f"score_{k}": totals[k] / counts[k] for k in totals}
    if score_rows:
        scores["score_overall"] = sum(s for _, s in score_rows) / len(score_rows)
    else:
        scores["score_overall"] = 0.0

    bench.set_scores(run_id, scores)
    bench.finalize_run(
        run_id,
        summary={
            "total_probes": len(score_rows),
            "scores": scores,
        },
    )

    results["ended_at"] = datetime.now(timezone.utc).isoformat()
    results["scores"] = scores

    return results


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--scenario", default="life_coach_baseline")
    parser.add_argument("--base-url", default="http://localhost:8000")
    args = parser.parse_args()

    scenario_path = Path(__file__).parent / "conversations" / f"{args.scenario}.json"
    eval_path = Path(__file__).parent / "eval" / f"{args.scenario}_eval.json"

    if not scenario_path.exists():
        raise SystemExit(f"Scenario not found: {scenario_path}")
    if not eval_path.exists():
        raise SystemExit(f"Eval not found: {eval_path}")

    results = run_benchmark(args.base_url, scenario_path, eval_path)

    out_dir = Path(__file__).parent / "results"
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    out_path = out_dir / f"{args.scenario}_{stamp}.json"
    out_path.write_text(json.dumps(results, indent=2))
    print(f"Saved results to {out_path}")


if __name__ == "__main__":
    main()
