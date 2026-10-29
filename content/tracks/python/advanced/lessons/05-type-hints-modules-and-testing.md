---
title: Type Hints, Modules and Testing
summary: Annotate code with type hints (and know they are not enforced), understand how import works and what __name__ == "__main__" guards, set up a virtual environment, and write basic assert, unittest and pytest tests.
minutes: 25
concepts: [type-hints, modules-testing]
---

## Why this matters

Small scripts live in one file. Real projects have dozens of files, third-party packages, several developers and code that must keep working after changes. Three habits make that survivable. **Type hints** document what each function expects and returns, and let tools catch mistakes before the program runs. **Modules and virtual environments** let you split code into files and keep each project's dependencies separate. **Tests** prove the code still works after you change it.

Interviewers use these topics to tell scripters from engineers: "What does `if __name__ == "__main__"` do?", "Does Python check type hints?", "How would you test this function?"

## The mental model

Three separate ideas, one picture each.

**Type hints are labels, not locks.** A hint is a note attached to a function (stored in `__annotations__`). Python reads it and does nothing with it. A separate tool such as `mypy` or your editor reads the labels and warns you.

**Importing runs a file.** `import helpers` finds `helpers.py`, executes it top to bottom **once**, and stores the result as a module object in a cache (`sys.modules`). Every later `import helpers` reuses that same object.

**A test is a program that checks another program.** It calls your code with known inputs and compares the result to the answer you expect. If they differ, it fails loudly.

## Type hints

Annotate parameters with `name: type` and the return value with `-> type`:

```python
def greet(name: str, times: int = 1) -> str:
    return ("Hello, " + name + "! ") * times

print(greet("Ada", 2))          # -> Hello, Ada! Hello, Ada!
print(greet.__annotations__)
# -> {'name': <class 'str'>, 'times': <class 'int'>, 'return': <class 'str'>}
```

**What they do not do.** Python does not check them at runtime:

```python
print(greet(42, "x"))     # no TypeError from the hints
# -> TypeError: can only concatenate str (not "int") to str
```

That error comes from the `+` inside the function, not from the annotation. With a function that happened to accept both, the wrong call would silently work. The hints are for humans and tools.

### Collections, unions and Optional

Since Python 3.9 you can parameterise built-in containers directly, and since 3.10 you can write unions with `|`:

```python
def average(scores: list[float]) -> float:
    return sum(scores) / len(scores)

def lookup(table: dict[str, int], key: str) -> int | None:
    return table.get(key)        # may return None

def first_word(text: str | None) -> str:
    if text is None:             # narrow the type before using it
        return ""
    return text.split()[0] if text.split() else ""

print(lookup({"a": 1}, "b"))     # -> None
print(first_word(None) == "")    # -> True
```

`int | None` means "an int or None". Older code writes this as `Optional[int]` from the `typing` module; the meaning is identical. The important habit: if a function may return `None`, say so, because the caller must then check before using the value. A type checker flags `lookup(t, "x") + 1` as a possible error exactly for this reason.

Other common hints: `tuple[int, str]` (fixed shape), `tuple[int, ...]` (any length), `Callable[[int], str]` (a function taking an int and returning str), `Any` (opt out), and `None` as a return type for functions that return nothing.

### Generics basics

A **generic** function works for many types while keeping the relationship between them. "Return the first element" returns *the same type as the items*:

```python
from typing import TypeVar

T = TypeVar("T")

def first(items: list[T]) -> T:
    return items[0]

n = first([10, 20, 30])     # a checker infers int
s = first(["a", "b"])       # a checker infers str
print(n, s)                 # -> 10 a
```

`T` is a placeholder: whatever type goes in, the same type comes out. Python 3.12 adds the shorter `def first[T](items: list[T]) -> T:` syntax, but `TypeVar` works on 3.10+.

## Modules, imports and `__main__`

Any `.py` file is a module. Suppose `mathutils.py` contains:

```python
# mathutils.py
def square(x):
    return x * x

print("mathutils loaded")      # runs at import time

if __name__ == "__main__":
    print(square(4))           # runs only when executed directly
```

Using it from another file:

```python
import mathutils                    # prints: mathutils loaded
from mathutils import square        # no second print: module is cached
print(mathutils.square(3))          # -> 9
print(square(5))                    # -> 25
```

Three forms to know: `import mathutils` (use `mathutils.square`), `from mathutils import square` (use `square`), and `import mathutils as mu`. Avoid `from x import *`, which dumps unknown names into your namespace and can silently overwrite your own.

### What `__name__ == "__main__"` means

