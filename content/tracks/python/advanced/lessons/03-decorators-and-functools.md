---
title: Decorators and functools
summary: Read and write decorators, explain exactly what the @ line does, keep function metadata with functools.wraps, build decorators that take arguments, and cache results with lru_cache.
minutes: 25
concepts: [decorators]
---

## Why this matters

Sooner or later you want to add the same behaviour to many functions: log every call, time it, check permissions, retry on failure, cache results. Copy-pasting that code into each function is noisy and error-prone. A **decorator** lets you write the behaviour once and attach it with a single line above the function.

Decorators are everywhere in real Python: `@property`, `@staticmethod`, `@dataclass`, `@app.route("/")` in Flask, `@pytest.fixture` in tests. They are also a favourite interview topic, because writing one proves you understand that functions are ordinary objects and that closures remember variables. Once you see what `@` really does, the magic disappears.

## The mental model

A function in Python is a value, just like a number or a string. You can store it in a variable, pass it to another function, and return it from a function.

A decorator is simply **a function that takes a function and returns a function** (usually a new one that wraps the original).

```
before:   name ──► [original function]

after:    name ──► [wrapper function] ──remembers──► [original function]
```

The `@` line is only shorthand for an assignment. These two snippets are identical:

```python
@my_decorator
def greet():
    ...

# is exactly the same as:
def greet():
    ...
greet = my_decorator(greet)
```

The name `greet` is rebound to whatever the decorator returned. Whenever someone later calls `greet()`, they are calling the wrapper, and the wrapper decides whether and how to call the original.

## Writing your first decorator

Here is the smallest useful decorator. It announces each call.

```python
def announce(func):
    def wrapper(*args, **kwargs):
        print(f"calling {func.__name__}")
        result = func(*args, **kwargs)
        print(f"{func.__name__} returned {result!r}")
        return result
    return wrapper

@announce
def add(a, b):
    return a + b

print(add(2, 3))
# calling add
# add returned 5
# 5
```

Walk through the pieces:

1. `announce(add)` runs **once**, at definition time. It builds `wrapper`, which closes over `func` (the original `add`), and returns it.
2. The name `add` now points at `wrapper`.
3. `add(2, 3)` runs `wrapper(2, 3)`. The wrapper prints, calls the original with the same arguments, prints again and **returns the result**.

Why `*args, **kwargs`? The wrapper does not know what signature the original has, so it accepts anything and forwards everything. Why `return result`? If you forget it, the decorated function silently returns `None`. That is the number one decorator bug.

### Decoration time versus call time

```python
def noisy(func):
    print("decorating", func.__name__)   # runs once, when the def is executed
    def wrapper(*args, **kwargs):
        print("running", func.__name__)  # runs on every call
        return func(*args, **kwargs)
    return wrapper

@noisy
def f():
    pass
# decorating f

f()
f()
# running f
# running f
```

Keeping those two moments apart is the heart of understanding decorators. Code in the outer function runs once; code in `wrapper` runs every time.

## functools.wraps: keeping the function's identity

After decoration, `add` is really `wrapper`, so its metadata is wrong:

```python
print(add.__name__)   # -> wrapper
print(add.__doc__)    # -> None   (even if add had a docstring)
```

This breaks debugging, documentation tools and anything that inspects names. The fix is the standard-library decorator `functools.wraps`, applied to the wrapper:

```python
import functools

def announce(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        print(f"calling {func.__name__}")
        return func(*args, **kwargs)
    return wrapper

@announce
def add(a, b):
    """Add two numbers."""
    return a + b

print(add.__name__)      # -> add
print(add.__doc__)       # -> Add two numbers.
print(add.__wrapped__)   # -> <function add at 0x...>   the original
```

`wraps` copies `__name__`, `__doc__`, `__module__` and a few more attributes from the original onto the wrapper, and stores the original as `__wrapped__`. Treat it as mandatory boilerplate for every decorator you write.

## Decorators that take arguments

Sometimes you want `@repeat(3)` rather than plain `@repeat`. Look at what the `@` line does with a call in it:

```python
@repeat(3)
def hello(): ...

# is the same as:
hello = repeat(3)(hello)
```

`repeat(3)` must **return a decorator**, which is then applied to `hello`. That gives three nested layers: the outer function takes the settings, the middle function takes the function being decorated, and the inner function is the wrapper.

```python
import functools

def repeat(times):                       # layer 1: settings
    def decorator(func):                 # layer 2: the function
        @functools.wraps(func)
        def wrapper(*args, **kwargs):    # layer 3: each call
            result = None
            for _ in range(times):
                result = func(*args, **kwargs)
            return result
        return wrapper
    return decorator

@repeat(3)
def hello(name):
    print("hi", name)

hello("Ada")
# hi Ada
# hi Ada
# hi Ada
```

