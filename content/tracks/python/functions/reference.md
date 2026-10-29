---
title: "Functions: syntax reference"
---

## Defining and returning

```python
def area(width, height=1):
    """Return the area of a rectangle."""
    return width * height

def min_max(nums):
    return min(nums), max(nums)        # a tuple

lo, hi = min_max([3, 1, 2])            # unpacking
```

| Idea | Rule |
|---|---|
| parameter vs argument | parameters are in the `def`; arguments are what the caller passes |
| `return` | hands a value to the caller and ends the function |
| no `return` | the function returns `None` |
| `print` | displays text; the caller receives nothing |
| `return a, b` | returns the tuple `(a, b)` |

## Parameter kinds

| Syntax | Meaning |
|---|---|
| `def f(a, b)` | positional or keyword |
| `def f(a, b=2)` | default; defaulted parameters come after required ones |
| `def f(*args)` | extra positionals collected in a tuple |
| `def f(**kwargs)` | extra keywords collected in a dict |
| `def f(a, /, b)` | `a` is positional-only |
| `def f(a, *, key)` | `key` is keyword-only |
| `f(*seq)`, `f(**mapping)` | unpack at the call site |

```python
def log(msg, *args, sep=" ", **opts):
    return msg + sep + sep.join(map(str, args))
```

## Mutable defaults

```python
def add(x, bucket=[]):        # BUG: one list, created once at def time
    bucket.append(x)
    return bucket

def add(x, bucket=None):      # fix: None sentinel
    if bucket is None:
        bucket = []
    bucket.append(x)
    return bucket
```

## Scope (LEGB) and closures

| Level | Where |
|---|---|
| Local | names assigned inside the current function |
| Enclosing | names in outer functions |
| Global | module level |
| Built-in | `len`, `print`, ... |

| Keyword | Effect |
|---|---|
| `global x` | assign to the module-level `x` |
| `nonlocal x` | assign to `x` in the nearest enclosing function |

```python
def make_counter():
    n = 0
    def inc():
        nonlocal n
        n += 1
        return n
    return inc

fs = [lambda i=i: i for i in range(3)]   # bind the loop value now, not later
```

Closures look variables up when called, not when defined (late binding); a default argument freezes the value.

## Recursion

```python
def fact(n):
    if n <= 1:               # base case
        return 1
    return n * fact(n - 1)   # smaller subproblem
```

Missing base case gives `RecursionError` (default limit about 1000 frames). Cache repeated work with `functools.lru_cache(maxsize=None)` or a dict.

## Higher-order tools

| Tool | Example | Result |
|---|---|---|
| `lambda` | `lambda x: x * 2` | anonymous function |
| `map` | `list(map(str, [1, 2]))` | `['1', '2']` |
| `filter` | `list(filter(None, [0, 1]))` | `[1]` |
| `sorted(key=)` | `sorted(words, key=len)` | stable sort by length |
| `reduce` | `reduce(lambda a, b: a + b, xs)` | fold to one value |
