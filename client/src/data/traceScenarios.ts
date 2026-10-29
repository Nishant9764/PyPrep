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
];
