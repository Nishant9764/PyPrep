---
title: Scope and Closures
summary: Predict which variable a name refers to using the LEGB rule, fix UnboundLocalError, and build closures without falling into the late-binding trap.
minutes: 20
concepts: [scope, closures]
---

## Why this matters

A name like `count` can exist in several places at once: inside a function, in the module, even in Python's own built-ins. *Scope* is the set of rules that decides which one you get. If you do not know the rules, you will hit baffling errors such as `UnboundLocalError: local variable 'count' referenced before assignment` on a line that looks perfectly fine.

Closures build on scope: they are how a function can carry private state around with it, and they are the foundation of decorators, callbacks and factories. They also contain the single most-asked "what does this print?" interview trap: loops that create functions.

## The mental model

Python resolves a name by searching a chain of namespaces, innermost first. The acronym is **LEGB**:

```
L  Local       names assigned inside the current function
E  Enclosing   names in any outer function that wraps this one
G  Global      names at the top level of the module
B  Built-in    len, print, sum, ...  (the very last stop)
```

The first place that contains the name wins. If none does: `NameError`.

The crucial detail is **how Python decides a name is local**. Before running a function, Python scans its body. If a name is *assigned anywhere* in the body (`x = ...`, `x += ...`, `for x in ...`, `import x`), then that name is local to the **entire** function, on every line, including lines above the assignment. Reading a variable never makes it local; assigning does.

## Reading versus assigning

```python
rate = 0.2

def price_with_tax(amount):
    return amount * (1 + rate)      # rate is read: found in Global

print(price_with_tax(100))          # -> 120.0
```

Reading a global from inside a function is fine. Now watch what happens when we assign:

```python
counter = 0

def bump():
    counter = counter + 1           # assignment makes counter LOCAL
    return counter

bump()   # UnboundLocalError: cannot access local variable 'counter' where it is not associated with a value
```

Python saw `counter = ...` in the body, decided `counter` is local, and then the right-hand side tried to read that local before it had a value. The global `counter` was never consulted. The misconception is "Python will look for `counter` globally if it has no local value yet." It does not; the decision is made once, by scanning the function.

Two ways to fix it. Either pass the value in and return the new one (usually best):

```python
def bump(counter):
    return counter + 1

counter = bump(counter)
print(counter)   # -> 1
```

or declare intent with `global`:

```python
counter = 0

def bump():
    global counter
    counter += 1

bump(); bump()
print(counter)   # -> 2
```

`global` works but makes functions depend on hidden state, which is harder to test and reason about. Prefer parameters and return values.

Note that *mutating* a global object is not assignment, so it needs no declaration:

```python
log = []

def record(msg):
    log.append(msg)      # no assignment to the name 'log'

record("hi")
print(log)   # -> ['hi']
```

Shadowing is the quiet cousin of this: a local named `list` or `sum` hides the built-in for that function, and later `list(...)` raises `TypeError: 'list' object is not callable`. Avoid naming variables after built-ins.

## Enclosing scope and nonlocal

A function defined inside another function can read the outer function's names (the E in LEGB):

```python
def make_greeter(greeting):
    def greet(name):
        return greeting + ", " + name      # greeting comes from the enclosing scope
    return greet

hello = make_greeter("Hello")
print(hello("Ada"))      # -> Hello, Ada
```

To *rebind* an enclosing variable you need `nonlocal`, which is the enclosing-scope version of `global`:

```python
def make_counter():
    count = 0
    def step():
        nonlocal count
        count += 1
        return count
    return step

c = make_counter()
print(c(), c(), c())     # -> 1 2 3
d = make_counter()
print(d())               # -> 1       independent state
```

Without the `nonlocal` line, `count += 1` would make `count` local to `step` and raise the same `UnboundLocalError`.

## Closures

Look at `make_counter` again. After `make_counter()` returns, its frame should be gone, yet `c` still increments `count`. The reason: `step` is a **closure**, a function bundled with the variables it uses from enclosing scopes. Python keeps those variables alive in small cells attached to the function. Each call of `make_counter` creates a new frame, hence new cells, hence independent counters.

