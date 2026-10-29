export interface TraceStep {
  iteration: string;
  values: string;
  action: string;
  result: string;
}

export interface TraceScenario {
  id: string;
  title: string;
  topic: string;
  goal: string;
  code: string;
  columns: [string, string, string, string];
  steps: TraceStep[];
  takeaway: string;
}

export const traceScenarios: TraceScenario[] = [
  {
    id: 'negative-slice', title: 'Reverse a string with a negative slice', topic: 'Strings · slicing', goal: 'Track how the slice walks from the final character back to the first.',
    code: 'word = "code"\nresult = word[::-1]\nprint(result)', columns: ['Step', 'Index / state', 'Action', 'Result'],
    steps: [
      { iteration: 'Start', values: 'word = "code"', action: 'Slice start and stop are omitted; step is -1.', result: 'Begin at the last character.' },
      { iteration: '1', values: 'index 3 → "e"', action: 'Take the character, then move back one.', result: 'e' },
      { iteration: '2', values: 'index 2 → "d"', action: 'Continue in the negative direction.', result: 'ed' },
      { iteration: '3', values: 'index 1 → "o"', action: 'Continue until the slice boundary.', result: 'edo' },
      { iteration: '4', values: 'index 0 → "c"', action: 'No earlier index remains.', result: 'edoc' },
    ], takeaway: 'A slice is [start:stop:step]. A negative step walks backward; the stop boundary remains exclusive.'
  },
  {
    id: 'frequency-dict', title: 'Count values with a dictionary', topic: 'Collections · frequency maps', goal: 'Watch one key appear and its count increase as each item is visited.',
    code: 'items = ["a", "b", "a"]\ncounts = {}\nfor item in items:\n    counts[item] = counts.get(item, 0) + 1\nprint(counts)', columns: ['Iteration', 'item', 'Previous count', 'Dictionary after update'],
    steps: [
      { iteration: 'Start', values: '—', action: 'Initialize an empty dictionary.', result: '{}' },
      { iteration: '1', values: '"a"', action: 'get("a", 0) gives 0; add 1.', result: '{"a": 1}' },
      { iteration: '2', values: '"b"', action: 'get("b", 0) gives 0; add 1.', result: '{"a": 1, "b": 1}' },
      { iteration: '3', values: '"a"', action: 'get("a", 0) gives 1; add 1.', result: '{"a": 2, "b": 1}' },
    ], takeaway: 'A dictionary lookup/update is usually O(1), so a frequency pass is O(n) time and O(k) space for k distinct values.'
  },
  {
    id: 'enumerate-loop', title: 'Pair each value with its index', topic: 'Loops · enumerate', goal: 'Follow index and value together without indexing the list manually.',
    code: 'names = ["Ada", "Lin"]\nfor index, name in enumerate(names):\n    print(index, name)', columns: ['Iteration', 'index', 'name', 'Printed'],
    steps: [
      { iteration: '1', values: '0', action: 'Unpack the first (index, value) pair.', result: '0 Ada' },
      { iteration: '2', values: '1', action: 'Unpack the next pair.', result: '1 Lin' },
      { iteration: 'Done', values: '—', action: 'The iterable has no more items.', result: 'Loop ends.' },
    ], takeaway: 'enumerate() expresses “position plus value” directly and avoids range(len(items)) for common loops.'
  },
  {
    id: 'two-pointer', title: 'Move two pointers inward', topic: 'Coding patterns · two pointers', goal: 'Trace a palindrome check while the left and right indexes converge.',
    code: 'text = "level"\nleft, right = 0, len(text) - 1\nwhile left < right:\n    if text[left] != text[right]:\n        break\n    left += 1\n    right -= 1', columns: ['Check', 'Pointers', 'Compared values', 'Next state'],
    steps: [
      { iteration: '1', values: '0 and 4', action: 'Compare text[0] with text[4]. Both are "l".', result: 'left=1, right=3' },
      { iteration: '2', values: '1 and 3', action: 'Compare text[1] with text[3]. Both are "e".', result: 'left=2, right=2' },
      { iteration: 'Done', values: '2 and 2', action: 'left < right is false.', result: 'No mismatch; palindrome.' },
    ], takeaway: 'Two pointers can check a palindrome in O(n) time and O(1) extra space without building a reversed copy.'
  },
  {
    id: 'list-comprehension', title: 'Filter and transform in one pass', topic: 'Collections · comprehensions', goal: 'Track the condition and output for each input value.',
    code: 'values = [1, 2, 3, 4]\nsquares = [x * x for x in values if x % 2 == 0]\nprint(squares)', columns: ['Visit', 'x', 'Condition x % 2 == 0', 'Output list'],
    steps: [
      { iteration: '1', values: '1', action: '1 % 2 == 0 is false; skip.', result: '[]' },
      { iteration: '2', values: '2', action: '2 % 2 == 0 is true; append 2 * 2.', result: '[4]' },
      { iteration: '3', values: '3', action: '3 % 2 == 0 is false; skip.', result: '[4]' },
      { iteration: '4', values: '4', action: '4 % 2 == 0 is true; append 4 * 4.', result: '[4, 16]' },
    ], takeaway: 'Read a comprehension as “expression, for each item, if condition”. It creates a new list and uses O(k) space.'
  },
  {
    id: 'zip-unpack', title: 'Pair two lists with zip()', topic: 'Loops · zip and unpacking', goal: 'See how zip stops when the shorter iterable ends.',
    code: 'names = ["Ada", "Lin", "Sam"]\nscores = [10, 8]\nfor name, score in zip(names, scores):\n    print(name, score)', columns: ['Iteration', 'name', 'score', 'Printed'],
    steps: [
      { iteration: '1', values: 'Ada, 10', action: 'Unpack the first pair.', result: 'Ada 10' },
      { iteration: '2', values: 'Lin, 8', action: 'Unpack the second pair.', result: 'Lin 8' },
      { iteration: 'Done', values: 'Sam has no paired score.', action: 'Default zip stops at the shortest input.', result: 'Sam is not visited.' },
    ], takeaway: 'Use strict=True when unequal lengths should raise ValueError instead of silently truncating.'
  },
  {
    id: 'loop-else-break', title: 'Understand for-else and break', topic: 'Control flow · loop else', goal: 'Distinguish normal loop completion from a break.',
    code: 'values = [2, 4, 6]\nfor value in values:\n    if value % 2:\n        print("odd")\n        break\nelse:\n    print("all even")', columns: ['Visit', 'value', 'Condition', 'Outcome'],
    steps: [
      { iteration: '1', values: '2', action: '2 % 2 is 0; continue.', result: 'No break.' },
      { iteration: '2', values: '4', action: '4 % 2 is 0; continue.', result: 'No break.' },
      { iteration: '3', values: '6', action: '6 % 2 is 0; continue.', result: 'No break.' },
      { iteration: 'Else', values: 'Loop exhausted normally.', action: 'No break occurred.', result: 'all even' },
    ], takeaway: 'The else suite belongs to the loop and runs only if the loop finishes without break.'
  },
  {
    id: 'while-counter', title: 'Trace a while counter', topic: 'Control flow · while', goal: 'Track the condition before each iteration and the update after it.',
    code: 'n = 3\nwhile n > 0:\n    print(n)\n    n -= 1\nprint("go")', columns: ['Check', 'n before body', 'Action', 'State after'],
    steps: [
      { iteration: '1', values: '3 > 0', action: 'Print 3; subtract one.', result: 'n = 2' },
      { iteration: '2', values: '2 > 0', action: 'Print 2; subtract one.', result: 'n = 1' },
      { iteration: '3', values: '1 > 0', action: 'Print 1; subtract one.', result: 'n = 0' },
      { iteration: 'Stop', values: '0 > 0 is false.', action: 'Skip body and continue after loop.', result: 'Print go' },
    ], takeaway: 'A while condition is checked before every body execution; ensure state changes can eventually make it false.'
  },
  {
    id: 'alias-vs-copy', title: 'Separate an alias from a shallow copy', topic: 'Collections · references', goal: 'Track which list object each variable points to.',
    code: 'original = [[1], [2]]\nalias = original\nshallow = original.copy()\nalias[0].append(9)\nshallow.append([3])\nprint(original)\nprint(shallow)', columns: ['Step', 'Operation', 'original', 'shallow'],
    steps: [
      { iteration: 'Start', values: 'alias is original', action: 'Both names refer to the same outer list.', result: '[[1], [2]]' },
      { iteration: '1', values: 'alias[0].append(9)', action: 'Mutate a nested list shared by the shallow copy.', result: 'original inner list becomes [1, 9]' },
      { iteration: '2', values: 'shallow.append([3])', action: 'Append to only the copied outer list.', result: 'original has 2 items; shallow has 3' },
    ], takeaway: 'copy() duplicates only the outer container. Nested mutable objects remain shared; use deepcopy only when that is the intended behavior.'
  },
  {
    id: 'mutable-default', title: 'Spot a mutable default argument', topic: 'Functions · default values', goal: 'See why a default list is reused across calls.',
    code: 'def add(value, items=[]):\n    items.append(value)\n    return items\nprint(add(1))\nprint(add(2))', columns: ['Call', 'value', 'Same default list?', 'Returned value'],
    steps: [
      { iteration: '1', values: 'value = 1', action: 'Append to the list created when def ran.', result: '[1]' },
      { iteration: '2', values: 'value = 2', action: 'Reuse that same list and append again.', result: '[1, 2]' },
    ], takeaway: 'Use None as the default and create a fresh list inside the function when each call needs independent state.'
  },
  {
    id: 'closure-late-binding', title: 'Trace late binding in closures', topic: 'Functions · closures', goal: 'Follow when the loop variable is read by each lambda.',
    code: 'functions = [lambda: i for i in range(3)]\nprint([fn() for fn in functions])\nfixed = [lambda i=i: i for i in range(3)]\nprint([fn() for fn in fixed])', columns: ['Expression', 'i when created', 'i when called', 'Values'],
    steps: [
      { iteration: 'Create 3 lambdas', values: 'i takes 0, 1, 2', action: 'Each closure refers to the same enclosing i.', result: 'After loop i is 2.' },
      { iteration: 'Call first list', values: 'All calls read current i = 2.', action: 'Evaluate each lambda after loop completion.', result: '[2, 2, 2]' },
      { iteration: 'Default argument', values: 'Capture each current i at creation.', action: 'Each function gets its own default value.', result: '[0, 1, 2]' },
    ], takeaway: 'Closures look up free variables when called. A default argument can capture the current value, though a named function may be clearer.'
  },
  {
    id: 'dict-update-order', title: 'Follow dictionary updates', topic: 'Collections · dictionaries', goal: 'Track replacement of a value without moving its insertion order.',
    code: 'data = {"a": 1, "b": 2}\ndata["a"] = 3\ndata["c"] = 4\nprint(list(data.items()))', columns: ['Step', 'Key', 'Operation', 'Ordered items'],
    steps: [
      { iteration: 'Start', values: 'a, b', action: 'Keys are inserted in this order.', result: '[a: 1, b: 2]' },
      { iteration: '1', values: 'a', action: 'Replace existing value.', result: '[a: 3, b: 2]' },
      { iteration: '2', values: 'c', action: 'Insert a new key at the end.', result: '[a: 3, b: 2, c: 4]' },
    ], takeaway: 'Python dictionaries preserve insertion order. Updating an existing key does not move it to the end.'
  },
  {
    id: 'short-circuit', title: 'Read short-circuit boolean logic', topic: 'Expressions · any and all', goal: 'Identify which operands Python evaluates and which it skips.',
    code: 'def check(value):\n    print("check", value)\n    return value > 0\nprint(False and check(1))\nprint(True or check(2))\nprint(all(check(value) for value in [1, 0, 3]))', columns: ['Expression', 'Known value', 'Evaluate next?', 'Result'],
    steps: [
      { iteration: 'and', values: 'False and ...', action: 'False already determines the result.', result: 'check(1) is skipped; False' },
      { iteration: 'or', values: 'True or ...', action: 'True already determines the result.', result: 'check(2) is skipped; True' },
      { iteration: 'all', values: 'check(1) is True; check(0) is False.', action: 'The generator is lazy, so all() stops at the first False.', result: 'check(3) is skipped; False' },
    ], takeaway: 'and, or, all(), and any() short-circuit. Do not rely on side effects in expressions that may be skipped.'
  },
  {
    id: 'try-finally', title: 'Trace try, except, and finally', topic: 'Errors · exception flow', goal: 'See where a matching handler runs and why finally always follows.',
    code: 'try:\n    value = int("x")\nexcept ValueError:\n    print("invalid")\nfinally:\n    print("cleanup")\nprint("continued")', columns: ['Stage', 'Operation', 'Control flow', 'Output'],
    steps: [
      { iteration: '1', values: 'int("x")', action: 'Raises ValueError before assignment.', result: 'Jump to matching except.' },
      { iteration: '2', values: 'except ValueError', action: 'Run the handler.', result: 'invalid' },
      { iteration: '3', values: 'finally', action: 'Run cleanup after handler.', result: 'cleanup' },
      { iteration: '4', values: 'after try', action: 'Exception was handled; continue.', result: 'continued' },
    ], takeaway: 'Catch specific expected exceptions. finally is for cleanup and executes whether an exception was raised or not.'
  },
  {
    id: 'generator-consumption', title: 'Track a generator being consumed', topic: 'Iteration · generators', goal: 'Notice that iterators advance and cannot be replayed from the beginning.',
    code: 'values = (n * n for n in range(3))\nprint(next(values))\nprint(list(values))\nprint(list(values))', columns: ['Operation', 'Next value', 'Remaining items', 'Printed'],
    steps: [
      { iteration: 'next', values: '0', action: 'Advance generator once.', result: '0' },
      { iteration: 'list 1', values: '1 then 4', action: 'Consume all remaining values.', result: '[1, 4]' },
      { iteration: 'list 2', values: 'No values remain.', action: 'The exhausted iterator stays exhausted.', result: '[]' },
    ], takeaway: 'Generators are lazy, one-pass iterators. Build a new generator or store the results if multiple passes are required.'
  },
  {
    id: 'negative-indices', title: 'Resolve negative indexes and slices', topic: 'Sequences · indexing', goal: 'Convert negative positions from the end and respect the exclusive stop.',
    code: 'items = ["a", "b", "c", "d", "e"]\nprint(items[-1])\nprint(items[-4:-1])\nprint(items[1:5:2])', columns: ['Expression', 'Start/index', 'Stop/step', 'Result'],
    steps: [
      { iteration: 'items[-1]', values: 'Index -1', action: 'Count from the end.', result: 'e' },
      { iteration: 'items[-4:-1]', values: 'Indexes 1 through 3', action: 'Stop -1 resolves to index 4, exclusive.', result: '[b, c, d]' },
      { iteration: 'items[1:5:2]', values: '1, then 3', action: 'Take every second item before stop 5.', result: '[b, d]' },
    ], takeaway: 'A slice is start-inclusive and stop-exclusive; omitted bounds and step are filled in based on the step direction.'
  },
  {
    id: 'class-attribute-shadow', title: 'Trace instance attribute shadowing', topic: 'OOP · attributes', goal: 'Separate a class attribute from an instance attribute with the same name.',
    code: 'class Counter:\n    total = 0\n    def __init__(self):\n        self.total = 1\na = Counter()\nb = Counter()\na.total += 1\nprint(a.total, b.total, Counter.total)', columns: ['Step', 'Lookup / assignment', 'a.total', 'b.total / class'],
    steps: [
      { iteration: 'Create a', values: 'self.total = 1', action: 'Create an instance attribute on a.', result: 'a.total = 1' },
      { iteration: 'Create b', values: 'self.total = 1', action: 'Create a separate instance attribute on b.', result: 'b.total = 1' },
      { iteration: 'Update a', values: 'a.total += 1', action: 'Read a instance value and assign back to a.', result: 'a=2, b=1, class=0' },
    ], takeaway: 'Attribute lookup checks the instance before the class. Assigning through an instance can shadow a class attribute.'
  },
];
