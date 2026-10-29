---
title: Lists, Mutability and Aliasing
summary: Build and change lists confidently, and know exactly when two names share one list and when you have an independent copy.
minutes: 20
concepts: [list-basics, mutability-aliasing]
---

## Why this matters

The list is Python's workhorse container: scores, names, rows, queues, stacks. Unlike a string, a list can be changed in place, and that power brings the single most common source of confusing bugs in beginner Python: **two names for one list**. If you have ever changed a list "over there" and found it changed "over here" too, or called `.sort()` and got `None`, this lesson is for you.

## The mental model

A list is an ordered, numbered row of **references**. A variable name is a label that points to an object living somewhere in memory. Assignment never copies the object; it just attaches another label.

```
 a = [1, 2, 3]            a ---+
                                v
                            [ 1 | 2 | 3 ]     one list object
                                ^
 b = a                    b ---+              two names, ONE list
```

Indexing and slicing work exactly as for strings (`a[0]`, `a[-1]`, `a[1:3]`), but because lists are **mutable** you can also change them: assign to a slot, append, remove. When you mutate the object, every name that points to it sees the change.

## List basics

```python
nums = [10, 20, 30]
print(nums[0], nums[-1])     # -> 10 30
print(len(nums))             # -> 3
print(nums[1:])              # -> [20, 30]     a slice is a NEW list
nums[1] = 99                 # change a slot in place
print(nums)                  # -> [10, 99, 30]
```

The everyday methods:

```python
a = [1, 2]
a.append(3)          # add ONE item at the end        -> [1, 2, 3]
a.extend([4, 5])     # add each item of another list  -> [1, 2, 3, 4, 5]
a.insert(0, 0)       # insert at a position           -> [0, 1, 2, 3, 4, 5]
a.remove(3)          # remove first item equal to 3   -> [0, 1, 2, 4, 5]
last = a.pop()       # remove and return the last     -> last is 5
first = a.pop(0)     # remove and return index 0      -> first is 0
print(a)             # -> [1, 2, 4]
print(2 in a)        # -> True
print(a.index(4))    # -> 2
```

`append` versus `extend` trips up many learners:

```python
x = [1, 2]
x.append([3, 4])
print(x)             # -> [1, 2, [3, 4]]   the list became ONE item
y = [1, 2]
y.extend([3, 4])
print(y)             # -> [1, 2, 3, 4]
```

Asking for a position that does not exist raises `IndexError` (`[][0]`), and `remove` of a missing value raises `ValueError`; `pop()` on an empty list raises `IndexError`. As with strings, slices never raise.

## Methods that change the list return None

Methods that mutate a list do their work in place and return `None`, to signal "I changed the object, there is no new one".

```python
nums = [3, 1, 2]
result = nums.sort()
print(result)        # -> None
print(nums)          # -> [1, 2, 3]

nums = nums.append(4)    # classic bug
print(nums)          # -> None   the list is gone; nums now names None
```

This applies to `append`, `extend`, `insert`, `remove`, `sort`, `reverse` and `clear`. Compare with strings, where methods return a new value: `s.upper()` returns something, `lst.sort()` returns nothing. The function `sorted(lst)` and the slice `lst[::-1]` are the non-mutating versions that return new lists.

## Aliasing: two names, one list

```python
a = [1, 2, 3]
b = a                 # NOT a copy: b is a second label for the same list
b.append(4)
print(a)              # -> [1, 2, 3, 4]   a changed too!
print(a is b)         # -> True
print(id(a) == id(b)) # -> True           same object identity
```

`id()` gives an object's identity number (its address, in CPython), and `is` tests for identity. If `id(a) == id(b)`, there is one list. This is why passing a list to a function lets the function change your list:

```python
def add_zero(items):
    items.append(0)

data = [1]
add_zero(data)
print(data)           # -> [1, 0]   the function mutated the caller's list
```

### Making a real copy

```python
a = [1, 2, 3]
b = a.copy()          # also: list(a), or a[:]
b.append(4)
print(a)              # -> [1, 2, 3]   untouched
print(b)              # -> [1, 2, 3, 4]
print(a is b)         # -> False
```

`a[:]`, `a.copy()` and `list(a)` all build a new list of the same items. That is a **shallow copy**: the new list is independent, but its items are the *same objects*. For numbers and strings that does not matter, because they are immutable. For nested lists it does:

```python
grid = [[0, 0], [0, 0]]
shallow = grid.copy()
shallow[0][0] = 9
print(grid)           # -> [[9, 0], [0, 0]]   the inner list is shared!

import copy
deep = copy.deepcopy(grid)
deep[1][1] = 7
print(grid)           # -> [[9, 0], [0, 0]]   deepcopy duplicated the inner lists too
```

