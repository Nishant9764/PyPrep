---
title: Conditionals and Boolean Logic
summary: Make a program choose between paths with if/elif/else, combine conditions with and/or/not, and predict truthiness and short-circuit behaviour.
minutes: 16
concepts: [conditionals, boolean-logic]
---

## Why this matters

Up to now your programs ran straight down the page, every line, every time. Real programs have to react: if the password is wrong, show an error; if the basket is empty, skip the payment; if the number is divisible by 3, print "Fizz". The tool for that is the **conditional**, and the language it speaks is **boolean logic**: questions whose answer is `True` or `False`.

Two things go wrong for beginners. First, an `if/elif/else` chain where the *order* of the checks gives the wrong answer even though every individual check looks right. Second, conditions built with `and`, `or` and `not` that do not mean what the English sentence meant. Both are about *how Python reads your condition*, and that is what this lesson makes concrete.

## The mental model

Picture a railway junction. The train (your program) arrives at the junction, a signal asks a question, and the train is routed down exactly **one** track. After the branch, the tracks rejoin and the train continues.

```
            ┌── condition A true? ──▶ [block A] ──┐
 arrive ──▶ ├── elif B true? ───────▶ [block B] ──┼──▶ continue
            └── else ───────────────▶ [block C] ──┘
```

The decisive rule: Python checks the conditions **from top to bottom and stops at the first one that is true**. It runs that block only, then skips all the remaining `elif` and `else` blocks, whether or not they would also have been true. This is why the order of conditions matters.

## if, elif, else

```python
temperature = 28

if temperature >= 30:
    print("hot")
elif temperature >= 20:
    print("warm")
else:
    print("cool")
# -> warm
```

Three things to notice:

- Each condition ends with a colon.
- The block belongs to the condition because it is **indented** (4 spaces is the convention). Indentation is not decoration in Python; it is the syntax.
- `elif` means "else, if": it is only looked at when everything above was false. `else` has no condition and catches the rest.

`elif` and `else` are optional. A plain `if` with nothing else simply does nothing when false.

### Order matters

Here is the classic ordering bug. We want to grade scores: 90 and above is "A", 80 and above is "B", otherwise "C".

```python
score = 95
if score >= 80:
    grade = "B"
elif score >= 90:
    grade = "A"
else:
    grade = "C"
print(grade)   # -> B   (wrong!)
```

95 is `>= 80`, so the first branch wins and `elif score >= 90` is never even asked. Put the **most specific** (strictest) condition first:

```python
if score >= 90:
    grade = "A"
elif score >= 80:
    grade = "B"
else:
    grade = "C"
```

Now you can also read each `elif` as having the negation of everything above built in: reaching `elif score >= 80` means `score < 90` already. You never need to write `elif 80 <= score < 90`.

### Separate ifs are not an elif chain

```python
n = 15
if n % 3 == 0:
    print("Fizz")
if n % 5 == 0:
    print("Buzz")
# -> Fizz
# -> Buzz
```

Two separate `if` statements are two independent questions, so both can run. An `elif` would have stopped after "Fizz". Choose `if/elif` when the cases are **mutually exclusive**, and separate `if`s when several can apply.

### Early returns

Inside a function, `return` leaves immediately, which flattens nested logic:

```python
def sign(n):
    if n < 0:
        return "negative"
    if n == 0:
        return "zero"
    return "positive"

print(sign(-4), sign(0), sign(9))   # -> negative zero positive
```

No `else` is needed: if the first `if` fired, the function is already over.

## Boolean logic

A comparison (`==`, `!=`, `<`, `<=`, `>`, `>=`) produces a bool. Combine bools with:

| Operator | Meaning | `True`/`False` rule |
|----------|---------|---------------------|
| `and` | both | true only if both are true |
| `or` | either | true if at least one is true |
| `not` | opposite | flips the value |

```python
age = 25
has_ticket = True
print(age >= 18 and has_ticket)      # -> True
print(age < 18 or not has_ticket)    # -> False
```

Precedence: `not` first, then `and`, then `or`. So `a or b and c` means `a or (b and c)`. Use brackets when mixing.

### Comparison chaining

Python lets you write maths-style ranges:

```python
x = 7
print(1 <= x <= 10)        # -> True
print(1 <= x and x <= 10)  # same thing
```

### Truthiness

