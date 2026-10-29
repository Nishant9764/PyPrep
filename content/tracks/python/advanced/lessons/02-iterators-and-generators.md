---
title: Iterators and Generators
summary: Understand the iteration protocol behind every for loop, then write lazy generators with yield, generator expressions and yield from.
minutes: 25
concepts: [iterators, generators]
---

## Why this matters

Every `for` loop, list comprehension, `sum()`, `sorted()`, `zip()` and unpacking you have written relies on one tiny protocol. Once you know it you can make your own classes loopable, read a ten-gigabyte file one line at a time, and model infinite sequences such as "all prime numbers" without running out of memory.

Generators are the practical payoff. A generator function looks like a normal function, but it can **pause** at a `yield`, hand a value to the caller, and later **resume** exactly where it stopped. This gives you lazy, memory-friendly pipelines in a few lines, and it is a classic interview topic ("what is the difference between `return` and `yield`?").

## The mental model

There are two roles, and mixing them up causes most confusion.

* An **iterable** is something you can loop over: a list, string, dict, file, range. It has an `__iter__()` method that returns an iterator.
* An **iterator** is the little machine that produces the items one at a time. It has `__next__()`, which returns the next item or raises `StopIteration` when there are none left. An iterator's `__iter__()` returns itself.

A `for` loop is just this, written out:

```python
for x in thing:
    body(x)

# is equivalent to
it = iter(thing)              # calls thing.__iter__()
while True:
    try:
        x = next(it)          # calls it.__next__()
    except StopIteration:
        break
    body(x)
```

```
list [10, 20, 30]  --iter()-->  list_iterator  --next()--> 10
                                (remembers its position)   20
                                                           30
                                                           StopIteration
```

The key fact: **the position lives in the iterator, not in the list**. You can ask the same list for many independent iterators, but a single iterator only moves forward and never rewinds.

## Iterators by hand

```python
nums = [10, 20, 30]
it = iter(nums)
print(next(it))   # 10
print(next(it))   # 20
print(next(it))   # 30
print(next(it, "done"))   # done   (the default avoids StopIteration)
```

Without the default, the fourth `next(it)` raises `StopIteration`. Now see exhaustion:

```python
it = iter([1, 2, 3])
print(list(it))   # [1, 2, 3]
print(list(it))   # []   <- the iterator is used up
```

A list is an iterable, so `list(nums)` can be done again and again. An iterator is single-use. This is the source of the most common iterator bug (see the mistakes section).

To make your own class an iterator, implement both methods:

```python
class Countdown:
    def __init__(self, start):
        self.current = start

    def __iter__(self):
        return self

    def __next__(self):
        if self.current <= 0:
            raise StopIteration
        value = self.current
        self.current -= 1
        return value

print(list(Countdown(3)))   # [3, 2, 1]
c = Countdown(2)
print(list(c), list(c))     # [2, 1] []
```

Because this class is its own iterator, it can only be looped once. If you want a *reusable* iterable, have `__iter__` return a **fresh** iterator each time (a generator method does this for free, as you will see).

## Generators: functions that pause

Writing a class with `__next__` and manual state is tedious. A function containing `yield` becomes a **generator function**; calling it does *not* run the body. It returns a generator object, which is an iterator.

```python
def countdown(n):
    print("starting")
    while n > 0:
        yield n
        n -= 1
    print("finished")

g = countdown(2)       # nothing printed yet!
print(next(g))         # starting / 2
print(next(g))         # 1
print(next(g, None))   # finished / None
```

Follow the execution. The first `next(g)` runs the body until it hits `yield n`, hands out `2`, and **freezes** the whole frame: the value of `n`, the position in the loop, everything. The second `next(g)` unfreezes it right after the `yield`, so `n -= 1` runs and the loop yields `1`. The third resumes, the `while` ends, the function falls off its end, and Python raises `StopIteration` for you (which `next(g, None)` turned into `None`). A plain `return` inside a generator likewise just ends it.

Laziness is the superpower. Nothing is computed until someone asks:

```python
def naturals():
    n = 1
    while True:            # infinite, but only 1 value in memory at a time
        yield n
        n += 1

from itertools import islice
print(list(islice(naturals(), 5)))   # [1, 2, 3, 4, 5]
```

Doing the same with a list would never finish. Generators also compose into pipelines where each stage pulls from the previous one:

```python
def squares(nums):
    for n in nums:
        yield n * n

def evens(nums):
    for n in nums:
        if n % 2 == 0:
            yield n

print(sum(evens(squares(range(10)))))   # 0+4+16+36+64 = 120
```

