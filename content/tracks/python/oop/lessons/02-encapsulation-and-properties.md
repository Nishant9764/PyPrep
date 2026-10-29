---
title: Encapsulation and Properties
summary: Protect an object's invariants using naming conventions and @property, and write getters and setters that validate without changing how callers use the attribute.
minutes: 20
concepts: [encapsulation, classes-objects]
---

## Why this matters

If any code can write `account.balance = -5000`, then no code can trust that a balance is valid. **Encapsulation** means an object controls access to its own state so that its rules (its *invariants*) cannot be broken from outside: a balance is never negative, a temperature stays above absolute zero, a stack never pops from empty without an error you chose.

Python's approach is different from Java or C++. There are no enforced `private` keywords; instead there are naming conventions and the `@property` decorator, which lets you start with a plain attribute and add validation later without changing a single call site. Interviewers love this topic because it separates "knows the syntax" from "understands the design".

## The mental model

Think of an object as a shop. Customers (calling code) deal with the counter (the public interface). The stockroom (internal state) is behind a door marked "staff only". The sign does not lock the door, but everyone agrees to respect it.

```
  outside code                      inside the object
  ------------                      -----------------
  acct.deposit(50)   ---------->    validates amount
  acct.balance       ---------->    property getter returns self._balance
  acct.balance = 10  ---------->    property setter (validates, or refuses)
        X  acct._balance            "staff only" by convention
```

A **property** looks like an attribute to the caller (`acct.balance`, no parentheses) but runs a method behind the scenes. That is how Python keeps the simple attribute syntax and still lets you validate.

## Privacy by convention

```python
class Account:
    def __init__(self, owner, balance=0):
        self.owner = owner            # public
        self._balance = balance       # single underscore: "internal, please don't touch"
        self.__pin = "1234"           # double underscore: name-mangled

a = Account("Ada", 100)
print(a._balance)       # -> 100    works; it is only a convention
print(a.__dict__)       # -> {'owner': 'Ada', '_balance': 100, '_Account__pin': '1234'}
```

A **single leading underscore** says "implementation detail". Nothing stops access; linters and teammates will complain. A **double leading underscore** triggers *name mangling*: inside the class `__pin` is rewritten to `_Account__pin`. Its purpose is to avoid accidental clashes in subclasses, not to provide security. `a.__pin` raises `AttributeError`, but `a._Account__pin` works. Use the single underscore for "private" in everyday code.

## Methods guard the state

Before properties, the obvious way to protect state is to expose operations rather than raw data:

```python
class Account:
    def __init__(self, balance=0):
        self._balance = balance

    def deposit(self, amount):
        if amount <= 0:
            raise ValueError("deposit must be positive")
        self._balance += amount

    def withdraw(self, amount):
        if amount > self._balance:
            raise ValueError("insufficient funds")
        self._balance -= amount

    def get_balance(self):
        return self._balance

acct = Account(100)
acct.deposit(50)
acct.withdraw(30)
print(acct.get_balance())    # -> 120
```

Raising an exception is how a method refuses invalid input. Silently ignoring it, or printing a message and carrying on, leaves the caller thinking the operation worked.

## Properties: getters and setters that look like attributes

```python
class Temperature:
    def __init__(self, celsius):
        self.celsius = celsius        # goes through the setter below!

    @property
    def celsius(self):                # getter
        return self._celsius

    @celsius.setter
    def celsius(self, value):         # setter
        if value < -273.15:
            raise ValueError("below absolute zero")
        self._celsius = value

    @property
    def fahrenheit(self):             # read-only computed property
        return self._celsius * 9 / 5 + 32

t = Temperature(100)
print(t.celsius)       # -> 100
print(t.fahrenheit)    # -> 212.0
t.celsius = 0          # runs the setter
print(t.fahrenheit)    # -> 32.0
# t.celsius = -300     -> ValueError: below absolute zero
# t.fahrenheit = 50    -> AttributeError: property 'fahrenheit' of 'Temperature' object has no setter
```

Study the details. The *public* name is `celsius`; the data is stored in `_celsius`. Assigning `self.celsius = celsius` in `__init__` deliberately goes through the setter, so even a bad initial value is rejected. A property with no setter is **read-only**, which is excellent for derived values: `fahrenheit` is never stored, so it can never be out of sync.

