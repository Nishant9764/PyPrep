---
title: Strings: syntax reference
---

## Indexing and slicing

| Expression | Meaning | Example (`s = "python"`) |
|---|---|---|
| `s[0]` | first character | `'p'` |
| `s[-1]` | last character | `'n'` |
| `s[i]` with `i >= len(s)` | raises `IndexError` | `s[6]` fails |
| `s[a:b]` | from `a` up to **but not including** `b` | `s[1:4]` -> `'yth'` |
| `s[:b]` / `s[a:]` | omitted start = 0, omitted stop = end | `s[:2]` -> `'py'` |
| `s[a:b:k]` | every `k`-th character | `s[::2]` -> `'pto'` |
| `s[::-1]` | whole string, walking backwards | `'nohtyp'` |
| `s[5:1:-1]` | start at 5, walk back, stop before 1 | `'noht'` |
| `s[1:5:-1]` | start is *before* stop but step is negative | `''` (empty) |

Slices never raise `IndexError`: `s[2:100]` is `'thon'`.

Rule for a **negative step**: the defaults flip. Omitted start means "the last character", omitted stop means "before the first character".

## Methods (all return a new string)

| Task | Method |
|---|---|
| change case | `s.lower()`, `s.upper()`, `s.title()`, `s.capitalize()`, `s.swapcase()` |
| trim | `s.strip()`, `s.lstrip()`, `s.rstrip()`, `s.strip("x")` |
| search | `s.find(t)` (-1 if absent), `s.index(t)` (error if absent), `t in s`, `s.count(t)` |
| test | `s.startswith(t)`, `s.endswith(t)`, `s.isdigit()`, `s.isalpha()`, `s.isalnum()`, `s.isspace()` |
| replace | `s.replace(old, new)` |
| split / join | `"a b".split()` -> `['a', 'b']`; `",".join(["a", "b"])` -> `'a,b'` |

Strings are **immutable**: `s[0] = "x"` is a `TypeError`, and `s.upper()` alone does nothing unless you keep the result: `s = s.upper()`.

## f-strings

```python
name, score, total = "Asha", 7, 9
f"{name} scored {score}/{total}"       # 'Asha scored 7/9'
f"{score / total:.2f}"                 # '0.78'   (2 decimals)
f"{score / total:.1%}"                 # '77.8%'
f"{1234567:,}"                         # '1,234,567'
f"{name:>8}|{name:<8}|{name:^8}"       # right, left, centre in width 8
f"{7:03d}"                             # '007'
f"{name!r}"                            # "'Asha'"
```

## Handy patterns

```python
"".join(reversed(s))          # reverse
s == s[::-1]                  # palindrome check
"".join(c for c in s if c.isalnum()).lower()   # keep letters/digits
sorted(s) == sorted(t)        # anagram check
ord("a"), chr(97)             # char <-> code point
```