The outer list was copied, the inner lists were not. `copy.deepcopy` copies everything all the way down.

A related trap is `[[0] * 3] * 2`, which builds two references to the *same* inner list:

```python
bad = [[0] * 3] * 2
bad[0][0] = 1
print(bad)            # -> [[1, 0, 0], [1, 0, 0]]   both rows changed
good = [[0] * 3 for _ in range(2)]
good[0][0] = 1
print(good)           # -> [[1, 0, 0], [0, 0, 0]]
```

### Rebinding is not mutating

Aliasing only bites when you *mutate*. Assigning a new value to a name just moves the label:

```python
a = [1, 2]
b = a
a = [9, 9]            # a now points to a NEW list; b still points to the old one
print(b)              # -> [1, 2]

a = [1, 2]
b = a
a += [3]              # += on a list mutates in place (like extend)
print(b)              # -> [1, 2, 3]
b = b + [4]           # + builds a NEW list and rebinds b
print(a)              # -> [1, 2, 3]
```

Different spellings (`a = a + [x]` versus `a += [x]`) give different aliasing behaviour. Whenever you wonder, ask: "did this create a new list, or change the existing one?"

## Common mistakes (and how to spot them)

**Believing `b = a` copies.** Misconception: a variable is a box that holds the data. It is a label on shared data. Symptom: changing `b` changes `a`. Fix: `b = a.copy()` or `list(a)`; confirm with `a is b`.

**Assigning the result of a mutating method.** `lst = lst.sort()` or `lst = lst.append(x)` leaves `lst` as `None`, and the next line crashes with `TypeError: 'NoneType' object is not iterable` or `AttributeError`. Call the method on its own line, or use `sorted()`.

**Removing items while looping over the same list.** `for x in nums: if x % 2 == 0: nums.remove(x)` skips elements, because the list shifts under the loop's internal position. Loop over a copy (`for x in nums[:]`) or build a new list with a comprehension.

**Confusing `append` and `extend`.** `lst.append([1, 2])` adds a nested list; `extend` adds the elements.

**Thinking a shallow copy is fully independent.** `copy()` of a list of lists still shares the inner lists. Use `copy.deepcopy` or build the inner lists freshly.

**Using `[[0] * n] * m` for a grid.** All rows are the same list. Use a comprehension.

**Off-by-one with `insert`/`pop`.** `pop(i)` removes the item at index `i`; `remove(v)` removes by *value*. Mixing them up removes the wrong thing or raises `ValueError`.

## Check yourself

1. After `a = [1, 2]; b = a; b.append(3)`, what is `a`, and what does `a is b` give?

<details><summary>Answer</summary>

`a` is `[1, 2, 3]` and `a is b` is `True`. Assignment attached a second name to the same list, and `append` mutated that one list.

</details>

2. What is printed by `print([3, 1, 2].sort())`?

<details><summary>Answer</summary>

`None`. `sort()` sorts the list in place and returns `None`. Use `sorted([3, 1, 2])` to get `[1, 2, 3]` as a value.

</details>

3. `x = [[1], [2]]; y = x.copy(); y[0].append(5)`. What is `x`?

<details><summary>Answer</summary>

`[[1, 5], [2]]`. `copy()` is shallow, so `x` and `y` are different outer lists holding the same inner lists. Use `copy.deepcopy(x)` for independence.

</details>

4. What is the difference between `a += [4]` and `a = a + [4]` when another name `b` points at the same list?

<details><summary>Answer</summary>

`a += [4]` extends the existing list in place, so `b` sees the change. `a = a + [4]` builds a new list and rebinds `a`, so `b` keeps the old contents.

</details>

5. How do you build a 3x3 grid of zeros whose rows are independent?

<details><summary>Answer</summary>

`[[0] * 3 for _ in range(3)]`. The comprehension runs `[0] * 3` once per row, creating three separate lists. `[[0] * 3] * 3` would repeat one list three times.

</details>

## Key takeaways

- A list is a mutable row of references; variables are labels, and `b = a` attaches a second label to the same list.
- `id(a) == id(b)` or `a is b` tells you whether two names share one object.
- Copy with `a.copy()`, `list(a)` or `a[:]`; nested structures need `copy.deepcopy` or freshly built inner lists.
- `append`, `extend`, `insert`, `remove`, `sort`, `reverse` change the list and return `None`; never assign their result.
- Functions receive the same list you pass in, so mutating a parameter mutates the caller's list.
- Mutating (`+=`, `append`) and rebinding (`=`) behave differently when names are shared.
