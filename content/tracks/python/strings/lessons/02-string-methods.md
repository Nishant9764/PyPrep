---
title: String Methods, Immutability and Formatting
summary: Transform and inspect text with the built-in string methods, understand why they return new strings, and format output with f-strings.
minutes: 20
concepts: [string-immutability, string-methods, string-formatting]
---

## Why this matters

Real text is messy: names typed with stray spaces, emails in mixed case, CSV lines glued together with commas, prices that need two decimals. Python strings come with dozens of ready-made methods that clean, search and reshape text. Knowing the handful that matter, and knowing the one rule that governs all of them (**strings never change; methods give you a new string**), removes a whole family of "why did nothing happen?" bugs. The last third of this lesson covers f-strings, the modern way to build output that looks right.

## The mental model

A string value is **immutable**: once created, its characters are frozen. There is no operation that edits a string in place. A method such as `s.upper()` does not touch `s`. It builds a brand-new string and hands it back to you.

```
 name = "  Ada "          name ---> "  Ada "
 name.strip()             (a new string "Ada" is created and returned)
                          name ---> "  Ada "   (still the old value!)
 name = name.strip()      name ---> "Ada"      (the NAME now points at the new string)
```

So the question to ask about any string method is always: "where did I put the result?" If you do not assign it, print it, or pass it on, it is thrown away.

A method call has the shape `value.method(arguments)`. The dot means "ask this string to do something". Methods can be chained from left to right because each one returns a string that the next one can use: `"  Hello ".strip().lower()` gives `"hello"`.

## Immutability in action

```python
s = "hello"
s.upper()
print(s)          # -> hello    nothing changed; the result was discarded

s = s.upper()
print(s)          # -> HELLO    rebinding the name to the new string
```

Trying to change one character fails loudly:

```python
s = "hello"
s[0] = "J"
# TypeError: 'str' object does not support item assignment
```

The fix is to build a new string from pieces:

```python
s = "hello"
s = "J" + s[1:]
print(s)          # -> Jello
```

Because each concatenation creates a new string, building a long string with `+=` in a big loop is slow. The idiomatic way is to collect pieces in a list and join them once (shown below).

## The methods you will use every day

**Case and cleaning.**

```python
raw = "  Hello, World!  "
print(raw.strip())        # -> Hello, World!      removes whitespace at both ends
print(raw.lstrip())       # -> 'Hello, World!  '  left side only
print(raw.lower())        # ->   hello, world!
print("hello world".title())   # -> Hello World
print("hello".capitalize())    # -> Hello
print("xxhixx".strip("x"))     # -> hi            strip these characters instead
```

**Searching and testing.**

```python
s = "banana"
print(s.find("an"))        # -> 1     first position, or -1 if absent
print(s.find("z"))         # -> -1
print(s.index("an"))       # -> 1     like find, but raises ValueError if absent
print(s.count("a"))        # -> 3
print(s.startswith("ban")) # -> True
print(s.endswith("na"))    # -> True
print("an" in s)           # -> True  the cheapest "contains" test
print("abc123".isdigit())  # -> False
print("123".isdigit())     # -> True
print("abc".isalpha())     # -> True
```

A classic trap: `find` returns `-1` when nothing is found, and `-1` is also a valid index (the last character!). Always test `if s.find(x) != -1` or, better, use `x in s`.

**Replacing.**

```python
print("a-b-c".replace("-", "+"))      # -> a+b+c
print("a-b-c".replace("-", "+", 1))   # -> a+b-c    only the first occurrence
```

**Splitting and joining.** These two are inverses and are the backbone of text processing. `split` turns one string into a list of pieces; `join` glues a list of strings back together using the string it is called on as the glue.

```python
line = "red,green,blue"
parts = line.split(",")
print(parts)                 # -> ['red', 'green', 'blue']
print("-".join(parts))       # -> red-green-blue
print("  many   spaces here ".split())   # -> ['many', 'spaces', 'here']
print("a,b,c".split(",", 1))              # -> ['a', 'b,c']
```

Called with no argument, `split()` splits on any run of whitespace and ignores leading and trailing whitespace, which is usually what you want for words. `join` needs every item to be a string, so convert numbers first: `",".join(str(n) for n in [1, 2, 3])` gives `"1,2,3"`.

Joining is also the right way to build a string piece by piece:

```python
pieces = []
for i in range(3):
    pieces.append(str(i * i))
print(" ".join(pieces))      # -> 0 1 4
```

## Formatting with f-strings

An f-string is a string literal with an `f` in front. Anything in curly braces is evaluated as Python and its value is inserted.

```python
name, score = "Ada", 93.456
print(f"{name} scored {score}")        # -> Ada scored 93.456
print(f"double: {score * 2}")          # -> double: 186.912
print(f"{name!r}")                     # -> 'Ada'      repr form, shows the quotes
```

