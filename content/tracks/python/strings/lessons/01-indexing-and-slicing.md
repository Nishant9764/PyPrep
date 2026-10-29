---
title: Indexing and Slicing
summary: Pick single characters, cut out pieces, and walk a string forwards or backwards with a step, without guessing at off-by-one or direction.
minutes: 20
concepts: [string-indexing, slicing, slice-step]
---

## Why this matters

Almost every text task starts with "get this character" or "get that piece": the first letter of a name, the file extension, the last four digits of a card number, a string read backwards to test a palindrome. Python gives you one compact notation, square brackets, for all of it. The notation has three separate skills hiding inside it, and most bugs come from blurring them together:

1. **Indexing** picks exactly one character: `s[3]`.
2. **Slicing** picks a stretch between two boundaries: `s[2:5]`.
3. **Stepping** picks every k-th character, forwards or backwards: `s[::2]`, `s[::-1]`.

We will learn them one at a time, each with its own traps.

## The mental model

A string is an ordered row of characters. Every character sits in a numbered slot. The numbers start at **0**, not 1, because an index really means "how many characters you have to skip from the front".

```
 s = "python"

 character:    p    y    t    h    o    n
 index:        0    1    2    3    4    5
 negative:    -6   -5   -4   -3   -2   -1
```

Negative numbers count from the back: `-1` is the last character, `-2` the one before it. Python simply adds `len(s)` to a negative index, so `s[-1]` means `s[len(s) - 1]`.

For slicing it is more useful to imagine the numbers written on the **lines between the characters**:

```
   | p | y | t | h | o | n |
   0   1   2   3   4   5   6
```

A slice `s[a:b]` copies everything between line `a` and line `b`. That picture explains why the start is included and the stop is excluded: you cut at two lines, and the character *after* line `b` is not between them.

## Skill 1: indexing a single character

```python
s = "python"
print(s[0])      # -> p      first character
print(s[3])      # -> h
print(s[-1])     # -> n      last character
print(s[-2])     # -> o
print(s[len(s) - 1])  # -> n  same as s[-1]
```

An index returns a **string of length one**, not a special "character" type. Asking for a slot that does not exist is an error, and it is the only place in this lesson where an error is raised:

```python
s = "python"
print(s[6])
# IndexError: string index out of range
```

The valid positions for a string of length `n` are `0` to `n - 1` and `-n` to `-1`. For `"python"` that is `0..5` and `-6..-1`. An empty string has no valid positions at all, so `""[0]` raises `IndexError`; this is the classic crash when a program assumes the input is not empty.

Indexing combines naturally with loops. Here are two ways to visit every character with its position:

```python
s = "abc"
for i in range(len(s)):
    print(i, s[i])
# -> 0 a
# -> 1 b
# -> 2 c

for i, ch in enumerate(s):
    print(i, ch)       # same output, no manual indexing
```

## Skill 2: slicing bounds

A slice has the form `s[start:stop]`. It returns a **new string** containing the characters at positions `start, start+1, ..., stop-1`. The start is **included**, the stop is **excluded**.

```python
s = "python"
print(s[1:4])    # -> yth     positions 1, 2, 3
print(s[0:2])    # -> py      positions 0, 1
print(s[2:3])    # -> t       one character, but still a string
print(s[3:3])    # -> ''      start == stop: nothing between the lines
```

A handy consequence: the length of `s[a:b]` is `b - a` (when both are in range), and `s[:k] + s[k:]` is always the whole string with no gap and no overlap.

Either bound may be left out. A missing start means "from the very beginning", a missing stop means "to the very end":

```python
s = "python"
print(s[:2])     # -> py      the first two characters
print(s[2:])     # -> thon    everything from position 2
print(s[-3:])    # -> hon     the last three characters
print(s[:-1])    # -> pytho   everything except the last character
print(s[:])      # -> python  a full copy
```

Now the surprise. Slicing is forgiving. Bounds that are too large or too small are quietly clamped to the string's ends, and a slice that selects nothing returns the empty string. **Slices never raise IndexError.**

```python
s = "python"
print(s[2:100])   # -> thon   stop clamped to 6
print(s[-100:2])  # -> py     start clamped to 0
print(s[10:20])   # -> ''     nothing there
print(s[4:2])     # -> ''     start is after stop (with the default step)
print(""[0:5])    # -> ''     slicing an empty string is fine
```

This is why `s[:1]` is a safe way to get "the first character or nothing" while `s[0]` crashes on an empty string.

## Skill 3: the step, and the negative step

A slice can take a third number: `s[start:stop:step]`. The step is how far Python moves after each pick. The default is `1`.

```python
s = "abcdefghij"
print(s[::2])     # -> acegi   every second character, from the start
print(s[1::2])    # -> bdfhj   every second character, starting at position 1
print(s[::3])     # -> adgj
print(s[2:8:2])   # -> ceg     positions 2, 4, 6
```

### A negative step walks backwards

With `step = -1` Python moves one position **left** after each pick. And here is the part that confuses nearly everyone: **when the step is negative, the defaults for start and stop flip.** With a positive step the default start is the beginning and the default stop is the end. With a negative step the default start is the *end* and the default stop is *beyond the beginning*. Python picks the defaults that make sense for the direction you are travelling.

