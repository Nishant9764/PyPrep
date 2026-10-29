---
title: Tuples and Sets
summary: Use tuples for fixed groups of values and unpacking, and sets for uniqueness, fast membership tests and set algebra.
minutes: 15
concepts: [tuples-sets, list-basics]
---

## Why this matters

Lists are not always the right tool. A point `(x, y)` or a function returning two values wants a **fixed** bundle that nobody can accidentally change. A task such as "remove duplicates", "which words appear in both files?" or "have I seen this value already?" wants a container built for uniqueness and fast lookup. Python offers two small, sharp tools for these jobs: the **tuple** and the **set**. They also show up everywhere in interview code, for example as dictionary keys (tuples) and "seen" collections (sets).

## The mental model

Three containers, three promises:

```
 list   [1, 2, 2, 3]    ordered, may repeat, CAN change
 tuple  (1, 2, 2, 3)    ordered, may repeat, can NOT change
 set    {1, 2, 3}       unordered, NO repeats, add/remove allowed, items must be hashable
```

A **tuple** is an immutable list. You can index and slice it, but you cannot assign to a slot or append. A **set** is a bag in which each distinct value appears at most once and Python can check membership almost instantly, because it uses a hash table rather than scanning every item. The price is that a set has no order and no positions: there is no `s[0]`.

## Tuples

```python
point = (3, 4)
print(point[0], point[-1])   # -> 3 4
print(len(point))            # -> 2
print(point + (5,))          # -> (3, 4, 5)   builds a new tuple
point[0] = 9
# TypeError: 'tuple' object does not support item assignment
```

A single-item tuple needs a trailing comma: `(5,)` is a tuple, `(5)` is just the number 5 in brackets. The parentheses are optional in many places; the **comma** makes the tuple. `t = 1, 2, 3` is the same as `t = (1, 2, 3)`.

### Unpacking

Unpacking assigns the items of a tuple (or any sequence) to several names in one statement:

```python
x, y = (3, 4)
print(x, y)          # -> 3 4

a, b = 1, 2
a, b = b, a          # swap without a temporary variable
print(a, b)          # -> 2 1

first, *rest = [10, 20, 30, 40]
print(first, rest)   # -> 10 [20, 30, 40]

def min_max(values):
    return min(values), max(values)    # returns ONE tuple

lo, hi = min_max([4, 9, 1])
print(lo, hi)        # -> 1 9
```

The number of names must match the number of items, otherwise you get `ValueError: too many values to unpack`, unless you use a starred name to absorb the extras.

Because tuples are immutable (and hashable when their contents are), they can be **dictionary keys** and set members, which lists cannot:

```python
grid = {(0, 0): "start", (2, 3): "goal"}
print(grid[(2, 3)])          # -> goal
```

One subtlety: a tuple is only as immutable as its contents. `([1], 2)` is a tuple, but the list inside can still be changed.

## Sets

```python
s = {3, 1, 2, 3, 3}
print(s)                     # -> {1, 2, 3}   duplicates vanish
print(len(s))                # -> 3
print(2 in s)                # -> True        fast membership test
s.add(5)
s.discard(1)                 # remove if present, no error if absent
print(sorted(s))             # -> [2, 3, 5]   sets print in no promised order
```

Empty braces `{}` make an empty **dictionary**, not a set. Write `set()` for an empty set.

The most common use is **deduplication**:

```python
words = ["a", "b", "a", "c", "b"]
unique = set(words)
print(len(unique))           # -> 3
print(sorted(unique))        # -> ['a', 'b', 'c']
```

If you also need to keep the original order, use a seen-set while building a new list:

```python
seen = set()
result = []
for w in words:
    if w not in seen:
        seen.add(w)
        result.append(w)
print(result)                # -> ['a', 'b', 'c']
```

Set items must be hashable: numbers, strings and tuples are fine, lists and dicts are not (`{[1, 2]}` raises `TypeError: unhashable type: 'list'`).

