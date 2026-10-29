import { python } from '@codemirror/lang-python';
import { indentWithTab } from '@codemirror/commands';
import { Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import CodeMirror from '@uiw/react-codemirror';
import { useMemo } from 'react';
import { useDark } from '../theme';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
  onSubmit: () => void;
}

export function CodeEditor({ value, onChange, onRun, onSubmit }: Props) {
  const dark = useDark();
  const extensions = useMemo(
    () => [
      python(),
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({ 'aria-label': 'Python code editor. Press Escape then Tab to leave the editor.' }),
      Prec.highest(
        keymap.of([
          { key: 'Mod-Enter', run: () => (onRun(), true) },
          { key: 'Mod-Shift-Enter', run: () => (onSubmit(), true) },
        ]),
      ),
      keymap.of([indentWithTab]),
    ],
    // handlers are re-read through refs-free closures: rebuild when they change identity
    [onRun, onSubmit],
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
