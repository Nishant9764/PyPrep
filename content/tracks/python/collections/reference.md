---
title: "Collections: syntax reference"
---

## Choosing a container

| Type | Literal | Ordered | Duplicates | Mutable | Notes |
|---|---|---|---|---|---|
| list | `[1, 2]` | yes | yes | yes | general purpose sequence |
| tuple | `(1, 2)` | yes | yes | no | fixed bundle, usable as dict key; `(5,)` for one item |
| set | `{1, 2}` | no | no | yes | fast membership, set algebra; `set()` for empty |
| dict | `{"a": 1}` | insertion order | unique keys | yes | key to value lookup; `{}` is an empty dict |

## Lists

| Task | Code | Result / note |
|---|---|---|
| Add one | `xs.append(x)` | in place, returns `None` |
| Add many | `xs.extend(ys)` | in place |
| Insert at index | `xs.insert(i, x)` | in place |
| Remove by value | `xs.remove(x)` | first match; `ValueError` if absent |
| Remove by index | `xs.pop(i)` / `del xs[i]` | `pop()` returns the item |
| Copy | `xs[:]`, `list(xs)`, `xs.copy()` | shallow copy |
| Replace contents in place | `xs[:] = new` | all aliases see it |
| Alias (not a copy) | `ys = xs` | same object |

```python
a = [1, 2]
b = a            # alias
b.append(3)
print(a)         # -> [1, 2, 3]
```

## Tuples and sets

```python
x, y = (3, 4)            # unpacking
first, *rest = [1, 2, 3] # rest -> [2, 3]
a, b = b, a              # swap
```

| Set operation | Operator | Method |
|---|---|---|
| Union | `a \| b` | `a.union(b)` |
| Intersection | `a & b` | `a.intersection(b)` |
| Difference | `a - b` | `a.difference(b)` |
| Symmetric difference | `a ^ b` | `a.symmetric_difference(b)` |

Remove duplicates keeping nothing but values: `set(xs)`. Remove duplicates keeping order: `list(dict.fromkeys(xs))`.

## Dictionaries

| Task | Code |
|---|---|
| Read (may raise `KeyError`) | `d[k]` |
| Read with default | `d.get(k, 0)` |
| Insert or replace | `d[k] = v` |
| Insert only if missing | `d.setdefault(k, v)` |
| Delete | `del d[k]` / `d.pop(k, None)` |
| Loop keys / values / pairs | `for k in d` / `d.values()` / `d.items()` |
| Membership (keys) | `k in d` |

```python
counts = {}
for w in words:
    counts[w] = counts.get(w, 0) + 1          # frequency table

groups = {}
for w in words:
    groups.setdefault(len(w), []).append(w)   # grouping
```

```python
from collections import Counter, defaultdict
Counter(words).most_common(3)   # three most frequent (ties: first seen)
d = defaultdict(list)           # missing key -> []
d[k].append(v)
```

## Comprehensions

| Kind | Syntax |
|---|---|
| list | `[f(x) for x in xs if cond]` |
| set | `{f(x) for x in xs}` |
| dict | `{k: v for k, v in pairs}` |
| generator | `sum(f(x) for x in xs)` |
| choose a value | `[a if c else b for x in xs]` (no filter, keeps every item) |

## Sorting

| Goal | Code |
|---|---|
| New sorted list | `sorted(xs)` |
| Sort in place (returns `None`) | `xs.sort()` |
| Descending | `sorted(xs, reverse=True)` |
| By length | `sorted(xs, key=len)` |
| Case-insensitive | `sorted(xs, key=str.lower)` |
| Two rules (desc then asc) | `sorted(xs, key=lambda p: (-p[1], p[0]))` |
| Dict by value | `sorted(d.items(), key=lambda kv: kv[1])` |

Sorting is stable: equal keys keep their original order. Pass the function (`key=len`), never a call (`key=len()`).
