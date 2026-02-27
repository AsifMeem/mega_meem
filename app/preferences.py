import re


def extract_preferences(text: str) -> dict:
    t = text.lower()
    prefs = {}
    if any(k in t for k in ["concise", "short", "brief"]):
        prefs["concise"] = True
    if any(k in t for k in ["bullet", "bullets", "list format", "list"]):
        prefs["list_format"] = True
    return prefs


def should_apply_preferences(prefs: dict, min_count: int = 2) -> dict:
    applied = {}
    for key, meta in prefs.items():
        if isinstance(meta, dict) and meta.get("count", 0) >= min_count:
            applied[key] = True
    return applied


def build_preference_context(messages: list[dict], min_count: int = 2) -> str | None:
    counts: dict[str, int] = {}
    for msg in messages:
        if msg.get("role") != "user":
            continue
        prefs = extract_preferences(msg.get("content", ""))
        for key, value in prefs.items():
            if value is True:
                counts[key] = counts.get(key, 0) + 1

    pref_state = {key: {"count": count} for key, count in counts.items()}
    applied = should_apply_preferences(pref_state, min_count=min_count)
    if not applied:
        return None

    parts = ["User preferences to follow:"]
    if applied.get("concise"):
        parts.append("- Keep responses concise.")
    if applied.get("list_format"):
        parts.append("- Use list/bullets for plans.")
    return "\n".join(parts)
