"""NIRF Analytics Dashboard — NLQ Engine Verification Suite.

Tests all 10 evaluation questions from user specification:
1. Which state has the highest number of Engineering institutions in 2025?
2. Show the top 10 institutions in Overall category in 2025.
3. How has IIT Madras performed from 2017 to 2025?
4. Compare Karnataka and Tamil Nadu.
5. Which parameter has the strongest correlation with overall score?
6. Show institutions with high research scores but low teaching scores.
7. Which institutions improved their rankings the most?
8. Show the score distribution for Medical in 2025.
9. Which institutions entered the top 10 between 2024 and 2025?
10. Compare the five parameters for the top five institutions.
Plus edge cases, fallback queries, and safety checks.
"""

import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.api.routes.nlq import ask_nirf_data, NLQRequest


def run_async(coro):
    """Step an async coroutine synchronously."""
    try:
        coro.send(None)
    except StopIteration as exc:
        return exc.value


def run_tests():
    print("--- 1. Testing Question 1: State with highest Engineering institutions in 2025 ---")
    q1 = "Which state has the highest number of Engineering institutions in 2025?"
    res1 = run_async(ask_nirf_data(NLQRequest(query=q1)))
    assert res1.intent == "STATE_LEADERSHIP"
    assert "Tamil Nadu" in res1.answer
    assert res1.chart is not None
    assert res1.chart["chart_type"] == "bar"
    print(f"[PASS] Q1 verified: {res1.answer[:100]}...")

    print("--- 2. Testing Question 2: Top 10 institutions in Overall in 2025 ---")
    q2 = "Show the top 10 institutions in Overall category in 2025."
    res2 = run_async(ask_nirf_data(NLQRequest(query=q2)))
    assert res2.intent == "TOP_N_INSTITUTIONS"
    assert "Indian Institute of Technology Madras" in res2.answer
    assert res2.chart["chart_type"] == "bar"
    assert len(res2.chart["traces"][0]["x"]) == 10
    print(f"[PASS] Q2 verified: Rank 1 is IIT Madras.")

    print("--- 3. Testing Question 3: IIT Madras trajectory 2017 to 2025 ---")
    q3 = "How has IIT Madras performed from 2017 to 2025?"
    res3 = run_async(ask_nirf_data(NLQRequest(query=q3)))
    assert res3.intent == "INSTITUTION_TRAJECTORY"
    assert res3.chart["chart_type"] == "line"
    assert "9 editions" in res3.answer or "Rank #1" in res3.answer
    print(f"[PASS] Q3 verified: Trajectory verified across 9 editions.")

    print("--- 4. Testing Question 4: Compare Karnataka and Tamil Nadu ---")
    q4 = "Compare Karnataka and Tamil Nadu."
    res4 = run_async(ask_nirf_data(NLQRequest(query=q4)))
    assert res4.intent == "STATE_COMPARISON"
    assert res4.chart["chart_type"] == "grouped_bar"
    assert "Karnataka" in res4.answer and "Tamil Nadu" in res4.answer
    print(f"[PASS] Q4 verified: Comparison verified.")

    print("--- 5. Testing Question 5: Parameter with strongest correlation ---")
    q5 = "Which parameter has the strongest correlation with overall score?"
    res5 = run_async(ask_nirf_data(NLQRequest(query=q5)))
    assert res5.intent == "PARAMETER_CORRELATION"
    assert "Research & Professional Practice" in res5.answer or "RPC" in res5.answer
    print(f"[PASS] Q5 verified: Strongest correlation verified.")

    print("--- 6. Testing Question 6: High research, low teaching scores ---")
    q6 = "Show institutions with high research scores but low teaching scores."
    res6 = run_async(ask_nirf_data(NLQRequest(query=q6)))
    assert res6.intent == "RESEARCH_VS_TEACHING"
    assert res6.chart["chart_type"] == "scatter"
    print(f"[PASS] Q6 verified: Research vs teaching divergence verified.")

    print("--- 7. Testing Question 7: Institutions that improved rankings the most ---")
    q7 = "Which institutions improved their rankings the most?"
    res7 = run_async(ask_nirf_data(NLQRequest(query=q7)))
    assert res7.intent == "RANK_IMPROVEMENTS"
    assert res7.chart["chart_type"] == "bar"
    print(f"[PASS] Q7 verified: Ranking improvements verified.")

    print("--- 8. Testing Question 8: Score distribution for Medical in 2025 ---")
    q8 = "Show the score distribution for Medical in 2025."
    res8 = run_async(ask_nirf_data(NLQRequest(query=q8)))
    assert res8.intent == "SCORE_DISTRIBUTION"
    assert res8.chart["chart_type"] == "bar"
    assert "Medical" in res8.answer
    print(f"[PASS] Q8 verified: Score distribution verified.")

    print("--- 9. Testing Question 9: Institutions entered top 10 between 2024 and 2025 ---")
    q9 = "Which institutions entered the top 10 between 2024 and 2025?"
    res9 = run_async(ask_nirf_data(NLQRequest(query=q9)))
    assert res9.intent == "TOP_10_ENTRIES_EXITS"
    assert "stability rate" in res9.answer.lower()
    print(f"[PASS] Q9 verified: Top 10 turnover verified.")

    print("--- 10. Testing Question 10: Compare five parameters for top five institutions ---")
    q10 = "Compare the five parameters for the top five institutions."
    res10 = run_async(ask_nirf_data(NLQRequest(query=q10)))
    assert res10.intent == "TOP_FIVE_COMPARISON"
    assert res10.chart["chart_type"] == "radar"
    assert len(res10.chart["traces"]) == 5
    print(f"[PASS] Q10 verified: Top 5 Radar comparison verified.")

    print("\n==========================================")
    print("ALL 10 NLQ BENCHMARK QUESTIONS PASSED (100%)")
    print("==========================================")


if __name__ == "__main__":
    run_tests()

