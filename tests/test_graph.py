import math

import pytest

from logigraph.core.graph import RoadNetwork


def small() -> RoadNetwork:
    g = RoadNetwork(3)
    g.add_edge(0, 1, 100, 10)
    g.add_edge(1, 2, 100, 10)
    g.add_edge(0, 2, 300, 30)
    return g


def test_adjacency_and_find_edge():
    g = small()
    assert g.m == 3
    assert [g.head[e] for e in g.out_edges(0)] == [1, 2]
    assert g.find_edge(0, 2) == 2
    assert g.find_edge(2, 0) == -1


def test_traffic_incident_updates_in_place():
    g = small()
    g.set_travel_time(0, 99)
    g.close(1)
    assert g.travel_s[0] == 99 and g.closed[1] == 1
    g.reopen(1)
    assert g.closed[1] == 0


@pytest.mark.parametrize("bad", [-1, math.nan])
def test_rejects_negative_or_nan_travel_time(bad):
    with pytest.raises(ValueError):
        small().set_travel_time(0, bad)


def test_rejects_out_of_range_indices():
    g = small()
    with pytest.raises(IndexError):
        g.add_edge(0, 3, 1, 1)
    with pytest.raises(IndexError):
        g.close(10)


def test_from_csv_roundtrip(tmp_path):
    (tmp_path / "nodes.csv").write_text("id,lat,lon,district\n0,21.0,105.8,Đống Đa\n1,21.1,105.9,Ba Đình\n2,21.2,105.7,Đống Đa\n")
    (tmp_path / "edges.csv").write_text("tail,head,length_m,travel_s\n0,1,50,5\n1,2,60,6\n")
    g = RoadNetwork.from_csv(tmp_path / "nodes.csv", tmp_path / "edges.csv")
    assert (g.n, g.m) == (3, 2)
    assert g.district_names == ["Đống Đa", "Ba Đình"]
    assert g.district == [0, 1, 0]


def test_add_edge_rejects_nan():
    with pytest.raises(ValueError):
        RoadNetwork(2).add_edge(0, 1, math.nan, 1)
