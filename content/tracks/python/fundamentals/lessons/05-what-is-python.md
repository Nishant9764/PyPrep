---
title: What Python Is and How Programs Run
summary: Learn what Python is, what an interpreter does, how source becomes executable code, and how names refer to objects while a program runs.
minutes: 20
concepts: [python-runtime, variables-types]
---

## Why this matters

When a program prints the wrong answer, understanding what Python did between reading your code and showing the result makes debugging much less mysterious. This lesson gives you a simple map: Python source is checked and compiled, an interpreter starts the program, names are connected to objects as statements run, and the runtime provides services such as function calls, memory management, imports, and exceptions.

You do not need to install a compiler or learn machine code before writing Python. The point is to recognize the pieces when an interviewer asks “Is Python interpreted or compiled?”, when the terminal shows `SyntaxError`, or when two variables unexpectedly change the same list. The short accurate answer is that Python is a language with several implementations; CPython, the most common implementation, compiles source to bytecode and executes that bytecode in its virtual machine.

## The mental model

Python is a **programming language**: it defines rules for writing statements and what those statements mean. A **Python implementation** is a program that follows those rules and runs Python code. CPython is the common implementation installed by `python` or `python3` on many machines. PyPy is another implementation and can use a just-in-time (JIT) compiler to speed up frequently executed code.

When you run a script, think of it as a short pipeline:

```text
Python source file
       │
       ▼
parse and compile ──► code object / bytecode
       │                         │
       │ syntax mistakes         ▼
       └── SyntaxError       interpreter + runtime
                                  │
                                  ├── names refer to objects
                                  ├── statements execute in order
                                  ├── functions create call frames
                                  └── output or runtime exceptions
```

The diagram is a beginner's model of CPython. The Python language specifies observable behavior; other implementations may use a different internal pipeline.

## Your first vocabulary

- **Source code** is the readable text you write, such as `print("Hi")`.
- **Parser** checks whether the text follows Python's grammar and builds a structured representation of it.
- **Compiler** translates that representation into a code object. In CPython, the code object contains Python bytecode, not processor-native machine instructions.
- **Interpreter** evaluates the code object and asks the runtime to perform operations.
- **Runtime** is the set of active services while code runs: looking up names, creating objects, calling functions, importing modules, handling exceptions, and managing memory.
- **Operating system process** is the running Python interpreter. It has resources such as memory, files, and a process ID.

In casual conversation, people often call CPython an “interpreter” because it runs Python programs. If asked whether Python is interpreted or compiled, avoid a one-word answer: CPython compiles source into bytecode, then interprets that bytecode. Some Python implementations also compile frequently used code to native instructions.

## Compile time and run time

**Compile-time work** checks and prepares code before those statements execute. A missing colon is a syntax error, so Python cannot create a valid code object for that source. **Run time** is when Python executes valid code. A runtime exception happens while executing a program whose syntax was valid. A **logic bug** is different: the code runs without an exception but does not do what the programmer intended.

```python
# Compile time: this source cannot be parsed because the colon is missing.
if True
    print("hello")
```

```python
# This source compiles successfully. The exception happens at run time.
answer = 10 / 0
```

```python
# This runs, but it may be a logic bug if the task asked for a total.
print(2 - 3)  # -> -1
```

Python compiles a module before executing its top-level statements. A function body is compiled as part of that module, but the body runs only when the function is called. Imports also execute the imported module's top-level statements the first time it is loaded into the process.

You can inspect the stages with standard tools. These are for learning and tooling; ordinary scripts usually do not call `compile()` or `exec()` themselves.

```python
import ast
import dis

source = "total = 2 + 3"
tree = ast.parse(source)                 # source text -> syntax tree
code_object = compile(tree, "demo.py", "exec")
dis.dis(code_object)                     # CPython bytecode inspection
exec(code_object)                        # execute trusted code only
print(total)                              # -> 5
```

Never pass untrusted text to `exec()`: it executes Python code with the permissions of your process.

## The terminal, the REPL, scripts, and modules

A **terminal** is a place to give commands to a shell. The shell starts Python when you type `python app.py` (or `python3 app.py`). Python then reads the file as a script. If you type `python` without a filename, Python starts a **REPL**: an interactive read–eval–print loop where you can enter one statement at a time.

A **module** is a Python file that can be imported. Importing creates a module namespace and normally runs its top-level statements once in that process. A **package** is a collection of modules organized so Python can import them together. These words describe how code is organized and started; they do not change the basic idea that statements execute and names refer to values.

