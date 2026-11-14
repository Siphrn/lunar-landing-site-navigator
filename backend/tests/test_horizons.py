"""Gate for horizons.py: runs offline from the committed cache."""
import json, pathlib, sys
import pytest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import horizons
from horizons import azel, parse_result, HorizonsError

SITES = {s["id"]: s for s in json.loads(
    (pathlib.Path(horizons.__file__).parent / "data" / "sites.json").read_text())}
DEC = ("2026-12-01", "2026-12-31")


def els(site, body):
    return [r[2] for r in azel(SITES[site], body, *DEC, offline=True)]


def test_apollo11_sun_high():
    assert max(els("apollo11", "sun")) > 60


@pytest.mark.parametrize("site", [s for s, v in SITES.items() if v["lat"] < -80])
def test_pole_sun_and_earth_low(site):
    sun, earth = els(site, "sun"), els(site, "earth")
    lat = abs(SITES[site]["lat"])
    # Sun stays within the colatitude plus the 1.5 deg axial tilt of the horizon
    assert max(abs(e) for e in sun) < (90 - lat) + 2.0
    # Earth adds ~6.7 deg of libration
    assert max(abs(e) for e in earth) < (90 - lat) + 8.0


def test_slice_shape_and_times():
    rows = azel(SITES["haworth"], "sun", *DEC, offline=True)
    assert len(rows) == 30 * 24 + 1
    assert rows[0][0] == "2026-12-01T00:00:00Z" and rows[-1][0] == "2026-12-31T00:00:00Z"
    assert all(0 <= r[1] < 360 for r in rows)


def test_uncached_offline_raises():
    with pytest.raises(HorizonsError):
        azel(SITES["haworth"], "sun", "2030-01-01", "2030-01-02", offline=True)


def test_error_text_raises_clearly():
    with pytest.raises(HorizonsError, match="no ephemeris"):
        parse_result("Cannot interpret date. Type \"?!\" for help.")


def test_bad_inputs():
    with pytest.raises(ValueError):
        azel(SITES["haworth"], "mars", *DEC)
    with pytest.raises(ValueError):
        azel(SITES["haworth"], "sun", "2026-13-01", "2026-12-31")
    with pytest.raises(ValueError):
        azel(SITES["haworth"], "sun", "2026-12-31", "2026-12-01")