Why bother, rather than writing `get_celsius()` and `set_celsius()`? Because you can begin with a plain public attribute `self.celsius = c`, and when requirements change add validation by converting it to a property. Every existing `t.celsius` and `t.celsius = x` keeps working. Java programmers write getters up front out of fear; Pythonistas add properties when needed.

### The infinite recursion trap

```python
class Bad:
    @property
    def x(self):
        return self.x          # calls the property again -> RecursionError
```

Inside a property named `x`, reading `self.x` calls the getter again. Store the value under a *different* name (`_x`) and return that.

## Designing a good interface

Some guidelines that interviewers look for:

- **Expose behaviour, not internals.** `acct.deposit(50)` beats `acct._balance += 50` because the method can validate.
- **Validate at the boundary.** Check in the constructor and setter, so every object that exists is valid.
- **Prefer read-only properties for derived data** (area, full name, fahrenheit).
- **Return copies when exposing mutable internals.** If a getter returns `self._items` directly, the caller can mutate your private list. Return `list(self._items)` or a tuple.

```python
class Playlist:
    def __init__(self):
        self._songs = []

    def add(self, song):
        self._songs.append(song)

    @property
    def songs(self):
        return tuple(self._songs)     # callers get an immutable snapshot

p = Playlist()
p.add("A")
print(p.songs)        # -> ('A',)
```

## Common mistakes (and how to spot them)

**Believing underscores enforce privacy.** Symptom: you rely on `_balance` being safe, and another module changes it. Misconception: "Python has private variables." It has *conventions*; the design must tolerate violations by being clear, not by being secret.

**Setter that does not validate, or validates only in the setter but not `__init__`.** If `__init__` writes `self._celsius = c` directly it bypasses the check, so `Temperature(-500)` succeeds. Assign through the public name in the constructor.

**Property recursion.** `RecursionError` from a getter or setter means it reads/writes its own public name. Use the underscore name for storage.

**Defining the setter without the getter first.** `@x.setter` requires `x` to already be a property. The order is: `@property def x`, then `@x.setter def x`, both with the same name.

**Returning internal mutable objects.** Symptom: "I never changed `playlist._songs` but it changed." The getter handed out the real list. Return a copy or tuple.

**Silent failure.** A setter that `return`s on bad input without raising hides bugs. Raise `ValueError` (bad value) or `TypeError` (bad type).

**Using a double underscore for ordinary privacy.** It makes subclass access and debugging awkward (`_Account__pin`). Prefer one underscore.

## Check yourself

1. What is the difference between `_x` and `__x` inside a class?
   <details><summary>Answer</summary>`_x` is a convention meaning "internal"; nothing changes. `__x` is name-mangled to `_ClassName__x` to avoid accidental clashes in subclasses. Neither is truly private.</details>

2. A class has `@property def area(self)` and no setter. What happens on `shape.area = 5`?
   <details><summary>Answer</summary>`AttributeError`: the property is read-only. The value would have to be changed through the attributes it is computed from.</details>

3. Why does `__init__` write `self.celsius = celsius` rather than `self._celsius = celsius`?
   <details><summary>Answer</summary>So the assignment goes through the property setter and is validated. Writing `_celsius` directly would let an invalid initial value in.</details>

4. What is wrong with `@property def name(self): return self.name`?
   <details><summary>Answer</summary>The getter reads `self.name`, which calls the getter again forever, causing `RecursionError`. Store the data in `self._name` and return that.</details>

5. Why might a getter return `tuple(self._items)` instead of `self._items`?
   <details><summary>Answer</summary>Returning the real list lets callers mutate your internal state and break invariants. A tuple (or copy) is a safe snapshot.</details>

## Key takeaways

- Encapsulation means an object protects its own invariants; outsiders use methods and properties.
- Python privacy is by convention: `_name` means internal, `__name` mangles to avoid subclass clashes.
- `@property` makes a method look like an attribute; `@name.setter` adds validation on assignment.
- A property without a setter is read-only, ideal for derived values.
- Assign through the public property in `__init__` so construction is validated too.
- Store data under a different name (`_x`) than the property (`x`) or you get infinite recursion.
