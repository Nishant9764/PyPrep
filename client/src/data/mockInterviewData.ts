export interface MockCodingPrompt {
  id: string;
  title: string;
  prompt: string;
  starter: string;
  solution: string;
  expected: string;
  rubric: string[];
}

export const mockCodingPrompts: MockCodingPrompt[] = [
  {
    id: 'normalize-whitespace', title: 'Normalize whitespace',
    prompt: 'Write `normalize(text)` to replace each run of whitespace with one space and remove leading/trailing whitespace. Use the built-in string operations when they fit.',
    starter: 'def normalize(text):\n    # Return the normalized string\n    pass\n\nprint(normalize("  learn\\t Python   well  "))',
    solution: 'def normalize(text):\n    return " ".join(text.split())\n\nprint(normalize("  learn\\t Python   well  "))',
    expected: 'learn Python well', rubric: ['Uses split with no separator to split on whitespace runs.', 'Joins words with one space.', 'Handles empty and whitespace-only input.'],
  },
  {
    id: 'first-unique', title: 'First non-repeating character',
    prompt: 'Write `first_unique(text)` that returns the first character occurring once, preserving the original order. Return `None` if no character qualifies.',
    starter: 'from collections import Counter\n\ndef first_unique(text):\n    # Count first, then scan in input order\n    pass\n\nprint(first_unique("swiss"))',
    solution: 'from collections import Counter\n\ndef first_unique(text):\n    counts = Counter(text)\n    return next((char for char in text if counts[char] == 1), None)\n\nprint(first_unique("swiss"))',
    expected: 'w', rubric: ['Counts each character once in a frequency table.', 'Scans the original text to preserve order.', 'Handles the no-match case.'],
  },
  {
    id: 'group-records', title: 'Group records by department',
    prompt: 'Write `group_names(records)` that returns a dictionary from department to a list of employee names. Preserve input order within each group.',
    starter: 'from collections import defaultdict\n\ndef group_names(records):\n    # Group each record by its dept field\n    pass\n\nrecords = [{"name": "Ava", "dept": "Eng"}, {"name": "Ben", "dept": "Sales"}, {"name": "Cam", "dept": "Eng"}]\nprint(dict(group_names(records)))',
    solution: 'from collections import defaultdict\n\ndef group_names(records):\n    groups = defaultdict(list)\n    for record in records:\n        groups[record["dept"]].append(record["name"])\n    return groups\n\nrecords = [{"name": "Ava", "dept": "Eng"}, {"name": "Ben", "dept": "Sales"}, {"name": "Cam", "dept": "Eng"}]\nprint(dict(group_names(records)))',
    expected: "{'Eng': ['Ava', 'Cam'], 'Sales': ['Ben']}", rubric: ['Creates one collection per department.', 'Appends names in encounter order.', 'Does not discard later records sharing a key.'],
  },
  {
    id: 'safe-default', title: 'Avoid a shared mutable default',
    prompt: 'Write `add_item(item, items=None)` so omitted lists are independent between calls, while a caller-provided list is updated in place.',
    starter: 'def add_item(item, items=None):\n    # Use a fresh list only when no list was supplied\n    pass\n\nprint(add_item("a"))\nprint(add_item("b"))',
    solution: 'def add_item(item, items=None):\n    if items is None:\n        items = []\n    items.append(item)\n    return items\n\nprint(add_item("a"))\nprint(add_item("b"))',
    expected: "['a']\n['b']", rubric: ['Uses None as the sentinel.', 'Creates a fresh list for each omitted argument.', 'Mutates and returns an explicitly provided list.'],
  },
  {
    id: 'merge-settings', title: 'Merge configuration dictionaries',
    prompt: 'Write `merge_settings(defaults, overrides)` that returns a new dictionary where override values win. Do not mutate either input.',
    starter: 'def merge_settings(defaults, overrides):\n    pass\n\ndefaults = {"theme": "light", "font": 12}\noverrides = {"theme": "dark"}\nprint(merge_settings(defaults, overrides))',
    solution: 'def merge_settings(defaults, overrides):\n    return {**defaults, **overrides}\n\ndefaults = {"theme": "light", "font": 12}\noverrides = {"theme": "dark"}\nprint(merge_settings(defaults, overrides))',
    expected: "{'theme': 'dark', 'font': 12}", rubric: ['Returns a new mapping.', 'Copies both sets of values.', 'Defines conflict behavior: right-hand overrides win.'],
  },
  {
    id: 'chunk-list', title: 'Split a list into batches',
    prompt: 'Write `chunks(items, size)` that returns consecutive lists of at most `size` elements. The final batch may be shorter. Assume size is positive.',
    starter: 'def chunks(items, size):\n    # Return a list of list batches\n    pass\n\nprint(chunks([1, 2, 3, 4, 5], 2))',
    solution: 'def chunks(items, size):\n    return [items[start:start + size] for start in range(0, len(items), size)]\n\nprint(chunks([1, 2, 3, 4, 5], 2))',
    expected: '[[1, 2], [3, 4], [5]]', rubric: ['Advances start by the batch size.', 'Uses an exclusive end bound.', 'Keeps the final partial batch.'],
  },
  {
    id: 'sort-records', title: 'Sort records by two fields',
    prompt: 'Sort employees by department ascending, then salary descending. Return the sorted list without changing the original.',
    starter: 'def sort_employees(employees):\n    pass\n\nemployees = [{"name": "A", "dept": "Eng", "salary": 90}, {"name": "B", "dept": "Eng", "salary": 100}, {"name": "C", "dept": "Sales", "salary": 80}]\nprint([e["name"] for e in sort_employees(employees)])',
    solution: 'def sort_employees(employees):\n    return sorted(employees, key=lambda e: (e["dept"], -e["salary"]))\n\nemployees = [{"name": "A", "dept": "Eng", "salary": 90}, {"name": "B", "dept": "Eng", "salary": 100}, {"name": "C", "dept": "Sales", "salary": 80}]\nprint([e["name"] for e in sort_employees(employees)])',
    expected: "['B', 'A', 'C']", rubric: ['Uses a tuple key for primary and secondary ordering.', 'Reverses only the salary comparison.', 'Uses sorted() so the input stays unchanged.'],
  },
  {
    id: 'anagram-check', title: 'Check whether two strings are anagrams',
    prompt: 'Write `are_anagrams(a, b)` for case-insensitive English text, ignoring spaces. Explain whether your approach sorts or counts characters.',
    starter: 'from collections import Counter\n\ndef are_anagrams(a, b):\n    pass\n\nprint(are_anagrams("Dormitory", "Dirty room"))',
    solution: 'from collections import Counter\n\ndef are_anagrams(a, b):\n    clean_a = "".join(a.lower().split())\n    clean_b = "".join(b.lower().split())\n    return Counter(clean_a) == Counter(clean_b)\n\nprint(are_anagrams("Dormitory", "Dirty room"))',
    expected: 'True', rubric: ['Applies the stated case and whitespace normalization.', 'Compares character frequencies or sorted normalized text.', 'Does not confuse anagrams with substrings.'],
  },
];

