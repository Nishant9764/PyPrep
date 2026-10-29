---
title: Exceptions and Context Managers
summary: Handle errors precisely with try/except/else/finally, raise your own exceptions, and guarantee cleanup with `with` statements and custom context managers.
minutes: 25
concepts: [exceptions, context-managers]
---

## Why this matters

Real programs fail: a file is missing, a user types "abc" where a number belongs, a network call times out. Python's answer is the **exception**, an object that interrupts normal flow and travels up the call stack until something handles it. If nothing does, the program crashes with a traceback.

Two skills separate beginner code from professional code. The first is catching *exactly* the failures you can deal with and letting everything else surface. The second is making sure that cleanup (closing files, releasing locks, rolling back changes) happens on **every** path out of a block, including the error paths. Exceptions handle the first skill; context managers (the `with` statement) handle the second. Interviewers love both because they reveal whether you understand control flow beyond the happy path.

## The mental model

Think of the call stack as a stack of plates. When `raise` happens, Python stops running the current function and looks at the nearest enclosing `try`. If its `except` clause matches the exception's type, control jumps there. If not, the current frame is discarded (like removing the top plate) and Python looks at the caller's `try`, and so on until the stack is empty and the program dies.

```
try:            # 1. run the body
    ...
except X:       # 2. only if the body raised an X (or subclass of X)
    ...
else:           # 3. only if the body raised NOTHING
    ...
finally:        # 4. ALWAYS, even after return, break or an uncaught exception
    ...
```

Exceptions form a class hierarchy: `KeyError` and `IndexError` are both subclasses of `LookupError`; every ordinary error derives from `Exception`; `BaseException` sits above it and also covers `KeyboardInterrupt` and `SystemExit`. An `except X` clause catches X **and all of its subclasses**, and clauses are checked top to bottom, so put specific ones first.

## try, except, else, finally

Start with the simplest case: convert text to a number.

```python
def parse(text):
    try:
        n = int(text)
    except ValueError:
        print("not a number")
        return None
    else:
        print("parsed")
        return n
    finally:
        print("done")

print(parse("42"))   # parsed / done / 42
print(parse("x"))    # not a number / done / None
```

Why have `else` at all? It keeps the `try` body *small*. Only put the line that can actually raise the exception you are catching inside `try`; put the "it worked, now continue" code in `else`. That way an unrelated bug in the follow-up code is not accidentally caught by your `except`.

`finally` runs even if the block executes `return`. In the example above, `finally` prints "done" *before* the caller receives the return value. Use it for cleanup that must always happen.

You can catch several types in one clause with a tuple, and bind the exception object with `as`:

```python
def ratio(a, b):
    try:
        return a / b
    except (ZeroDivisionError, TypeError) as err:
        print("bad input:", type(err).__name__)
        return None

print(ratio(1, 0))      # bad input: ZeroDivisionError / None
print(ratio(1, "x"))    # bad input: TypeError / None
```

### Raising and custom exceptions

Use `raise` to signal that *your* function's contract was violated. Create a custom class when callers need to tell your failures apart from built-in ones.

```python
class InsufficientFunds(Exception):
    def __init__(self, balance, needed):
        super().__init__(f"need {needed}, have {balance}")
        self.balance = balance
        self.needed = needed

def withdraw(balance, amount):
    if amount > balance:
        raise InsufficientFunds(balance, amount)
    return balance - amount

try:
    withdraw(10, 50)
except InsufficientFunds as err:
    print(err, err.needed)    # need 50, have 10 50
```

Inside an `except` block a bare `raise` re-raises the current exception unchanged (handy for "log it, then let it continue"). To translate a low-level error into a high-level one while keeping the history, use `raise NewError(...) from err`; the traceback then shows both.

Finally, a style note. Python programmers favour **EAFP** ("easier to ask forgiveness than permission"): just try the operation and catch the failure. The alternative, **LBYL** ("look before you leap"), checks first with `if`. For dictionaries `try: d[k] except KeyError` or `d.get(k)` is idiomatic; EAFP also avoids races, such as a file that disappears between your `exists()` check and your `open()`.

## Context managers and the with statement

Closing a file by hand is error-prone:

```python
f = open("data.txt")
data = f.read()      # if this raises, the next line never runs
f.close()
```

You could wrap it in `try/finally`, but the `with` statement packages exactly that pattern:

```python
with open("data.txt") as f:
    data = f.read()
# f is closed here, even if read() raised
```

`with expr as name:` calls `expr.__enter__()` first; whatever it returns is bound to `name`. When the block ends, by any route, Python calls `expr.__exit__(exc_type, exc_value, traceback)`. If the block finished normally the three arguments are `None`. If it raised, they describe the exception, and `__exit__` can **swallow** it by returning a truthy value. Returning `False` or `None` lets the exception continue.

