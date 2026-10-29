---
title: Comprehensions and Sorting
summary: Build lists, sets and dicts in one readable expression, and sort anything by any rule with sorted, list.sort and key functions.
minutes: 25
concepts: [comprehensions, sorting]
---

## Why this matters

Two jobs appear in almost every program: *transform or filter a collection* ("the squares of the even numbers") and *put a collection in order* ("cheapest first, ties alphabetical"). Python has compact, idiomatic tools for both: **comprehensions** and **`sorted` with a key function**. Beginners often write four-line loops for the first and hand-rolled bubble sorts for the second. Knowing the built-in tools makes your code shorter, faster and easier to read, and interviewers expect them.

## The mental model

A comprehension is a `for` loop that *collects its results* into a new container, folded into one expression:

```
 loop version                      comprehension
 result = []                       result = [ x * x   for x in nums   if x % 2 == 0 ]
 for x in nums:                             ^value    ^loop           ^optional filter
     if x % 2 == 0:
         result.append(x * x)
```

Read it as: "give me `x * x` **for** each `x` in `nums` **if** x is even". The pieces appear in the same order as in the loop, except that the thing being collected moves to the front.

Sorting has its own model: Python never compares your items directly when you pass a `key`. It first computes **one sort key per item**, then orders the items by those keys. The key function answers "what should I look at to decide the order?".

## List comprehensions

```python
nums = [1, 2, 3, 4, 5, 6]
squares = [n * n for n in nums]
print(squares)                      # -> [1, 4, 9, 16, 25, 36]

evens = [n for n in nums if n % 2 == 0]
print(evens)                        # -> [2, 4, 6]

labels = ["even" if n % 2 == 0 else "odd" for n in nums]
print(labels)                       # -> ['odd', 'even', 'odd', 'even', 'odd', 'even']
```

Notice the two different places for `if`. A trailing `if` is a **filter** (it drops items). An `if ... else` at the *front* is a **conditional expression** that picks between two values for every item, so it keeps all items and needs the `else`.

Comprehensions work on any iterable, including strings, and can have two `for` parts (read left to right like nested loops):

```python
print([ch.upper() for ch in "abc"])              # -> ['A', 'B', 'C']
pairs = [(a, b) for a in [1, 2] for b in "xy"]
print(pairs)    # -> [(1, 'x'), (1, 'y'), (2, 'x'), (2, 'y')]
```

## Set and dict comprehensions

Change the brackets and you change the container:

```python
words = ["apple", "bob", "cat", "apple"]
print({w for w in words})                       # a set: duplicates vanish
lengths = {w: len(w) for w in words}
print(lengths)                                  # -> {'apple': 5, 'bob': 3, 'cat': 3}
inverted = {v: k for k, v in {"a": 1, "b": 2}.items()}
print(inverted)                                 # -> {1: 'a', 2: 'b'}
```

A comprehension with `(...)` is a **generator expression**. It produces items lazily instead of building a list, which is ideal when you only want to feed the result to `sum`, `max`, `any` or `all`:

```python
print(sum(n * n for n in range(4)))             # -> 14
print(any(len(w) > 4 for w in words))           # -> True
```

**When not to use one.** If the body needs several statements, or the expression is so long that you must re-read it, write a normal loop. Also never use a comprehension just for side effects such as `[print(x) for x in xs]`; use a plain `for`.

## Sorting: `sorted` versus `.sort()`

```python
nums = [3, 1, 2]
print(sorted(nums))          # -> [1, 2, 3]   a NEW list
print(nums)                  # -> [3, 1, 2]   original untouched
nums.sort()                  # sorts IN PLACE and returns None
print(nums)                  # -> [1, 2, 3]
print(sorted(nums, reverse=True))   # -> [3, 2, 1]
```

`sorted()` works on any iterable (strings, tuples, sets, dict keys) and always returns a list. `list.sort()` exists only on lists, changes the list and returns `None`. The classic bug is `nums = nums.sort()`, which leaves `nums` as `None`.

### The key function

`key=` takes a function that is called once per item to produce the value to sort by:

```python
words = ["pear", "fig", "banana", "kiwi"]
print(sorted(words, key=len))                    # -> ['fig', 'pear', 'kiwi', 'banana']
print(sorted(words, key=str.lower))              # case-insensitive alphabetical
print(sorted(words, key=lambda w: w[-1]))        # by last letter
```