A common slip is to write `@repeat` with no parentheses on a three-layer decorator. Then `repeat(hello)` runs, treats the function as `times`, and returns `decorator`, so `hello` becomes the middle layer and calling `hello("Ada")` hands the string to `decorator` as if it were a function. The tell-tale symptom is a confusing error far from the cause, or a function that does nothing.

### Stacking decorators

```python
def bold(f):
    return lambda: "<b>" + f() + "</b>"

def italic(f):
    return lambda: "<i>" + f() + "</i>"

@bold
@italic
def text():
    return "hi"

print(text())   # -> <b><i>hi</i></b>
```

Decorators apply from the bottom up (`text = bold(italic(text))`) but the outermost wrapper runs first when you call.

## functools.lru_cache: a decorator you should know

Some functions are slow but pure: the same arguments always give the same answer. A cache stores answers so repeated calls are instant. The standard library provides one:

```python
import functools

@functools.lru_cache(maxsize=None)
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)

print(fib(80))            # -> 23416728348467685   (instant)
print(fib.cache_info())   # -> CacheInfo(hits=78, misses=81, maxsize=None, currsize=81)
```

Without the cache, `fib(80)` makes roughly 2^80 recursive calls and effectively never finishes. With it, each value is computed once, so the work is linear. `maxsize` caps how many results are kept; when full, the **least recently used** entry is dropped. `functools.cache` is the same thing with no limit. Two rules: the arguments must be **hashable** (no lists or dicts), and the function should be pure, otherwise you will get stale answers.

Under the hood, a hand-rolled version is a decorator with a dictionary:

```python
def memo(func):
    cache = {}
    @functools.wraps(func)
    def wrapper(*args):
        if args not in cache:
            cache[args] = func(*args)
        return cache[args]
    return wrapper
```

Note `args not in cache` rather than `cache.get(args)`: a function that legitimately returns `None` or `0` must still be cached.

## Common mistakes (and how to spot them)

**1. Forgetting to return the wrapper's result.**

```python
def log(func):
    def wrapper(*args, **kwargs):
        print("call")
        func(*args, **kwargs)     # result thrown away
    return wrapper
```

Symptom: the decorated function always returns `None`. Misconception: "the wrapper just adds side effects". The wrapper *replaces* the function, so it must return what the original returned.

**2. Returning `wrapper()` instead of `wrapper`.** Writing `return wrapper()` calls the wrapper immediately at decoration time. Symptom: strange output on import and `'NoneType' object is not callable` later. A decorator returns the function object, not its result.

**3. Forgetting `functools.wraps`.** Symptom: every decorated function reports the name `wrapper`, and frameworks that register functions by name collide.

**4. Misplaced parentheses with argument decorators.** `@repeat` versus `@repeat(3)` are different programs. Count the layers: if the decorator takes settings, you need the call.

**5. Sharing state by accident.** A cache or counter created *inside* `wrapper` resets on every call. Create it in the decorator body (outside `wrapper`) so it lives as long as the decorated function.

## Check yourself

1. Rewrite `@timer` placed above `def work():` without using the `@` syntax.

<details><summary>Answer</summary>

After the function definition, write `work = timer(work)`. The `@` line is just shorthand for that assignment.
</details>

2. A decorator's inner `wrapper` prints "start", calls the function, and prints "end", but callers get `None` back from `add(2, 3)`. What is missing?

<details><summary>Answer</summary>

`return func(*args, **kwargs)` (or storing the result and returning it). Without a `return`, the wrapper returns `None`, and the wrapper has replaced the original function.
</details>

3. What does `functools.wraps(func)` do, and what is visibly different without it?

<details><summary>Answer</summary>

It copies metadata such as `__name__` and `__doc__` from `func` to the wrapper and sets `__wrapped__`. Without it, `add.__name__` is `"wrapper"` and the docstring is lost.
</details>

4. How many nested functions does `@retry(attempts=3)` need, and why?

<details><summary>Answer</summary>

Three. `retry(3)` runs first and must return a real decorator (layer 2), which receives the function and returns the wrapper (layer 3). `@retry(attempts=3)` means `f = retry(attempts=3)(f)`.
</details>

5. Why does `lru_cache` fail with `TypeError: unhashable type: 'list'` on `f([1, 2])`?

<details><summary>Answer</summary>

The cache is a dictionary keyed by the call arguments, and dictionary keys must be hashable. Lists are mutable and therefore unhashable. Pass a tuple instead.
</details>

## Key takeaways

- A decorator is a function that takes a function and returns a function; `@d` above `def f` means `f = d(f)`.
- The outer decorator body runs once at definition time; the wrapper runs on every call, and it must return the original's result.
- Use `*args, **kwargs` to forward any signature, and always apply `functools.wraps(func)` to the wrapper.
- A decorator with arguments is a function that returns a decorator: `@d(x)` means `f = d(x)(f)`, so it needs three layers.
- `functools.lru_cache` turns exponential recursion like Fibonacci into linear work, for pure functions with hashable arguments.
- State that must survive between calls (counters, caches) belongs in the enclosing scope, not inside `wrapper`.
