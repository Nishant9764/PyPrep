---
title: Your First Program and Debugging
summary: Run a small Python script, read its output and traceback, and fix simple syntax, runtime, and logic errors.
minutes: 18
concepts: [program-setup, debugging]
---

## Why this matters

Knowing a line of Python is useful only when you can run it, inspect what happened, and recover when it fails. A beginner often has two questions at once: “What should I type?” and “Where does this code go?” This lesson separates the Python interpreter, a script file, and the terminal, then gives you a repeatable way to diagnose errors.

Python code can be entered at an interactive prompt or saved in a `.py` file. The prompt is useful for trying one expression. A script is better when you want to keep, rerun, share, and test a program. Both use the same language; the difference is how the code is supplied and how long it is kept.

## The mental model

Think of a Python program as instructions read from top to bottom. Each statement can create a value, change a name, call a function, or decide which statement comes next. The interpreter reports syntax problems before it can run the affected code. A runtime exception happens while an instruction is running. A logic bug is valid code that produces the wrong answer.

The terminal is a separate program that starts Python. The Python prompt usually looks like `>>>`; a shell prompt does not. Commands such as `python --version` belong in the terminal, while `print(2 + 3)` belongs at the Python prompt or in a script. Confusing these two places is a common first obstacle.

## Start interactively, then save a script

At a Python prompt, enter an expression and Python displays its value:

```pycon
>>> 2 + 3
5
>>> name = "Mina"
>>> print(f"Hello, {name}!")
Hello, Mina!
```

The assignment stores a value under the name `name`. The final statement calls `print`, which writes text to standard output. `print` is useful when you want to see a value, but a function should usually `return` a value when another part of the program needs to use it.

For a saved script, put the statements in a file such as `hello.py`:

```python
name = "Mina"
message = f"Hello, {name}!"
print(message)
```

Run it from the terminal with `python hello.py` (some systems use `python3 hello.py` or the Windows `py hello.py`). `python --version` or `python3 --version` tells you which interpreter that command starts. A virtual environment is useful once a project installs third-party packages; it is covered with project setup in the advanced path.

Use descriptive filenames such as `hello.py`. Avoid names like `json.py`, `random.py`, or `typing.py`: a local file with a standard-library module’s name can shadow the real module and make imports confusing.

## Read errors as clues

A syntax error means Python could not parse the code. For example, a missing closing parenthesis prevents the call from being understood:

```python
print("Hello"
```

The interpreter points near the place where parsing failed. The caret may indicate where the parser noticed the problem, which can be after the original mistake. Check the surrounding line for unmatched parentheses, quotes, colons, and indentation.

A runtime exception means the program parsed but an operation could not complete:

```python
age_text = "twenty"
age = int(age_text)
```

This raises `ValueError`, because the text is not an integer representation. The traceback shows the exception type and message, followed by the call stack. Start with the final exception line, then inspect the source line named immediately above it. Read earlier frames only when you need to learn how execution reached that point.

A logic bug does not raise an exception, but the result is wrong:

```python
price = 12
quantity = 3
print(price + quantity)  # -> 15, but a total cost should multiply
```

Write down a tiny input and the expected result, then follow the values one statement at a time. Temporary `print()` calls can help locate where a value changes; remove noisy debugging output after you find the cause.

## Use a small debugging routine

When a program behaves unexpectedly:

1. Read the full error type and message.
2. Find the file and line in the traceback.
3. Print or inspect the values used on that line.
4. Reproduce the issue with the smallest input you can.
5. Change one thing, rerun, and check the expected result.

A debugger can pause at a breakpoint and show local variables, but the same routine works with a short script and a few prints. A minimal reproducible example removes unrelated code; it is easier to reason about and easier for someone else to help with.

## Common mistakes (and how to spot them)

**Typing shell commands at `>>>`.** `python --version` is a shell command, not Python syntax. Run it in the terminal, or use `import sys; print(sys.version)` inside Python.

**Running the wrong file or interpreter.** If output does not change, check the filename and current folder. Use the same interpreter consistently and confirm its version. An editor’s Run button may start a different interpreter than a terminal command.

**Reading only the first traceback line.** The last line names the exception; the frame above it points to the failing code. Work from the failure back through the calls instead of guessing at the whole program.

**Fixing the symptom without checking the expected behavior.** A program that runs can still be wrong. Write a concrete input and result before editing, then check both after the change.

**Leaving debug prints in output-sensitive code.** Extra lines can confuse a user or cause an automated checker to reject the result. Remove temporary prints or send diagnostics to a logger when appropriate.

## Check yourself

1. Where should `python hello.py` be typed: the shell or the Python prompt?

<details><summary>Answer</summary>

In the shell/terminal. The terminal starts the interpreter with the file as input.
</details>

2. What is the difference between a syntax error and a logic bug?

<details><summary>Answer</summary>

A syntax error prevents Python from parsing the code. A logic bug runs but produces a result that does not meet the requirement.
</details>

3. Which part of a traceback names the exception?

<details><summary>Answer</summary>

The final line gives the exception type and message. The source frame directly above it identifies the failing operation.
</details>

4. Why should you avoid naming your program `json.py`?

<details><summary>Answer</summary>

Python may import the local file instead of the standard-library `json` module, shadowing it and breaking code that expects the real module.
</details>

## Key takeaways

- Use the Python prompt for quick experiments and `.py` files for saved programs.
- Shell commands start Python; Python statements run inside Python.
- Syntax errors prevent parsing; exceptions interrupt execution; logic bugs produce incorrect behavior.
- Read tracebacks from the exception line and reproduce failures with small inputs.
- Check expected output, not only whether the program runs.
