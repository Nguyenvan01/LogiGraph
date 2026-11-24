import random

import pytest

from logigraph.core.apq import AdaptableHeapPQ
from logigraph.core.heaps import LazyBinaryHeap


def _pop_matches(ref: list, got: tuple) -> None:
    """Phần tử lấy ra phải có khóa nhỏ nhất và tồn tại trong danh sách đối chứng."""
    ref.sort(key=lambda item: item[0])
    assert got[0] == ref[0][0]
    for i, item in enumerate(ref):
        if item[0] == got[0] and item[1] == got[1]:
            ref.pop(i)
            return
    raise AssertionError(f"{got} không có trong danh sách đối chứng")


def test_apq_differential_against_sorted_list():
    rng = random.Random(7)
    for _ in range(30):
        pq, ref, locs = AdaptableHeapPQ(), [], []   # ref: [key, value, loc]
        for step in range(300):
            op = rng.random()
            if op < 0.4 or not ref:
                key, value = rng.randint(0, 50), step
                loc = pq.add(key, value)
                ref.append([key, value, loc])
            elif op < 0.6:
                assert pq.min()[0] == min(item[0] for item in ref)
                _pop_matches(ref, pq.remove_min())
            elif op < 0.85:
                item = rng.choice(ref)
                item[0] = rng.randint(0, 50)           # tăng hoặc giảm
                pq.update(item[2], item[0])
            else:
                item = rng.choice(ref)
                ref.remove(item)
                assert pq.remove(item[2]) == (item[0], item[1])
                assert item[2].index == -1
            assert len(pq) == len(ref)
            for item in ref:
                assert pq._data[item[2].index] is item[2]
        while ref:
            _pop_matches(ref, pq.remove_min())
        assert pq.is_empty()
        assert pq.peak >= 1


def test_update_changes_value():
    pq = AdaptableHeapPQ()
    loc = pq.add(5, "a")
    pq.add(3, "b")
    pq.update(loc, 1, "z")
    assert pq.remove_min() == (1, "z")


def test_locator_invalidated_after_leaving_heap():
    pq = AdaptableHeapPQ()
    a = pq.add(1, "a")
    b = pq.add(2, "b")
    pq.remove_min()
    assert a.index == -1
    with pytest.raises(ValueError):
        pq.update(a, 0)
    with pytest.raises(ValueError):
        pq.remove(a)
    pq.remove(b)
    with pytest.raises(ValueError):
        pq.remove(b)
    with pytest.raises(ValueError):
        AdaptableHeapPQ().update(pq.add(1, "x"), 0)   # Locator của heap khác


def test_empty_heaps_raise_index_error():
    with pytest.raises(IndexError):
        AdaptableHeapPQ().min()
    with pytest.raises(IndexError):
        AdaptableHeapPQ().remove_min()
    with pytest.raises(IndexError):
        LazyBinaryHeap().pop()


def test_lazy_heap_sorts_and_tracks_peak():
    rng = random.Random(3)
    heap = LazyBinaryHeap()
    keys = [rng.randint(0, 100) for _ in range(500)]
    for i, k in enumerate(keys):
        heap.push(k, i)
    assert heap.peak == 500
    out = [heap.pop()[0] for _ in range(len(heap))]
    assert out == sorted(keys)
