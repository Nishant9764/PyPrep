---
title: Complexity and Interview Patterns
summary: Estimate how code scales with Big-O, know what built-in operations really cost, and solve problems with the two-pointer, hash-map and sliding-window patterns while explaining your thinking out loud.
minutes: 30
concepts: [complexity, two-pointers, hash-map-patterns, sliding-window]
---

## Why this matters

Two programs can give the same answer, yet one finishes in a blink and the other still runs when you come back from lunch. The difference is how the work **grows with the input**. Interviewers ask about this constantly: "What is the time complexity?" "Can you do better?" They are not testing memorised trivia. They want to see that you can predict how code behaves on a million items, and that you know a small set of reusable patterns for getting from a slow idea to a fast one.

This lesson gives you both: a practical feel for Big-O, and three patterns (two pointers, hash maps, sliding windows) that solve a huge share of screening problems.

## The mental model

**Big-O** describes how the number of basic steps grows as the input size `n` grows, ignoring constant factors. You ask: "if `n` becomes 10 times bigger, how much slower is this?"

```
O(1)        constant     same time for any n         dict lookup
O(log n)    logarithmic  doubling n adds one step    binary search
O(n)        linear       10x n -> 10x time           one loop
O(n log n)  linearithmic sorting                     sorted()
O(n^2)      quadratic    10x n -> 100x time          loop inside a loop
O(2^n)      exponential  +1 to n doubles the time    naive fib(n)
```

Rule of thumb: Python runs about 10^7 simple steps per second. With `n = 100,000`, O(n) takes about 0.01 s but O(n^2) is 10^10 steps, so hours.

How to count: look at loops. One loop over `n` items is O(n). A loop nested inside it is O(n^2). Drop constants and lower terms (`3n + 10` is O(n)). **Hidden loops count**: `x in some_list`, `list.index`, `sum(...)`, slicing and `list.insert(0, x)` all loop internally.

## What built-in operations cost

You cannot reason about your code unless you know what each line costs. The big divide is **list versus hash-based (dict/set)**:

| Operation | list | dict / set |
|---|---|---|
| `x in container` | O(n) | O(1) average |
| index `a[i]` / `d[key]` | O(1) | O(1) average |
| `append` / `add` / `d[k] = v` | O(1) amortised | O(1) average |
| `pop()` from end | O(1) | n/a |
| `pop(0)` / `insert(0, x)` | O(n) | n/a |
| `remove(x)` | O(n) | O(1) (`set.remove`) |
| `sorted(...)` | O(n log n) | n/a |
| slice `a[i:j]` | O(j - i) | n/a |

Why is a set lookup O(1)? Python hashes the value to compute where it would be stored and jumps straight there, instead of scanning. The price is memory, and that only hashable (immutable) items may be stored.

See the difference yourself:

```python
import time

n = 20_000
data_list = list(range(n))
data_set = set(data_list)

start = time.perf_counter()
hits = sum(1 for x in range(n) if x in data_list)   # n scans of up to n items
print(hits, "list:", round(time.perf_counter() - start, 2), "s")
# -> 20000 list: 1.02 s   (exact time varies by machine)

start = time.perf_counter()
hits = sum(1 for x in range(n) if x in data_set)    # n O(1) lookups
print(hits, "set:", round(time.perf_counter() - start, 4), "s")
# -> 20000 set: 0.0009 s
```

The first version looks innocent but is O(n^2). Swapping the container is often the whole optimisation. **Space** matters too: the set version spends O(n) extra memory to buy its speed. Trading memory for time is the central theme of the patterns below.

## Pattern 1: hash map (and seen-sets)

Use it when the brute force repeatedly asks "have I seen this value before?" or "where was it?".

**Worked problem: two-sum.** Given a list of integers and a target, return the indices of two different elements that add up to the target.

*Brute force first.* Try every pair:

```python
def two_sum_slow(nums, target):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
# O(n^2) time, O(1) space
```

*The improvement.* For each number `x`, the partner we need is `target - x`. Instead of scanning for it, remember every number we have passed in a dict from value to index, and look the partner up in O(1):

```python
def two_sum(nums, target):
    seen = {}                          # value -> index
    for i, x in enumerate(nums):
        need = target - x
        if need in seen:
            return [seen[need], i]
        seen[x] = i                    # store AFTER checking
    return []

print(two_sum([2, 7, 11, 15], 9))   # -> [0, 1]
print(two_sum([5, 1, 9], 10))       # -> [1, 2]  (5 is not paired with itself)
```

O(n) time, O(n) space. Storing after the check is what stops an element pairing with itself.

The same idea gives **grouping**: build a dict whose key captures what makes items "the same". To group anagrams, use `"".join(sorted(word))` as the key: `groups.setdefault(key, []).append(word)`. To find a duplicate, keep a `set` of values seen so far.

## Pattern 2: two pointers

Use it on **sorted** data (or data you can sort), or when you walk inward from both ends. Two indices move according to a rule, so each element is visited a bounded number of times.

**Worked problem: does a sorted list contain two numbers summing to target?**

*Brute force:* all pairs, O(n^2). *Improvement:* put one pointer at each end. If the sum is too small, the only way to increase it is to move the left pointer right; if too big, move the right pointer left. Each step discards one element for good.

