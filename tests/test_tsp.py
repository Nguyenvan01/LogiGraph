import math
import random

import pytest

from logigraph.core.tsp import held_karp, nearest_neighbour, tsp_brute


def asymmetric(rng: random.Random, n: int, inf_rate: float = 0.0) -> list[list[float]]:
    return [[0 if u == v else (math.inf if rng.random() < inf_rate else rng.randint(1, 100))
             for v in range(n)] for u in range(n)]


def assert_tour(dist, start, cost, tour):
    n = len(dist)
    assert tour[0] == tour[-1] == start
    assert sorted(tour[:-1]) == list(range(n))
    assert sum(dist[tour[i]][tour[i + 1]] for i in range(n)) == cost


def test_held_karp_matches_brute_on_random_asymmetric_matrices():
    rng = random.Random(3)
    for n in range(2, 9):
        for _ in range(6):
            dist = asymmetric(rng, n, inf_rate=0.2)
            start = rng.randrange(n)
            hk, brute, nn = held_karp(dist, start), tsp_brute(dist, start), nearest_neighbour(dist, start)
            assert hk[0] == brute[0]
            assert nn[0] >= hk[0]
            for cost, tour in (hk, brute, nn):
                if cost == math.inf:
                    assert tour == []
                else:
                    assert_tour(dist, start, cost, tour)


def test_asymmetry_matters():
    # 0->1->2->0 rẻ, chiều ngược lại đắt.
    dist = [[0, 1, 50], [50, 0, 1], [1, 50, 0]]
    assert held_karp(dist) == (3, [0, 1, 2, 0])
    assert held_karp(dist, start=2) == (3, [2, 0, 1, 2])


def test_no_hamiltonian_cycle_returns_inf():
    inf = math.inf
    dist = [[0, 1, 1], [inf, 0, inf], [inf, inf, 0]]   # không quay lại được từ 1 hay 2
    for solver in (held_karp, tsp_brute, nearest_neighbour):
        assert solver(dist) == (inf, [])


def test_nearest_neighbour_can_be_worse():
    dist = [[0, 1, 2, 9], [9, 0, 9, 1], [9, 1, 0, 9], [1, 9, 1, 0]]
    assert held_karp(dist)[0] < nearest_neighbour(dist)[0]


def test_single_point_and_validation():
    for solver in (held_karp, tsp_brute, nearest_neighbour):
        assert solver([[7]]) == (0, [0, 0])
        with pytest.raises(ValueError):
            solver([[0, 1], [1]])
        with pytest.raises(ValueError):
            solver([])
        with pytest.raises(IndexError):
            solver([[0, 1], [1, 0]], start=2)
    with pytest.raises(ValueError):
        held_karp([[0] * 17 for _ in range(17)])
    with pytest.raises(ValueError):
        tsp_brute([[0] * 11 for _ in range(11)])
