import random

import pytest

from logigraph.core.dsu import DisjointSet, QuickFind

VARIANTS = [
    lambda n: DisjointSet(n, True, True),
    lambda n: DisjointSet(n, True, False),
    lambda n: DisjointSet(n, False, True),
    lambda n: DisjointSet(n, False, False),
    QuickFind,
]


def bfs_labels(n, pairs):
    adj = [[] for _ in range(n)]
    for a, b in pairs:
        adj[a].append(b)
        adj[b].append(a)
    label = [-1] * n
    c = 0
    for s in range(n):
        if label[s] == -1:
            label[s] = c
            queue = [s]
            for u in queue:
                for v in adj[u]:
                    if label[v] == -1:
                        label[v] = c
                        queue.append(v)
            c += 1
    return c, label


@pytest.mark.parametrize("make", VARIANTS)
def test_agrees_with_bfs_on_random_graphs(make):
    rng = random.Random(7)
    for _ in range(30):
        n = rng.randint(1, 40)
        pairs = [(rng.randrange(n), rng.randrange(n)) for _ in range(rng.randint(0, n))]
        count, label = bfs_labels(n, pairs)
        ds = make(n)
        for a, b in pairs:
            ds.union(a, b)
        assert ds.count == count
        for _ in range(50):
            a, b = rng.randrange(n), rng.randrange(n)
            assert ds.connected(a, b) == (label[a] == label[b])


@pytest.mark.parametrize("make", VARIANTS)
def test_union_returns_false_when_same_set_and_bounds(make):
    ds = make(3)
    assert ds.union(0, 1) is True
    assert ds.union(1, 0) is False
    assert ds.count == 2
    with pytest.raises(IndexError):
        ds.find(3)
    with pytest.raises(IndexError):
        ds.union(-1, 0)


def chain_steps(ds, n):
    for i in range(n - 1):
        ds.union(i, i + 1)
    for _ in range(n):
        ds.find(0)
    return ds.steps


def test_both_optimizations_take_far_fewer_steps_on_long_chain():
    n = 1000
    naive = chain_steps(DisjointSet(n, False, False), n)
    fast = chain_steps(DisjointSet(n, True, True), n)
    assert naive > 100 * fast


def test_path_compression_flattens_chain():
    ds = DisjointSet(5, path_compression=True, union_by_rank=False)
    for i in range(4):
        ds.union(i, i + 1)
    root = ds.find(0)
    assert all(ds.parent[i] == root for i in range(5))


def test_quickfind_steps_count_relabels():
    qf = QuickFind(4)
    qf.union(0, 1)
    qf.union(2, 3)
    qf.union(0, 2)          # nhãn của {0,1} đổi hết: 2 lần ghi
    assert qf.steps == 4
    assert qf.find(0) == qf.find(3)
