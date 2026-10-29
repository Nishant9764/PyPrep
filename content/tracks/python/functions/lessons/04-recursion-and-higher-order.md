---
title: Recursion and Higher-Order Functions
summary: Write recursive functions with a correct base case, understand the call stack and memoisation, and use functions as values with lambda, map, filter, sorted and reduce.
minutes: 22
concepts: [recursion, higher-order]
---

## Why this matters

Two big ideas live in this lesson, and both come from treating functions as more than named blocks of code.

**Recursion** means a function solves a problem by calling itself on a smaller piece of it. Trees, nested lists, file systems, parsing and many interview problems (permutations, flood fill, binary search) are naturally recursive. **Higher-order functions** are functions that take other functions as arguments or return them. They let you write `sorted(words, key=len)` instead of a hand-written sort, and they are the basis for decorators and callbacks.

## The mental model

For recursion, picture a stack of sticky notes. Each call writes a new note (a frame holding that call's parameters and locals) and puts it on top. When a call returns, its note is removed and the value goes to the note below.

```
factorial(3)                   stack (top first)
  3 * factorial(2)             factorial(0)  -> returns 1
        2 * factorial(1)       factorial(1)  waiting: 1 * 1
              1 * factorial(0) factorial(2)  waiting: 2 * 1
                    1          factorial(3)  waiting: 3 * 2  -> 6
```

Every recursive function needs two parts: a **base case** that answers directly without recursing, and a **recursive case** that moves *strictly closer* to the base case. Miss either and the stack never stops growing.

For higher-order functions the model is simpler: in Python a function is just another object. `len` is a name bound to a function object, exactly like `x = 5` binds a name to an integer. So you can store it in a list, pass it to another function, and return it.

## Recursion step by step

```python
def factorial(n):
    if n == 0:                 # base case
        return 1
    return n * factorial(n - 1)   # recursive case: smaller n

print(factorial(5))   # -> 120
```

Trace `factorial(3)`: it needs `factorial(2)`, which needs `factorial(1)`, which needs `factorial(0)`, which returns 1. Then the waiting multiplications resolve on the way back: `1*1`, `2*1`, `3*2`. The work happens *after* the inner call returns.

A recursive function over a list usually follows "first item plus the answer for the rest":

```python
def total(items):
    if not items:              # base case: empty list
        return 0
    return items[0] + total(items[1:])

print(total([4, 5, 6]))        # -> 15
```

And nested data is where recursion shines, because a loop cannot know how deep to go:

```python
def flatten(x):
    if not isinstance(x, list):
        return [x]
    out = []
    for item in x:
        out.extend(flatten(item))
    return out

print(flatten([1, [2, [3, 4]], 5]))   # -> [1, 2, 3, 4, 5]
```

### Missing or unreachable base cases

```python
def countdown(n):
    print(n)
    countdown(n - 1)           # no base case

countdown(3)   # prints 3, 2, 1, 0, -1, ... then RecursionError
```

Python limits the stack depth (about 1000 frames by default) and raises `RecursionError: maximum recursion depth exceeded`. That error nearly always means the base case is missing, or the recursive step does not get closer to it. A subtle version: `factorial(-1)` with the base case `n == 0` never hits 0 going downwards. Guarding with `n <= 0` or validating input prevents it.

### Repeated work and memoisation

Naive Fibonacci is elegant and terrible:

```python
def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)
```

`fib(30)` makes over a million calls because `fib(28)` is recomputed again and again. Each value depends only on `n`, so remember answers you have already computed (**memoisation**):

```python
def fib(n, memo=None):
    if memo is None:          # None sentinel: no shared default!
        memo = {}
    if n < 2:
        return n
    if n not in memo:
        memo[n] = fib(n - 1, memo) + fib(n - 2, memo)
    return memo[n]

print(fib(50))    # -> 12586269025
```

Now each `n` is computed once: linear time instead of exponential. The standard library does it for you with `functools.lru_cache`:

```python
from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)

print(fib(80))    # -> 23416728348467685
```

Recursion is not always the right tool. Python does not optimise tail calls, so a simple counting loop is faster and cannot overflow the stack. Use recursion when the problem's own shape is recursive.

## Functions as values

```python
def shout(s):
    return s.upper() + "!"

ops = [str.strip, str.lower, shout]
text = "  Hello "
for op in ops:
    text = op(text)
print(text)               # -> HELLO!
```

Note `shout` without parentheses is the function itself; `shout("a")` is a call. A **lambda** is a small anonymous function limited to a single expression: `lambda x: x * 2` is equivalent to `def f(x): return x * 2`. Use it for short throwaway callbacks, not for anything you would want to name or test.

## map, filter, sorted, reduce

```python
nums = [1, 2, 3, 4, 5, 6]

print(list(map(lambda n: n * n, nums)))          # -> [1, 4, 9, 16, 25, 36]
print(list(filter(lambda n: n % 2 == 0, nums)))  # -> [2, 4, 6]
```

`map` applies a function to every item; `filter` keeps items for which the function is truthy. Both return lazy iterators, so wrap them in `list(...)` to see the values. Comprehensions often read better (`[n * n for n in nums]`), but `map`/`filter` shine when you already have a named function: `list(map(int, ["1", "2"]))`.

The most useful higher-order call is the `key` argument:

```python
words = ["pear", "fig", "banana", "kiwi"]
print(sorted(words, key=len))                    # -> ['fig', 'pear', 'kiwi', 'banana']
print(max(words, key=lambda w: w[-1]))           # -> pear
```

`key` is called once per item to produce the value to compare. `sorted` is stable, so `pear` and `kiwi` (both length 4) keep their original order.

`functools.reduce` folds a sequence into one value by repeatedly applying a two-argument function:

```python
from functools import reduce

print(reduce(lambda acc, n: acc * n, [1, 2, 3, 4], 1))   # -> 24
```

Steps: `((1*1)*2)*3)*4`. The third argument is the starting value, which also becomes the answer for an empty list.

Finally, functions can return functions (you saw closures last lesson):

```python
def compose(f, g):
    return lambda x: f(g(x))

inc_then_double = compose(lambda x: x * 2, lambda x: x + 1)
print(inc_then_double(5))   # -> 12
```

## Common mistakes (and how to spot them)

**No base case, or a base case that is never reached.** Symptom: `RecursionError`. Misconception: "the function will stop on its own when the data is small enough." Python only stops when a branch returns without recursing.

**Not using the result of the recursive call.** Writing `factorial(n - 1)` on its own line and returning `n` discards the answer. Recursion obeys the same return rules as any function: you must return the value.

**Forgetting `list()` around `map` or `filter`.** `print(map(...))` shows `<map object at 0x...>`. They are lazy iterators.

**Calling instead of passing.** `sorted(words, key=len())` fails (`len()` needs an argument); `key=len` passes the function. Parentheses mean "call now".

**Overusing lambda.** A multi-step lambda is unreadable and has no name in tracebacks. Use `def`.

**Recomputing overlapping subproblems.** Exponential time in a Fibonacci-style recursion is the sign that you need memoisation.

## Check yourself

1. What two ingredients must every recursive function have?
   <details><summary>Answer</summary>A base case that returns without recursing, and a recursive case that makes the problem strictly smaller so the base case is eventually reached.</details>

2. What exception signals runaway recursion, and what is the usual cause?
   <details><summary>Answer</summary>`RecursionError` (maximum recursion depth exceeded); usually a missing base case or a step that does not approach it.</details>

3. Why is plain recursive `fib(35)` slow and how is it fixed?
   <details><summary>Answer</summary>It recomputes the same subproblems exponentially often. Memoisation (a dict or `functools.lru_cache`) computes each value once.</details>

4. What is the difference between `key=len` and `key=len()`?
   <details><summary>Answer</summary>`key=len` passes the function object so `sorted` can call it on each item. `len()` tries to call it immediately with no argument and raises `TypeError`.</details>

5. What does `reduce(lambda a, b: a + b, [], 0)` return?
   <details><summary>Answer</summary>`0`, the initial value, because there are no items to fold.</details>

## Key takeaways

- A recursive function needs a base case and a recursive step that moves toward it.
- Each call gets its own frame on the call stack; results combine as the calls return.
- `RecursionError` almost always means a missing or unreachable base case.
- Memoise overlapping subproblems with a dict or `lru_cache` to turn exponential work into linear.
- Functions are objects: pass them, store them, return them, and remember that parentheses mean "call".
- `map`, `filter`, `sorted(key=...)`, and `reduce` let you parameterise behaviour; wrap `map`/`filter` in `list()` to see results.
