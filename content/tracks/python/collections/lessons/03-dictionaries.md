---
title: Dictionaries and the Counting Pattern
summary: Store and look up values by key, and build frequency tables and groups with manual loops, get, setdefault, Counter and defaultdict.
minutes: 25
concepts: [dict-basics, dict-counting]
---

## Why this matters

A list answers "what is at position 3?". Very often the real question is "what is the price of `apple`?" or "how many times did the word `the` appear?". Searching a list for the right entry works but is slow and clumsy. A **dictionary** (`dict`) stores *key/value pairs* and finds a value from its key almost instantly. It is the single most useful data structure in everyday Python and in interviews: counting, grouping, caching and "have I seen this?" problems are all dictionary problems.

## The mental model

Think of a dictionary as a set of labelled drawers. Each label (the **key**) is unique, and each drawer holds one **value**:

```
 prices = { "apple": 3,   "pear": 5,   "fig": 8 }
             key->value   key->value   key->value
```

You never ask for "drawer number 2". You ask for the drawer labelled `"pear"`. Python turns the key into a number (a *hash*) and jumps straight to the right spot, which is why a lookup takes about the same time for 10 keys or 10 million. Two consequences follow:

* keys must be **unique**: assigning to an existing key replaces its value;
* keys must be **hashable**, which in practice means immutable: strings, numbers and tuples work, lists do not. Values can be anything.

Since Python 3.7 a dict remembers insertion order, so iterating gives keys in the order they were first added.

## Creating, reading and changing

```python
prices = {"apple": 3, "pear": 5}
print(prices["pear"])        # -> 5
prices["fig"] = 8            # add a new key
prices["apple"] = 4          # replace an existing value
print(prices)                # -> {'apple': 4, 'pear': 5, 'fig': 8}
print(len(prices))           # -> 3
print("fig" in prices)       # -> True   (membership tests KEYS)
del prices["pear"]
print(prices)                # -> {'apple': 4, 'fig': 8}
```

Reading a key that does not exist raises a `KeyError`:

```python
print(prices["kiwi"])
# KeyError: 'kiwi'
```

There are two safe ways around it. Test first with `in`, or use `.get(key, default)`, which returns the default (`None` if you give none) instead of raising:

```python
print(prices.get("kiwi"))        # -> None
print(prices.get("kiwi", 0))     # -> 0
print(prices.get("apple", 0))    # -> 4
```

### Looping

A plain `for` loop over a dict walks the **keys**. Use `.values()` for values and `.items()` for both at once (each item is a `(key, value)` tuple that you can unpack):

```python
for name in prices:
    print(name)                  # -> apple, then fig
for name, cost in prices.items():
    print(name, cost)            # -> apple 4, then fig 8
print(sum(prices.values()))      # -> 12
```

Do not add or delete keys while looping over the same dict; Python raises `RuntimeError: dictionary changed size during iteration`. Loop over `list(prices)` if you must change it.

## The counting pattern, built from scratch

The most common dictionary job is a **frequency table**: how many times does each item occur? Suppose we want the letter counts of `"banana"`. The plan is: start with an empty dict, and for each item either start its count at 1 (first time seen) or add 1 to the existing count.

**Step 1: manual if/else.**

```python
counts = {}
for ch in "banana":
    if ch in counts:
        counts[ch] += 1
    else:
        counts[ch] = 1
print(counts)        # -> {'b': 1, 'a': 3, 'n': 2}
```

The `if ch in counts` check is essential. `counts[ch] += 1` on a missing key means "read `counts[ch]` first", and that raises `KeyError`. The `else` branch handles the first sighting.

**Step 2: `.get` with a default.** The if/else exists only to supply a starting value of 0. `.get(ch, 0)` supplies it directly, so the whole thing is one line:

```python
counts = {}
for ch in "banana":
    counts[ch] = counts.get(ch, 0) + 1
print(counts)        # -> {'b': 1, 'a': 3, 'n': 2}
```

Read it aloud: "the new count is the old count (or 0 if there is none) plus one".

**Step 3: `setdefault`.** `d.setdefault(key, default)` returns `d[key]` if it exists; otherwise it *stores* the default under that key and returns it. That is perfect for **grouping**, where the default is an empty list that you then mutate:

```python
words = ["tea", "ten", "bat", "bee", "tap"]
by_letter = {}
for w in words:
    by_letter.setdefault(w[0], []).append(w)
print(by_letter)     # -> {'t': ['tea', 'ten', 'tap'], 'b': ['bat', 'bee']}
```

**Step 4: `collections.Counter`.** Counting is so common that the standard library has a dict subclass built for it:

