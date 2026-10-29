---
title: "Control flow: syntax reference"
---

## Conditionals

```python
if score >= 90:
    grade = "A"
elif score >= 80:        # only checked if the first test was False
    grade = "B"
else:
    grade = "C"

label = "even" if n % 2 == 0 else "odd"     # conditional expression
```

Order matters: the first true branch wins, so test the most specific condition first.

## Boolean logic

| Expression | Meaning | Notes |
|-----------|---------|-------|
| `a and b` | both true | Returns `a` if `a` is falsy, otherwise `b` (short-circuit) |
| `a or b` | at least one true | Returns `a` if `a` is truthy, otherwise `b` |
| `not a` | negation | Always returns a `bool` |
| `0 < x < 10` | chained comparison | Same as `0 < x and x < 10` |
| `x in (1, 2, 3)` | membership | Shorter than three `==` tests joined by `or` |

Falsy values: `False`, `None`, `0`, `0.0`, `""`, `[]`, `{}`, `()`, `set()`. Everything else is truthy, including `"0"` and `"False"`.

## for loops and range

| Goal | Code | Values produced |
|------|------|-----------------|
| Items of a sequence | `for ch in "abc":` | `a b c` |
| Count `n` times | `for i in range(n):` | `0 .. n-1` |
| Start and stop | `range(2, 6)` | `2 3 4 5` (stop excluded) |
| Step | `range(0, 10, 3)` | `0 3 6 9` |
| Count down | `range(5, 0, -1)` | `5 4 3 2 1` |
| Index and item | `for i, x in enumerate(xs):` | pairs `(0, x0), (1, x1) ...` |
| Two sequences | `for a, b in zip(xs, ys):` | stops at the shorter one |
| Backwards | `for x in reversed(xs):` | last item first |

`len(range(a, b))` is `b - a` when `a < b`. A negative step needs `start > stop`, otherwise the range is empty.

## Accumulator patterns

```python
total = 0                       # initialise BEFORE the loop
for x in xs:
    total += x                  # update inside

best = None
for x in xs:
    if best is None or x > best:
        best = x
```

## while, break, continue, else

```python
while n > 1:                    # condition re-checked each pass
    n //= 2                     # something inside must change it

for x in xs:
    if x < 0:
        break                   # leave the loop now
    if x == 0:
        continue                # skip to the next item
else:
    print("no negative found")  # runs only if the loop was NOT broken
```

## Nested loops

```python
for row in range(3):            # outer: runs 3 times
    for col in range(4):        # inner: restarts from the beginning each time
        print(row * col, end=" ")
    print()                     # newline after each finished row
```

Total inner iterations = outer count times inner count. `break` leaves only the innermost loop.
