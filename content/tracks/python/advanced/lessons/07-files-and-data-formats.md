---
title: Files, Paths and Data Formats
summary: Read and write text safely with pathlib and context managers, and parse JSON and CSV without loading more data than needed.
minutes: 22
concepts: [file-io-data, exceptions, context-managers]
---

## Why this matters

Many useful Python programs take information from a file and save a result. Configuration, reports, exported tables, logs, and small datasets often arrive as text, JSON, or CSV. A correct file operation must choose the right path, encoding, format, and error behavior. It must also close the file even if parsing or writing fails.

This lesson introduces a safe default for ordinary files and shows when a stream is preferable to reading everything into memory. A file path is an address; a file handle is an open resource; JSON and CSV are formats layered on top of text. Keeping those ideas separate makes file code easier to test and debug.

## The mental model

`Path` describes where a file should be. Calling `open()` asks the operating system for a live handle. The `with` statement enters a context and guarantees that the handle is closed when the block exits, including when an exception occurs. The handle is the resource; the `Path` is only its address.

Text files map bytes to characters using an encoding. Use UTF-8 explicitly when the file format is UTF-8, rather than relying on a machine-dependent default. JSON and CSV libraries parse or format the text; they do not decide where the file lives or how failures should be handled.

## Paths and text files

`pathlib.Path` composes paths using `/`, which is more portable and readable than manually joining strings:

```python
from pathlib import Path

path = Path("data") / "notes.txt"
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text("Hello, Python!\n", encoding="utf-8")
text = path.read_text(encoding="utf-8")
print(text.strip())  # -> Hello, Python!
```

`read_text()` is convenient when the whole file is small. For explicit resource management, modes, or incremental work, use `open()` in a `with` block:

```python
with path.open("r", encoding="utf-8") as file:
    for line in file:
        print(line.rstrip())
```

Iteration reads one line at a time. This avoids keeping the entire file in memory. By contrast, `file.read()` returns the whole remaining contents as one string; use it for bounded files when that behavior is desired.

To append text, use mode `"a"`; to replace a file, use `"w"`; to read, use `"r"`. Writing with `"w"` truncates an existing file. Do not use it when old contents must be preserved. Binary files use modes such as `"rb"` and return bytes; encoding applies only to text mode.

## JSON: structured data

The `json` module converts between JSON text and Python values. `json.load(file)` parses a file; `json.loads(text)` parses a string. The `dump`/`dumps` functions write a value to a file or return JSON text:

```python
import json

settings = {"theme": "dark", "font_size": 16}
path = Path("settings.json")
with path.open("w", encoding="utf-8") as file:
    json.dump(settings, file, indent=2)

with path.open(encoding="utf-8") as file:
    loaded = json.load(file)
print(loaded["theme"])  # -> dark
```

JSON has objects, arrays, strings, numbers, booleans, and null. They map naturally to Python dictionaries, lists, strings, numbers, booleans, and `None`. A file may be missing or contain invalid JSON: catch `FileNotFoundError` or `json.JSONDecodeError` only when the program has a useful recovery action. Do not turn every failure into an empty dictionary; that hides corrupted input.

## CSV: rows and columns

CSV files look simple, but fields may contain commas, quotes, or newlines. Use the `csv` module instead of splitting lines on commas. Open CSV text with `newline=""` so the module can handle line endings correctly:

```python
import csv

with Path("people.csv").open(newline="", encoding="utf-8") as file:
    for row in csv.DictReader(file):
        print(row["name"], row["age"])
```

`DictReader` uses the first row as field names and returns each row as a dictionary. Values are strings, so convert values deliberately and handle invalid input. If the file has no header or you need positional rows, use `csv.reader` instead.

## Errors, safety and tests

Treat filenames and file contents as input. If a path comes from a user, decide which directory is allowed and prevent traversal outside that directory. Do not trust a filename just because it ends with `.json` or `.csv`; validate structure and size before using it. For a beginner script, a clear error is better than silently overwriting a different file.

File operations are easy to test with a temporary directory. Give the function a path rather than hard-coding one global filename; then a test can create a temporary input, call the function, and inspect its output. Keep parsing and business rules in functions so tests can exercise them without depending on a particular working directory.

When replacing important files, write to a temporary sibling file and then rename it after a successful write. This reduces the chance that a crash leaves a half-written result. The exact atomicity guarantees depend on the filesystem and operating system, so critical applications should document and test their assumptions.

## Common mistakes (and how to spot them)

**Forgetting to close a file.** Use `with open(...)` or `Path.open()` so cleanup happens on all exits. A closed file handle cannot be read again.

**Using the wrong encoding.** Text may display as garbled characters or raise `UnicodeDecodeError`. Specify the expected encoding, usually UTF-8 for files you create, and report decoding failures clearly.

**Splitting CSV by commas.** A quoted field can contain a comma, so `line.split(",")` corrupts the row. Use `csv.reader` or `csv.DictReader`.

**Treating JSON as Python syntax.** JSON uses `true`, `false`, and `null`; Python uses `True`, `False`, and `None`. Use `json.load(s)` rather than `eval`.

**Reading a large file all at once.** `read_text()` allocates a string for the complete file. Iterate over lines or use a streaming parser when the file size can be large.

## Check yourself

1. Why use a `with` block when opening a file?

<details><summary>Answer</summary>

It closes the file when the block ends, even if an exception occurs.
</details>

2. When should you use `json.load` versus `json.loads`?

<details><summary>Answer</summary>

`load` parses from a file-like object; `loads` parses a string containing JSON text.
</details>

3. Why should CSV generally be parsed with the `csv` module instead of `split(",")`?

<details><summary>Answer</summary>

Quoted fields can contain commas, quotes, or newlines, so manual splitting does not correctly parse the format.
</details>

4. When is line-by-line reading preferable to `read_text()`?

<details><summary>Answer</summary>

When a file may be large and the program can process each line independently, streaming keeps memory use bounded.
</details>

## Key takeaways

- Use `Path` for filesystem paths and `with` for open handles.
- State the text encoding explicitly; use binary mode for bytes.
- Use `json` and `csv` libraries rather than parsing formats by hand.
- Validate data and handle expected failures without hiding corruption.
- Stream large files and pass paths into functions to make file code testable.
