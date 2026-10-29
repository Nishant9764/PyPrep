---
title: Parameters, *args, **kwargs and Mutable Defaults
summary: Choose the right kind of parameter for a function, unpack arguments at the call site, and avoid the mutable-default-argument bug.
minutes: 20
concepts: [parameters, mutable-defaults]
---

## Why this matters

Real functions need flexibility: a `print` that accepts any number of values, a `sorted` that takes an optional `key`, a `connect` function with sensible defaults. Python gives you several parameter kinds to express that, and the notation (`*args`, `**kwargs`, `/`, `*`) looks cryptic until you see the idea behind it.

This lesson also covers the most famous Python trap for intermediate learners: **mutable default arguments**. It shows up in interviews constantly because it tests whether you understand *when* Python evaluates things. If a function "remembers" data between calls and you did not ask it to, this is why.

## The mental model

When you call a function, Python matches arguments to parameters like dealing cards into named slots:

```
def f(a, b, c=10, *rest, key=None, **extra):

f(1, 2, 3, 4, 5, key="x", mode="fast")
   a=1  b=2  c=3   rest=(4, 5)   key="x"   extra={"mode": "fast"}
```

Positional arguments fill slots from the left. Keyword arguments (`name=value`) go straight to the slot with that name. Leftovers are collected: extra positionals into a **tuple** (`*rest`), extra keywords into a **dict** (`**extra`). Any parameter with a default that did not receive an argument takes its default.

The second half of the model is about **time**. A `def` statement runs once, when Python reaches it. Defaults are evaluated *at that moment* and stored on the function object. They are not re-evaluated on each call. For an immutable default like `10` that does not matter. For a list it matters a great deal.

## Positional, keyword and default parameters

```python
def power(base, exponent=2):
    return base ** exponent

print(power(5))              # -> 25     exponent uses its default
print(power(2, 10))          # -> 1024   positional
print(power(exponent=3, base=2))   # -> 8   keywords, any order
```

Parameters with defaults must come after those without; `def f(a=1, b)` is a `SyntaxError`. Keyword arguments make calls self-documenting, which matters when a function has several similar parameters: `connect(host, 8080, True)` is mysterious, `connect(host, port=8080, secure=True)` is not.

You cannot give the same parameter twice: `power(2, base=3)` raises `TypeError: power() got multiple values for argument 'base'`.

## *args and **kwargs

A star in the **definition** *collects*:

```python
def total(*numbers):
    print(numbers)
    return sum(numbers)

print(total(1, 2, 3))   # -> (1, 2, 3)
                        # -> 6
print(total())          # -> ()
                        # -> 0

def describe(**details):
    for key, value in sorted(details.items()):
        print(key, "=", value)

describe(name="Ada", year=1815)
# -> name = Ada
# -> year = 1815
```

The names `args` and `kwargs` are only conventions; the stars do the work. Inside the function `numbers` is an ordinary tuple and `details` an ordinary dict.

A star at the **call site** does the opposite: it *unpacks* a sequence or dict into separate arguments.

```python
values = [3, 4]
print(power(*values))             # -> 81     same as power(3, 4)

options = {"base": 2, "exponent": 5}
print(power(**options))           # -> 32     same as power(base=2, exponent=5)
```

Parameters after a bare `*` (or after `*args`) are **keyword-only**, and parameters before a `/` are **positional-only**:

```python
def render(text, *, upper=False):
    return text.upper() if upper else text

print(render("hi", upper=True))   # -> HI
# render("hi", True)  -> TypeError: takes 1 positional argument but 2 were given
```

Keyword-only parameters are a good choice for flags: the caller is forced to write `upper=True`, so the call explains itself.

## Mutable default arguments

Here is the bug in its simplest form:

```python
def add_item(item, basket=[]):
    basket.append(item)
    return basket

print(add_item("apple"))    # -> ['apple']
print(add_item("pear"))     # -> ['apple', 'pear']   surprise!
print(add_item("plum"))     # -> ['apple', 'pear', 'plum']
```

Each call without a `basket` seems to start fresh, but it does not. Walk through what Python did:

1. When it executed `def add_item(...)`, it evaluated `[]` **once**, created one list object, and stored it in `add_item.__defaults__`.
2. Every call that omits `basket` binds the parameter to that **same** list.
3. `append` mutates that list in place, so the change is visible to the next call.