```python
s = "abcdefghij"
print(s[::-1])    # -> jihgfedcba   start at the last char, go left to the very beginning
print(s[::-2])    # -> jhfdb        last char, then every second one going left
print(s[5:1:-1])  # -> fedc         start at 5, walk left, stop BEFORE reaching 1
print(s[8:2:-3])  # -> if           8, 5, then 2 is the stop (excluded)
```

Look at `s[5:1:-1]`. The rule "stop is excluded" still holds, but now you approach the stop from the right: the picks are positions 5, 4, 3, 2, and then position 1 is the stop, so it is not included.

Why is `s[1:5:-1]` empty?

```python
s = "abcdefghij"
print(s[1:5:-1])   # -> ''
```

You told Python to start at 1 and walk **left**, but the stop 5 is to the *right* of the start. You are already past the finish line before taking a step, so nothing is selected. When you use a negative step, the start must be the larger number and the stop the smaller one. The same idea explains why `s[4:2]` is empty with the default step: you cannot walk right from 4 to reach 2.

The explicit loop that does the same thing as `s[::-1]` makes the direction visible:

```python
s = "abc"
out = ""
for i in range(len(s) - 1, -1, -1):   # start at last index, stop before -1, step -1
    out += s[i]
print(out)    # -> cba
```

Notice that `range(len(s) - 1, -1, -1)` has exactly the same shape as the slice: start at the last index, stop *before* `-1` (so index 0 is included), step by `-1`. Inside a slice you cannot write `s[len(s)-1:-1:-1]` for the same job, because there `-1` is read as "the last character" and the result is empty; that is why the slice leaves the stop out entirely.

## Common mistakes (and how to spot them)

### Indexing mistakes

**Using the length as an index.** `s[len(s)]` raises `IndexError` because the last valid index is `len(s) - 1`. Misconception: "the positions are 1 to n". They are 0 to n-1. Symptom: crash exactly at the end of a loop such as `for i in range(len(s) + 1)`.

**Forgetting that an empty string has no first character.** `s[0]` on `""` raises `IndexError`. Guard with `if s:` or use `s[:1]`.

**Trying to assign to an index.** `s[0] = "J"` raises `TypeError: 'str' object does not support item assignment`. Strings are immutable; build a new one with `"J" + s[1:]`.

### Slicing-bound mistakes

**Expecting the stop to be included.** `"python"[1:3]` is `"yt"`, not `"yth"`. Misconception: treating the stop like an index to *keep*. Think of it as the line where you cut, and the length as `stop - start`.

**Expecting an error for a large bound.** `s[0:100]` returns the whole string; it does not raise. If your program silently returns the wrong amount of text, check whether you assumed an error would warn you.

### Step mistakes

**Reversing with the wrong bounds.** `s[1:5:-1]` is empty, and `s[0:3:-1]` is empty too. With a negative step the start must be to the *right* of the stop. If a backwards slice gives `''`, swap the bounds or drop them.

**Thinking `s[-1:0:-1]` reverses the whole string.** It stops *before* index 0, so the first character is missing: `"abc"[-1:0:-1]` is `"cb"`. Leave the stop empty to run all the way to the beginning.

**Mixing up "step" with "number of items".** `s[::2]` means "every second character", not "two characters".

## Check yourself

1. What does `"banana"[-2]` return?

<details><summary>Answer</summary>

`"n"`. Negative indexes count from the back: `-1` is the last `"a"`, `-2` is the `"n"` before it. Python computes `len(s) - 2 = 4`, and `"banana"[4]` is `"n"`.

</details>

2. What is `"python"[2:100]`, and does it raise an error?

<details><summary>Answer</summary>

`"thon"`, and no error. Slice bounds outside the string are clamped to its ends. Only a single index such as `"python"[100]` raises `IndexError`.

</details>

3. Evaluate `"abcdefghij"[7:2:-2]`.

<details><summary>Answer</summary>

`"hfd"`. Start at index 7 (`h`), then move left by 2 each time: 7, 5, 3 give `h`, `f`, `d`. The next pick would be index 1, which is beyond the stop 2, so the walk ends.

</details>

4. Why is `"abcdef"[1:4:-1]` an empty string?

<details><summary>Answer</summary>

A negative step walks left, but the stop (4) is to the right of the start (1), so the walk is finished before it starts. For a backwards slice the start must be larger than the stop, for example `"abcdef"[4:1:-1]` is `"edc"`.

</details>

5. Write a slice that returns the last three characters of `s`, and one that returns `s` without its last character.

<details><summary>Answer</summary>

`s[-3:]` and `s[:-1]`. Both are safe on short strings: `"ab"[-3:]` is `"ab"` and `""[:-1]` is `""`.

</details>

## Key takeaways

- Positions start at 0; negative indexes count from the end; only a single index can raise `IndexError`.
- `s[a:b]` includes `a`, excludes `b`, has length `b - a`, and never raises, because out-of-range bounds are clamped.
- Omitted bounds mean "to the edge" in the direction of travel: that is why `s[::-1]` starts at the last character.
- A negative step reverses the walk and flips the default start and stop; for an explicit backwards slice the start must be greater than the stop.
- `s[::-1]` is the slice twin of `for i in range(len(s) - 1, -1, -1)`.
- Slices return new strings; a string itself can never be changed by indexing.
