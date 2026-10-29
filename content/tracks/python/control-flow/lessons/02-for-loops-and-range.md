---
title: for Loops, range() and Direction
summary: Write for loops confidently, choose the right start, stop and step in range(), count in either direction, and build totals with the accumulator pattern, while telling apart the three different ways such loops go wrong.
minutes: 20
concepts: [for-loops, off-by-one, iteration-direction, accumulator-pattern]
---

## Why this matters

A computer is useful because it can repeat a task a million times without getting bored. The `for` loop is how you ask for that: "do this once for every item". Totals, searches, tables, countdowns, string processing and almost every interview problem are built on it.

Loops are also where beginners meet their first *quiet* bugs: the program runs, prints something, and the answer is simply wrong. The tricky part is that **three different mistakes produce wrong answers that look alike**: stopping one step too soon or too late (off-by-one), walking the wrong way (direction), and mismanaging the running total (the accumulator). This lesson teaches each separately, then shows what each one looks like when it goes wrong, so you can diagnose rather than guess.

## The mental model

A `for` loop has a *loop variable* and a *source of items*. Python repeatedly does two things: take the next item from the source, stick the loop variable's label on it, then run the indented body.

```
 source:   [ 4 ]  [ 9 ]  [ 2 ]
              │      │      │
 loop var x ──┘      │      │      round 1: x → 4, run body
 loop var x ─────────┘      │      round 2: x → 9, run body
 loop var x ────────────────┘      round 3: x → 2, run body
                                   source exhausted → loop ends
```

The loop variable is just a name that gets re-pointed at each item. Nothing else in the loop changes by itself: any other variable (a total, a count) stays as it is unless the body updates it.

```python
for letter in "cat":
    print(letter)
# -> c
# -> a
# -> t
```

You can loop over anything that yields items: strings, lists, ranges, dictionary keys. Add `enumerate` when you need positions too, and `zip` to walk two sequences together:

```python
for i, ch in enumerate("hey"):
    print(i, ch)          # -> 0 h   then 1 e   then 2 y

for a, b in zip([1, 2, 3], [10, 20, 30]):
    print(a + b)          # -> 11   22   33
```

## range(): a sequence of numbers on demand

When you want to repeat something a number of times, or you need index numbers, use `range`. It has three forms:

```python
list(range(5))          # -> [0, 1, 2, 3, 4]        range(stop)
list(range(2, 6))       # -> [2, 3, 4, 5]           range(start, stop)
list(range(0, 10, 3))   # -> [0, 3, 6, 9]           range(start, stop, step)
```

### (a) Start, stop, step and the exclusive stop

Read `range(start, stop, step)` as: "begin at `start`, keep going in jumps of `step`, and stop **before** reaching `stop`". The start is included; the stop is **never** included.

```python
print(list(range(1, 5)))    # -> [1, 2, 3, 4]    no 5!
```

Why exclusive? Because it makes counting nice: `range(n)` gives exactly `n` numbers (0 to n-1), and `range(a, b)` gives exactly `b - a` numbers. Chained ranges join without overlap: `range(0, 5)` then `range(5, 10)`.

The consequence is the famous **off-by-one trap**. To include the number 10 you must write `range(1, 11)`:

```python
for n in range(1, 10):     # prints 1..9, the 10 is missing
    print(n, end=" ")
# -> 1 2 3 4 5 6 7 8 9
for n in range(1, 11):
    print(n, end=" ")
# -> 1 2 3 4 5 6 7 8 9 10
```

*What an off-by-one failure looks like:* the result is **almost right**, differing by exactly one item. A sum from 1 to 10 comes out 45 instead of 55 (the 10 is missing, so the error equals the last number). A pattern has one row too few. A loop that handles `i` and `i + 1` crashes with `IndexError` at the end because it ran one step too far. If your answer is wrong by *a single element at an end*, check the stop value first.

A second flavour is the "fence-post" error: 5 fence posts have only 4 gaps between them. Looping over pairs of neighbours in a list of length n has only `n - 1` pairs, so use `range(len(items) - 1)`, not `range(len(items))`.

### (b) Direction and the sign of the step

The default step is `+1`, so ranges count **up**. If `start` is already greater than `stop` and the step is positive, there is nothing to produce:

```python
print(list(range(5, 0)))    # -> []     empty! it only goes up, and 5 is already past 0
```

To count **down**, give a **negative step**. The sign of the step is the direction, and the "stop before reaching" rule still holds, now in the downward direction:

```python
print(list(range(5, 0, -1)))     # -> [5, 4, 3, 2, 1]    stops before 0
print(list(range(5, -1, -1)))    # -> [5, 4, 3, 2, 1, 0] stop is -1 to include 0
print(list(range(10, 0, -3)))    # -> [10, 7, 4, 1]
```

The most common real use is visiting every index of a sequence from the last to the first. The last index of a sequence of length `n` is `n - 1`, and to include index 0 you must stop at `-1`:

```python
word = "abc"
for i in range(len(word) - 1, -1, -1):
    print(i, word[i])
# -> 2 c
# -> 1 b
# -> 0 a
```

Read the three arguments aloud: "start at the last index, stop before -1, move by -1". When you do not need the indexes, Python has a simpler way: `reversed()` hands you the items in reverse order without any arithmetic:

```python
for ch in reversed("abc"):
    print(ch)          # -> c   b   a
for n in reversed(range(1, 4)):
    print(n)           # -> 3   2   1
```

