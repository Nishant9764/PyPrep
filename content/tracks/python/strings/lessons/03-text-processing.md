---
title: Text Processing Patterns
summary: Clean, split, count and compare text using a handful of reusable patterns: normalising, tokenising, character counting, palindromes, anagrams and simple ciphers.
minutes: 20
concepts: [text-processing, string-methods, string-indexing]
---

## Why this matters

Text problems look different on the surface (is this a palindrome? count the words; shift every letter by three) but they are built from the same few moves. Learn the moves and you can assemble the solution to most beginner and interview string tasks without memorising each one. Those moves are: **normalise** the text, **split** it into tokens, **walk** it character by character, **count** things, and **rebuild** a result. This lesson shows each move and then combines them.

## The mental model

Think of a text task as a small pipeline:

```
raw text --> normalise --> break into pieces --> examine/transform pieces --> build the answer
 "  A man, a plan!"   "aman,aplan!"  -> characters   -> keep only letters  -> compare / count / join
```

Each stage uses ordinary tools you already have. Normalising uses `lower()`, `strip()`, and filters such as `isalpha()`. Breaking into pieces uses `split()` for words or a `for ch in s` loop for characters. Examining uses `if` and counters. Rebuilding uses `join` on a list or an accumulator string. The skill is deciding which stage the problem is about, and not mixing them up: a bug in "count the words" is usually a bug in the splitting stage, and a bug in "is it a palindrome" is usually a bug in the normalising stage.

## Pattern 1: normalise first

Before comparing text, decide what counts as "the same". Usually case and punctuation should not matter.

```python
raw = "  Hello, World!  "
clean = raw.strip().lower()
print(clean)                      # -> hello, world!

letters_only = "".join(ch for ch in raw.lower() if ch.isalpha())
print(letters_only)               # -> helloworld
```

The second line walks the string, keeps characters for which `isalpha()` is true, and glues them back together. Replace `isalpha` with `isalnum` to keep digits too, or with `ch.isspace()` to find whitespace. `isalpha`, `isdigit`, `isalnum`, `isspace`, `isupper` and `islower` are your character-classification toolkit.

## Pattern 2: tokenise (split into words)

```python
sentence = "the quick  brown fox"
words = sentence.split()
print(words)            # -> ['the', 'quick', 'brown', 'fox']
print(len(words))       # -> 4
longest = max(words, key=len)
print(longest)          # -> quick
```

Calling `split()` with no argument tolerates repeated spaces and tabs. Punctuation is not removed, so `"hi, there".split()` gives `['hi,', 'there']`. If punctuation matters, strip it from each token: `word.strip(".,!?")`.

## Pattern 3: walk the characters and count

Looping over a string gives one character at a time. Combine with a counter (an accumulator) to count anything.

```python
text = "Mississippi"
vowels = 0
for ch in text.lower():
    if ch in "aeiou":
        vowels += 1
print(vowels)           # -> 4
```

To count *each* character you need a table of counts, which is a dictionary. You will meet the full pattern in the collections topic, but here is the idea now:

```python
counts = {}
for ch in "banana":
    if ch in counts:
        counts[ch] += 1
    else:
        counts[ch] = 1
print(counts)           # -> {'b': 1, 'a': 3, 'n': 2}
```

Character counts are the key to anagram checks: two words are anagrams exactly when each letter appears the same number of times in both. A quicker way to get the same effect is to sort the letters:

```python
def is_anagram(a, b):
    a = a.lower().replace(" ", "")
    b = b.lower().replace(" ", "")
    return sorted(a) == sorted(b)

print(is_anagram("Listen", "Silent"))      # -> True
print(is_anagram("apple", "paple"))        # -> True
print(is_anagram("rat", "car"))            # -> False
```

`sorted(a)` returns a list of the characters in order. Two strings with the same multiset of letters produce the same sorted list.

## Pattern 4: compare from both ends (palindromes)

A palindrome reads the same forwards and backwards. Normalise, then compare with the reversed version:

```python
def is_palindrome(s):
    cleaned = "".join(ch.lower() for ch in s if ch.isalnum())
    return cleaned == cleaned[::-1]

print(is_palindrome("A man, a plan, a canal: Panama"))   # -> True
print(is_palindrome("hello"))                            # -> False
print(is_palindrome(""))                                 # -> True
```

An empty string reads the same both ways, so it counts as a palindrome. The version without slicing walks two positions towards each other, which is the two-pointer idea:

```python
def is_palindrome_loop(s):
    cleaned = "".join(ch.lower() for ch in s if ch.isalnum())
    i, j = 0, len(cleaned) - 1
    while i < j:
        if cleaned[i] != cleaned[j]:
            return False
        i += 1
        j -= 1
    return True
```

