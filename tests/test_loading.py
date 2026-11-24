import random

import pytest

from logigraph.core.loading import knapsack_bnb, knapsack_brute, knapsack_dp, knapsack_greedy

SOLVERS = (knapsack_dp, knapsack_bnb, knapsack_greedy, knapsack_brute)


def instance(rng: random.Random, n: int) -> tuple[list[int], list[int], int]:
    weights = [rng.randint(1, 50) for _ in range(n)]
    values = [rng.randint(0, 100) for _ in range(n)]
    return weights, values, rng.randint(0, sum(weights) + 5)


def assert_valid(weights, values, capacity, result):
    best, chosen = result
    assert chosen == sorted(set(chosen))
    assert sum(weights[i] for i in chosen) <= capacity
    assert sum(values[i] for i in chosen) == best


def test_dp_bnb_brute_agree_on_random_instances():
    rng = random.Random(4)
    for _ in range(80):
        weights, values, capacity = instance(rng, rng.randint(0, 15))
        exact = knapsack_brute(weights, values, capacity)
        for solver in SOLVERS:
            result = solver(weights, values, capacity)
            assert_valid(weights, values, capacity, result)
            if solver is knapsack_greedy:
                assert result[0] <= exact[0]
            else:
                assert result[0] == exact[0]


def test_bnb_matches_dp_on_larger_instances():
    rng = random.Random(7)
    for _ in range(5):
        weights, values, capacity = instance(rng, 60)
        capacity //= 2
        dp = knapsack_dp(weights, values, capacity)
        bnb = knapsack_bnb(weights, values, capacity)
        assert_valid(weights, values, capacity, bnb)
        assert bnb[0] == dp[0]
        assert knapsack_greedy(weights, values, capacity)[0] <= dp[0]


def test_greedy_is_not_optimal():
    # Parcel tỉ lệ cao nhất chiếm chỗ, hai Parcel còn lại cộng lại tốt hơn.
    weights, values, capacity = [6, 5, 5], [7, 5, 5], 10
    assert knapsack_greedy(weights, values, capacity) == (7, [0])
    assert knapsack_dp(weights, values, capacity) == (10, [1, 2])


def test_float_values_and_edge_cases():
    assert knapsack_dp([3, 4], [1.5, 2.5], 7) == (4.0, [0, 1])
    assert knapsack_bnb([3, 4], [1.5, 2.5], 7) == (4.0, [0, 1])
    for solver in SOLVERS:
        assert solver([], [], 10) == (0, [])
        assert solver([5], [9], 0) == (0, [])
        assert solver([5], [9], 5) == (9, [0])


def test_bnb_handles_n_1000_without_recursion():
    rng = random.Random(1)
    weights, values, capacity = instance(rng, 1000)
    best, chosen = knapsack_bnb(weights, values, capacity // 3)
    assert_valid(weights, values, capacity // 3, (best, chosen))


@pytest.mark.parametrize("solver", SOLVERS)
@pytest.mark.parametrize("args", [
    ([1, 2], [1], 5),          # lệch độ dài
    ([0], [1], 5),             # khối lượng không dương
    ([1.5], [1], 5),           # khối lượng không nguyên
    ([1], [-1], 5),            # cước âm
    ([1], [1], -1),            # tải trọng âm
    ([1], [1], 2.0),           # tải trọng không nguyên
])
def test_invalid_input_raises(solver, args):
    with pytest.raises(ValueError):
        solver(*args)


def test_brute_rejects_large_n():
    with pytest.raises(ValueError):
        knapsack_brute([1] * 23, [1] * 23, 5)
