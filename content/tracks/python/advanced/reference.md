---
title: Advanced Python: syntax reference
---

## Exceptions and context managers

```python
try:
    risky()
except (KeyError, ValueError) as e:   # most specific first
    handle(e)
else:                                  # only if no exception
    use_result()
finally:                               # always runs
    cleanup()

raise ValueError("bad input")          # raise your own
raise                                  # re-raise inside except
raise NewError("...") from e           # chain causes
```

```python
with open("f.txt") as f:               # cleanup guaranteed
    data = f.read()

from contextlib import contextmanager
@contextmanager
def managed():
    setup()
    try:
        yield value                    # body of the with runs here
    finally:
        teardown()
```

## Iterators and generators

| Idea | Syntax |
|---|---|
| Iterable | has `__iter__` (list, str, dict, file) |
| Iterator | has `__next__`, raises `StopIteration` when done |
| Generator function | `def g(): yield x` |
| Generator expression | `(x * x for x in data)` |
| Delegate | `yield from other` |
| Lazy slice | `itertools.islice(it, n)` |

## Decorators and functools

```python
import functools

def deco(func):                        # @deco  ==  f = deco(f)
    @functools.wraps(func)             # keep name and docstring
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)   # do not forget the return
    return wrapper

def deco_with_args(n):                 # @deco_with_args(3)  ==  f = deco_with_args(3)(f)
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        return wrapper
    return decorator

@functools.lru_cache(maxsize=None)     # or @functools.cache
def fib(n): ...                        # args must be hashable
```

## Big-O of built-in operations

| Operation | list | dict | set | deque |
|---|---|---|---|---|
| `x in c` | O(n) | O(1) avg | O(1) avg | O(n) |
| get by index/key | O(1) | O(1) avg | n/a | O(n) middle |
| append / add / set | O(1) amortised | O(1) avg | O(1) avg | O(1) |
| pop from end | O(1) | n/a | n/a | O(1) |
| pop(0) / insert(0, x) | O(n) | n/a | n/a | O(1) |
| remove / delete | O(n) | O(1) avg | O(1) avg | O(n) |
| slice `a[i:j]` | O(j - i) | n/a | n/a | n/a |
| sorted / list.sort | O(n log n) | O(n log n) | O(n log n) | n/a |
| min / max / sum / len | O(n), len is O(1) | O(n) | O(n) | O(n) |
| copy | O(n) | O(n) | O(n) | O(n) |
| set union / intersection | n/a | n/a | O(len a + len b) | n/a |

Growth order: O(1) < O(log n) < O(n) < O(n log n) < O(n^2) < O(2^n). About 10^7 simple steps per second in Python.

## Interview patterns

| Pattern | Use when | Skeleton | Cost |
|---|---|---|---|
| Hash map / seen-set | "have I seen it?", pairs, counting, grouping | `seen[x] = i` after checking `target - x in seen` | O(n) time and space |
| Two pointers | sorted data, inward scan, in-place compaction | `l, r = 0, n - 1; while l < r:` | O(n) time, O(1) space |
| Sliding window | longest/shortest contiguous range | expand `right`; `while invalid: shrink left`; width `right - left + 1` | O(n) |

Interview script: clarify, brute force and its cost, spot the waste, name the pattern, state new complexity, code, trace an edge case.

## Type hints

```python
def f(a: int, b: str = "x") -> bool: ...
xs: list[int] = []
d: dict[str, list[int]] = {}
pair: tuple[int, str]
maybe: int | None            # Optional[int]
cb: Callable[[int], str]     # from collections.abc
T = TypeVar("T")             # def first(xs: list[T]) -> T
f.__annotations__            # stored, never enforced at runtime
```

Check with `mypy file.py`; Python itself ignores the hints.

## Modules, environments and tests

```python
import pkg.mod              # use pkg.mod.name
from pkg.mod import name    # use name
import pkg.mod as m

if __name__ == "__main__":   # True only when run directly
    main()
```

```
python -m venv .venv  &&  source .venv/bin/activate
pip install pytest  &&  pip freeze > requirements.txt
pytest -q                  # collects test_*.py and test_* functions
python -m unittest         # standard-library runner
```

```python
assert add(2, 3) == 5, "message shown on failure"

with pytest.raises(ValueError):          # pytest
    parse("x")
self.assertEqual(a, b)                   # unittest.TestCase
self.assertRaises(ValueError)            # context manager form
```
