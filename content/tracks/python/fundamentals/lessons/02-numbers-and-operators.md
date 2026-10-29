---
title: Numbers and Operators
summary: Use Python's arithmetic operators correctly, choose between /, // and %, predict whether a result is an int or a float, and read expressions according to precedence.
minutes: 16
concepts: [numeric-operators]
---

## Why this matters

Even programs that look like they have nothing to do with maths are full of arithmetic: which page of results a row belongs on, whether a year is a leap year, how many full boxes you can fill, what time it is after adding 90 minutes. Python has one operator for each of these needs, and beginners usually trip over just two or three of them: the difference between `/` and `//`, what `%` is for, and the order in which an expression is evaluated.

Learn the operators as answers to questions ("how many whole times does it fit?", "what is left over?") rather than as symbols to memorise, and the rest follows.

## The mental model

Think of an **expression** as a question that Python answers with one value. `7 + 3` is the question "what is seven plus three?" and the answer, a brand-new value, is `10`. Operators never change their inputs; they produce a new value, which you can then label with a name:

```
 7  +  3      ──▶   10   ──▶ total = 10
 operand operator operand      result
```

Two things decide the answer: **what the operator does** and **the type of the result**. Integers (`int`) have no decimal part; floats (`float`) do. Python follows a simple rule: if either side is a float, the answer is a float; otherwise an `int` stays an `int`, with one exception, true division, which always gives a float.

## The seven arithmetic operators

```python
print(7 + 3)    # -> 10     addition
print(7 - 3)    # -> 4      subtraction
print(7 * 3)    # -> 21     multiplication
print(7 / 2)    # -> 3.5    true division, ALWAYS a float
print(7 // 2)   # -> 3      floor division: how many whole times 2 fits in 7
print(7 % 2)    # -> 1      remainder: what is left after those whole times
print(2 ** 5)   # -> 32     power
```

Focus on the three division-like operators, because they are different questions:

| Question | Operator | `17` and `5` |
|----------|----------|-------------|
| What is the exact quotient? | `/` | `3.4` |
| How many whole 5s fit into 17? | `//` | `3` |
| What is left over? | `%` | `2` |

The three are tied together by the identity `17 == (17 // 5) * 5 + (17 % 5)`, which is 15 + 2. Python gives you both halves at once with `divmod`:

```python
q, r = divmod(17, 5)
print(q, r)     # -> 3 2
```

### Where `//` and `%` are useful

Anything with "groups of" or "cycles" in it:

```python
minutes = 135
hours = minutes // 60
left = minutes % 60
print(hours, "h", left, "min")   # -> 2 h 15 min

n = 38
print(n % 2 == 0)                 # -> True   even numbers have remainder 0
print((5 + 3) % 7)                # -> 1      wrap around a 7-day week
```

`n % k == 0` is the standard test for "n is divisible by k". The wrap-around trick `(position + steps) % size` appears in circular buffers, clocks and ciphers.

### Negative numbers

`//` rounds **down** (towards negative infinity), not towards zero. This surprises people:

```python
print(7 // 2)     # -> 3
print(-7 // 2)    # -> -4    (-3.5 rounded down is -4, not -3)
print(-7 % 2)     # -> 1     because (-4) * 2 + 1 == -7
```

The rule that never fails: `a == (a // b) * b + (a % b)`, and the result of `%` takes the sign of the right operand. If you only ever use positive numbers you can ignore this, but be aware of it when negatives appear.

## int versus float

```python
print(6 / 3)      # -> 2.0    still a float, even though it is a whole number
print(6 // 3)     # -> 2      int
print(6.0 // 4)   # -> 1.0    one float operand makes the result a float
print(2 ** -1)    # -> 0.5    negative exponent gives a float
print(10 * 1.5)   # -> 15.0
```

If you need a whole number from `/`, use `//` or wrap in `int()`. Do not assume `6 / 3` is `2`: it is `2.0`, and `2.0 == 2` is `True` but `print` shows the decimal.

Floats are stored in binary, so some decimals cannot be represented exactly:

```python
print(0.1 + 0.2)           # -> 0.30000000000000004
print(0.1 + 0.2 == 0.3)    # -> False
print(round(0.1 + 0.2, 2)) # -> 0.3
```

This is not a Python bug; every language using standard floating-point does the same. The practical rule is to compare floats with a tolerance (`abs(a - b) < 1e-9`) or `round()` first, never with `==`. Use `int` whenever you are counting things (cents instead of dollars is a classic trick).