Anywhere a condition is expected, Python accepts any value and treats it as true or false. **Falsy** values: `False`, `None`, `0`, `0.0`, `""` (empty string), `[]`, `{}`, `()`, `set()`. Everything else is **truthy**.

```python
name = ""
if name:
    print("hello", name)
else:
    print("no name given")     # -> no name given
```

`if items:` is the idiomatic way to say "if the list is not empty".

### Short-circuiting and what `and`/`or` return

`and` and `or` stop as soon as the answer is known, and they return **one of their operands**, not necessarily `True` or `False`:

```python
print(0 and 5)          # -> 0       first operand is falsy, stop and return it
print(3 and 5)          # -> 5       first is truthy, so the answer is the second
print("" or "default")  # -> default first is falsy, so take the second
print("hi" or "default")# -> hi
```

Short-circuiting is also a safety tool: in `len(s) > 0 and s[0] == "a"` the second check never runs on an empty string, so no `IndexError`.

## Common mistakes (and how to spot them)

**Mistake 1: conditions in the wrong order.** Shown above: the symptom is the wrong branch for values near a boundary, and a branch that never runs. *Misconception:* "Python picks the best-matching branch". It picks the first true one.

**Mistake 2: `or` with a bare value.**

```python
color = "green"
if color == "red" or "blue":
    print("primary")      # prints for ANY color
```

`"blue"` on its own is a non-empty string, which is truthy, so the condition is always true. Write `color == "red" or color == "blue"`, or `color in ("red", "blue")`.

**Mistake 3: `=` instead of `==`.** `if x = 3:` is a `SyntaxError`. `=` assigns, `==` compares.

**Mistake 4: comparing a bool to True.** `if done == True:` works but is noisy; write `if done:`. Worse, `if x == "yes" or "y"` repeats mistake 2.

**Mistake 5: separate `if`s where `elif` was needed.**

```python
n = 5
if n > 0:
    label = "positive"
if n > 3:
    label = "big"
else:
    label = "small"   # overwrites "positive" when n <= 3 only; the logic is muddled
```

*Symptom:* a later `else` clobbering a value set earlier, because it belongs only to the second `if`. Use one chain.

**Mistake 6: wrong negation (De Morgan).** "Not (a and b)" is `(not a) or (not b)`, not `(not a) and (not b)`. Quick check: `not (x > 0 and y > 0)` means at least one is non-positive.

**Mistake 7: bad indentation.** An `else` aligned with the wrong `if`, or a statement meant to run always sitting inside the block. The symptom is a line that runs only sometimes.

## Check yourself

1. With `x = 10`, which prints: `if x > 5: ... elif x > 8: ... else: ...`?

<details><summary>Answer</summary>The first block only. 10 > 5 is true, so Python skips the `elif` even though `x > 8` is also true. Reorder to put `x > 8` first.</details>

2. What does `print(0 or "" or "fallback")` output?

<details><summary>Answer</summary>`fallback`. `0` and `""` are falsy, so `or` keeps looking and returns the last operand.</details>

3. Why is `if day == "sat" or "sun":` always true?

<details><summary>Answer</summary>It parses as `(day == "sat") or ("sun")`. The non-empty string `"sun"` is truthy. Write `day == "sat" or day == "sun"` or `day in ("sat", "sun")`.</details>

4. Rewrite `not (a >= 1 and a <= 9)` without `not`.

<details><summary>Answer</summary>`a < 1 or a > 9`. Negating `and` flips it to `or` and negates each part.</details>

5. Which values are falsy: `0`, `"0"`, `[]`, `[0]`, `None`?

<details><summary>Answer</summary>`0`, `[]` and `None`. `"0"` is a non-empty string and `[0]` is a non-empty list, so both are truthy.</details>

## Key takeaways

- An `if/elif/else` chain runs **exactly one** block: the first whose condition is true. Put the strictest condition first.
- Use `elif` for mutually exclusive cases and separate `if`s when several may apply.
- `and`, `or`, `not` bind in that order of strength (`not` strongest); use brackets for mixed conditions.
- Empty or zero values (`0`, `""`, `[]`, `None`) are falsy; everything else is truthy.
- `and`/`or` short-circuit and return an operand, which makes guards like `s and s[0]` safe.
- `x == "a" or "b"` is a bug; compare each time or use `in`.