*What a direction failure looks like:* **the loop body never runs** (empty range, so the result is the starting value such as `0` or `""`), or the output is the right items in the **reverse order**, or you get a "right except mirrored" result. If your answer is completely empty or backwards (not just off by one item), check the step's sign and the order of start and stop.

### (c) The accumulator pattern

Most loops exist to produce *one result* from many items: a sum, a count, a maximum, a longer string. The pattern has three parts: **initialise** a variable *before* the loop, **update** it inside the loop on every round, **use** it *after* the loop.

```python
total = 0                      # 1. initialise (the "identity": adding nothing)
for n in [4, 9, 2]:
    total = total + n          # 2. update each round
print(total)                   # 3. use after the loop -> 15
```

A good starting value is the one that leaves the result unchanged: `0` for a sum, `1` for a product, `""` for building text, `[]` for building a list, `0` for a count.

```python
product = 1
for n in range(1, 6):
    product *= n
print(product)                 # -> 120

evens = []
for n in range(10):
    if n % 2 == 0:
        evens.append(n)
print(evens)                   # -> [0, 2, 4, 6, 8]
```

*What an accumulator failure looks like:* the answer is **not close, but strange**. If you initialise **inside** the loop, the total is reset each round, so you get only the last item's contribution:

```python
for n in [4, 9, 2]:
    total = 0
    total = total + n
print(total)                   # -> 2   (only the last item)
```

If you forget to initialise, you get `NameError`. If you start a product at `0` you always get `0`. If you `return` or `print` inside the loop instead of after, you get the first partial result. If you start a maximum at `0`, a list of all-negative numbers wrongly returns `0`.

### Telling the three apart

| Symptom | Likely culprit |
|---------|----------------|
| Right except a single item missing or extra at an end; `IndexError` at the edge | **off-by-one**: check `stop` |
| Empty result, or correct items but reversed/mirrored | **direction**: check the sign of `step` and start/stop order |
| Result equals only the last (or first) item's contribution; resets; `NameError`; always 0 | **accumulator**: check where it is initialised and updated |

## Common mistakes (and how to spot them)

**Mistake 1: `range(n)` when you needed 1 to n.** Gives 0 to n-1. Symptom: first number is 0, last is missing. Use `range(1, n + 1)`.

**Mistake 2: modifying the loop variable and expecting it to affect the loop.**

```python
for i in range(3):
    i = i + 10      # rebinding the name; next round Python re-points i anyway
```

The loop gets the next value from the source regardless of what you did to `i`.

**Mistake 3: counting down with `range(n, 0)`.** Empty. Add the step: `range(n, 0, -1)`.

**Mistake 4: `range(n - 1, 0, -1)` forgetting index 0.** It stops *before* 0, so the first element is skipped.

**Mistake 5: resetting the accumulator inside the loop** (shown above).

**Mistake 6: printing instead of accumulating.** Printing each item inside the loop shows numbers but leaves no total to use later.

**Mistake 7: looping with an index when the items are enough.** `for i in range(len(xs)): print(xs[i])` works but `for x in xs:` is shorter and cannot go out of bounds. Reach for indexes only when you need positions (or use `enumerate`).

**Mistake 8: changing a list while looping over it.** Removing items shifts the rest and the loop skips elements. Loop over a copy (`for x in xs[:]`) or build a new list.

## Check yourself

1. What does `list(range(3, 8))` give, and how many items?

<details><summary>Answer</summary>`[3, 4, 5, 6, 7]`, which is `8 - 3 = 5` items. The stop (8) is excluded.</details>

2. Write a `range` that produces `[10, 8, 6, 4, 2]`.

<details><summary>Answer</summary>`range(10, 0, -2)`. It counts down by 2 and stops before 0. (`range(10, 1, -2)` also works.)</details>

3. This should print the sum of 1..5 but prints 5. Why? `for n in range(1, 6): total = 0; total += n`

<details><summary>Answer</summary>The accumulator is re-initialised inside the loop each round, so only the last value (5) survives. Move `total = 0` before the loop to get 15.</details>

4. Your loop over `range(len(xs))` compares `xs[i]` with `xs[i + 1]` and crashes with `IndexError`. Fix it.

<details><summary>Answer</summary>The last index has no right neighbour. Use `range(len(xs) - 1)`, since n items have n - 1 neighbouring pairs.</details>

5. Name two ways to visit the characters of `s` from last to first.

<details><summary>Answer</summary>`for ch in reversed(s):` or `for i in range(len(s) - 1, -1, -1): s[i]`. (A slice `s[::-1]` also works.)</details>

## Key takeaways

- A `for` loop re-points the loop variable at each item of a source until the source is exhausted.
- `range(start, stop, step)` includes `start` and **excludes `stop`**. For 1..n write `range(1, n + 1)`. Off-by-one errors are wrong by exactly one item at an end.
- The **sign of the step is the direction**. Counting down needs a negative step, and to include 0 the stop must be `-1`. `reversed()` avoids the arithmetic.
- Accumulator pattern: initialise **before** the loop, update **inside**, use **after**. Choose a starting value that does not disturb the result.
- Diagnose by symptom: one item off means bounds, empty or mirrored means direction, last-item-only or reset means the accumulator.
- Prefer looping over items directly and use `enumerate` or `zip` when you need positions or pairs.
