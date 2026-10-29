---
title: Input, Output and Type Conversion
summary: Read text from the user with input(), convert it to numbers with int() and float(), and build clear output with print() options and f-strings.
minutes: 16
concepts: [type-conversion, io-formatting]
---

## Why this matters

A program that cannot talk to anyone is not much use. `print()` is how your program shows results, and `input()` is how it asks questions. Almost every beginner program, and a surprising number of interview and automated-test exercises, is some version of "read something, work something out, print it nicely".

There is one fact that causes more first-week bugs than any other: **`input()` always gives you text**, even when the user types digits. The cure is type conversion, and once you understand why conversion is needed you will also understand a large class of `TypeError` and "my numbers are being glued together" problems.

## The mental model

Think of your program as a small factory with a front door and a loading dock.

```
 keyboard ──▶ input() ──▶ str ──▶ int()/float() ──▶ your logic ──▶ f"..." ──▶ print() ──▶ screen
              (always text)        (convert)                      (format)
```

Everything entering through `input()` is a **string**, a sequence of characters. The characters `"4"`, `"2"` have no numeric meaning until you ask for it. Everything leaving through `print()` is turned into text too. Conversion happens at the doors; inside, you work with proper numbers.

## print(): showing results

`print()` writes its arguments to the screen, separated by a space, then adds a newline:

```python
print("Hello")             # -> Hello
print("Total:", 42)        # -> Total: 42
print("a", "b", "c")       # -> a b c
```

Two options change that behaviour. `sep` is the text placed *between* items, and `end` is the text placed *after* the last item (default newline):

```python
print("a", "b", "c", sep="-")        # -> a-b-c
print("Loading", end="...")
print("done")                         # -> Loading...done
print(1, 2, 3, sep="")               # -> 123
print()                               # prints an empty line
```

`print` does not return the text; it returns `None`. It is for showing things to humans. Inside a function, if the caller needs the answer, use `return`; printing is not returning.

### f-strings: building text with values

Joining text and numbers with `+` is clumsy because of the `str`/`int` clash. An **f-string** is a string with an `f` in front; anything in `{}` is evaluated and inserted:

```python
name = "Asha"
score = 92
print(f"{name} scored {score}")           # -> Asha scored 92
print(f"Next year: {score + 1}")          # -> Next year: 93
print(f"{name.upper()} has {len(name)} letters")   # -> ASHA has 4 letters
```

Inside the braces you can add a **format spec** after a colon to control how a value looks:

```python
price = 3.14159
print(f"{price:.2f}")        # -> 3.14        two digits after the point
print(f"{1234567:,}")        # -> 1,234,567   thousands separator
print(f"{7:03d}")            # -> 007         pad with zeros to width 3
print(f"[{'hi':>6}]")        # -> [    hi]     right-align in width 6
print(f"[{'hi':<6}]")        # -> [hi    ]     left-align
print(f"{0.256:.1%}")        # -> 25.6%        percent
```

`.2f` means "fixed point, 2 decimals" and also *rounds* the displayed value. The number itself is not changed; only its text is.

## input(): asking questions

`input(prompt)` shows the prompt, waits for the user to press Enter, and returns what they typed as a `str` (without the newline):

```python
name = input("Your name? ")
print(f"Hello, {name}!")
# user types: Sam
# -> Hello, Sam!
```

Now the trap. Suppose the user types `4` and `5` for two questions and you add them:

```python
a = input()      # user types 4
b = input()      # user types 5
print(a + b)     # -> 45     not 9!
```

Both are strings, so `+` joined them. Convert first.

## Type conversion

The functions `int()`, `float()`, `str()` and `bool()` take a value and build a new value of that type. They do not modify the original.

```python
print(int("42") + 1)        # -> 43
print(float("3.5") * 2)     # -> 7.0
print(str(99) + " balloons")   # -> 99 balloons
print(int(7.9))             # -> 7      truncates, does NOT round
print(int(-7.9))            # -> -7
print(float(3))             # -> 3.0
print(round(7.9))           # -> 8      use round() to round
```

So a correct "add two numbers" program is:

```python
a = int(input())    # user types 4
b = int(input())    # user types 5
print(a + b)        # -> 9
```

What can go wrong:

```python
int("3.5")      # ValueError: invalid literal for int() with base 10: '3.5'
int("hello")    # ValueError
int("")         # ValueError   (the user just pressed Enter)
float("3.5")    # fine, 3.5
int(float("3.5"))   # fine, 3 (go through float first)
int(" 42 ")     # fine, 42    (surrounding spaces are tolerated)
```

`int()` on text accepts only whole-number text. If the input might have decimals, use `float()`.

### bool() and truthiness

`bool(x)` is `False` for "empty" values and `True` for everything else:

```python
print(bool(0), bool(""), bool(None))     # -> False False False
print(bool(1), bool("0"), bool("False")) # -> True True True
```

The last two surprise people: `"0"` and `"False"` are non-empty strings, so they are `True`. Converting text to a boolean is a comparison job (`answer == "yes"`), not a `bool()` job.

### A realistic example

A tip calculator that reads two lines and prints a tidy receipt:

```python
bill = float(input("Bill: "))
percent = int(input("Tip %: "))
tip = bill * percent / 100
print(f"Tip: {tip:.2f}")
print(f"Total: {bill + tip:.2f}")
# user types 48.50 then 15
# -> Tip: 7.28
# -> Total: 55.77
```

Reading it: two doors with conversion (`float`, `int`), pure arithmetic in the middle, and formatting at the exit door. This three-stage shape (read and convert, compute, format and print) is how most small programs are built.

## Common mistakes (and how to spot them)

**Mistake 1: doing arithmetic on `input()` text.**

```python
age = input("Age: ")
print(age + 1)
# TypeError: can only concatenate str (not "int") to str
```

*Misconception:* the user typed a number, so I got a number. You got the text `"25"`. Wrap with `int()`. A related silent version: `input() * 2` on `"5"` gives `"55"`, no error at all.

**Mistake 2: forgetting that `print` shows, not returns.**

```python
def double(n):
    print(n * 2)

x = double(4)    # prints 8
print(x)         # -> None
```

*Symptom:* `None` appearing in results, or tests that expect a value finding nothing.

**Mistake 3: `int()` of decimal text.** `int("2.5")` crashes. Convert with `float` first, or `int(float(s))`.

**Mistake 4: expecting `int()` to round.** `int(2.99)` is `2`. Use `round(2.99)` to get 3.

**Mistake 5: forgetting the `f` prefix.** `print("Hello {name}")` prints the braces literally. Put an `f` before the opening quote.

**Mistake 6: converting once but using the old variable.**

```python
n = input()
int(n)             # result thrown away!
print(n + 1)       # still TypeError
```

Conversion functions *return* a new value. Write `n = int(n)`.

**Mistake 7: rounding the data instead of the display.** `f"{x:.2f}"` formats for show. If you need the rounded number to continue calculations, use `round(x, 2)`.

## Check yourself

1. The user types `12` and `8`. What does `print(input() + input())` show, and why?

<details><summary>Answer</summary>`128`. `input()` returns strings, and `+` concatenates them. Use `int(input()) + int(input())` to get 20.</details>

2. What do `int(9.99)`, `round(9.99)` and `int("9")` give?

<details><summary>Answer</summary>`9`, `10` and `9`. `int()` truncates floats; `round()` rounds.</details>

3. Write one `print` call that outputs `x=3, y=4` from variables `x` and `y`, using an f-string.

<details><summary>Answer</summary>`print(f"x={x}, y={y}")`. Alternatively `print("x=", x, ", y=", y, sep="")`.</details>

4. What does `print("a", "b", sep="", end="!")` output?

<details><summary>Answer</summary>`ab!` with no trailing newline, so the next print continues on the same line.</details>

5. What does `f"{2 / 3:.3f}"` produce?

<details><summary>Answer</summary>`0.667`. Three digits after the decimal point, rounded.</details>

## Key takeaways

- `input()` **always returns a `str`**. Convert with `int()` or `float()` before doing arithmetic.
- Conversion functions return new values; assign the result (`n = int(n)`).
- `int()` truncates toward zero and rejects decimal text; `round()` rounds; `float()` accepts both.
- `print(..., sep=..., end=...)` controls separators and line endings; `print` returns `None`.
- f-strings embed expressions, and specs like `:.2f`, `:,` and `:>6` control formatting.
- Build programs in three stages: read and convert, compute, format and print.