export interface ConversationPrompt { question: string; framework: string; }
export const conversationPrompts: ConversationPrompt[] = [
  { question: 'Walk me through a Python project you built and the part you personally owned.', framework: 'Cover the problem, your role, architecture/data flow, one hard trade-off, how you tested it, and what changed because of your work.' },
  { question: 'Tell me about a bug that took longer than expected to find.', framework: 'Explain the symptom, how you reproduced it, the evidence you inspected, root cause, fix, and how you prevented a repeat.' },
  { question: 'Describe a time you disagreed with a technical approach.', framework: 'State the shared goal, options and evidence, how you communicated, the decision, and what you learned. Keep it specific and respectful.' },
  { question: 'How would you make a small Python script reliable enough for a team to maintain?', framework: 'Mention clear functions/modules, input validation, useful errors/logging, tests, dependency isolation, documentation, and review.' },
  { question: 'Describe a feature you would improve if you had another week.', framework: 'Choose a real limitation, explain user impact, propose a bounded improvement, identify risks, and say how you would measure success.' },
  { question: 'Tell me about a mistake you made in a project and how you handled it.', framework: 'Own the mistake, explain impact and communication, describe the corrective action, and name a concrete process change.' },
  { question: 'How do you decide whether to use a library or write a small utility yourself?', framework: 'Compare correctness, maintenance, security, compatibility, performance, and team familiarity. Explain the threshold that would change your decision.' },
  { question: 'Explain one technical idea from your project to a non-technical teammate.', framework: 'Start from their goal, use a concrete analogy or example, avoid jargon, then check whether the explanation answered their question.' },
];

export interface PredictionPrompt { id: string; title: string; code: string; output: string; explanation: string; }
export const predictionPrompts: PredictionPrompt[] = [
  { id: 'alias', title: 'Aliasing and in-place update', code: 'a = [1]\nb = a\nb += [2]\nprint(a)\nprint(a is b)', output: '[1, 2]\nTrue', explanation: '`a` and `b` refer to the same list. `+=` mutates that list in place.' },
  { id: 'shallow-copy', title: 'Shallow copy', code: 'a = [[1], [2]]\nb = a.copy()\nb[0].append(9)\nb.append([3])\nprint(a)\nprint(b)', output: '[[1, 9], [2]]\n[[1, 9], [2], [3]]', explanation: 'The outer list is copied, but its nested lists are shared. Appending a new outer item affects only b.' },
  { id: 'mutable-default', title: 'Mutable default argument', code: 'def add(x, items=[]):\n    items.append(x)\n    return items\nprint(add(1))\nprint(add(2))', output: '[1]\n[1, 2]', explanation: 'The default list is created once when def executes and is reused by calls that omit items.' },
  { id: 'late-binding', title: 'Closure late binding', code: 'funcs = [lambda: i for i in range(3)]\nprint([f() for f in funcs])\nfixed = [lambda i=i: i for i in range(3)]\nprint([f() for f in fixed])', output: '[2, 2, 2]\n[0, 1, 2]', explanation: 'The first lambdas look up the shared i when called. The default argument captures each loop value at creation.' },
  { id: 'generator', title: 'Generator exhaustion', code: 'values = (n*n for n in range(3))\nprint(next(values))\nprint(list(values))\nprint(list(values))', output: '0\n[1, 4]\n[]', explanation: 'next consumes one value; list consumes the remaining values; an exhausted generator stays exhausted.' },
  { id: 'loop-else', title: 'Loop else', code: 'for value in [2, 4, 6]:\n    if value % 2:\n        break\nelse:\n    print("all even")', output: 'all even', explanation: 'The loop ends naturally without break, so its else suite runs.' },
  { id: 'short-circuit', title: 'Short-circuit evaluation', code: 'def check(x):\n    print("check", x)\n    return x > 0\nprint(False and check(1))\nprint(True or check(2))\nprint(all(check(x) for x in [1, 0, 3]))', output: 'False\nTrue\ncheck 1\ncheck 0\nFalse', explanation: 'and/or skip operands when the result is already determined. all() stops when its generator first yields a false value.' },
  { id: 'dict-order', title: 'Dictionary update order', code: 'd = {"a": 1, "b": 2}\nd["a"] = 3\nd["c"] = 4\nprint(list(d.items()))', output: "[('a', 3), ('b', 2), ('c', 4)]", explanation: 'Updating an existing key keeps its insertion position; a new key is appended.' },
];