## Pattern 5: transform each character (a Caesar cipher)

A Caesar cipher shifts each letter a fixed number of places in the alphabet, wrapping around from `z` to `a`. The tools are `ord` (character to number) and `chr` (number to character), plus the remainder operator for the wrap.

```python
def caesar(text, shift):
    out = []
    for ch in text:
        if ch.isalpha() and ch.islower():
            offset = (ord(ch) - ord("a") + shift) % 26
            out.append(chr(ord("a") + offset))
        else:
            out.append(ch)          # leave spaces and punctuation alone
    return "".join(out)

print(caesar("abc xyz", 3))     # -> def abc
print(caesar("def abc", -3))    # -> abc xyz
```

Step by step for `"x"` with shift 3: `ord("x") - ord("a")` is 23, adding 3 gives 26, and `26 % 26` is 0, so the result is `"a"`. The `% 26` is what makes the alphabet wrap, and Python's `%` returns a non-negative result for a positive modulus, so negative shifts work too.

Notice the shape: loop over characters, decide what to do with each, append to a list, join once at the end. Most "transform text" tasks fit this template.

## Common mistakes (and how to spot them)

**Forgetting to normalise.** `is_palindrome("Racecar")` is `False` if you compare `"Racecar"` with `"racecaR"`. Misconception: "equal-looking text is equal". Symptom: correct on lowercase test words, wrong on sentences with capitals, spaces or punctuation. Lowercase first and filter with `isalnum()`.

**Splitting with a single space.** `"a  b".split(" ")` has an empty string in the middle, so word counts are inflated. Use `split()`.

**Counting words by counting spaces.** `text.count(" ")` is the number of gaps in a clean sentence, so you get one too few, and wrong again with doubled spaces. Use `len(text.split())`.

**Off-by-one in character loops.** Writing `for i in range(1, len(s))` skips the first character; `range(len(s) - 1)` skips the last. When in doubt, loop directly over the string (`for ch in s`) and only use indexes when you really need positions.

**Modifying a string while "walking" it.** Code such as `for ch in s: s = s.replace(ch, "")` does not change what the loop is iterating over; the loop keeps walking the original string. Build a separate result.

**Building a result with `+=` and forgetting the starting value.** `result = None` then `result += ch` raises `TypeError`. Start with `""` or a list.

**Cipher wrap-around errors.** Writing `chr(ord(ch) + shift)` without `% 26` pushes `"z"` past the letters into punctuation. Subtract `ord("a")` first, apply `% 26`, then add it back.

## Check yourself

1. Why does `"Hello, world".split()` give `['Hello,', 'world']`, and how would you remove the comma?

<details><summary>Answer</summary>

`split()` only divides on whitespace, so the comma stays attached to the token. Clean each token, for example `[w.strip(",.!?") for w in text.split()]`, or filter the characters before splitting.

</details>

2. What does `sorted("cab")` return, and why does comparing sorted strings test for anagrams?

<details><summary>Answer</summary>

`['a', 'b', 'c']`, a list of characters in order. Two words are anagrams exactly when they contain the same letters with the same counts, and sorting puts any such pair into the identical sequence.

</details>

3. Is the empty string a palindrome under the function `s == s[::-1]`? Is that sensible?

<details><summary>Answer</summary>

Yes, `"" == ""[::-1]` is `True`. It is the standard convention: there is nothing that differs between the two readings.

</details>

4. In the Caesar cipher, what is `chr(ord("a") + (ord("y") - ord("a") + 3) % 26)`?

<details><summary>Answer</summary>

`"b"`. `"y"` is offset 24, plus 3 is 27, and `27 % 26 = 1`, which is offset 1 from `"a"`.

</details>

5. Why is it better to collect pieces in a list and `"".join(...)` them than to do `result += ch` for a long text?

<details><summary>Answer</summary>

Strings are immutable, so each `+=` can create a new string and copy the old one, which gets slow for long inputs. A list append is cheap and `join` builds the final string once.

</details>

## Key takeaways

- Think in a pipeline: normalise, tokenise, examine, rebuild. Find which stage a bug lives in.
- Use `lower()` and `isalnum()`/`isalpha()` to make comparisons ignore case and punctuation.
- `split()` with no argument is the safe tokeniser for words; `join` is the safe way to rebuild.
- Counting characters is an accumulator problem; a dictionary of counts, or `sorted`, turns it into an anagram test.
- Palindrome checks compare a cleaned string with its reverse, or walk two pointers inward.
- Character transforms follow one template: loop, decide per character, append to a list, join once. `ord`, `chr` and `% 26` handle alphabet arithmetic.
