from benchmarks.run import score_response


def test_preference_scoring_partial_credit():
    probe = {
        "expected_any": ["-", "•", "1.", "2."],
        "must_have_question": True,
        "max_length": 200,
    }

    # list + question, short
    resp1 = "- Do X\n- Do Y\nWhat do you want to focus on?"
    s1, _ = score_response(resp1, probe)
    assert s1 == 1.0

    # list + short, no question
    resp2 = "- Do X\n- Do Y"
    s2, _ = score_response(resp2, probe)
    assert s2 == 2.0 / 3.0

    # question + short, no list
    resp3 = "What do you want to focus on?"
    s3, _ = score_response(resp3, probe)
    assert s3 == 2.0 / 3.0

    # list + question, too long
    resp4 = "- " + ("x" * 500) + "\nWhat now?"
    s4, _ = score_response(resp4, probe)
    assert s4 == 2.0 / 3.0
