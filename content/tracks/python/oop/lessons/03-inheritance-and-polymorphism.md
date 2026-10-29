---
title: Inheritance, Polymorphism and Abstract Classes
summary: Build subclasses with super(), override methods, predict the method resolution order, and write code that works with any object that offers the right methods.
minutes: 24
concepts: [inheritance, polymorphism]
---

## Why this matters

Real programs contain families of similar things: circles, squares and triangles are all shapes; a manager is an employee with extra duties; a CSV exporter and a JSON exporter both "export". Without a way to share code you copy and paste, and every bug fix has to be made three times.

**Inheritance** lets one class reuse and extend another. **Polymorphism** ("many forms") lets the code that *uses* those classes stay ignorant of which one it holds: `for shape in shapes: total += shape.area()` works for every shape without a single `if`. Interviewers ask about both constantly, usually as "what does `super()` do?" or "what does this diamond hierarchy print?".

## The mental model

A subclass is a new class that holds a *link* to its parent. When Python looks up `obj.method`, it checks the object, then the object's class, then walks up the chain of parents until it finds the name:

```
        Animal            speak(), intro()
          ^
          |
   +------+------+
   |             |
  Dog           Cat       Dog overrides speak(); Cat does not override intro()
 speak()
```

Nothing is copied. A `Dog` object simply has more places to look. The order in which classes are searched is called the **method resolution order (MRO)**, and you can print it with `Dog.__mro__`. Inheritance models an **"is-a"** relationship: a `Dog` *is an* `Animal`.

## Subclasses, overriding and super()

```python
class Animal:
    def __init__(self, name):
        self.name = name

    def speak(self):
        return "..."

    def intro(self):
        return f"{self.name} says {self.speak()}"

class Dog(Animal):                 # Dog inherits from Animal
    def speak(self):               # override: same name, new behaviour
        return "Woof"

class Cat(Animal):
    pass                           # inherits everything unchanged

print(Dog("Rex").intro())     # -> Rex says Woof
print(Cat("Tom").intro())     # -> Tom says ...
```

`Dog` has no `__init__` and no `intro`; both come from `Animal`. Notice what happens inside `intro`: it calls `self.speak()`. Because `self` is a `Dog`, lookup starts at `Dog` and finds the overriding version. That is why Rex says "Woof", even though `intro` is written in `Animal`.

When a subclass needs its own `__init__`, it must usually run the parent's too, or the parent's attributes never get set. That is the job of `super()`:

```python
class Employee:
    def __init__(self, name, salary):
        self.name = name
        self.salary = salary

    def pay(self):
        return self.salary

class Manager(Employee):
    def __init__(self, name, salary, bonus):
        super().__init__(name, salary)    # let Employee set name and salary
        self.bonus = bonus

    def pay(self):
        return super().pay() + self.bonus  # extend, don't duplicate

m = Manager("Ada", 5000, 800)
print(m.pay())                 # -> 5800
print(m.name)                  # -> Ada
print(isinstance(m, Employee)) # -> True
print(issubclass(Manager, Employee))  # -> True
```

`super()` means "the next class in the MRO after mine". Do not write `self.name = name` again in `Manager`; call `super().__init__(...)` so there is one place that knows how to build an `Employee`. Inside a method you can also use `super().pay()` to *extend* the parent's behaviour instead of replacing it. Forget the `super().__init__` call and `m.pay()` raises `AttributeError: 'Manager' object has no attribute 'salary'`.

`isinstance(obj, Cls)` is true for the class and all its ancestors, which is why it is preferred over `type(obj) == Cls`.

## Multiple inheritance and the MRO

A class may list several parents. Python then needs a rule for lookup order. It uses the **C3 linearisation**: children before parents, and parents in the order you listed them, each class appearing once.

```python
class A:
    def who(self): return "A"

class B(A):
    def who(self): return "B"

class C(A):
    def who(self): return "C"

class D(B, C):
    pass

print(D().who())                       # -> B
print([k.__name__ for k in D.__mro__]) # -> ['D', 'B', 'C', 'A', 'object']
```

This is the classic "diamond". `D` finds `who` in `B` first (it is listed first). `A` comes after both `B` and `C`, so `C.who` is never skipped in favour of `A.who`. If `B.who` called `super().who()`, it would reach `C`, not `A`, because `super()` follows the MRO of the *object's* class, not the class where the method was written. Every class ends with `object`, the root of all classes. Keep hierarchies shallow; prefer one parent unless you are writing a small "mixin" that adds a single capability.

## Polymorphism and duck typing

Polymorphism means calling the same method name on different objects and getting behaviour that suits each one.

```python
class Circle:
    def __init__(self, r): self.r = r
    def area(self): return 3.14159 * self.r ** 2

class Square:
    def __init__(self, s): self.s = s
    def area(self): return self.s ** 2

shapes = [Circle(1), Square(2)]
print([round(s.area(), 2) for s in shapes])   # -> [3.14, 4]
```

