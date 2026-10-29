import { python } from '@codemirror/lang-python';
import { indentWithTab } from '@codemirror/commands';
import { Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import CodeMirror from '@uiw/react-codemirror';
import { useMemo, useRef } from 'react';
import { useDark } from '../theme';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
  onSubmit: () => void;
  ariaLabel?: string;
}

export function CodeEditor({ value, onChange, onRun, onSubmit, ariaLabel = 'Python code editor. Press Escape then Tab to leave the editor.' }: Props) {
  const dark = useDark();
  const runRef = useRef(onRun);
  const submitRef = useRef(onSubmit);
  runRef.current = onRun;
  submitRef.current = onSubmit;
  const extensions = useMemo(
    () => [
      python(),
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({ 'aria-label': ariaLabel }),
      Prec.highest(
        keymap.of([
          { key: 'Mod-Enter', run: () => (runRef.current(), true) },
          { key: 'Mod-Shift-Enter', run: () => (submitRef.current(), true) },
        ]),
      ),
      keymap.of([indentWithTab]),
    ],
    // Read changing handlers through refs so typing does not rebuild CodeMirror's keymap.
    [ariaLabel],
  );
  return (
    <div className="cm-wrap">
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={extensions}
        theme={dark ? 'dark' : 'light'}
        basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: true, indentOnInput: true, autocompletion: false, tabSize: 4 }}
        minHeight="280px"
      />
    </div>
  );
}
