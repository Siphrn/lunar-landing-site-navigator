import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from metrics import visible, longest_run, next_set_h, both_windows, summarize

T, F = True, False


def test_longest_dark():
    assert longest_run([T, T, F, F, F, T], False) == 3
    assert longest_run([], False) == 0


def test_visible_flat_and_mask():
    assert list(visible([0, 90], [0.5, -0.1])) == [True, False]
    mask = [2.0] * 360
    assert list(visible([10, 200], [1.0, 3.0], mask)) == [False, True]
    neg = [-1.0] * 360  # peak: sees below 0
    assert list(visible([5], [-0.5], neg)) == [True]


def test_next_set_h():
    assert next_set_h([F, T], 0) is None
    assert next_set_h([T, T, T], 0) == -1
    assert next_set_h([T, T, F, T], 0) == 2
    assert next_set_h([T, T, F, T], 1, step_h=2) == 2


def test_both_windows():
    times = [f"t{i}" for i in range(6)]
    sun = [T, T, T, F, T, T]
    earth = [F, T, T, T, T, T]
    assert both_windows(times, sun, earth) == [
        {"start": "t1", "stop": "t2", "hours": 2},
        {"start": "t4", "stop": "t5", "hours": 2},
    ]


def test_summarize():
    times = [f"t{i}" for i in range(4)]
    s = summarize(times, [1.0, 3.0, -1.0, -2.0], [T, T, F, F], [T, T, T, T])
    assert s["pct_sunlit"] == 50.0 and s["longest_dark_h"] == 2
    assert s["pct_earth"] == 100.0 and s["longest_blackout_h"] == 0
    assert s["max_sun_el_deg"] == 3.0 and s["mean_sun_el_deg"] == 2.0
    assert s["next_sunset_h"] == 2 and s["next_earthset_h"] == -1
