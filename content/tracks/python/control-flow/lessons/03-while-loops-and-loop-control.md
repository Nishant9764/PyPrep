---
title: while Loops, break, continue and Nesting
summary: Repeat work until a condition changes with while, steer loops with break, continue and for/else, and reason about nested loops and how the inner loop restarts.
minutes: 17
concepts: [while-loops, loop-control, nested-loops]
---

## Why this matters

A `for` loop is perfect when you know what you are looping over: these items, these numbers. But sometimes you do not know in advance how many rounds you need. Keep asking until the password is right. Halve a number until it reaches 1. Read lines until the input runs out. For "repeat until something becomes true" Python gives you `while`.

This lesson also covers the tools for steering a loop from the inside (`break` to leave, `continue` to skip) and for loops inside loops, which is how you handle grids, tables and "every pair" problems. The common failures here are loops that never end, loops that skip the update step, and inner loops that do not behave the way people picture.

## The mental model

A `while` loop is an `if` that jumps back. Python checks the condition; if it is true, it runs the body and then **checks again from the top**; if false, it moves on.

```
        ┌────────────────────────────┐
        ▼                            │
   condition true? ── yes ──▶ run body
        │ no
        ▼
   carry on after the loop
```

Because the condition is re-checked only between rounds, something in the body **must change what the condition depends on**. If nothing changes, the answer to the question never changes either, and you have an infinite loop.

A reliable recipe has three parts, always in this layout:

1. **Set up** the variable the condition uses, before the loop.
2. **Test** it in the `while` line.
3. **Change** it inside the body, in the direction that eventually makes the test false.

## while loops

```python
n = 1
while n <= 3:
    print("round", n)
    n += 1
print("done")
# -> round 1
# -> round 2
# -> round 3
# -> done
```

Trace it: `n` is 1, test passes, print, `n` becomes 2; again for 2 and 3; when `n` becomes 4 the test `4 <= 3` is false, so the loop ends and `done` is printed. Forget `n += 1` and the program prints "round 1" forever.

When the number of rounds depends on the data, `while` shines:

```python
n = 40
steps = 0
while n > 1:
    n = n // 2
    steps += 1
print(steps)    # -> 5   (40 -> 20 -> 10 -> 5 -> 2 -> 1)
```

Here nobody could write `range(...)` in advance, because the number of halvings is what we are computing. Notice `steps` is an accumulator again: set before, updated inside, used after.

Another typical use is validating input:

```python
answer = input("Type yes: ")
while answer != "yes":
    answer = input("Type yes: ")
```

The `input` appears twice: once to set up the variable and once to change it. Python programmers often avoid the duplication with `while True:` plus `break`, described next.

## break, continue and for/else

`break` leaves the nearest loop immediately. `continue` skips the rest of the current round and goes straight to the next one.

```python
for n in [3, 8, 5, 12, 7]:
    if n > 10:
        print("found", n)
        break
# -> found 12     (7 is never looked at)

for n in range(1, 8):
    if n % 2 == 0:
        continue            # skip evens
    print(n, end=" ")
# -> 1 3 5 7
```

Use `break` when you have your answer and need no more work (searching), and `continue` to ignore items that do not qualify so the main code does not need to be indented further.

`while True:` loops forever on purpose, and `break` provides the exit:

```python
total = 0
while True:
    line = input()
    if line == "stop":
        break
    total += int(line)
print(total)
# user types 5, 7, stop
# -> 12
```

### The loop's else clause

A `for` or `while` can have an `else:` block, which runs **only if the loop finished without hitting `break`**. It is the neat way to say "if I searched everything and found nothing":

```python
def has_even(nums):
    for n in nums:
        if n % 2 == 0:
            print("found", n)
            break
    else:
        print("no even number")

has_even([3, 5, 8])    # -> found 8
has_even([3, 5, 7])    # -> no even number
```

Despite the name, loop-`else` is not "else of the last condition". Read it as "no-break". A very common alternative is a flag variable (`found = False`) or an early `return`.

## Nested loops

A loop inside a loop's body is a **nested loop**. The golden rule: for every single round of the **outer** loop, the **inner** loop starts afresh and runs through **all** of its rounds. Total rounds = outer rounds times inner rounds.

```python
for row in range(1, 4):
    for col in range(1, 4):
        print(row * col, end=" ")
    print()
# -> 1 2 3
# -> 2 4 6
# -> 3 6 9
```