Every module has a built-in variable `__name__`. When you run `python mathutils.py`, Python sets `__name__` to `"__main__"`. When another file imports it, `__name__` is `"mathutils"`. So the guard means "run this block only when the file is the program, not when it is being imported". It lets one file serve as both a reusable library and a runnable script, and it is the reason tests can import your code without launching your program.

### Virtual environments

Third-party packages (installed with `pip`) go into the Python installation you use. Two projects needing different versions of the same package would clash. A **virtual environment** is a private folder with its own Python and its own installed packages:

```
python -m venv .venv              # create it
source .venv/bin/activate         # activate (Windows: .venv\Scripts\activate)
pip install requests              # installs into .venv only
pip freeze > requirements.txt     # record exact versions
```

Create one per project and keep it out of version control.

## Testing basics

The simplest test is an `assert`: it does nothing when the condition is true and raises `AssertionError` when it is false.

```python
def add(a, b):
    return a + b

assert add(2, 3) == 5
assert add(-1, 1) == 0
assert add(2, 2) == 5, "2 + 2 should be 4"
# -> AssertionError: 2 + 2 should be 4
```

**pytest** builds on this: any function named `test_*` in a file named `test_*.py` is collected and run, and plain `assert` statements give detailed failure messages.

```python
# test_calc.py
import pytest
from calc import add, divide

def test_add():
    assert add(2, 3) == 5

def test_divide_by_zero_raises():
    with pytest.raises(ZeroDivisionError):
        divide(1, 0)
```

Run it with `pytest`. The standard library's **unittest** does the same job with classes and assertion methods:

```python
import unittest
from calc import add

class TestAdd(unittest.TestCase):
    def test_positive(self):
        self.assertEqual(add(2, 3), 5)

    def test_raises(self):
        with self.assertRaises(TypeError):
            add(1, None)

if __name__ == "__main__":
    unittest.main()
```

Good tests cover the normal case, edge cases (empty input, zero, one element, negatives) and the failure paths. Each test should check one behaviour, be deterministic and not depend on other tests running first.

## Common mistakes (and how to spot them)

**1. Believing hints are enforced.** Symptom: `def f(x: int)` happily accepts `"hello"` and fails later somewhere else. Misconception: "annotations are like types in Java". If you need runtime checking, validate explicitly or use a library built for it.

**2. Mutable-default confusion in hints.** `def f(items: list = [])` is typed correctly but still shares one list between calls. Hints do not fix the default-argument trap.

**3. Circular or accidental imports.** Naming your file `random.py` or `json.py` shadows the standard module and breaks every import of it. Symptom: `AttributeError: module 'random' has no attribute 'randint'`. Never name your files after standard-library modules.

**4. Running code at import time.** Putting a `main()` call or `input()` at the top level means importing the module (for example from a test) launches the program. Put it under `if __name__ == "__main__":`.

**5. Tests that assert nothing useful.** A test that only calls the function, or compares the result to itself, can never fail. Also remember `python -O` strips `assert` statements entirely, so never use `assert` to validate user input in production code; raise a real exception instead.

## Check yourself

1. Does `def double(n: int) -> int` stop `double("ab")` from running? What happens?

<details><summary>Answer</summary>

No. Python ignores the annotations at runtime, so `double("ab")` runs and returns `"abab"`. Only an external checker such as mypy would flag the call.
</details>

2. Write the hint for a function that takes a list of strings and returns either a string or `None`.

<details><summary>Answer</summary>

`def pick(words: list[str]) -> str | None:` (or `Optional[str]` from `typing`).
</details>

3. A module prints "loaded" at the top level. How many times does it print if three different files each `import` it during one run?

<details><summary>Answer</summary>

Once. The first import executes the file and caches the module object in `sys.modules`; later imports reuse it.
</details>

4. What are the values of `__name__` when `tool.py` is run directly versus imported?

<details><summary>Answer</summary>

Run directly with `python tool.py`: `"__main__"`. Imported by another file: `"tool"`. That is why `if __name__ == "__main__":` only runs in the first case.
</details>

5. Why use a virtual environment for each project?

<details><summary>Answer</summary>

It isolates the project's packages and versions from other projects and from the system Python, so installing or upgrading in one place cannot break another, and `requirements.txt` can reproduce the setup.
</details>

## Key takeaways

- Type hints (`x: int`, `-> str`, `list[int]`, `int | None`) document intent for people and tools; Python does not enforce them at runtime.
- If a function can return `None`, say so in the hint so callers know to check.
- `import` executes a module once and caches it; keep top-level code free of side effects.
- `if __name__ == "__main__":` runs a block only when the file is executed directly, not when imported.
- A virtual environment (`python -m venv .venv`) gives each project its own packages.
- A test calls code with known inputs and asserts the result; pytest uses plain `assert`, unittest uses `TestCase` methods, and edge cases deserve their own tests.
