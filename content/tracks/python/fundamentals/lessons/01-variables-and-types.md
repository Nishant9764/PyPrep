---
title: Variables, Values and Types
summary: Explain what a variable really is in Python, predict what happens when you assign one name to another, and use type() to find out what kind of value you are holding.
minutes: 15
concepts: [variables-types]
---

## Why this matters

Every program you will ever write does the same three things: it holds some information, it does something with that information, and it shows a result. This lesson is about the first of those. The information is made of **values** (the number 42, the text "hello", the answer True), and the way we hold on to them is with **variables**.

It sounds trivial, and the syntax really is trivial. The trouble is that many beginners carry in a wrong picture of what a variable is, usually "a box with a value inside". That picture works for the first week and then quietly breaks when you meet lists, functions and objects. If you get the right picture now, a whole family of later confusions (why did my list change when I didn't touch it?) will never happen to you.

You will also meet your first error messages here. A `NameError` or a `TypeError` is not Python being rude; it is Python telling you exactly which of two simple rules you broke.

## The mental model

Forget boxes. Think of **sticky notes**.

- A **value** lives somewhere in memory. It is created when your program runs a piece of code like `42` or `"hello"`.
- A **variable** (better: a *name*) is a sticky note with a label written on it, stuck onto a value.
- The statement `age = 42` means: "make (or find) the value 42, and stick the label `age` on it."

```
   age ───────▶ 42
```

Two important consequences follow.

1. Values have types; **names do not**. The value `42` is an integer. The value `"hello"` is a string. The name `age` is just a label, and next week you can stick it on something else entirely.
2. One value can wear several labels at the same time.

```
   a ──┐
       ├──▶ 42
   b ──┘
```

When you write `b = a`, Python does not copy anything. It looks at what `a` is stuck to and sticks a second label `b` on the same value. For numbers and text this is invisible because those values can never be changed. It becomes very visible once you meet lists, which we cover in the collections topic.

Reading code gets easier if you always read `=` as "**the name on the left now refers to the value on the right**", never as the maths statement "is equal to".

## Assignment, step by step

Python runs an assignment in a fixed order: first it works out the value on the right-hand side, then it sticks the name from the left-hand side on it.

```python
x = 10
y = x + 5
print(x, y)   # -> 10 15
```

Line 1 makes the value 10 and labels it `x`. Line 2 first evaluates `x + 5` (which is 15), then labels that new value `y`. Nothing links `y` back to `x`. If `x` changes later, `y` stays 15:

```python
x = 10
y = x + 5
x = 100
print(x, y)   # -> 100 15
```

`x = 100` did not alter the value 10. It moved the `x` label onto a brand-new value, 100. `y` still points at 15. Learners who think of boxes often expect `y` to become 105, as in a spreadsheet. Variables are not spreadsheet cells; they do not recalculate.

The right side is always worked out **before** the name changes, which is why this common line makes sense:

```python
count = 3
count = count + 1
print(count)   # -> 4
```

Python computes `count + 1` using the old label (3 + 1 = 4), then moves the label `count` onto 4. As a shorthand you can write `count += 1`.

You can also bind several names at once:

```python
a, b = 1, 2
a, b = b, a        # swap without a temporary variable
print(a, b)        # -> 2 1
```

Everything on the right is evaluated first (the pair 2, 1), and only then are the labels moved. That is why the swap works.

### Choosing names

Names may contain letters, digits and underscores, and must not start with a digit. They are case-sensitive: `score` and `Score` are different names. Python style is `snake_case` (`total_price`), and a good name says what the value *means*, not what it is. Avoid reusing built-in names such as `list`, `str`, `sum` or `max` for your own variables, because you would hide the real ones.

## Every value has a type

A **type** tells Python what a value is and therefore what you may do with it. The four you will use most often at the start:

| Type | Example values | Meaning |
|------|---------------|---------|
| `int` | `7`, `-3`, `0` | whole numbers |
| `float` | `3.14`, `-0.5`, `2.0` | numbers with a decimal point |
| `str` | `"hi"`, `'a'`, `""` | text |
| `bool` | `True`, `False` | yes/no answers |

Ask Python what it is holding with `type()`:

```python
print(type(7))        # -> <class 'int'>
print(type(7.0))      # -> <class 'float'>
print(type("7"))      # -> <class 'str'>
print(type(True))     # -> <class 'bool'>
print(type(None))     # -> <class 'NoneType'>
```

Notice that `7`, `7.0` and `"7"` look alike to a human but are three different values of three different types. `None` is a special value meaning "nothing here", and you will see it often later.

Because types belong to values, the same name can hold different types over time (Python is *dynamically typed*):

```python
thing = 5
print(type(thing))    # -> <class 'int'>
thing = "five"
print(type(thing))    # -> <class 'str'>
```

That freedom is convenient, but it means mistakes show up when the program runs rather than before.

## What the type allows

The operation you perform must make sense for the type. `+` adds numbers but *joins* strings:

```python
print(2 + 3)          # -> 5
print("2" + "3")      # -> 23
print("ab" * 3)       # -> ababab
```

Mixing the two is an error, because Python refuses to guess whether you meant 5 or "23":

```python
print("age: " + 42)
# TypeError: can only concatenate str (not "int") to str
```

Two ways to fix it, depending on what you want: convert the number with `str(42)`, or pass separate items to `print`, which converts them for you: `print("age:", 42)`. The next lessons come back to conversion in detail.

You can also test a type directly: `isinstance(42, int)` is `True`. One quirk worth knowing is that `bool` is a kind of `int`: `True == 1` and `True + True` is 2. You will rarely need it, but it explains some odd results.

## Common mistakes (and how to spot them)

**Mistake 1: expecting a name to update itself.**

```python
price = 10
total = price * 3
price = 20
print(total)   # -> 30   (not 60)
```

*Symptom:* an old result when you expected a new one. *Misconception:* a variable is a formula that stays linked. In truth `total` is a label stuck on the value 30, computed once. To get 60 you must run `total = price * 3` again.

**Mistake 2: using a name before giving it a value.**

```python
print(score)
# NameError: name 'score' is not defined
```

*Symptom:* `NameError`. Python only knows a name after an assignment has actually run. It is usually a typo (`scroe`) or the assignment sits later in the file, or inside a branch that did not execute.

**Mistake 3: using `=` where you meant `==`.** `=` binds a name; `==` asks whether two values are equal. `if x = 5:` is a `SyntaxError` for exactly this reason.

**Mistake 4: forgetting quotes.** `name = Alice` looks for a variable called `Alice` and fails with a `NameError`. Text needs quotes: `name = "Alice"`.

**Mistake 5: treating digits in a string as a number.**

```python
a = "10"
b = "20"
print(a + b)   # -> 1020
```

*Symptom:* concatenation instead of addition. *Misconception:* the characters look like numbers so they must behave as numbers. The type is `str`, so `+` joins.

**Mistake 6: shadowing a built-in.** After `sum = 0`, the call `sum([1, 2, 3])` fails with `TypeError: 'int' object is not callable`, because the label `sum` now sticks to the integer 0.

## Check yourself

1. After `a = 5`, `b = a`, `a = 9`, what are `a` and `b`?

<details><summary>Answer</summary>`a` is 9 and `b` is 5. `b = a` stuck a second label on the value 5. `a = 9` then moved only the label `a` onto a new value, so `b` was unaffected.</details>

2. What does this print? `x = 2; y = x * 3; x = 10; print(y)`

<details><summary>Answer</summary>6. `y` was computed once as 2 * 3 and is not linked to `x`.</details>

3. What is `type("3.5")`, and what is `type(3.5)`?

<details><summary>Answer</summary>`<class 'str'>` for the first (it is in quotes, so it is text) and `<class 'float'>` for the second.</details>

4. Why does `"total: " + 10` raise an error, and give two fixes.

<details><summary>Answer</summary>`+` between a string and an integer is ambiguous, so Python raises `TypeError`. Fix with `"total: " + str(10)` or `print("total:", 10)` (or an f-string, covered later).</details>

5. After `a, b = 1, 2` then `a, b = b, a + b`, what are `a` and `b`?

<details><summary>Answer</summary>`a` is 2 and `b` is 3. The right side is evaluated first using the old values: (2, 1 + 2). Then both names move.</details>

## Key takeaways

- A variable is a **name stuck onto a value**, not a box containing it. `=` means "make this name refer to that value".
- The right-hand side is evaluated first, and nothing recalculates later: `y = x + 5` does not stay linked to `x`.
- **Values** have types (`int`, `float`, `str`, `bool`, `None`); names do not. Use `type()` to inspect.
- The type decides which operations make sense; mixing `str` and `int` with `+` raises `TypeError`.
- `NameError` means the name has no value yet (a typo or a missing assignment), and `=` is assignment while `==` is comparison.
- Never name a variable after a built-in such as `list`, `sum` or `str`.
