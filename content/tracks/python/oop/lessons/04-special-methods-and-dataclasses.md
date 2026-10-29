---
title: Special Methods and Dataclasses
summary: Make your own classes behave like built-in types by implementing __repr__, __eq__, __lt__, __len__, __iter__, operators and more, and cut the boilerplate with @dataclass.
minutes: 24
concepts: [dunder-methods, classes-objects]
---

## Why this matters

Try this with a class you wrote:

```python
class Point:
    def __init__(self, x, y):
        self.x, self.y = x, y

p = Point(1, 2)
print(p)                     # -> <__main__.Point object at 0x7f...>
print(p == Point(1, 2))      # -> False
```

The output is useless for debugging, and two points with identical coordinates are not "equal". Python's built-in types behave better: lists print their contents, `len()` works, `+` joins things, and `for` loops walk them. All of that comes from **special methods**, nicknamed *dunder* methods because their names are surrounded by **d**ouble **under**scores. Implement the right ones and your class plugs into the language itself. Interviews love this: "implement a `Vector` class that supports `+`", or "make this container iterable".

## The mental model

Syntax in Python is just a nice way to call a method. You almost never call dunders yourself; Python calls them for you:

```
you write            Python calls
---------            ------------------------
print(p)             str(p)    -> type(p).__str__(p)
repr(p), debugger    type(p).__repr__(p)
p == q               type(p).__eq__(p, q)
p + q                type(p).__add__(p, q)
len(p)               type(p).__len__(p)
p[2]                 type(p).__getitem__(p, 2)
for x in p           type(p).__iter__(p)
sorted([p, q])       uses  p < q  ->  type(p).__lt__(p, q)
```

Python looks these methods up on the **class**, not on the instance. If the class does not define one, you get the default (object identity for `==`, the ugly address for `print`) or a `TypeError` (`len()` of an object with no `__len__`).

## Representing objects: __repr__ and __str__

```python
class Point:
    def __init__(self, x, y):
        self.x, self.y = x, y

    def __repr__(self):                       # for developers: unambiguous
        return f"Point({self.x}, {self.y})"

    def __str__(self):                        # for users: readable
        return f"({self.x}, {self.y})"

p = Point(1, 2)
print(p)          # -> (1, 2)         print uses __str__
print(repr(p))    # -> Point(1, 2)
print([p, p])     # -> [Point(1, 2), Point(1, 2)]   containers use __repr__
```

`__repr__` should ideally look like the code that rebuilds the object. If you define only one, define `__repr__`: `str()` falls back to it when `__str__` is missing, but not the other way round. Both must **return a string**; printing inside them returns `None` and raises `TypeError`.

## Equality, hashing and ordering

```python
class Point:
    def __init__(self, x, y):
        self.x, self.y = x, y

    def __eq__(self, other):
        if not isinstance(other, Point):
            return NotImplemented            # let Python try something else
        return (self.x, self.y) == (other.x, other.y)

    def __hash__(self):
        return hash((self.x, self.y))        # equal objects must hash equal

    def __lt__(self, other):
        return (self.x, self.y) < (other.x, other.y)

print(Point(1, 2) == Point(1, 2))               # -> True
print(len({Point(1, 2), Point(1, 2)}))          # -> 1   (set uses hash + eq)
print(sorted([Point(3, 0), Point(1, 5)])[0].x)  # -> 1
```

Three rules to remember:

1. Defining `__eq__` **removes** the default `__hash__` (the class becomes unhashable) because Python cannot assume the two still agree. If your objects should live in sets or be dict keys, define `__hash__` too, built from the same fields that `__eq__` compares. Only do this for objects you will not mutate afterwards.
2. `sorted()` and `list.sort()` need only `__lt__`. Writing the full set of comparisons by hand is tedious; the standard library offers `functools.total_ordering`, which fills in the rest from `__eq__` plus one of `<`, `<=`, `>`, `>=`.
3. Returning `NotImplemented` (not raising, not `False`) for foreign types lets Python try the other operand's method, and finally fall back to "not equal".

## Operator overloading

Arithmetic operators map to methods: `+` is `__add__`, `-` is `__sub__`, `*` is `__mul__`, `abs()` is `__abs__`. The rule of good taste: return a **new** object and leave the operands unchanged, just as `1 + 2` does not modify `1`.

```python
class Vector:
    def __init__(self, x, y):
        self.x, self.y = x, y

    def __add__(self, other):
        return Vector(self.x + other.x, self.y + other.y)

    def __mul__(self, k):                      # v * 3
        return Vector(self.x * k, self.y * k)

    __rmul__ = __mul__                         # 3 * v  (reflected operand)

    def __abs__(self):
        return (self.x ** 2 + self.y ** 2) ** 0.5

    def __repr__(self):
        return f"Vector({self.x}, {self.y})"

v = Vector(3, 4)
print(v + Vector(1, 1))    # -> Vector(4, 5)
print(v * 2)               # -> Vector(6, 8)
print(2 * v)               # -> Vector(6, 8)
print(abs(v))              # -> 5.0
```

For `2 * v`, Python first tries `int.__mul__(2, v)`, which does not know vectors and returns `NotImplemented`. It then tries the right-hand operand's reflected method `v.__rmul__(2)`. Without `__rmul__`, you get `TypeError: unsupported operand type(s)`.