```python
# In a terminal shell:
#   python app.py

# At the Python REPL prompt >>>, enter Python statements:
>>> number = 4
>>> print(number * 2)
8
```

Do not type shell commands such as `python app.py` at the `>>>` prompt. They are commands for the shell, not Python statements.

## Names and objects while the program runs

A variable is a **name**. The value is an **object**. Assignment binds a name to an object; it does not put a duplicate value inside the name. Two names can point to one object:

```python
first = ["tea"]
second = first
second.append("coffee")
print(first)             # -> ['tea', 'coffee']
print(first is second)   # -> True
```

The expression `first is second` asks whether both names refer to the same object (identity). `first == second` asks whether the values compare equal. Use `==` for ordinary value comparisons and `is None` to check the special `None` value. A separate copy compares equal at first, but it is not identical:

```python
original = [1, 2]
copy = original.copy()
print(original == copy)  # -> True
print(original is copy) # -> False
```

Lists are mutable, so an operation like `.append()` changes the existing list. Integers and strings are immutable, so an operation that appears to change one creates or binds a different value. The distinction between changing an object and rebinding a name explains many beginner bugs; the Advanced memory lesson expands this into reference counting and garbage collection.

## Common mistakes (and how to spot them)

**Saying Python is “only interpreted.”** A concise interview answer is: “CPython compiles source to bytecode and executes it in its virtual machine; other implementations can use different strategies.” Bytecode is not the same as native machine code.

**Calling every failure a compile error.** A missing colon is a `SyntaxError` before execution. Division by zero is a runtime exception. Printing the wrong value with no exception is a logic bug.

**Confusing the shell with Python.** If `python app.py` produces a syntax error after you type it at `>>>`, run it from the shell prompt instead.

**Thinking a name owns a private copy.** After `b = a`, both names refer to the same object. If a list changes through one name, check whether there is an alias before blaming Python's memory manager.

**Treating `id()` as a memory address.** `id()` returns an identity value that is useful during the object's lifetime. Its exact meaning and representation are implementation-dependent; do not rely on it as a physical address.

**Using `exec()` on input from a user or a file you do not trust.** `exec()` runs arbitrary Python statements. Use parsing tools such as `ast` if you only need to inspect source.

## Practice at three levels

**Beginner:** Draw arrows for `a = [1]; b = a; c = a.copy()`. Predict `a is b`, `a is c`, and what changes after `b.append(2)`.

**Intermediate:** Classify these as syntax error, runtime exception, or logic bug: `if True print(1)`, `int("pear")`, and `print(2 - 3)` when asked to add two numbers.

**Advanced:** Explain CPython's source-to-bytecode-to-virtual-machine path, then name two details that the language does not guarantee about physical object layout or exact garbage-collection timing.

## Check yourself

1. Is Python a language, an implementation, or both in everyday use? Name one implementation.
<details><summary>Answer</summary>Python is the language specification and behavior; CPython and PyPy are implementations that run Python programs. People also use “Python” casually to mean CPython.</details>

2. What happens between a CPython source file and its execution?
<details><summary>Answer</summary>CPython parses and compiles the source into code objects containing bytecode, then the Python virtual machine evaluates that bytecode with runtime services.</details>

3. How do a syntax error, runtime exception, and logic bug differ?
<details><summary>Answer</summary>A syntax error prevents valid code from being compiled. A runtime exception occurs while executing valid code. A logic bug runs but produces an unintended result.</details>

4. After `a = [1]; b = a; b.append(2)`, what does `a` contain, and why?
<details><summary>Answer</summary>`a` contains `[1, 2]`: assignment bound both names to the same mutable list object.</details>

5. What is the difference between `==` and `is`?
<details><summary>Answer</summary>`==` compares values for equality; `is` checks object identity. Use `is None` for the `None` singleton, and use `==` for ordinary values.</details>

## Key takeaways

- Python is a language; CPython and PyPy are implementations. State which one you mean when explaining internals.
- CPython parses and compiles source to bytecode, then evaluates code objects in its virtual machine.
- Syntax errors happen before execution; runtime exceptions and logic bugs happen after code begins running.
- A terminal shell, a Python REPL, a script, and an importable module are different ways to interact with and organize programs.
- Names refer to objects. Assignment can create aliases, and mutation through one alias is visible through the others.
- Use `==` for value equality, `is` for identity, and never execute untrusted source with `exec()`.