The items themselves are returned, not the keys. Sorting by `len` gives you the words, shortest first.

### Sorting by several things

Make the key a **tuple**; Python compares tuples element by element, so the second element only matters when the first ties:

```python
people = [("Ann", 30), ("Bob", 25), ("Cy", 30), ("Di", 25)]
print(sorted(people, key=lambda p: (-p[1], p[0])))
# -> [('Ann', 30), ('Cy', 30), ('Bob', 25), ('Di', 25)]
```

Here `-p[1]` flips the age so the oldest comes first while names stay alphabetical within an age. (Negation works for numbers only; for strings, sort in two passes or use `reverse`.)

### Stability

Python's sort is **stable**: items whose keys are equal keep their original relative order. That is why sorting by length leaves `"fig"` before `"abc"` if `"fig"` came first. You can exploit it to sort by two rules: sort by the secondary rule first, then by the primary rule.

### Sorting dictionaries

A dict sorts as its keys. To order by value, sort the `.items()`:

```python
score = {"ann": 3, "bob": 9, "cy": 5}
print(sorted(score))                                   # -> ['ann', 'bob', 'cy']
print(sorted(score.items(), key=lambda kv: kv[1]))     # -> [('ann', 3), ('cy', 5), ('bob', 9)]
print(sorted(score, key=score.get, reverse=True))      # -> ['bob', 'cy', 'ann']
```

## Common mistakes (and how to spot them)

**1. `x = x.sort()`.** The symptom is `None` where a list should be. Misconception: "every method returns the changed object". `sort` mutates and returns `None`; use `sorted(x)` if you want a value.

**2. Comparing the wrong thing.** `sorted(["10", "9", "2"])` gives `['10', '2', '9']` because strings compare character by character. Convert with `key=int` to sort by numeric value.

**3. Calling the key function.** `key=len()` raises a `TypeError`; pass the function itself, `key=len`. For a lambda, write `key=lambda w: len(w)`.

**4. Filter `if` in the wrong place.** `[x for x in xs if x > 0 else 0]` is a `SyntaxError`. Filtering goes at the end; choosing between two values goes at the front: `[x if x > 0 else 0 for x in xs]`.

**5. Mutating while building.** `[xs.append(i) for i in range(3)]` builds a useless list of `None`s. Use a loop when the point is the side effect.

## Check yourself

1. What does `[n for n in range(10) if n % 3 == 0]` produce?
<details><summary>Answer</summary><code>[0, 3, 6, 9]</code>. The trailing <code>if</code> filters the numbers 0 to 9.</details>

2. What is the difference between `[x if x > 0 else 0 for x in xs]` and `[x for x in xs if x > 0]`?
<details><summary>Answer</summary>The first keeps every item, replacing negatives with 0 (same length). The second drops the non-positive items (shorter result).</details>

3. After `a = [3, 1, 2]; b = a.sort()`, what are `a` and `b`?
<details><summary>Answer</summary><code>a</code> is <code>[1, 2, 3]</code> because it was sorted in place; <code>b</code> is <code>None</code> because <code>sort</code> returns nothing.</details>

4. How do you sort `["bb", "a", "ccc", "dd"]` by length, longest first, and what is the result?
<details><summary>Answer</summary><code>sorted(words, key=len, reverse=True)</code> gives <code>['ccc', 'bb', 'dd', 'a']</code>. Because the sort is stable, <code>'bb'</code> stays before <code>'dd'</code> even with <code>reverse=True</code>.</details>

5. Write a sort key that orders pairs by the second item descending, then the first item ascending.
<details><summary>Answer</summary><code>key=lambda p: (-p[1], p[0])</code>. The tuple is compared left to right, so the first item only breaks ties.</details>

## Key takeaways

* `[expr for x in it if cond]` is a loop that collects; trailing `if` filters, leading `a if c else b` chooses.
* Curly braces give set and dict comprehensions; parentheses give a lazy generator expression.
* Use a plain loop when a comprehension would be long or only for side effects.
* `sorted()` returns a new list; `.sort()` changes the list and returns `None`.
* `key=` takes a function (not a call) that produces what to sort by; a tuple key sorts by several rules.
* Sorting is stable, and dicts are sorted via their keys or `.items()`.