No intermediate lists are built; each number flows through the whole chain before the next one starts.

### Generator expressions and yield from

A **generator expression** is a comprehension in parentheses. It is lazy where a list comprehension is eager:

```python
squares_list = [n * n for n in range(5)]   # builds the whole list now
squares_gen = (n * n for n in range(5))    # builds nothing yet
print(squares_list)        # [0, 1, 4, 9, 16]
print(next(squares_gen))   # 0
print(sum(n * n for n in range(1000000)))   # 333332833333500000, no big list
```

When a function is the only argument, the extra parentheses can be dropped, as in the last line.

`yield from` delegates to another iterable, replacing a loop that re-yields each item:

```python
def flatten(nested):
    for item in nested:
        if isinstance(item, list):
            yield from flatten(item)    # recursion + generators
        else:
            yield item

print(list(flatten([1, [2, [3, 4]], 5])))   # [1, 2, 3, 4, 5]
```

A generator method is also the easiest way to make a class re-iterable: write `def __iter__(self): yield from self.items` and every `for` loop gets a brand-new generator.

## Common mistakes (and how to spot them)

**1. Using an exhausted iterator.**

```python
squares = (n * n for n in range(4))
print(sum(squares))   # 14
print(sum(squares))   # 0   <- surprise!
```

Symptom: the second pass silently gives an empty result, not an error. Misconception: "a generator is a list that is computed later". It is a **one-shot stream**. Fix: call the generator function again, or store the results with `list(...)` if you need several passes.

**2. Expecting a generator function call to run the code.** `g = countdown(3)` prints nothing and returns an object. Any `print` or side effect in the body happens only when you iterate. Errors inside the body also show up late.

**3. `yield` versus `return` confusion.** `return [x, y]` ends the function and returns a whole list; `yield x; yield y` produces values one at a time and keeps the function alive between them. A beginner writes `return` inside the loop and gets only the first item.

**4. Mutating what you yield.** If you build a chunk list, yield it, then call `.clear()` on the same list, every consumer sees the same (emptied) list. Create a fresh list instead.

**5. Printing or indexing a generator.** `print(gen)` shows `<generator object ...>`, and `gen[0]` raises `TypeError: 'generator' object is not subscriptable`. Convert with `list(gen)` or pull with `next()`.

**6. Catching `StopIteration` nowhere.** Calling `next(it)` on an exhausted iterator raises it. Use `next(it, default)` when "no more items" is an expected situation.

## Check yourself

1. What is the difference between an iterable and an iterator? Give an example of each.
<details><summary>Answer</summary>An iterable has `__iter__` and can produce an iterator (a list, string, dict, range). An iterator has `__next__`, remembers its position, yields items one at a time, raises `StopIteration` at the end, and returns itself from `__iter__` (for example `iter([1, 2])` or a generator object).</details>

2. What does this print?
```python
it = iter("ab")
print(next(it), next(it), next(it, "?"))
```
<details><summary>Answer</summary>`a b ?`. The third call has run out of items, so the default is returned instead of raising `StopIteration`.</details>

3. Calling `g = gen()` where `gen` contains `yield` prints nothing from inside the body. Why?
<details><summary>Answer</summary>Calling a generator function only creates a generator object. The body runs lazily, starting at the first `next(g)` (or when a `for` loop or `list()` asks for items), and pauses at each `yield`.</details>

4. Why does the second `sum(gen)` return 0?
<details><summary>Answer</summary>Generators are iterators, so they are exhausted after one pass. The second `sum` receives an iterator that immediately raises `StopIteration`. Recreate the generator or materialise it as a list.</details>

5. Rewrite as a generator expression: `[len(w) for w in words]` evaluated lazily.
<details><summary>Answer</summary>`(len(w) for w in words)`. It builds items on demand; wrap it in `list()` only if you need them all at once.</details>

## Key takeaways

- A `for` loop calls `iter()` on the iterable and then `next()` until `StopIteration`.
- Iterables produce iterators; iterators remember position, move only forward and are single-use.
- A function with `yield` returns a generator: calling it runs nothing, `next()` runs until the next `yield` and freezes the frame there.
- Generators are lazy: constant memory, infinite sequences, and pipelines that process one item at a time.
- Generator expressions `(... for ...)` are the lazy cousin of list comprehensions; `yield from` delegates to a sub-iterable.
- If you need to loop more than once, keep a list, or make a class whose `__iter__` returns a fresh iterator each time.