Trace: `row` is 1; the inner loop runs col = 1, 2, 3 printing three numbers on one line; then `print()` (which belongs to the outer loop, one indent level out) ends the line; `row` becomes 2 and the inner loop restarts from `col = 1`. Where a statement is indented decides how often it runs: the `print()` at the outer level runs 3 times, the product print runs 9 times.

Triangle patterns make the dependency visible. If the inner range depends on the outer variable, the rows differ:

```python
for i in range(1, 5):
    print("*" * i)
# -> *
# -> **
# -> ***
# -> ****
```

Written with a nested loop: `for i in range(1, 5): for j in range(i): print("*", end="")` plus a `print()` after the inner loop.

Nested loops are also how you examine **every pair** of items. To avoid pairing an item with itself or counting each pair twice, start the inner loop after the outer index:

```python
nums = [2, 7, 4]
for i in range(len(nums)):
    for j in range(i + 1, len(nums)):
        print(nums[i] + nums[j], end=" ")
# -> 9 6 11
```

Mind the cost: two nested loops over n items do about n * n steps. Fine for 1,000 items, painful for a million.

One more catch: `break` only leaves the **innermost** loop. To abandon both, use a `return` inside a function, or a flag the outer loop checks.

## Common mistakes (and how to spot them)

**Mistake 1: forgetting to update the loop variable.**

```python
n = 5
while n > 0:
    print(n)       # prints 5 forever
```

*Symptom:* the program hangs or floods the screen. *Misconception:* "the loop will notice when it is done". The condition is only re-evaluated, never changed, by Python. Add `n -= 1`.

**Mistake 2: updating in the wrong direction.** `while n > 0: n += 1` moves away from the exit. Ask: "does each round bring the condition closer to false?"

**Mistake 3: `continue` before the update in a while loop.**

```python
i = 0
while i < 5:
    if i == 2:
        continue     # jumps back to the test, i is still 2: infinite loop
    i += 1
```

In a `for` loop `continue` is safe because Python advances for you; in a `while` loop you must make sure the update still happens (move `i += 1` above, or restructure).

**Mistake 4: `else` on the wrong level.** An `else` lined up with the `if` inside a loop runs on every non-matching round; lined up with `for`, it runs once at the end if there was no break. Indentation decides.

**Mistake 5: resetting state in the wrong loop.** In nested loops, a row total must be set to 0 in the **outer** body (before the inner loop), not outside both loops and not inside the inner loop:

```python
for row in grid:
    row_sum = 0           # once per row
    for value in row:
        row_sum += value
```

**Mistake 6: expecting `break` to exit all loops.** It exits only the innermost one.

**Mistake 7: off-by-one in the while test.** `while i < len(xs)` versus `<=`; with `<=` the last round indexes past the end and raises `IndexError`.

## Check yourself

1. How many times does the body run? `i = 10`, `while i > 0: i -= 3`

<details><summary>Answer</summary>4 times: i goes 10, 7, 4, 1 (all > 0), then becomes -2 and the test fails.</details>

2. What is printed by `for n in range(5): if n == 3: break` then `print(n)` after the loop?

<details><summary>Answer</summary>`3`. The loop variable keeps the value it had when `break` fired.</details>

3. When does a loop's `else` block run?

<details><summary>Answer</summary>Only when the loop ends normally, meaning the condition became false or the items ran out, without `break`.</details>

4. How many times does `print("x")` run? `for a in range(3): for b in range(4): print("x")`

<details><summary>Answer</summary>12 times: for each of the 3 outer rounds, the inner loop runs all 4 times.</details>

5. This loop never ends. Why, and fix it: `i = 0` / `while i < 5:` / `if i % 2 == 0: continue` / `i += 1`

<details><summary>Answer</summary>When `i` is 0 (even) `continue` jumps back before `i += 1`, so `i` stays 0 forever. Increment before the check, or use a `for i in range(5)` loop.</details>

## Key takeaways

- `while` re-checks its condition before every round; the body must **change** something that the condition depends on.
- Use `for` when you know the items, `while` when you repeat until something happens.
- `break` leaves the nearest loop, `continue` skips to the next round, and loop-`else` runs only when no `break` happened.
- In a `while` loop, never let `continue` jump over the update step.
- In nested loops the inner loop restarts completely for every round of the outer loop; where you indent a statement controls how often it runs.
- Reset per-row accumulators in the outer loop, and remember `break` only exits the innermost loop.