```python
class Shout:
    def __enter__(self):
        print("enter")
        return self
    def __exit__(self, exc_type, exc, tb):
        print("exit", exc_type.__name__ if exc_type else None)
        return False          # do not swallow exceptions

with Shout():
    print("inside")
# enter / inside / exit None

try:
    with Shout():
        raise KeyError("k")
except KeyError:
    print("caught outside")
# enter / exit KeyError / caught outside
```

Writing a class is verbose when all you need is "do setup, yield, do teardown". `contextlib.contextmanager` turns a generator function into a context manager: everything before `yield` is `__enter__`, the yielded value is the `as` target, and everything after is `__exit__`.

```python
from contextlib import contextmanager

@contextmanager
def announce(name):
    print("start", name)
    try:
        yield name.upper()
    finally:
        print("end", name)

with announce("job") as label:
    print("working on", label)
# start job / working on JOB / end job
```

The `try/finally` around the `yield` matters: if the body raises, the exception is thrown *into* the generator at the `yield` line, and without `finally` your teardown would be skipped. The standard library has handy ones ready-made, for example `contextlib.suppress(FileNotFoundError)` to ignore a specific error.

## Common mistakes (and how to spot them)

**1. The bare `except:`**

```python
try:
    risky()
except:          # catches EVERYTHING, even Ctrl-C and typos
    pass
```

Symptom: the program "works" but silently does the wrong thing, or cannot be interrupted. Misconception: "errors are bad, so hide them". A bare `except` also catches `KeyboardInterrupt` and `SystemExit`. Catch the narrowest type you can name, and at most `except Exception` at a top-level boundary where you log and continue.

**2. Swallowing exceptions.** `except ValueError: pass` hides the evidence. If you truly want to ignore a case, say so with `contextlib.suppress` or a comment, and make sure the rest of the function is still correct when the failure happened.

**3. A huge `try` body.**

```python
try:
    n = int(text)
    result = compute(n)     # a bug in compute() is now reported as "bad input"
except ValueError:
    print("bad input")
```

Symptom: misleading error messages. Fix: only `int(text)` goes in `try`; use `else` for the rest.

**4. Wrong clause order.** `except Exception` before `except KeyError` means the second clause can never run, because the first already matches every subclass.

**5. `__exit__` that accidentally swallows.** Writing `return True` (or returning the result of some call that is truthy) in `__exit__` hides every error from the caller. Symptom: exceptions inside the `with` block simply vanish.

**6. Forgetting `finally` around `yield`** in a `@contextmanager` function, so cleanup is skipped when the body fails.

## Check yourself

1. In `try/except/else/finally`, when does the `else` block run?
<details><summary>Answer</summary>Only when the `try` body finished without raising. It is skipped if an exception occurred (whether or not it was caught). `finally` runs in every case.</details>

2. What does this print?
```python
def f():
    try:
        return "a"
    finally:
        print("b")
print(f())
```
<details><summary>Answer</summary>`b` and then `a`. The `finally` block runs before the function actually hands back its return value.</details>

3. Why is `except:` (bare) considered dangerous, and what should you write instead?
<details><summary>Answer</summary>It catches every exception including `KeyboardInterrupt` and `SystemExit`, hiding bugs and making the program hard to stop. Name the specific exception types you can handle, for example `except (ValueError, KeyError) as err:`.</details>

4. What two methods does the `with` statement call, and how can `__exit__` suppress an exception?
<details><summary>Answer</summary>`__enter__` at the start (its return value becomes the `as` variable) and `__exit__(exc_type, exc_value, traceback)` at the end. If `__exit__` returns a truthy value the exception is swallowed; returning `None` or `False` lets it propagate.</details>

5. In a `@contextmanager` generator, why wrap the `yield` in `try/finally`?
<details><summary>Answer</summary>If the `with` body raises, the exception is re-raised at the `yield` line inside the generator. Code after `yield` would not run unless it is in a `finally` block, so cleanup would be skipped.</details>

## Key takeaways

- An `except X` clause catches X and its subclasses; order clauses from most to least specific.
- Keep the `try` body tiny; put follow-up code in `else`, cleanup in `finally`.
- Never use bare `except:` and never silently `pass` unless ignoring the error is the actual requirement.
- Create custom exception classes (subclass `Exception`) so callers can distinguish your failures.
- `with` guarantees `__exit__` runs on every path; returning a truthy value from `__exit__` swallows the error.
- `@contextmanager` is the short way to write setup/teardown: code before `yield` is enter, after is exit, and `finally` protects the teardown.
