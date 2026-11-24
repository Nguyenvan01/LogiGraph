import random

import pytest

from logigraph.core.graph import RoadNetwork
from logigraph.core.trip import plan_trip


def grid(k: int, seed: int = 1) -> RoadNetwork:
    rnd = random.Random(seed)
    g = RoadNetwork(k * k)
    for r in range(k):
        for c in range(k):
            u = r * k + c
            for v in ((u + 1) if c + 1 < k else -1, (u + k) if r + 1 < k else -1):
                if v >= 0:
                    g.add_edge(u, v, 100, rnd.randint(5, 20))
                    g.add_edge(v, u, 100, rnd.randint(5, 20))
    return g


def test_trip_respects_capacity_and_is_a_closed_connected_walk():
    g = grid(6)
    rnd = random.Random(7)
    points = [rnd.randrange(g.n) for _ in range(20)]
    weights = [rnd.randint(10, 80) for _ in range(20)]
    fees = [rnd.randint(1, 50) for _ in range(20)]
    trip = plan_trip(g, 0, points, weights, fees, capacity=300, max_stops=8)

    assert trip.weight <= 300
    assert trip.stops[0] == trip.stops[-1] == 0
    assert len(trip.stops) - 2 <= 8
    # các Road Segment nối liền nhau và tổng Travel Time khớp
    at = 0
    for e in trip.edges:
        assert g.tail[e] == at
        at = g.head[e]
    assert at == 0
    assert sum(g.travel_s[e] for e in trip.edges) == pytest.approx(trip.total_s)
    # mọi Parcel được chọn đều có Delivery Point nằm trên vòng
    for i in trip.parcels:
        assert points[i] in trip.stops


def test_empty_selection_returns_trivial_trip():
    trip = plan_trip(grid(3), 4, [1], [500], [10], capacity=100)
    assert trip.parcels == [] and trip.stops == [4, 4] and trip.total_s == 0


def test_rejects_too_many_stops():
    with pytest.raises(ValueError):
        plan_trip(grid(3), 0, [], [], [], 10, max_stops=20)


def test_unreachable_delivery_point_raises():
    g = RoadNetwork(3)
    g.add_edge(0, 1, 1, 1)
    g.add_edge(1, 0, 1, 1)
    g.add_edge(0, 2, 1, 1)          # 2 tới được nhưng không quay về Hub được
    with pytest.raises(ValueError):
        plan_trip(g, 0, [1, 2], [1, 1], [5, 5], capacity=10)