`Circle` and `Square` share no parent here, and that is fine. Python uses **duck typing**: "if it walks like a duck and quacks like a duck, it is a duck". The code only needs an `area()` method; it never checks the type. This is why `len()` works on lists, strings and dicts alike, and why you can pass any file-like object to code that calls `.read()`. Writing `if isinstance(s, Circle): ... elif isinstance(s, Square): ...` defeats the purpose: each new shape forces you to edit that chain.

## Abstract base classes

Sometimes you want to *demand* that subclasses provide a method, so the mistake of forgetting it shows up immediately and not in the middle of a run. Use `abc`:

```python
from abc import ABC, abstractmethod

class Shape(ABC):
    @abstractmethod
    def area(self):
        """Every shape must say how big it is."""

    def describe(self):                      # shared, concrete behaviour
        return f"{type(self).__name__} with area {self.area():.1f}"

class Square(Shape):
    def __init__(self, s): self.s = s
    def area(self): return self.s ** 2

print(Square(3).describe())     # -> Square with area 9.0

class Broken(Shape):
    pass

# Shape()    -> TypeError: Can't instantiate abstract class Shape ...
# Broken()   -> TypeError: Can't instantiate abstract class Broken ...
```

An abstract class cannot be instantiated, and neither can a subclass that still leaves an `@abstractmethod` unimplemented. The base class supplies the *contract* (`area`) and shared helpers (`describe`), which calls the abstract method and relies on polymorphism to run the subclass's version. This pattern is called the **template method**. The same `Animal.intro` above is a small example.

## Common mistakes (and how to spot them)

**Forgetting `super().__init__()`.** Symptom: `AttributeError` for an attribute the parent should have set. Misconception: "the parent's `__init__` runs by itself". It does only when the child defines no `__init__` at all.

**Passing the wrong arguments to the parent.** `super().__init__(self, name)` passes `self` twice and gives `TypeError: takes 2 positional arguments but 3 were given`. `super()` already binds `self`.

**Overriding when you meant to extend.** A subclass `pay` that returns only `self.bonus` throws away the salary. Call `super().pay()` and add to it.

**Using inheritance for "has-a".** A `Car` is not an `Engine`; it *has* one. Store an engine as an attribute (composition). If you cannot say "X is a Y", do not inherit.

**Type-checking instead of polymorphism.** Long `isinstance` chains break whenever a new type is added. Put the behaviour in a method on each class.

**Misreading the MRO.** In a diamond, `super()` does not mean "my parent"; it means "next in the MRO". Print `Cls.__mro__` when unsure.

**Instantiating an abstract class.** `TypeError: Can't instantiate abstract class` lists the methods you forgot to implement. Implement all of them with exactly the same names.

## Check yourself

1. What does `Dog("Rex").intro()` print if `intro` is defined in `Animal` and calls `self.speak()`, and `Dog` overrides `speak`?
   <details><summary>Answer</summary>The overriding `Dog.speak` runs. Lookup begins at the object's own class (`Dog`), so the subclass version wins even though `intro` is written in the parent.</details>

2. A subclass defines `__init__` but never calls `super().__init__()`. What goes wrong?
   <details><summary>Answer</summary>The parent's initialisation never runs, so attributes it sets are missing, leading to `AttributeError` later. The child must call `super().__init__(...)` explicitly.</details>

3. Given `class D(B, C)` where both `B` and `C` inherit from `A`, what is `D.__mro__`?
   <details><summary>Answer</summary>`D, B, C, A, object`. Children come before parents and the listed order of bases is kept.</details>

4. What is duck typing, and why does it make `isinstance` chains unnecessary?
   <details><summary>Answer</summary>Code cares about what an object can do (which methods it has), not what class it is. If every shape has `area()`, calling `shape.area()` works for all of them, so no type checks are needed.</details>

5. Why can you not create an instance of a class whose parent has an unimplemented `@abstractmethod`?
   <details><summary>Answer</summary>Python refuses to instantiate any class that still has abstract methods, raising `TypeError`. This surfaces the missing method at construction time instead of at some later call.</details>

## Key takeaways

- A subclass reuses its parent's code and can override any method; attribute lookup walks the MRO from the object's own class upward.
- Call `super().__init__(...)` so the parent sets up its part, and `super().method()` to extend rather than replace.
- `super()` follows the MRO (next class in line), which matters with multiple inheritance. Check `Cls.__mro__`.
- Polymorphism means the same method call behaves appropriately for each object; duck typing means no shared base class is required.
- Use `ABC` and `@abstractmethod` to declare a required interface; concrete helpers in the base can rely on it.
- Inherit for "is-a"; use composition (an attribute) for "has-a".
