import math
import random

import pytest

from logigraph.core.dsu import DisjointSet
from logigraph.core.graph import RoadNetwork
from logigraph.core.network import (connected_components, district_components, hub_backbone,
                                    k_clusters, kruskal_mst, prim_mst_array)


def random_graph(rng, n, m, connected):
    edges = []
    if connected:
        for v in range(1, n):
            edges.append((rng.randint(1, 50), rng.randrange(v), v))
    for _ in range(m):
        edges.append((rng.randint(1, 50), rng.randrange(n), rng.randrange(n)))
    rng.shuffle(edges)
    return edges


def components(n, edges):
    ds = DisjointSet(n)
    for _, u, v in edges:
        ds.union(u, v)
    return ds.count


def assert_spanning_forest(n, edges, chosen):
    ds = DisjointSet(n)
    for i in chosen:
        assert ds.union(edges[i][1], edges[i][2]), "cạnh được chọn tạo chu trình"
    assert len(chosen) == n - components(n, edges)


@pytest.mark.parametrize("connected", [True, False])
def test_kruskal_matches_prim(connected):
    rng = random.Random(42 + connected)
    for _ in range(60):
        n = rng.randint(1, 25)
        edges = random_graph(rng, n, rng.randint(0, 3 * n), connected)
        kt, kc = kruskal_mst(n, edges)
        pt, pc = prim_mst_array(n, edges)
        assert kt == pt
        assert kt == sum(edges[i][0] for i in kc)
        assert_spanning_forest(n, edges, kc)
        assert_spanning_forest(n, edges, pc)


def test_mst_small_known():
    edges = [(1, 0, 1), (4, 0, 2), (2, 1, 2), (7, 2, 3), (5, 1, 3)]
    assert kruskal_mst(4, edges) == (8.0, [0, 2, 4])
    assert prim_mst_array(4, edges)[0] == 8.0


def test_k_clusters_separates_two_groups():
    edges = [(1, 0, 1), (1, 1, 2), (2, 0, 2), (1, 3, 4), (1, 4, 5), (100, 2, 3)]
    assert k_clusters(6, edges, 2) == [0, 0, 0, 1, 1, 1]
    assert k_clusters(6, edges, 1) == [0] * 6
    assert k_clusters(6, edges, 6) == [0, 1, 2, 3, 4, 5]
    with pytest.raises(ValueError):
        k_clusters(6, edges, 0)
    with pytest.raises(ValueError):
        k_clusters(6, edges, 7)


def test_hub_backbone_asymmetric():
    inf = math.inf
    dist = [
        [0, 10, 30, 50],
        [20, 0, 4, 8],
        [30, 6, 0, inf],
        [50, 2, 1, 0],
    ]
    # trọng số vô hướng: 01=15, 02=30, 03=50, 12=5, 13=5, 23 bỏ (inf)
    total, links = hub_backbone(dist)
    assert total == 25.0
    assert sorted((min(i, j), max(i, j), w) for i, j, w in links) == [(0, 1, 15.0), (1, 2, 5.0), (1, 3, 5.0)]
    with pytest.raises(ValueError):
        hub_backbone([[0, 1]])


def two_way(g, u, v):
    return g.add_edge(u, v, 100, 10), g.add_edge(v, u, 100, 10)


def test_connected_components_after_closing_bridge():
    g = RoadNetwork(4)
    two_way(g, 0, 1)
    ab, ba = two_way(g, 1, 2)          # cầu
    two_way(g, 2, 3)
    assert connected_components(g) == (1, [0, 0, 0, 0])
    g.close(ab)
    assert connected_components(g)[0] == 1     # còn chiều ngược lại
    g.close(ba)
    assert connected_components(g) == (2, [0, 0, 1, 1])
    g.reopen(ab)
    assert connected_components(g)[0] == 1


def test_district_components():
    g = RoadNetwork(6)
    for v, name in enumerate(["Q1", "Q1", "Q1", "Q3", "Q3", "Q3"]):
        g.set_district(v, name)
    two_way(g, 0, 1)
    two_way(g, 2, 3)                   # nối khác District, không tính
    two_way(g, 3, 4)
    e = g.add_edge(4, 5, 100, 10)
    g.close(e)
    assert district_components(g) == [("Q1", 3, 2, 2), ("Q3", 3, 2, 2)]
    g.reopen(e)
    assert district_components(g) == [("Q1", 3, 2, 2), ("Q3", 3, 1, 3)]