You can see the stored default directly:

```python
print(add_item.__defaults__)   # -> (['apple', 'pear', 'plum'],)
```

The misconception is "the default is a fresh empty list each call". The truth is "the default is one object, created at definition time". It is the same aliasing you met with lists (`a = b = []`), just hidden inside a function signature. The same problem happens with `{}`, `set()`, and any instance of a class you made.

The standard fix is the **None sentinel**: use `None` (immutable) as the default and create the real list inside the body, which runs fresh on every call:

```python
def add_item(item, basket=None):
    if basket is None:
        basket = []
    basket.append(item)
    return basket

print(add_item("apple"))   # -> ['apple']
print(add_item("pear"))    # -> ['pear']
mine = ["fig"]
print(add_item("kiwi", mine))   # -> ['fig', 'kiwi']
```

Use `is None` rather than `if not basket`: an empty list passed by the caller is falsy, and you would silently replace it with a new one, breaking the caller's expectation that their list gets filled.

Sometimes the "bug" is used on purpose as a cache, but that is obscure and surprising; use a decorator like `functools.lru_cache` or a closure instead.

## Mutating arguments: a related surprise

Even without defaults, arguments are bound to the caller's objects, not copies:

```python
def add_tax(prices):
    for i in range(len(prices)):
        prices[i] = round(prices[i] * 1.2, 2)

data = [10, 20]
add_tax(data)
print(data)    # -> [12.0, 24.0]
```

`prices` and `data` are two names for one list. Mutating through either shows through both. Reassigning the parameter (`prices = [...]`) only rebinds the local name and leaves the caller's list alone. Decide whether your function mutates or returns a new object and say so in its docstring.

## Common mistakes (and how to spot them)

**Mutable default.** Symptom: results accumulate across calls, tests pass when run alone but fail when the function is called twice. Cause: the default object is shared. Fix: `None` sentinel.

**Putting a default before a non-default parameter.** Symptom: `SyntaxError: non-default argument follows default argument`. Reorder, or make the later parameter keyword-only.

**Forgetting the star when unpacking.** `power(values)` passes one list as `base` and leaves `exponent` at its default, then crashes in `**`. Misconception: "Python spreads a list automatically." Write `power(*values)`.

**Treating `*args` as a list.** It is a tuple, so `args.append(1)` raises `AttributeError`. Convert with `list(args)` if you need to change it.

**Passing the same argument twice.** `power(2, base=3)` gives "multiple values". A positional argument already filled the slot.

**Testing falsiness instead of `None`.** `if not basket:` replaces a legitimately empty list that the caller passed in. Use `if basket is None:`.

## Check yourself

1. What does this print?
   ```python
   def f(x, seen=[]):
       seen.append(x)
       return len(seen)
   print(f(1), f(2), f(3))
   ```
   <details><summary>Answer</summary>`1 2 3`. The one shared default list grows with each call.</details>

2. When is the default value expression evaluated?
   <details><summary>Answer</summary>Once, when the `def` statement executes, not at each call. The resulting object is stored on the function.</details>

3. What types do `*args` and `**kwargs` have inside the function?
   <details><summary>Answer</summary>`args` is a tuple of the extra positional arguments; `kwargs` is a dict of the extra keyword arguments.</details>

4. How do you call `power(base, exponent)` with `cfg = {"base": 3, "exponent": 2}`?
   <details><summary>Answer</summary>`power(**cfg)`, which unpacks the dict into keyword arguments.</details>

5. Why prefer `if basket is None:` over `if not basket:`?
   <details><summary>Answer</summary>An empty list the caller passed is falsy. `not basket` would discard it and create a new list, so the caller's list would never be filled. `is None` only reacts to "no argument given".</details>

## Key takeaways

- Positional arguments fill parameters left to right; keyword arguments fill by name; defaults cover the rest.
- `*args` collects extra positionals into a tuple, `**kwargs` extra keywords into a dict; at a call site the stars unpack.
- Parameters after `*` are keyword-only, which suits flags and options.
- Default values are evaluated once at definition time, so never use a mutable object as a default.
- The idiom is `def f(x, items=None): if items is None: items = []`.
- Arguments are not copies: mutating a list parameter changes the caller's list.
