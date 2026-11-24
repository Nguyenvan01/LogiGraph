import math
import random

import pytest

from logigraph.core.graph import RoadNetwork
from logigraph.core.routing import (PQ_KINDS, Router, bellman_ford, distance_matrix,
                                    path_edges, shortest_path)


def random_graph(rng: random.Random, n: int, m: int, p_closed: float = 0.1) -> RoadNetwork:
    g = RoadNetwork(n)
    for _ in range(m):
        e = g.add_edge(rng.randrange(n), rng.randrange(n), 1, rng.randint(0, 20))
        if rng.random() < p_closed:
            g.close(e)
    return g


def test_all_variants_match_bellman_ford():
    rng = random.Random(11)
    for _ in range(150):
        n = rng.randint(1, 15)
        g = random_graph(rng, n, rng.randint(0, 3 * n))
        s = rng.randrange(n)
        ref, _ = bellman_ford(g, s)
        for pq in PQ_KINDS:
            dist, parent = shortest_path(g, s, pq=pq)
            assert dist == ref
            for v in range(n):
                if dist[v] == math.inf or v == s:
                    assert parent[v] == -1
                else:
                    assert sum(g.travel_s[e] for e in path_edges(g, parent, v)) == dist[v]


def test_early_exit_equals_full_run():
    rng = random.Random(5)
    for _ in range(100):
        n = rng.randint(1, 15)
        g = random_graph(rng, n, rng.randint(0, 3 * n))
        s, t = rng.randrange(n), rng.randrange(n)
        full, full_parent = shortest_path(g, s)
        for pq in PQ_KINDS:
            dist, parent = shortest_path(g, s, t, pq=pq)
            assert dist[t] == full[t]
            edges = path_edges(g, parent, t)
            assert sum(g.travel_s[e] for e in edges) == (0 if full[t] == math.inf else full[t])
            assert (edges == []) == (full[t] == math.inf or s == t)


def test_path_edges_is_contiguous_and_skips_closed():
    g = RoadNetwork(4)
    g.add_edge(0, 1, 1, 1)
    cheap = g.add_edge(1, 3, 1, 1)
    g.add_edge(0, 2, 1, 5)
    g.add_edge(2, 3, 1, 5)
    g.close(cheap)
    dist, parent = shortest_path(g, 0)
    assert dist[3] == 10
    edges = path_edges(g, parent, 3)
    assert [g.tail[edges[0]], g.head[edges[0]], g.head[edges[1]]] == [0, 2, 3]
    assert path_edges(g, parent, 0) == []


def test_unreachable_and_validation():
    g = RoadNetwork(3)
    g.add_edge(0, 1, 1, 2)
    dist, parent = shortest_path(g, 0)
    assert dist == [0.0, 2.0, math.inf] and parent[2] == -1
    assert path_edges(g, parent, 2) == []
    with pytest.raises(IndexError):
        shortest_path(g, 3)
    with pytest.raises(IndexError):
        shortest_path(g, 0, -1)
    with pytest.raises(ValueError):
        shortest_path(g, 0, pq="fibonacci")


def test_distance_matrix_asymmetric_on_one_way():
    g = RoadNetwork(3)
    g.add_edge(0, 1, 1, 10)   # một chiều 0 → 1
    g.add_edge(1, 2, 1, 10)
    g.add_edge(2, 0, 1, 10)
    assert distance_matrix(g, [0, 1]) == [[0.0, 10.0], [20.0, 0.0]]


def test_router_skips_off_route_increase_and_reroutes_on_route():
    g = RoadNetwork(4)
    a = g.add_edge(0, 1, 1, 1)
    b = g.add_edge(1, 3, 1, 1)
    side = g.add_edge(0, 2, 1, 5)
    g.add_edge(2, 3, 1, 5)
    r = Router(g)
    assert r.route(0, 3).edges == [a, b]
    rerouted, route = r.incident(side, travel_s=50)
    assert not rerouted and route.edges == [a, b] and route.total_s == 2 and r.skips == 1
    rerouted, route = r.incident(b, close=True, at=1)
    assert rerouted and r.recomputes == 1
    assert route.total_s == math.inf and route.nodes == [1]


def test_router_randomized_incidents_match_fresh_dijkstra():
    rng = random.Random(2026)
    total_skips = 0
    for _ in range(40):
        n = rng.randint(2, 12)
        g = random_graph(rng, n, 4 * n, p_closed=0.0)
        for v in range(n):                                  # vòng để đa số cặp tới được nhau
            g.add_edge(v, (v + 1) % n, 1, rng.randint(5, 30))
        r = Router(g)
        s, t = rng.randrange(n), rng.randrange(n)
        route = r.route(s, t)
        for _ in range(25):
            at = rng.choice(route.nodes)
            e = rng.randrange(g.m)
            kind = rng.random()
            if kind < 0.45:
                rerouted, route = r.incident(e, travel_s=g.travel_s[e] + rng.randint(0, 20), at=at)
            elif kind < 0.75:
                rerouted, route = r.incident(e, travel_s=rng.randint(0, int(g.travel_s[e])), at=at)
            else:
                rerouted, route = r.incident(e, close=True, at=at)
            assert route.nodes[0] == at
            assert route.total_s == shortest_path(g, at)[0][t]
            if route.total_s < math.inf:
                assert sum(g.travel_s[x] for x in route.edges) == route.total_s
                assert all(g.closed[x] == 0 for x in route.edges)
                assert [g.head[x] for x in route.edges] == route.nodes[1:]
                assert route.nodes[-1] == t
        total_skips += r.skips
        assert r.skips + r.recomputes == 25
    assert total_skips > 0
