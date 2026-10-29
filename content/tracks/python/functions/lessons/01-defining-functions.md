---
title: Defining Functions and Return Values
summary: Define and call your own functions, and reliably tell the difference between a function that prints something and one that hands a value back.
minutes: 18
concepts: [function-basics, return-values]
---

## Why this matters

Every program longer than a few lines becomes unreadable if it is one long script. A function lets you give a name to a piece of work, write it once, and use it from many places. Functions are also the unit you will be tested on: every interview question asks you to "write a function that ...", and every test in PyPrep calls your function and looks at what comes back.

That last phrase hides the single most common beginner problem in Python: confusing **printing** a result with **returning** it. A learner who prints the answer sees the right thing on screen and still fails the tests, because the caller never received a value. This lesson builds the mental model that makes the difference obvious.

## The mental model

Think of a function definition as a **recipe card** and a function call as **someone cooking from it**.

`def` does not run anything. It builds a function object, stores the recipe in it, and binds a name to it. Only when you write `name(...)` does Python do work:

```
call site                      new frame (a fresh workspace)
---------                      -----------------------------
total = add(2, 3)   ------->   a = 2, b = 3        (parameters become local names)
                               result = a + b       (the body runs)
total = 5           <-------   return result        (value is handed back, frame is thrown away)
```

Three facts to hold on to:

1. Each call gets its **own new frame**: a private set of local names. Names created inside the function vanish when it finishes.
2. **Parameters** are the names in the definition (`a`, `b`). **Arguments** are the values you pass in the call (`2`, `3`). Python binds each parameter to its argument.
3. The call is an **expression**. It evaluates to whatever the function returns, so it can sit inside bigger expressions: `add(2, 3) * 10`.

## Defining and calling

The simplest function takes nothing and returns nothing useful:

```python
def greet():
    print("Hello!")

greet()          # -> Hello!
greet()          # -> Hello!
```

Defining `greet` printed nothing; each call ran the body. Now add a parameter so the function can work on different data:

```python
def greet(name):
    print("Hello,", name)

greet("Ada")     # -> Hello, Ada
greet("Linus")   # -> Hello, Linus
```

A **docstring** (a string literal as the first statement) documents what the function does. Tools and `help()` read it:

```python
def area(width, height):
    """Return the area of a rectangle."""
    return width * height

print(area(3, 4))        # -> 12
print(area.__doc__)      # -> Return the area of a rectangle.
```

Indentation defines the body. Everything indented under `def` belongs to the function; the first unindented line is back in the main program. Calling a function with the wrong number of arguments is an immediate error: `area(3)` raises `TypeError: area() missing 1 required positional argument: 'height'`.

## return versus print

`print` is an action that shows text to a human. `return` is how a function hands a **value** back to the code that called it. They are completely different tools:

```python
def add_print(a, b):
    print(a + b)

def add_return(a, b):
    return a + b

x = add_print(2, 3)      # -> 5      (printed as a side effect)
y = add_return(2, 3)     # nothing printed
print(x)                 # -> None
print(y)                 # -> 5
print(add_return(2, 3) * 10)   # -> 50
```

`add_print` shows the right digits but gives the caller nothing to work with: `x` holds `None`, and `add_print(2, 3) * 10` would crash. `add_return` produces a value that can be stored, compared, tested, or passed to another function. As a rule: **functions that compute something should return it; let the caller decide whether to print it.** Printing is for the very last step of a program.

`return` also **ends the function immediately**. Any line after it in that path never runs. This is what makes early returns so useful:

```python
def sign(n):
    if n < 0:
        return "negative"
    if n == 0:
        return "zero"
    return "positive"

print(sign(-4))   # -> negative
print(sign(0))    # -> zero
print(sign(9))    # -> positive
```

No `else` is needed: if the first `if` fires, the function has already left.

## The implicit None

If execution reaches the end of a function without hitting a `return` (or hits a bare `return`), Python returns `None` for you. `None` is the value that means "nothing here". This is the source of the infamous bug:

```python
def double_all(numbers):
    result = []
    for n in numbers:
        result.append(n * 2)
    # forgot: return result

print(double_all([1, 2, 3]))   # -> None
```

The loop worked perfectly; the answer was thrown away with the frame. A related trap is a `return` that is only reachable on some paths:

```python
def first_even(numbers):
    for n in numbers:
        if n % 2 == 0:
            return n

print(first_even([1, 3, 4]))   # -> 4
print(first_even([1, 3, 5]))   # -> None  (loop ended, fell off the end)
```

Sometimes `None` is the right answer for "not found", but make that a decision, not an accident. Writing `return None` explicitly at the end documents the intent.

## Returning several values

A function can only return one object, but that object can be a tuple, and tuples unpack neatly:

```python
def min_max(values):
    return min(values), max(values)      # builds the tuple (min, max)

low, high = min_max([4, 9, 1, 7])
print(low, high)                         # -> 1 9
print(min_max([4, 9, 1, 7]))             # -> (1, 9)
```

The commas make the tuple; the parentheses are optional. The caller can unpack it into separate names or keep the tuple whole.

## Common mistakes (and how to spot them)

**Printing instead of returning.** Symptom: the screen shows the right answer, but the caller gets `None`, or a test says `expected 12, got None`. Misconception: "printing is how a function gives its answer." In reality `print` talks to the human, `return` talks to the calling code.

**Forgetting to return after a loop.** Symptom: `None` appears where a list or number should be. Check the last line of the function: does every path end in a `return`?

**Returning inside the loop too early.** 

```python
def total(numbers):
    s = 0
    for n in numbers:
        s += n
        return s          # wrong: leaves after the first item

print(total([1, 2, 3]))   # -> 1
```

The misconception is that `return` just "reports the current value". It actually exits the function. Dedent it so it runs after the loop finishes.

**Calling without parentheses.** `greet` is the function object; `greet()` runs it. Writing `x = area` stores the function itself, and `print(x)` shows something like `<function area at 0x...>`.

**Expecting variables to survive.** After `add_return(2, 3)`, the names `a` and `b` no longer exist. Trying to use them afterwards raises `NameError`. A frame's names die with the call.

**Using a function's result when it only mutates.** Calling `my_list.sort()` returns `None`; a function you write that only changes its argument and never returns also gives `None`. Decide which style you offer and document it.

## Check yourself

1. What does this print, and why?
   ```python
   def f(x):
       x * 2
   print(f(4))
   ```
   <details><summary>Answer</summary>`None`. The body computes `x * 2` and discards it; there is no `return`, so the call evaluates to `None`.</details>

2. What is the difference between a parameter and an argument?
   <details><summary>Answer</summary>A parameter is the name in the `def` line; an argument is the actual value supplied in a call. Python binds each parameter to the corresponding argument at the start of the call.</details>

3. Why does `add_print(2, 3) * 10` raise a `TypeError` while `add_return(2, 3) * 10` gives `50`?
   <details><summary>Answer</summary>`add_print` returns `None`, and `None * 10` is unsupported. `add_return` returns the integer 5, which can be multiplied.</details>

4. What does `divmod`-style code `q, r = pair(17, 5)` need from `pair`?
   <details><summary>Answer</summary>It must return exactly two values (a tuple of length 2), for example `return a // b, a % b`. Otherwise unpacking fails with a `ValueError`.</details>

5. In `sign(n)` above, why is no `else` needed after the `if` branches?
   <details><summary>Answer</summary>`return` exits the function immediately, so any code after a taken `return` is never reached for that call.</details>

## Key takeaways

- `def` builds a function object; nothing in the body runs until you call it.
- Every call gets a fresh frame with its own local names, discarded when the call ends.
- `print` shows text; `return` gives a value back. Compute with `return`, print at the edges.
- Falling off the end of a function returns `None`, so check that every path returns what you intend.
- `return` exits immediately; put it after a loop when you mean "after all items".
- Return multiple values as a tuple and unpack them with `a, b = f()`.
