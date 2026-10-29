---
title: Classes, Objects and Attributes
summary: Define classes, understand what self really is, and know whether an attribute lives on the instance or on the class.
minutes: 22
concepts: [classes-objects, instance-vs-class]
---

## Why this matters

So far your data has lived in lists and dicts and your behaviour in separate functions. That works until the data and the rules about it multiply: a bank account has a balance, an owner and rules for withdrawing; a game has players, each with health and position. A **class** bundles the data (attributes) and the behaviour (methods) of one kind of thing, and lets you make as many independent copies (objects) as you need.

Most learners can copy the syntax of a class. The ones who get stuck in interviews do not know *where* attributes live, so they write bugs like "every new account shares one transaction list". This lesson builds that model.

## The mental model

A class is a **blueprint**; an object (instance) is a **thing built from it**. Technically both are Python objects with a dictionary of attributes:

```
class Dog                        d1 = Dog("Rex")        d2 = Dog("Fido")
+----------------------+         +---------------+      +----------------+
| species = "canine"   |<---+----| name = "Rex"  |      | name = "Fido"  |
| bark(self)           |<---+----+---------------+      +----------------+
| __init__(self, name) |         (instance __dict__)     (instance __dict__)
+----------------------+
```

When you write `d1.name`, Python looks in `d1`'s own dictionary first. If it is not there, it looks in the class `Dog`. That is the entire lookup rule for ordinary attributes, and it explains class attributes, methods and the shared-state trap.

And `self`? It is nothing magical. `d1.bark()` is translated into `Dog.bark(d1)`: the object before the dot is passed as the first argument. By convention that parameter is called `self`. Methods are just functions stored on the class whose first parameter receives the instance.

## Your first class

```python
class Dog:
    def __init__(self, name):
        self.name = name          # create an instance attribute

    def bark(self):
        return self.name + " says woof"

rex = Dog("Rex")
print(rex.name)        # -> Rex
print(rex.bark())      # -> Rex says woof
print(Dog.bark(rex))   # -> Rex says woof   (what rex.bark() really does)
```

Calling `Dog("Rex")` does three things: creates an empty object, calls `Dog.__init__(that_object, "Rex")` to initialise it, and returns it. `__init__` should not return anything; its job is to set up attributes on `self`.

Each object has its own data:

```python
a = Dog("Rex")
b = Dog("Fido")
a.name = "Max"
print(a.name, b.name)   # -> Max Fido
print(a is b)           # -> False
```

You can see where things live:

```python
print(a.__dict__)       # -> {'name': 'Max'}
```

A method that changes state modifies `self`:

```python
class Counter:
    def __init__(self):
        self.count = 0

    def increment(self, by=1):
        self.count += by
        return self.count

c = Counter()
c.increment()
c.increment(5)
print(c.count)    # -> 6
```

## Instance attributes versus class attributes

An attribute assigned on `self` (usually in `__init__`) belongs to **one instance**. An attribute assigned directly in the class body belongs to **the class** and is visible through every instance:

```python
class Dog:
    species = "Canis familiaris"      # class attribute: shared

    def __init__(self, name):
        self.name = name              # instance attribute: per object

a, b = Dog("Rex"), Dog("Fido")
print(a.species, b.species)           # -> Canis familiaris Canis familiaris
print(Dog.species)                    # -> Canis familiaris
```

Class attributes are great for constants and for counters that really are shared. Now the subtle part. **Reading** `a.species` falls back to the class. **Assigning** `a.species = "wolf"` never changes the class; it creates a *new instance attribute* that shadows the class one:

```python
a.species = "wolf"
print(a.species)      # -> wolf         (instance attribute found first)
print(b.species)      # -> Canis familiaris
print(Dog.species)    # -> Canis familiaris
del a.species
print(a.species)      # -> Canis familiaris   (shadow removed, falls back again)
```

To change shared state, assign through the class: `Dog.species = "..."`.

### The shared mutable class attribute trap

```python
class Cart:
    items = []                 # one list, owned by the class

    def add(self, x):
        self.items.append(x)   # mutates that shared list

a, b = Cart(), Cart()
a.add("milk")
print(b.items)                 # -> ['milk']   b never added anything!
```

`self.items.append(x)` does not assign to the name `items` on `self`; it looks up `items`, finds the class's list, and mutates it. Both carts see the same list. The fix is to create per-object state in `__init__`:

```python
class Cart:
    def __init__(self):
        self.items = []        # a fresh list for every object
```

Rule of thumb: **mutable state belongs in `__init__`; constants and truly shared settings belong in the class body.** Related to this, the trap with `+=` on an immutable class attribute: `self.count += 1` reads the class's `count`, adds one, and assigns the result to `self.count`, creating an instance attribute, while `Dog.count` stays put. To count instances you must write `Dog.count += 1`.

## classmethod and staticmethod

Normal methods receive the instance. Two decorators change that:

```python
class Temperature:
    unit = "C"

    def __init__(self, degrees):
        self.degrees = degrees

    @classmethod
    def from_fahrenheit(cls, f):          # receives the class, not an instance
        return cls((f - 32) * 5 / 9)

    @staticmethod
    def is_valid(degrees):                # receives nothing special
        return degrees >= -273.15

t = Temperature.from_fahrenheit(212)
print(t.degrees)                    # -> 100.0
print(Temperature.is_valid(-300))   # -> False
```

A `classmethod` gets the class as `cls` and is the standard way to write alternative constructors; because it uses `cls(...)`, subclasses get the right type. A `staticmethod` is an ordinary function that merely lives in the class's namespace for organisation; it cannot see `self` or `cls`.

## Common mistakes (and how to spot them)

**Forgetting `self` in the definition.** `def bark():` then `rex.bark()` raises `TypeError: bark() takes 0 positional arguments but 1 was given`. Python passed the instance automatically; the method has no parameter to receive it. Misconception: "`self` is optional decoration."

**Forgetting `self.` on the attribute.** In `__init__`, writing `name = name` assigns a local variable that vanishes; the object ends up without a `name`, and later you get `AttributeError: 'Dog' object has no attribute 'name'`. A bare name is a local; `self.name` is an attribute.

**Mutable class attribute shared by all instances.** Symptom: adding to one object's list changes every object's list. Move the list into `__init__`.

**Believing assignment through an instance updates the class.** `a.species = "wolf"` only shadows. Change the class itself with `Dog.species = ...`.

**Calling `__init__` with the wrong arguments.** `Dog()` when `__init__` expects `name` raises `TypeError: __init__() missing 1 required positional argument: 'name'`. The error names `__init__` because construction calls it.

**Returning a value from `__init__`.** `return something` there raises `TypeError: __init__() should return None`. Construction always returns the new object.

**Comparing objects by default.** `Dog("Rex") == Dog("Rex")` is `False`: without special methods, equality means "same object". (See the lesson on special methods.)

## Check yourself

1. What does `rex.bark()` translate to?
   <details><summary>Answer</summary>`Dog.bark(rex)`. The object before the dot becomes the first argument, conventionally named `self`.</details>

2. After `a.species = "wolf"`, what is `Dog.species` and why?
   <details><summary>Answer</summary>Unchanged. Assignment on an instance creates an instance attribute that shadows the class attribute; the class is not touched.</details>

3. Why do two `Cart` objects share `items` if it is defined as `items = []` in the class body?
   <details><summary>Answer</summary>That line runs once when the class is created, producing one list stored on the class. `self.items.append(...)` finds and mutates that single list. Create the list in `__init__` instead.</details>

4. When would you choose `@classmethod` over `@staticmethod`?
   <details><summary>Answer</summary>When the function needs the class itself, typically to build an instance (`cls(...)`) in an alternative constructor. Use `staticmethod` when it needs neither the class nor an instance.</details>

5. What three things happen when you call `Dog("Rex")`?
   <details><summary>Answer</summary>A new empty instance is created, `Dog.__init__` runs with that instance as `self` and "Rex" as `name`, and the instance is returned.</details>

## Key takeaways

- A class is a blueprint; each instance has its own attribute dictionary, and lookups fall back to the class.
- `self` is just the first parameter: `obj.method(x)` means `Class.method(obj, x)`.
- Set per-object state on `self` in `__init__`; forgetting `self.` creates a throwaway local.
- Class attributes are shared. Reading falls back to them, but assigning through an instance creates a shadowing instance attribute.
- Never use a mutable class attribute for per-object data; create it in `__init__`.
- `@classmethod` receives the class (use it for alternative constructors); `@staticmethod` receives nothing special.
