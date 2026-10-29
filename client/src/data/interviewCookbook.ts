export interface InterviewCookbookExample {
  id: string;
  title: string;
  topic: string;
  language: 'python' | 'sql';
  code: string;
  stdin?: string;
  expected?: string;
  explanation: string;
}

export const interviewCookbook: InterviewCookbookExample[] = [
  {
    id: 'first-unique', title: 'First unique character', topic: 'Strings · counting', language: 'python',
    code: `from collections import Counter

def first_unique(text):
    counts = Counter(text)
    return next((char for char in text if counts[char] == 1), None)

print(first_unique("swiss"))`, expected: 'w\n',
    explanation: 'Count once, then scan in original order. Expected O(n) time and O(k) extra space for k distinct characters.'
  },
  {
    id: 'fibonacci-generator', title: 'Fibonacci generator', topic: 'Generators · lazy values', language: 'python',
    code: `def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b

print(list(fibonacci(7)))`, expected: '[0, 1, 1, 2, 3, 5, 8]\n',
    explanation: 'yield pauses the function and resumes with its saved state. The generator itself keeps O(1) state; list() stores all requested outputs.'
  },
  {
    id: 'safe-mutable-default', title: 'Safe mutable default', topic: 'Functions · default arguments', language: 'python',
    code: `def add_item(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items

print(add_item("a"))
print(add_item("b"))`, expected: "['a']\n['b']\n",
    explanation: 'A default is evaluated once when the function is defined. Use None as a sentinel and create a fresh list inside each call.'
  },
  {
    id: 'metadata-decorator', title: 'Decorator that preserves metadata', topic: 'Decorators · functools.wraps', language: 'python',
    code: `from functools import wraps

def announce(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        print(f"calling {func.__name__}")
        return func(*args, **kwargs)
    return wrapper

@announce
def add(a, b):
    """Add two values."""
    return a + b

print(add(2, 3))
print(add.__name__)`, expected: 'calling add\n5\nadd\n',
    explanation: 'The wrapper forwards arguments and returns the wrapped result. functools.wraps copies useful metadata such as the function name and docstring.'
  },
  {
    id: 'context-manager', title: 'Context manager for cleanup', topic: 'Resources · contextlib', language: 'python',
    code: `from contextlib import contextmanager
from io import StringIO

@contextmanager
def managed(resource):
    try:
        yield resource
    finally:
        resource.close()

with managed(StringIO("hello")) as resource:
    print(resource.read())
print(resource.closed)`, expected: 'hello\nTrue\n',
    explanation: 'The finally block runs when the with block exits, including when an exception is raised. Real file resources are usually managed with open() directly.'
  },
  {
    id: 'oop-contract', title: 'OOP: interface and polymorphism', topic: 'OOP · abstraction', language: 'python',
    code: `from abc import ABC, abstractmethod

class Payment(ABC):
    @abstractmethod
    def pay(self, amount):
        ...

class Card(Payment):
    def __init__(self, last_four):
        self._last_four = last_four
    def pay(self, amount):
        return f"Charged {amount:.2f} to {self._last_four}"

def checkout(method: Payment, amount):
    return method.pay(amount)

print(checkout(Card("4242"), 12.5))`, expected: 'Charged 12.50 to 4242\n',
    explanation: 'The abstract base class defines a contract, Card implements it, and checkout uses the shared interface. Composition can keep payment selection separate from checkout.'
  },
  {
    id: 'dataclass-factory', title: 'Dataclass with independent mutable defaults', topic: 'Data classes · default_factory', language: 'python',
    code: `from dataclasses import dataclass, field

@dataclass
class Team:
    name: str
    members: list[str] = field(default_factory=list)

first = Team("A")
second = Team("B")
first.members.append("Ada")
print(first.members)
print(second.members)`, expected: "['Ada']\n[]\n",
    explanation: 'default_factory is called for each instance, so mutable list values are not accidentally shared.'
  },
  {
    id: 'safe-file-read', title: 'Read UTF-8 text with pathlib', topic: 'Files · pathlib', language: 'python',
    code: `from pathlib import Path
from tempfile import TemporaryDirectory

def read_text(filename):
    return Path(filename).read_text(encoding="utf-8")

with TemporaryDirectory() as folder:
    path = Path(folder) / "notes.txt"
    path.write_text("ready", encoding="utf-8")
    print(read_text(path))`, expected: 'ready\n',
    explanation: 'Path objects compose paths portably; encoding is explicit; TemporaryDirectory cleans up the sample file even if the block fails.'
  },
  {
    id: 'parameterized-sql', title: 'Parameterized SQL query', topic: 'SQL · injection prevention', language: 'sql',
    code: `cursor.execute(
    "SELECT id, name FROM users WHERE email = ?",
    (email,),
)`,
    explanation: 'Pass values separately from the SQL string so the driver binds data safely. Placeholder syntax varies by driver; do not interpolate user input into SQL.'
  },
  {
    id: 'async-gather', title: 'Run async tasks concurrently', topic: 'Async · asyncio.gather', language: 'python',
    code: `import asyncio

async def work(value):
    await asyncio.sleep(0.01)  # stands in for async I/O
    return value * 2

async def main(items):
    return await asyncio.gather(*(work(item) for item in items))

print(asyncio.run(main([1, 2, 3])))`, expected: '[2, 4, 6]\n',
    explanation: 'Each coroutine suspends during async I/O, letting the event loop make progress on other tasks. Blocking synchronous work would stall that loop.'
  },
];