Useful helpers: `abs(-4)` is `4`, `round(2.567, 2)` is `2.57`, `min(3, 9)` is `3`, `max(3, 9)` is `9`. Note that `round(2.5)` is `2`, since Python rounds exact halves to the nearest even number.

## Precedence: who goes first

Like in school maths, Python does some operators before others. From highest to lowest:

1. `**` (power)
2. unary minus (`-x`)
3. `*`, `/`, `//`, `%` (left to right)
4. `+`, `-` (left to right)
5. comparisons (`<`, `==`, ...)

```python
print(2 + 3 * 4)       # -> 14    multiplication first
print((2 + 3) * 4)     # -> 20    brackets override everything
print(2 ** 3 ** 2)     # -> 512   power is right-to-left: 2 ** (3 ** 2)
print(-3 ** 2)         # -> -9    power binds tighter than the minus: -(3 ** 2)
print(10 - 4 - 3)      # -> 3     left to right: (10 - 4) - 3
print(100 / 10 * 5)    # -> 50.0  left to right: (100 / 10) * 5
```

When in doubt, add brackets. They cost nothing and tell the reader what you meant.

### Shortcut assignment

`x = x + 1` can be written `x += 1`; likewise `-=`, `*=`, `/=`, `//=`, `%=`, `**=`. They are pure convenience, and still make a new value and re-label the name.

```python
total = 10
total += 5
total *= 2
print(total)   # -> 30
```

### A realistic example

Splitting a bill and rounding up to whole coins, using only the operators above:

```python
bill_cents = 4730
people = 4
share = bill_cents // people          # 1182 cents each
leftover = bill_cents % people        # 2 cents nobody can split
print(share, leftover)                # -> 1182 2
```

## Common mistakes (and how to spot them)

**Mistake 1: using `/` and expecting an integer.**

```python
pages = 10 / 2
print(list(range(pages)))
# TypeError: 'float' object cannot be interpreted as an integer
```

*Symptom:* a `float` turning up where an `int` is required, or output like `5.0`. *Misconception:* `/` is "integer division". It is true division; use `//` when you want a whole number.

**Mistake 2: forgetting precedence.**

```python
a, b = 10, 20
average = a + b / 2
print(average)   # -> 20.0   not 15.0
```

*Symptom:* a plausible but wrong number. Division runs before addition, so this is `a + (b / 2)`. Write `(a + b) / 2`.

**Mistake 3: confusing `%` with percent.** `50 % 200` is `50` (the remainder), not a percentage. For a percentage multiply: `part / total * 100`.

**Mistake 4: comparing floats with `==`.** `0.1 + 0.2 == 0.3` is `False`. The symptom is a condition that "should" be true but is not; the cause is tiny representation error.

**Mistake 5: `^` for power.** `2 ^ 3` is valid Python but means bitwise XOR and gives `1`. Power is `**`.

**Mistake 6: off-by-sign with `//` on negatives.** `-7 // 2` is `-4`, not `-3`. If you want truncation toward zero, use `int(-7 / 2)`.

## Check yourself

1. What do `17 // 5`, `17 % 5` and `17 / 5` give?

<details><summary>Answer</summary>`3`, `2` and `3.4`. The first two are an int quotient and remainder; the last is true division and is a float.</details>

2. What is `2 + 3 * 4 ** 2`?

<details><summary>Answer</summary>`50`. Power first (4 ** 2 = 16), then multiplication (3 * 16 = 48), then addition (2 + 48).</details>

3. You have 200 minutes. Write expressions for the full hours and the remaining minutes.

<details><summary>Answer</summary>`200 // 60` gives 3 hours, and `200 % 60` gives 20 minutes. Or `divmod(200, 60)` gives `(3, 20)`.</details>

4. Is `8 / 2` equal to `4`? What type is it?

<details><summary>Answer</summary>`8 / 2 == 4` is `True` because 4.0 equals 4, but the type is `float` (`4.0`). `8 // 2` would be the int `4`.</details>

5. How do you test that a number `n` is a multiple of 7?

<details><summary>Answer</summary>`n % 7 == 0`. A remainder of zero means 7 fits in n a whole number of times.</details>

## Key takeaways

- `/` is exact division and always returns a float; `//` is floor division (a whole number of times); `%` is the remainder. `divmod(a, b)` gives both.
- `a == (a // b) * b + a % b` always holds, even for negatives, where `//` rounds down.
- `n % k == 0` tests divisibility, and `(i + step) % size` wraps around a cycle.
- Result type: any float operand gives a float; `/` and `**` with negative exponent always give float.
- Precedence is `**`, then `* / // %`, then `+ -`. Use brackets whenever the order is not obvious.
- Never compare floats with `==`; use `round()` or a tolerance.
