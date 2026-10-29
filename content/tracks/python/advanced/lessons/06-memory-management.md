---
title: Memory Management and Python Internals
summary: Explain names and object references, mutability, copying, object lifetime, and what CPython's reference counting and cyclic garbage collector do.
minutes: 25
concepts: []
---

## Why this matters

Questions about memory often sound like trivia: “Does Python use a stack or a heap?”, “What does `del` do?”, or “How does garbage collection work?” The useful answer starts with a simpler model: names refer to objects. Once that is clear, aliasing, mutation, copying, object lifetime, and many surprising function behaviors become easier to reason about. Interviewers also want you to separate a promise made by the Python language from a detail of one implementation, especially CPython.

You do not need to memorize memory addresses. You do need to explain whether two names refer to one mutable object, whether a copy is shallow or deep, and why an object is still reachable. For an implementation question, say which implementation you mean. CPython's reference counts are important to CPython, but portable Python code should not depend on the exact moment an object is reclaimed.

## The mental model

Think of a name as a label and an object as the value it refers to:

```text
first ──┐
        ├──► one list object [1, 2]
alias ──┘
```

Assignment normally binds another name to an existing object. It does not copy the object. A function parameter is also a name bound to the object passed by the caller. If that object is mutable, code that changes it through one reference can be observed through every other reference to the same object.

Python guarantees the observable behavior of its object model: assignment binds names, mutable objects can be changed, and `is` tests whether two references point to the same object. The language does not promise that an object lives at a particular memory address, that `id()` is an address, or that cleanup happens immediately after the last name disappears. Those details can vary by implementation.

## Names, identity, and mutability

The `==` operator asks whether values compare equal. The `is` operator asks whether they are the same object. Use `is` for singletons such as `None`, not for ordinary value comparisons.

```python
left = [1, 2]
right = left
equal_copy = [1, 2]
print(left == equal_copy)  # -> True: equal contents
print(left is right)      # -> True: the same object
print(left is equal_copy) # -> False: a different list
```

Because `right` is an alias, changing the list through either name is visible from both:

```python
right.append(3)
print(left)  # -> [1, 2, 3]
```

An immutable object, such as a string or tuple, cannot be changed in place. Operations that look like changes create or return a value instead. A mutable object, such as a list, dictionary, or set, has operations that update that object. This distinction explains why a function can append to a list supplied by its caller, while `name = name + "!"` inside a function only rebinds the local name.

```python
def add_item(items):
    items.append("new")

values = ["old"]
add_item(values)
print(values)  # -> ['old', 'new']
```

## Copying nested data

There are several ways to make a new outer list: `items.copy()`, `list(items)`, or `items[:]`. These are shallow copies. They create a new outer container but keep references to the same nested objects.

```python
import copy

grid = [[1, 2], [3, 4]]
shallow = grid.copy()
deep = copy.deepcopy(grid)
shallow[0][0] = 9
print(grid)  # -> [[9, 2], [3, 4]]
deep[1][0] = 8
print(grid)  # -> [[9, 2], [3, 4]]
```

Use a shallow copy when sharing the elements is intended. Use a deep copy when nested mutable objects should also be independent, while remembering that deep copying can be expensive and may not make sense for files, locks, or objects with external resources. Often the clearest choice is to build the new data explicitly. A copy is not automatically “safe”; first decide which parts should be shared.

## Object lifetime in Python and in CPython

An object remains usable while the program has a way to reach it. References can come from local variables, containers, module globals, closures, and other objects. When no references can reach an object, it is eligible for reclamation. “Eligible” is the portable statement: Python code should not rely on an exact cleanup time.

CPython, the common reference implementation, primarily uses reference counting. Creating another strong reference increases an object's count; removing a reference decreases it. When the count reaches zero, CPython can usually reclaim the object promptly. This is an implementation behavior, not a timing promise for every Python implementation. In particular, do not use `del name` as a guarantee that memory immediately returns to the operating system. `del` removes a binding (or container entry); another reference may still keep the object alive.

Reference counting alone cannot reclaim a cycle. Imagine two lists that each contain the other. Even after the program drops its external names, each list still has a reference from its partner. CPython's cyclic garbage collector can find many unreachable cycles and reclaim them. The collector supplements reference counting; it does not change the fact that objects reachable from active program state must remain available.

For resources such as files and network connections, do not wait for garbage collection. Close them explicitly or use a context manager:

```python
with open("notes.txt", encoding="utf-8") as file:
    first_line = file.readline()
```

The `with` block makes the cleanup point clear even if reading raises an exception. This is more reliable and readable than hoping an object is finalized at a convenient time.

## Common mistakes (and how to spot them)

**Using `is` to compare values.** Two equal strings or numbers are not required to be the same object. Use `==` for value equality and `is None` for the `None` singleton.

**Assuming assignment or a shallow copy duplicates nested values.** If editing one nested list changes another view, the two outer lists share an inner object. Inspect the nesting and choose a deep copy or construct independent inner values.

**Treating `del` as “free this memory now.”** `del` removes one reference. If an object remains in another variable, list, dictionary, or closure, it remains reachable. Even an unreachable object may not cause process memory to shrink immediately.

**Calling CPython's reference count a Python language guarantee.** It is useful when discussing CPython, but other implementations may manage memory differently. State the implementation before discussing reference-count timing.

**Relying on finalizers to release important resources.** Cleanup can be delayed, and cycles make assumptions especially fragile. Use `with` or an explicit `close()` for external resources.

## Check yourself

1. What is the difference between `==` and `is`?
   <details><summary>Answer</summary>`==` compares values; `is` checks whether both names refer to the same object. Use `is None` for a `None` check.</details>

2. Why can changing a nested list in a shallow copy change the original?
   <details><summary>Answer</summary>The outer container is new, but the nested list references are shared. A deep copy duplicates nested objects too.</details>

3. What does `del items` guarantee?
   <details><summary>Answer</summary>It removes the binding named `items` from the current scope. It does not guarantee immediate object destruction or that process memory is returned to the operating system.</details>

4. Why does CPython need a cyclic garbage collector if it uses reference counting?
   <details><summary>Answer</summary>Two or more unreachable objects can hold references to one another, so their counts never reach zero. Cycle detection can reclaim such unreachable groups.</details>

5. Is prompt reclamation after a reference count reaches zero guaranteed by the Python language?
   <details><summary>Answer</summary>No. That is CPython behavior. Portable code should rely on object reachability semantics and use explicit cleanup for external resources.</details>

## Key takeaways

- Names refer to objects; assignment usually adds a reference rather than copying.
- `==` compares values, while `is` compares identity.
- Mutable objects can be observed changing through aliases; shallow copies still share nested objects.
- CPython uses reference counting plus cyclic garbage collection, but exact cleanup timing is not a portable Python guarantee.
- Use context managers or explicit close methods for files and other external resources.