```python
def has_pair(sorted_nums, target):
    left, right = 0, len(sorted_nums) - 1
    while left < right:                       # strictly less: no self-pairing
        total = sorted_nums[left] + sorted_nums[right]
        if total == target:
            return True
        if total < target:
            left += 1
        else:
            right -= 1
    return False

print(has_pair([1, 3, 4, 6, 9], 10))   # -> True   (1 + 9)
print(has_pair([1, 3, 4, 6, 9], 2))    # -> False
```

O(n) time, O(1) space, and no dict needed. The reason it is correct is an argument you should be able to say aloud: when the sum is too small, the current left element cannot work with *any* remaining right element (the right one is already the largest available), so discarding it is safe.

Palindrome checks and merging two sorted lists use the same idea.

## Pattern 3: sliding window

Use it for **contiguous** subarrays or substrings where you want the longest/shortest/best one. Keep a window `[left, right]`; expand `right` one step at a time, and shrink from `left` whenever the window breaks the rule. Each index enters and leaves the window once, so it is O(n).

**Worked problem: the longest substring without repeating characters.**

*Brute force:* check every substring for uniqueness: O(n^3) naively, O(n^2) with care. *Improvement:* a window that is always valid.

```python
def longest_unique(s):
    last = {}            # char -> most recent index
    left = best = 0
    for right, ch in enumerate(s):
        if ch in last and last[ch] >= left:
            left = last[ch] + 1       # jump past the earlier copy
        last[ch] = right
        best = max(best, right - left + 1)
    return best

print(longest_unique("abcabcbb"))   # -> 3   ("abc")
print(longest_unique("bbbb"))       # -> 1
print(longest_unique(""))           # -> 0
```

Width is `right - left + 1` because both ends are inclusive. Notice it combines two patterns: a window plus a dict.

## How to talk through a solution

A strong interview answer follows a script, and the script matters as much as the code:

1. **Clarify.** Ask about input size, duplicates, negatives, empty input, sorted or not. Restate the problem with an example.
2. **Brute force.** Say it out loud even if it is slow: "Try all pairs, O(n^2), O(1) space."
3. **Find the waste.** "The inner loop is searching for a value; a hash map answers that in O(1)." Name the pattern.
4. **State the improved complexity** before coding: time and space.
5. **Code it**, narrating. Then **trace a small example** by hand, including an edge case (empty, one element, duplicates).
6. **Re-state complexity** and mention the trade-off (memory for speed).

## Common mistakes (and how to spot them)

**1. Hidden O(n) inside a loop.** `if x in my_list` inside a `for` makes an O(n^2) solution that passes small tests and times out on large ones. Misconception: "`in` is one operation".

**2. Using two pointers on unsorted data.** The "too small, move left" argument only holds for sorted input. Sort first (O(n log n)) or use a hash map instead.

**3. Off-by-one in window width.** Writing `right - left` instead of `right - left + 1` under-counts by one. Remember that inclusive ends mean `+ 1`.

**4. Shrinking with `if` instead of `while`.** One removal may not restore validity; loop until the window is legal.

**5. Updating the dict before checking.** In two-sum, inserting first lets `5` pair with itself for target `10`.

## Check yourself

1. What is the time complexity of `for x in a: if x in b:` when `a` and `b` are lists of length `n`, and how do you fix it?

<details><summary>Answer</summary>

O(n^2), because `x in b` scans the list. Convert `b` to a set first (`b = set(b)`), making each check O(1) and the whole thing O(n) time with O(n) extra space.
</details>

2. Why is `list.pop(0)` slower than `list.pop()`?

<details><summary>Answer</summary>

Removing the first element shifts every remaining element one place left, which is O(n). Removing the last element shifts nothing, which is O(1). Use `collections.deque.popleft()` if you need fast removal from the front.
</details>

3. Why does the two-pointer pair-sum approach require sorted input?

<details><summary>Answer</summary>

Its correctness relies on order: if the sum is too small, moving the left pointer right is guaranteed to increase it, and the discarded element cannot pair with anything left. Without sorting, those guarantees disappear.
</details>

4. In a sliding window, why is the algorithm O(n) even though there is a `while` loop inside the `for`?

<details><summary>Answer</summary>

Each index is added to the window once and removed at most once. The inner loop's total iterations across the whole run are therefore at most `n`, giving about `2n` steps in total.
</details>

5. Give the time and space of the hash-map two-sum solution and the trade-off against brute force.

<details><summary>Answer</summary>

O(n) time and O(n) space, versus O(n^2) time and O(1) space for brute force. You spend memory on the dictionary to avoid the inner search.
</details>

## Key takeaways

- Big-O is about growth: count loops, remember hidden loops (`in` on a list, slicing, `sum`), drop constants.
- Know the costs: list membership O(n), set/dict membership O(1) average, sorting O(n log n), `insert(0)`/`pop(0)` O(n).
- Hash map: when you keep asking "have I seen it?", store what you have seen; check before you store.
- Two pointers: on sorted data, move the pointer that can improve the answer; each step discards an element.
- Sliding window: for contiguous ranges, expand right, shrink left with `while`, width is `right - left + 1`.
- In interviews, state brute force and its cost first, name the waste, then improve and re-state time and space.
