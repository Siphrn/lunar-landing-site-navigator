"""API gate: shapes match contracts 3-5 and B's mocks; bad input gives 400. Offline."""
import json, pathlib, sys
from fastapi.testclient import TestClient

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import app as appmod
import horizons

c = TestClient(appmod.app)
Q = {"start": "2026-12-01", "stop": "2026-12-31", "step_h": 1}
METRIC_KEYS = {"site", "name", "horizon", "mast_m", "pct_sunlit", "longest_dark_h", "pct_earth",
               "longest_blackout_h", "pct_both", "max_sun_el_deg", "mean_sun_el_deg",
               "next_sunset_h", "next_earthset_h", "both_windows"}


def setup_module():
    horizons.OFFLINE = True  # cache only: proves the API works offline


def test_sites():
    r = c.get("/sites")
    assert r.status_code == 200 and len(r.json()) == 12


def test_ephemeris_shape():
    d = c.get("/ephemeris", params={**Q, "site": "haworth", "horizon": "flat"}).json()
    assert set(d) == {"site", "start", "stop", "step_h", "horizon", "mast_m", "times", "sun", "earth", "mask_deg"}
    assert d["start"] == "2026-12-01T00:00:00Z" and d["stop"] == "2026-12-31T00:00:00Z"
    assert len(d["times"]) == 720 and d["times"][1] == "2026-12-01T01:00:00Z"
    for b in ("sun", "earth"):
        assert set(d[b]) == {"az", "el", "visible"}
        assert all(len(d[b][k]) == 720 for k in d[b])
    assert d["horizon"] == "flat" and d["mask_deg"] is None


def test_step_h():
    d = c.get("/ephemeris", params={**Q, "site": "haworth", "step_h": 3}).json()
    assert len(d["times"]) == 240 and d["times"][1] == "2026-12-01T03:00:00Z"


def test_terrain_fallback(tmp_path, monkeypatch):
    monkeypatch.setattr(appmod, "MASKS", tmp_path)
    d = c.get("/ephemeris", params={**Q, "site": "haworth", "horizon": "terrain"}).json()
    assert d["horizon"] == "flat" and d["mask_deg"] is None


def test_terrain_mask(tmp_path, monkeypatch):
    (tmp_path / "haworth.json").write_text(json.dumps({"site": "haworth", "n_az": 360, "mask_deg": [90.0] * 360}))
    monkeypatch.setattr(appmod, "MASKS", tmp_path)
    d = c.get("/ephemeris", params={**Q, "site": "haworth", "horizon": "terrain"}).json()
    assert d["horizon"] == "terrain" and len(d["mask_deg"]) == 360
    assert not any(d["sun"]["visible"])  # a 90 deg wall hides everything


def test_compare_shape():
    d = c.get("/compare", params={**Q, "sites": "haworth,malapert_massif,nobile_rim_1",
                                   "land_at": "2026-12-05T12:00:00Z"}).json()
    assert set(d) == {"start", "stop", "step_h", "land_at", "results"}
    assert d["land_at"] == "2026-12-05T12:00:00Z"
    assert [r["site"] for r in d["results"]] == ["haworth", "malapert_massif", "nobile_rim_1"]
    for r in d["results"]:
        assert set(r) == METRIC_KEYS
        assert 0 <= r["pct_sunlit"] <= 100
        for w in r["both_windows"]:
            assert set(w) == {"start", "stop", "hours"}


def test_compare_no_land_at():
    d = c.get("/compare", params={**Q, "sites": "apollo11"}).json()
    assert d["land_at"] is None


def test_bad_inputs_400():
    for p in [
        {**Q, "site": "nowhere"},
        {**Q, "site": "haworth", "start": "2026-12-40"},
        {**Q, "site": "haworth", "stop": "2026-11-01"},
        {**Q, "site": "haworth", "step_h": 0},
    ]:
        assert c.get("/ephemeris", params=p).status_code == 400, p
    assert c.get("/compare", params={**Q, "sites": "haworth,nowhere"}).status_code == 400
    assert c.get("/compare", params={**Q, "sites": "haworth", "land_at": "2027-06-01"}).status_code == 400
    assert c.get("/ephemeris", params={**Q, "site": "haworth", "horizon": "hilly"}).status_code == 422


def test_uncached_range_is_502_not_crash():
    r = c.get("/ephemeris", params={"site": "haworth", "start": "2030-01-01", "stop": "2030-01-02"})
    assert r.status_code == 502


def test_cors():
    r = c.get("/sites", headers={"Origin": "http://localhost:5173"})
    assert r.headers.get("access-control-allow-origin") == "*"


def test_mast_mask_and_fallback(tmp_path, monkeypatch):
    base = {"site": "haworth", "n_az": 360}
    (tmp_path / "haworth.json").write_text(json.dumps({**base, "mask_deg": [90.0] * 360}))
    (tmp_path / "haworth_h10.json").write_text(json.dumps({**base, "mask_deg": [-90.0] * 360}))
    (tmp_path / "malapert_massif.json").write_text(json.dumps({**base, "mask_deg": [90.0] * 360}))
    monkeypatch.setattr(appmod, "MASKS", tmp_path)
    p = {**Q, "site": "haworth", "horizon": "terrain"}
    d0 = c.get("/ephemeris", params=p).json()
    d10 = c.get("/ephemeris", params={**p, "mast_m": 10}).json()
    assert d0["mast_m"] == 0 and not any(d0["sun"]["visible"])
    assert d10["mast_m"] == 10 and all(d10["sun"]["visible"])
    # no _h10 file: falls back to the 0 m mask and says mast_m 0
    r = c.get("/compare", params={**Q, "sites": "haworth,malapert_massif", "horizon": "terrain", "mast_m": 10}).json()
    got = {x["site"]: (x["horizon"], x["mast_m"]) for x in r["results"]}
    assert got == {"haworth": ("terrain", 10), "malapert_massif": ("terrain", 0)}
    # flat ignores the mast
    assert c.get("/ephemeris", params={**Q, "site": "haworth", "mast_m": 10}).json()["mast_m"] == 0
    assert c.get("/ephemeris", params={**p, "mast_m": -1}).status_code == 422