After a colon inside the braces you can add a **format spec** that controls how the value looks:

```python
x = 3.14159
print(f"{x:.2f}")        # -> 3.14      two digits after the decimal point
print(f"{x:8.3f}|")      # ->    3.142| width 8, 3 decimals, right-aligned for numbers
n = 1234567
print(f"{n:,}")          # -> 1,234,567 thousands separator
print(f"{0.256:.1%}")    # -> 25.6%     percentage
print(f"{7:03d}")        # -> 007       zero-padded to width 3
print(f"{'hi':>6}|")     # ->     hi|   right-align in width 6
print(f"{'hi':<6}|")     # -> hi    |   left-align
print(f"{'hi':^6}|")     # ->   hi  |   centre
print(f"{'hi':*^7}")     # -> **hi***   centre with a fill character
```

The pattern is `{value:fill align width , .precision type}` and every part is optional. `>` right, `<` left, `^` centre. Numbers align right by default and text aligns left by default, which is why tables of numbers look tidy with a width and `.2f`.

Formatting changes how a value is **displayed**, not the value itself. `f"{x:.2f}"` produces a *string*; `x` is still `3.14159`. Use `round(x, 2)` if you need a rounded number.

## Common mistakes (and how to spot them)

**Calling a method and ignoring the result.** `name.strip()` on its own line does nothing visible. Misconception: "methods modify the string, like list methods do". Symptom: the output is exactly the same as the input. Fix: `name = name.strip()`.

**Expecting `replace` or `upper` to work in place.** Same cause. `text.replace("a", "b")` returns the new text; `text` still holds the old one.

**Using `find` result as a boolean.** `if s.find("x"):` is true when `x` is found at position 1 or more, true when it is *missing* (`-1` is truthy), and false when it is found at position 0. Use `if "x" in s:`.

**Passing non-strings to `join`.** `",".join([1, 2])` raises `TypeError: sequence item 0: expected str instance, int found`. Convert with `str()` first.

**Splitting on the wrong thing.** `"a, b".split(",")` gives `['a', ' b']` with a leading space. Strip each piece, or normalise first. Likewise `"a b".split(" ")` on text with double spaces yields empty strings; plain `split()` does not.

**Treating the format spec as rounding.** `f"{2.675:.2f}"` shows `2.67` (not `2.68`) because 2.675 cannot be stored exactly in binary floating point, and the underlying number is not changed. If an exact rule matters, round deliberately and understand float limits.

**Quotes inside f-strings.** On Python versions before 3.12 you cannot reuse the same quote type inside the braces: `f"{d["k"]}"` is a syntax error. Use `f"{d['k']}"` to stay compatible.

## Check yourself

1. After `s = "  hi  "` and `s.strip()`, what is `s`?

<details><summary>Answer</summary>

Still `"  hi  "`. Strings are immutable and `strip()` returns a new string, which was discarded. You need `s = s.strip()`.

</details>

2. What does `"a,b,,c".split(",")` return, and how does it differ from `"a  b".split()`?

<details><summary>Answer</summary>

`['a', 'b', '', 'c']`: an explicit separator keeps the empty piece between two commas. `"a  b".split()` gives `['a', 'b']` because with no argument Python splits on runs of whitespace and drops empties.

</details>

3. Write one expression that turns `["x", "y", "z"]` into `"x + y + z"`.

<details><summary>Answer</summary>

`" + ".join(["x", "y", "z"])`. The string you call `join` on is the glue placed between items.

</details>

4. What does `f"{1234.5:,.1f}"` produce, and what is the type of the result?

<details><summary>Answer</summary>

`'1,234.5'`, a `str`. The `,` adds the thousands separator and `.1f` keeps one decimal place.

</details>

5. Why is `if text.find("cat"):` a bug?

<details><summary>Answer</summary>

`find` returns `-1` if not found (truthy) and `0` if found at the very start (falsy), so the condition is backwards for those two cases. Use `if "cat" in text:` or compare with `-1` explicitly.

</details>

## Key takeaways

- Strings are immutable: every method returns a new string, so assign it (`s = s.strip()`) or use it directly.
- Learn the core set: `strip`, `lower`/`upper`, `replace`, `find`/`in`, `startswith`/`endswith`, `split`, `join`.
- `split` and `join` are inverses; `split()` with no argument handles messy whitespace; `join` needs strings.
- Build long strings by appending to a list and joining once, not by repeated `+=`.
- f-string format specs (`:.2f`, `:,`, `:>8`, `:03d`) change the display, not the value.
- `find` returns `-1` for "not found", which is a legal index; prefer `in` for yes/no checks.
