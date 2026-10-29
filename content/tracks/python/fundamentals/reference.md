---
title: "Fundamentals: syntax reference"
---

## Variables and types

| Task | Syntax | Notes |
|------|--------|-------|
| Bind a name | `x = 5` | The name points at a value; it is not a box holding it |
| Rebind | `x = x + 1` | Right side is evaluated first, then the name is rebound |
| Several at once | `a, b = 1, 2` | Right side is fully evaluated before any name changes |
| Swap | `a, b = b, a` | No temporary variable needed |
| Check a type | `type(x)` | `type(3.0).__name__` gives `'float'` |
| Check membership of a type | `isinstance(x, int)` | Note `isinstance(True, int)` is `True` |

Core built-in types: `int` (`7`), `float` (`7.0`), `str` (`"7"`), `bool` (`True`/`False`), `NoneType` (`None`).

## Arithmetic operators

| Operator | Meaning | Example | Result |
|----------|---------|---------|--------|
| `+` `-` `*` | add, subtract, multiply | `2 + 3 * 4` | `14` |
| `/` | true division, always a float | `7 / 2` | `3.5` |
| `//` | floor division (rounds toward minus infinity) | `-7 // 2` | `-4` |
| `%` | remainder, sign follows the divisor | `-7 % 3` | `2` |
| `**` | power (binds tighter than unary minus on its left) | `2 ** 10` | `1024` |
| `divmod(a, b)` | `(a // b, a % b)` in one step | `divmod(125, 60)` | `(2, 5)` |

Precedence, high to low: `**`, unary `-`, `* / // %`, `+ -`. Use parentheses when in doubt.
Invariant: `a == (a // b) * b + a % b`.

## Type conversion

| Call | Example | Result |
|------|---------|--------|
| `int(x)` | `int("42")`, `int(3.9)` | `42`, `3` (truncates toward zero) |
| `float(x)` | `float("2.5")` | `2.5` |
| `str(x)` | `str(10)` | `'10'` |
| `bool(x)` | `bool("")`, `bool("0")` | `False`, `True` |
| `round(x, n)` | `round(2.675, 2)` | `2.67` (float representation, banker's rounding) |

`int("3.5")` and `int("abc")` raise `ValueError`. `input()` always returns a `str`.

## Input and output

```python
name = input("Name: ")            # prompt text, returns str
age = int(input("Age: "))         # convert before doing arithmetic
print("a", "b", sep="-")          # a-b
print("loading", end="...")       # no newline at the end
print(f"{name} is {age + 1} next year")
```

## f-string format specs

| Spec | Example | Output |
|------|---------|--------|
| `:.2f` | `f"{3.14159:.2f}"` | `3.14` |
| `:05d` | `f"{7:05d}"` | `00007` |
| `:02d` | `f"{5:02d}"` | `05` |
| `:,` | `f"{1234567:,}"` | `1,234,567` |
| `:>6` / `:<6` / `:^6` | `f"{'hi':>6}"` | `    hi` |
| `=` | `f"{x = }"` | `x = 5` (handy for debugging) |