### Set algebra

Sets support the operations you know from school maths:

```python
a = {1, 2, 3, 4}
b = {3, 4, 5}
print(sorted(a | b))         # -> [1, 2, 3, 4, 5]   union: in either
print(sorted(a & b))         # -> [3, 4]            intersection: in both
print(sorted(a - b))         # -> [1, 2]            difference: in a but not b
print(sorted(a ^ b))         # -> [1, 2, 5]         symmetric difference: in exactly one
print({3, 4} <= a)           # -> True              subset test
print(a.isdisjoint({9}))     # -> True              nothing in common
```

Why does this matter beyond tidy code? Checking `x in some_list` has to look at items one by one (time grows with the list), while `x in some_set` takes roughly constant time. Turning a list into a set before many membership tests is a standard speed-up.

## Common mistakes (and how to spot them)

**Writing `{}` for an empty set.** `s = {}; s.add(1)` raises `AttributeError: 'dict' object has no attribute 'add'`. Misconception: braces always mean set. Use `set()`.

**Forgetting the comma in a one-item tuple.** `t = (5)` is an int; `t[0]` raises `TypeError: 'int' object is not subscriptable`. Write `(5,)`.

**Expecting a set to keep order or support indexing.** `s[0]` raises `TypeError`, and printing a set may show items in a different order than you inserted. If order matters, use a list or sort for display: `sorted(s)`.

**Trying to change a tuple.** `t[0] = 1` fails and `t.append(1)` does not exist. Build a new tuple, or use a list if you need change.

**Putting a list inside a set or using it as a dict key.** Lists are mutable, hence unhashable. Convert to a tuple first: `seen.add(tuple(row))`.

**Unpacking the wrong count.** `a, b = (1, 2, 3)` raises `ValueError: too many values to unpack (expected 2)`. Match the counts or use `*rest`.

**Using a set when duplicates matter.** `len(set(words))` is the number of *distinct* words, not the number of words. Counting occurrences needs a dictionary.

## Check yourself

1. What are the types of `(5)`, `(5,)` and `{}`?

<details><summary>Answer</summary>

`int`, `tuple` and `dict`. The comma makes a one-item tuple, and `{}` is an empty dictionary; an empty set is `set()`.

</details>

2. What does `set([1, 2, 2, 3, 3, 3])` contain, and how many items does `len` report?

<details><summary>Answer</summary>

`{1, 2, 3}` with length 3. A set keeps each distinct value once.

</details>

3. Given `a = {1, 2, 3}` and `b = {2, 3, 4}`, compute `a & b`, `a | b` and `a - b`.

<details><summary>Answer</summary>

`{2, 3}`, `{1, 2, 3, 4}` and `{1}`: in both, in either, and in `a` but not in `b`.

</details>

4. Why can a tuple like `(1, 2)` be a dictionary key but the list `[1, 2]` cannot?

<details><summary>Answer</summary>

Dictionary keys must be hashable, which in practice means immutable. A tuple of immutable items never changes, so its hash is stable; a list can change after being stored, so Python refuses to hash it.

</details>

5. Swap two variables `a` and `b` in one line.

<details><summary>Answer</summary>

`a, b = b, a`. The right side builds a tuple of the current values, and unpacking assigns them back in the opposite order.

</details>

## Key takeaways

- A tuple is an immutable, ordered bundle: use it for fixed groups, multiple return values and dictionary keys.
- The comma makes the tuple; `(5,)` is a tuple, `(5)` is not.
- Unpacking (`x, y = pair`, `first, *rest = items`) assigns several names at once and makes swaps trivial.
- A set stores distinct, hashable items with no order; `{}` is a dict, so use `set()` for an empty one.
- `|`, `&`, `-`, `^` give union, intersection, difference and symmetric difference.
- Membership tests on sets are fast, which makes "seen" sets and deduplication cheap.
