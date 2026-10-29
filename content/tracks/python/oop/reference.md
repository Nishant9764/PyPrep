---
title: "Classes and objects: syntax reference"
---

## Defining a class

```python
class Dog:
    species = "canine"              # class attribute (shared)

    def __init__(self, name):       # runs on Dog("Rex")
        self.name = name            # instance attribute (per object)

    def bark(self):                 # method: first parameter is the instance
        return f"{self.name} says woof"

    @classmethod
    def unnamed(cls):               # receives the class
        return cls("Unknown")

    @staticmethod
    def is_name(s):                 # receives nothing special
        return isinstance(s, str) and s != ""
```

| Piece | Meaning |
|---|---|
| `self.x = v` | create or update an instance attribute |
| `x = v` in class body | class attribute shared by all instances |
| `Cls.x += 1` | change shared state (`self.x += 1` would shadow it) |
| `obj.m(a)` | same as `Cls.m(obj, a)` |
| `obj.__dict__` | the instance's own attributes |
| `isinstance(o, C)` / `issubclass(A, B)` | type checks that respect inheritance |

## Encapsulation

| Syntax | Meaning |
|---|---|
| `_name` | internal by convention, no enforcement |
| `__name` | mangled to `_Class__name` (avoids subclass clashes) |
| `@property` | getter used like an attribute |
| `@name.setter` | runs on `obj.name = value`; validate and raise `ValueError` |
| property without setter | read-only attribute |

```python
class Temp:
    def __init__(self, c):
        self.celsius = c                # goes through the setter
    @property
    def celsius(self):
        return self._celsius
    @celsius.setter
    def celsius(self, v):
        if v < -273.15:
            raise ValueError("too cold")
        self._celsius = v
```

## Inheritance and polymorphism

```python
class Manager(Employee):
    def __init__(self, name, salary, bonus):
        super().__init__(name, salary)  # run the parent's init
        self.bonus = bonus
    def pay(self):
        return super().pay() + self.bonus
```

| Tool | Use |
|---|---|
| `class B(A)` | B inherits from A; B's methods override A's |
| `super().m()` | call the next class's `m` in the MRO |
| `Cls.__mro__` | lookup order, children before parents |
| `class D(B, C)` | multiple inheritance; bases searched left to right (C3) |
| `ABC` + `@abstractmethod` | subclasses must implement; class cannot be instantiated otherwise |
| duck typing | call the method; no isinstance check needed |

## Special methods

| Syntax | Method | Notes |
|---|---|---|
| `repr(x)`, debugger | `__repr__` | return a string, ideally `Cls(args)` |
| `str(x)`, `print(x)` | `__str__` | falls back to `__repr__` |
| `a == b` | `__eq__` | return `NotImplemented` for unknown types |
| `hash(a)`, sets, dict keys | `__hash__` | needed after defining `__eq__`; use immutable fields |
| `a < b`, `sorted` | `__lt__` | `functools.total_ordering` fills the rest |
| `a + b`, `a - b`, `a * b` | `__add__`, `__sub__`, `__mul__` | return new objects |
| `3 * a` | `__rmul__` | reflected operand |
| `abs(a)` | `__abs__` | |
| `len(a)`, `bool(a)` | `__len__` | empty means falsy |
| `a[i]`, `a[1:3]` | `__getitem__` | |
| `for x in a` | `__iter__` | return an iterator |
| `x in a` | `__contains__` | falls back to iteration |

## Dataclasses

```python
from dataclasses import dataclass, field

@dataclass(frozen=True, order=True)
class Version:
    major: int
    minor: int = 0
    notes: tuple = ()

@dataclass
class Bag:
    items: list = field(default_factory=list)   # never `= []`
```

`@dataclass` generates `__init__`, `__repr__`, `__eq__`; `frozen=True` adds immutability and `__hash__`; `order=True` adds comparisons using field order.