## Containers: __len__, __getitem__, __iter__, __contains__

```python
class Playlist:
    def __init__(self, songs):
        self._songs = list(songs)

    def __len__(self):
        return len(self._songs)

    def __getitem__(self, index):          # also gives slicing for free
        return self._songs[index]

    def __iter__(self):
        return iter(self._songs)

    def __contains__(self, song):
        return song in self._songs

p = Playlist(["a", "b", "c"])
print(len(p))          # -> 3
print(p[0], p[-1])     # -> a c
print(p[1:])           # -> ['b', 'c']
print("b" in p)        # -> True
for s in p:
    print(s, end=" ")  # -> a b c
```

By delegating to the underlying list, a handful of one-liners gives you indexing, slicing, `for` loops, `in`, `list(p)` and `sorted(p)`. `__bool__` is related: if you define `__len__` but not `__bool__`, an empty container is falsy, just like an empty list. (The iteration protocol itself is explored in the advanced topic on iterators.)

## Dataclasses: dunders for free

Many classes are mostly bundles of fields, and writing `__init__`, `__repr__` and `__eq__` for each is repetitive. `@dataclass` generates them from annotated fields:

```python
from dataclasses import dataclass, field

@dataclass
class Item:
    name: str
    price: float
    tags: list = field(default_factory=list)   # safe mutable default

a = Item("pen", 1.5)
b = Item("pen", 1.5)
print(a)            # -> Item(name='pen', price=1.5, tags=[])
print(a == b)       # -> True   compares all fields
a.tags.append("x")
print(b.tags)       # -> []     each instance got its own list
```

Useful options: `@dataclass(frozen=True)` makes instances immutable *and* hashable; `@dataclass(order=True)` generates `<`, `<=`, `>`, `>=` comparing fields in order. A mutable default such as `tags: list = []` is rejected with `ValueError` (the same trap as mutable default arguments); use `field(default_factory=list)`. Fields without defaults must come before fields with defaults.

## Common mistakes (and how to spot them)

**Calling `print` inside `__str__` or `__repr__`.** They must `return` a string. Symptom: `TypeError: __str__ returned non-string (type NoneType)`. Misconception: confusing printing with returning (see the functions topic).

**Defining `__eq__` but not `__hash__`, then using objects in a set.** Symptom: `TypeError: unhashable type`. Python disables hashing when you override equality.

**Hashing on fields you later mutate.** An object stored in a set with `hash((x, y))` becomes lost after `x` changes, because it sits in the wrong bucket. Hash only immutable data.

**Mutating `self` in `__add__`.** `a + b` then silently changes `a`. Return a new object.

**Assuming `__eq__` gives you `<`.** It does not. Define `__lt__` (or use `total_ordering` / `order=True`) before sorting.

**Forgetting `__rmul__`.** `v * 2` works but `2 * v` raises `TypeError`.

**`@dataclass` with `tags: list = []`.** `ValueError: mutable default ... use default_factory`. Use `field(default_factory=list)`.

## Check yourself

1. Which dunder does `print(obj)` use, and what does it fall back to?
   <details><summary>Answer</summary>`__str__`; if that is missing it falls back to `__repr__`. Inside containers, `__repr__` is used.</details>

2. You define `__eq__` on a class and then put instances in a set. What error might you see, and why?
   <details><summary>Answer</summary>`TypeError: unhashable type`. Defining `__eq__` without `__hash__` sets `__hash__` to `None`. Add a `__hash__` built from the same fields that `__eq__` compares.</details>

3. What do you need to define so that `sorted(list_of_objects)` works?
   <details><summary>Answer</summary>`__lt__` is enough (sorting only uses `<`). Alternatively use `functools.total_ordering` or `@dataclass(order=True)`.</details>

4. Why does `3 * Vector(1, 2)` fail when only `__mul__` exists?
   <details><summary>Answer</summary>`int.__mul__` returns `NotImplemented`, so Python tries the right operand's reflected method `__rmul__`, which is missing. Define it (often `__rmul__ = __mul__`).</details>

5. What does `@dataclass` generate, and why must a list field use `default_factory`?
   <details><summary>Answer</summary>It generates `__init__`, `__repr__` and `__eq__` (and optionally ordering and hashing) from the annotated fields. A plain `[]` default would be one list shared by all instances, so dataclasses reject it; `default_factory=list` builds a new list per instance.</details>

## Key takeaways

- Dunder methods are the hooks Python calls for syntax and built-ins; they are looked up on the class.
- Always define `__repr__` (unambiguous, returns a string); add `__str__` only for a friendlier display.
- `__eq__` and `__hash__` must agree; defining `__eq__` alone makes instances unhashable.
- `__lt__` is all `sorted()` needs; operators like `+` should return new objects, and `__rmul__` handles `number * obj`.
- `__len__`, `__getitem__`, `__iter__` and `__contains__` make a class behave like a collection.
- `@dataclass` writes `__init__`, `__repr__` and `__eq__` for you; use `field(default_factory=...)` for mutable defaults and `frozen=True` for immutable, hashable records.