```python
def multiplier(n):
    return lambda x: x * n

double = multiplier(2)
triple = multiplier(3)
print(double(10), triple(10))    # -> 20 30
```

This is how you build "configured" functions without classes or globals.

## The late-binding trap

A closure remembers the **variable**, not the value it had when the function was created. The lookup happens when the inner function is *called*. That causes this classic puzzle:

```python
funcs = []
for i in range(3):
    funcs.append(lambda: i)

print([f() for f in funcs])      # -> [2, 2, 2]   not [0, 1, 2]!
```

All three lambdas share one variable `i` (there is only one `i` in the module). The loop finished with `i == 2`, so every call looks up 2. Common wrong expectation: "each lambda captured the `i` from its own iteration."

The fix is to freeze the current value at creation time, using a default argument (defaults are evaluated at definition, as you saw in the previous lesson):

```python
funcs = []
for i in range(3):
    funcs.append(lambda i=i: i)

print([f() for f in funcs])      # -> [0, 1, 2]
```

Or build each function through a factory call, which gives each its own frame and cell:

```python
def make(i):
    return lambda: i

funcs = [make(i) for i in range(3)]
print([f() for f in funcs])      # -> [0, 1, 2]
```

## Common mistakes (and how to spot them)

**UnboundLocalError on a line that "obviously" has a value.** Look for an assignment or `+=` to that name elsewhere in the same function. Cause: assignment anywhere makes the name local everywhere in that function.

**Using `global` to avoid passing arguments.** Works, but couples the function to module state; tests that call it twice see leftover state. Pass and return instead.

**Forgetting `nonlocal`.** A closure that does `total += x` fails with `UnboundLocalError`. Either declare `nonlocal total`, or mutate a container (`state["total"] += x`).

**Late-binding loops.** Symptom: every callback does the same thing, using the last loop value. Fix with `lambda i=i: ...` or a factory function.

**Shadowing built-ins.** `max = 0` at the top of a module and then `max(a, b)` later gives `TypeError: 'int' object is not callable`. Pick different names.

**Expecting a loop variable to be private.** Unlike some languages, a `for` loop does not create its own scope; `i` is still visible after the loop. (Comprehensions *do* have their own scope.)

## Check yourself

1. What are the four scopes in LEGB, in lookup order?
   <details><summary>Answer</summary>Local, Enclosing, Global, Built-in.</details>

2. Why does `def f(): print(x); x = 5` raise `UnboundLocalError` even if a global `x` exists?
   <details><summary>Answer</summary>Because `x` is assigned in the body, Python treats it as local for the whole function. The `print(x)` therefore reads a local that has no value yet.</details>

3. What does `[f() for f in [lambda: n for n in range(3)]]` return?
   <details><summary>Answer</summary>`[2, 2, 2]`. All the lambdas read the same `n`, which ends at 2 (in Python 3 the comprehension variable lives in the comprehension scope but is still shared by its lambdas).</details>

4. When do you need `nonlocal`?
   <details><summary>Answer</summary>When an inner function must rebind (assign to) a variable of an enclosing function. Reading or mutating the object needs no declaration.</details>

5. Give two ways to make each lambda in a loop remember its own value.
   <details><summary>Answer</summary>Bind the value as a default argument (`lambda i=i: i`), or create the function inside a helper/factory function that takes the value as a parameter.</details>

## Key takeaways

- Names are resolved Local, Enclosing, Global, Built-in; the first match wins.
- Assigning to a name anywhere in a function makes it local throughout that function.
- `UnboundLocalError` means you read a local before assigning it, often via `x += 1` on a global.
- `global` and `nonlocal` allow rebinding outer names, but passing arguments and returning values is cleaner.
- A closure keeps the variables it uses alive, giving functions private, per-instance state.
- Closures capture variables, not values; fix late binding with default arguments or a factory.