```python
from collections import Counter

c = Counter("banana")
print(c)                     # -> Counter({'a': 3, 'n': 2, 'b': 1})
print(c["a"])                # -> 3
print(c["z"])                # -> 0   (missing keys count as 0, no KeyError)
print(c.most_common(2))      # -> [('a', 3), ('n', 2)]
```

**Step 5: `collections.defaultdict`.** A `defaultdict` takes a *factory function* that builds the starting value whenever a missing key is touched. `defaultdict(int)` starts numbers at 0, `defaultdict(list)` starts lists at `[]`:

```python
from collections import defaultdict

counts = defaultdict(int)
for ch in "banana":
    counts[ch] += 1          # no KeyError: a missing key becomes 0 first
print(dict(counts))          # -> {'b': 1, 'a': 3, 'n': 2}

groups = defaultdict(list)
for w in ["tea", "ten", "bat"]:
    groups[w[0]].append(w)
print(dict(groups))          # -> {'t': ['tea', 'ten'], 'b': ['bat']}
```

Which one should you reach for? Use `Counter` when you only count, `defaultdict(list)` when you group, and know the manual versions because interviewers often ask you to write them without imports.

## A realistic example: most common word

```python
text = "the cat and the hat and the bat"
freq = {}
for word in text.split():
    freq[word] = freq.get(word, 0) + 1
print(freq)   # -> {'the': 3, 'cat': 1, 'and': 2, 'hat': 1, 'bat': 1}

best = max(freq, key=freq.get)
print(best, freq[best])   # -> the 3
```

`max(freq, key=freq.get)` loops over the keys and picks the one whose *count* is largest. Ties go to the key that was inserted first.

## Common mistakes (and how to spot them)

**1. Incrementing a key that does not exist yet.**

```python
counts = {}
counts["a"] += 1     # KeyError: 'a'
```

Misconception: "a missing key counts as zero". Only `Counter` and `defaultdict(int)` behave that way; a plain dict does not. Use `.get(k, 0)` or an `in` check.

**2. Testing the values instead of the keys.** `if 3 in prices` asks whether `3` is a *key*. To search values write `3 in prices.values()`.

**3. Sharing one default list.** `d = dict.fromkeys(keys, [])` puts the *same* list under every key, so appending to one changes all (this is the aliasing problem from the lists lesson). Build separate lists with `setdefault`, `defaultdict(list)` or a comprehension.

**4. Using a list as a key.** `d[[1, 2]] = "x"` raises `TypeError: unhashable type: 'list'`. Use a tuple: `d[(1, 2)] = "x"`.

**5. Printing a Counter's order and assuming it is sorted.** A `Counter` prints with the most common first, but a plain dict is in insertion order. If you need a specific order, sort explicitly.

## Check yourself

1. What does `d = {"a": 1}; d["b"]` do, and name two ways to avoid it?
<details><summary>Answer</summary>It raises <code>KeyError: 'b'</code>. Avoid it with <code>"b" in d</code> before reading, or with <code>d.get("b", default)</code>.</details>

2. What is printed by `d = {}; d["x"] = d.get("x", 0) + 1; d["x"] = d.get("x", 0) + 1; print(d)`?
<details><summary>Answer</summary><code>{'x': 2}</code>. The first line stores 0 + 1, the second reads 1 and stores 2.</details>

3. Why does `counts[ch] += 1` fail on a plain empty dict but work on `defaultdict(int)`?
<details><summary>Answer</summary>The augmented assignment reads <code>counts[ch]</code> first. A plain dict raises KeyError for a missing key; a defaultdict calls its factory (<code>int()</code> gives 0), stores the result and returns it, so the addition works.</details>

4. What does `for x in {"a": 1, "b": 2}` give you for x, and how do you get the numbers instead?
<details><summary>Answer</summary>The keys, <code>"a"</code> then <code>"b"</code>. Use <code>.values()</code> for the numbers or <code>.items()</code> for both.</details>

5. Which of these can be a dictionary key: `"hi"`, `7`, `(1, 2)`, `[1, 2]`?
<details><summary>Answer</summary>The string, the number and the tuple. The list is mutable and therefore unhashable, so it raises TypeError.</details>

## Key takeaways

* A dict maps unique, hashable keys to values and looks them up in about constant time.
* `d[k]` raises `KeyError` when missing; `d.get(k, default)` and `k in d` are the safe options.
* Looping over a dict gives keys; use `.items()` for key/value pairs.
* The counting pattern is `d[k] = d.get(k, 0) + 1`; grouping is `d.setdefault(k, []).append(v)`.
* `Counter` and `defaultdict` are shortcuts for the same two patterns; learn the manual form first.
* Only immutable values (strings, numbers, tuples) can be keys.
