import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import { pythonGenerator } from 'blockly/python';
import { api } from '../api';
import { useAuth } from '../auth';
import { LessonVisualizer } from '../components/LessonVisualizer';
import { PageHead } from '../components/ui';
import { useDark } from '../theme';

type ExampleId = 'hello' | 'decision' | 'count' | 'list';
type RunResult = { status: string; stdout: string; error?: string; message?: string };

const examples: { id: ExampleId; title: string; description: string; xml: string }[] = [
  { id: 'hello', title: 'Print a message', description: 'Connect a text block to print. Then change the message and run it.', xml: '<xml xmlns="https://developers.google.com/blockly/xml"><block type="text_print" x="24" y="24"><value name="TEXT"><shadow type="text"><field name="TEXT">Hello from blocks!</field></shadow></value></block></xml>' },
  { id: 'decision', title: 'Make a decision', description: 'Compare two values, then make Python choose a branch.', xml: '<xml xmlns="https://developers.google.com/blockly/xml"><block type="controls_if" x="24" y="24"><mutation else="1"></mutation><value name="IF0"><block type="logic_compare"><field name="OP">GTE</field><value name="A"><shadow type="math_number"><field name="NUM">18</field></shadow></value><value name="B"><shadow type="math_number"><field name="NUM">18</field></shadow></value></block></value><statement name="DO0"><block type="text_print"><value name="TEXT"><shadow type="text"><field name="TEXT">You can continue</field></shadow></value></block></statement><statement name="ELSE"><block type="text_print"><value name="TEXT"><shadow type="text"><field name="TEXT">Check the requirement</field></shadow></value></block></statement></block></xml>' },
  { id: 'count', title: 'Repeat with a for loop', description: 'A loop runs its body once for each value in a range.', xml: '<xml xmlns="https://developers.google.com/blockly/xml"><block type="controls_for" x="24" y="24"><field name="VAR">step</field><value name="FROM"><shadow type="math_number"><field name="NUM">1</field></shadow></value><value name="TO"><shadow type="math_number"><field name="NUM">5</field></shadow></value><value name="BY"><shadow type="math_number"><field name="NUM">1</field></shadow></value><statement name="DO"><block type="text_print"><value name="TEXT"><block type="variables_get"><field name="VAR">step</field></block></value></block></statement></block></xml>' },
  { id: 'list', title: 'Work with a list', description: 'Create a list, visit each item, and print the values one by one.', xml: '<xml xmlns="https://developers.google.com/blockly/xml"><block type="controls_forEach" x="24" y="24"><field name="VAR">fruit</field><value name="LIST"><block type="lists_create_with"><mutation items="3"></mutation><value name="ADD0"><shadow type="text"><field name="TEXT">apple</field></shadow></value><value name="ADD1"><shadow type="text"><field name="TEXT">pear</field></shadow></value><value name="ADD2"><shadow type="text"><field name="TEXT">mango</field></shadow></value></block></value><statement name="DO"><block type="text_print"><value name="TEXT"><block type="variables_get"><field name="VAR">fruit</field></block></value></block></statement></block></xml>' },
];

const toolbox: any = {
  kind: 'categoryToolbox',
  contents: [
    { kind: 'category', name: 'Output', categorystyle: 'text_category', contents: [{ kind: 'block', type: 'text_print' }, { kind: 'block', type: 'text' }, { kind: 'block', type: 'text_join' }] },
    { kind: 'category', name: 'Variables', categorystyle: 'variable_category', custom: 'VARIABLE' },
    { kind: 'category', name: 'Conditions', categorystyle: 'logic_category', contents: [{ kind: 'block', type: 'controls_if' }, { kind: 'block', type: 'logic_compare' }, { kind: 'block', type: 'logic_operation' }, { kind: 'block', type: 'logic_boolean' }, { kind: 'block', type: 'logic_negate' }] },
    { kind: 'category', name: 'Loops', categorystyle: 'loop_category', contents: [{ kind: 'block', type: 'controls_for' }, { kind: 'block', type: 'controls_forEach' }, { kind: 'block', type: 'controls_repeat_ext' }, { kind: 'block', type: 'controls_whileUntil' }, { kind: 'block', type: 'controls_flow_statements' }] },
    { kind: 'category', name: 'Math', categorystyle: 'math_category', contents: [{ kind: 'block', type: 'math_number' }, { kind: 'block', type: 'math_arithmetic' }, { kind: 'block', type: 'math_modulo' }, { kind: 'block', type: 'math_single' }, { kind: 'block', type: 'math_random_int' }] },
    { kind: 'category', name: 'Lists', categorystyle: 'list_category', contents: [{ kind: 'block', type: 'lists_create_with' }, { kind: 'block', type: 'lists_repeat' }, { kind: 'block', type: 'lists_length' }, { kind: 'block', type: 'lists_getIndex' }, { kind: 'block', type: 'lists_setIndex' }, { kind: 'block', type: 'lists_sort' }, { kind: 'block', type: 'lists_reverse' }] },
    { kind: 'category', name: 'Functions', categorystyle: 'procedure_category', custom: 'PROCEDURE' },
  ],
};

function makeTheme(dark: boolean) {
  return Blockly.Theme.defineTheme('pyprep-' + (dark ? 'dark' : 'light'), {
    name: 'PyPrep',
    base: Blockly.Themes.Classic,
    componentStyles: {
      workspaceBackgroundColour: dark ? '#111730' : '#f6f8fc',
      toolboxBackgroundColour: dark ? '#161c34' : '#ffffff',
      toolboxForegroundColour: dark ? '#e7ebf7' : '#16203a',
      flyoutBackgroundColour: dark ? '#1b2441' : '#ffffff',
      flyoutForegroundColour: dark ? '#e7ebf7' : '#16203a',
      flyoutOpacity: 1,
      scrollbarColour: dark ? '#536087' : '#aab4cb',
      scrollbarOpacity: 0.55,
      insertionMarkerColour: dark ? '#aab8ff' : '#2f3fb4',
      insertionMarkerOpacity: 0.25,
      markerColour: dark ? '#ffd84d' : '#2f3fb4',
      cursorColour: dark ? '#ffd84d' : '#2f3fb4',
      selectedGlowColour: dark ? '#93a1ff' : '#2f3fb4',
      selectedGlowOpacity: 0.18,
    },
  });
}

const models = [
  { id: 'memory', title: 'Names and memory', lesson: 'Memory Management and Python Internals', match: 'Memory Management Memory', topic: 'advanced', slug: 'memory-management' },
  { id: 'condition', title: 'Conditions', lesson: 'Conditionals and Boolean Logic', match: '', topic: 'control-flow', slug: 'conditionals' },
  { id: 'loop', title: 'Loops', lesson: 'for Loops, range() and Direction', match: 'for Loops range loop', topic: 'control-flow', slug: 'for-loops-and-range' },
  { id: 'slice', title: 'Slicing', lesson: 'Indexing and Slicing', match: 'Indexing and Slicing', topic: 'strings', slug: 'indexing-and-slicing' },
  { id: 'functions', title: 'Function calls', lesson: 'Defining Functions and Return Values', match: 'Defining Functions and Return Values', topic: 'functions', slug: 'defining-functions' },
  { id: 'generator', title: 'Generators', lesson: 'Iterators and Generators', match: 'Iterators and Generators', topic: 'advanced', slug: 'iterators-and-generators' },
];

export function VisualLab() {
  const { track = 'python' } = useParams();
  const { user } = useAuth();
  const hostRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const dark = useDark();
  const [tab, setTab] = useState<'blocks' | 'models'>('blocks');
  const [exampleId, setExampleId] = useState<ExampleId>('count');
  const [generatedCode, setGeneratedCode] = useState('');
  const [stdin, setStdin] = useState('');
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [runError, setRunError] = useState('');
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [modelId, setModelId] = useState('memory');
  const exampleRef = useRef<ExampleId>('count');
  const currentExample = examples.find((example) => example.id === exampleId) ?? examples[0];
  const storageKey = useMemo(() => 'pyprep.visual-lab.v1.' + (user?.id ?? 'learner') + '.' + track, [user?.id, track]);
  const selectedModel = models.find((model) => model.id === modelId) ?? models[0];

  useEffect(() => {
    if (!hostRef.current) return;
    const workspace = Blockly.inject(hostRef.current, {
      toolbox,
      theme: makeTheme(dark),
      renderer: 'zelos',
      trashcan: true,
      sounds: false,
      grid: { spacing: 24, length: 3, colour: dark ? '#2a3355' : '#dce2ef', snap: true },
      zoom: { controls: true, wheel: true, startScale: 0.86, maxScale: 1.35, minScale: 0.55, scaleSpeed: 1.12 },
      move: { scrollbars: true, drag: true, wheel: true },
    });
    workspaceRef.current = workspace;
    const update = () => {
      setGeneratedCode(pythonGenerator.workspaceToCode(workspace));
      try { window.localStorage.setItem(storageKey, JSON.stringify(Blockly.serialization.workspaces.save(workspace))); } catch { /* saved workspace is a convenience */ }
      try { window.localStorage.setItem(storageKey + '.example', exampleRef.current); } catch { /* optional preference */ }
    };
    let restored = false;
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        Blockly.serialization.workspaces.load(JSON.parse(saved), workspace);
        restored = true;
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }
    try {
      const savedExample = window.localStorage.getItem(storageKey + '.example');
      if (savedExample && examples.some((example) => example.id === savedExample)) {
        exampleRef.current = savedExample as ExampleId;
        setExampleId(exampleRef.current);
      }
    } catch { /* optional preference */ }
    if (!restored) Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(examples.find((example) => example.id === 'count')!.xml), workspace);
    workspace.addChangeListener((event) => { if (!event.isUiEvent) update(); });
    update();
    const host = hostRef.current;
    const observer = new ResizeObserver(() => Blockly.svgResize(workspace));
    observer.observe(host);
    requestAnimationFrame(() => Blockly.svgResize(workspace));
    return () => {
      observer.disconnect();
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(Blockly.serialization.workspaces.save(workspace)));
        window.localStorage.setItem(storageKey + '.example', exampleRef.current);
      } catch { /* ignore storage errors */ }
      workspace.dispose();
      workspaceRef.current = null;
    };
  }, [dark, storageKey]);

  function loadExample(id: ExampleId) {
    setExampleId(id);
    exampleRef.current = id;
    setRunResult(null);
    setRunError('');
    const workspace = workspaceRef.current;
    if (!workspace) return;
    workspace.clear();
    Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(examples.find((item) => item.id === id)!.xml), workspace);
    setGeneratedCode(pythonGenerator.workspaceToCode(workspace));
  }

  async function runBlocks() {
    if (!generatedCode.trim()) { setRunError('Add a block to the workspace before running.'); return; }
    setRunning(true);
    setRunError('');
    setRunResult(null);
    try {
      const result = await api<RunResult>('/tracks/' + track + '/interview/cookbook-visual-lab/run', { method: 'POST', body: { code: generatedCode, stdin } });
      setRunResult(result);
    } catch (error) {
      setRunError(error instanceof Error ? error.message : 'Could not reach the isolated Python runner.');
    } finally { setRunning(false); }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { setRunError('Clipboard access is unavailable. Select and copy the generated Python instead.'); }
  }

  return <div className="page visual-lab-page">
    <PageHead title="Visual Lab">
      <p>Build Python by connecting blocks, see the code they create, and run it in PyPrep’s isolated runner. Explore visual models for memory, conditions, loops, functions, slicing, and generators.</p>
      <div className="row"><Link className="btn" to={'/t/' + track + '/learn'}>Learning path</Link><Link className="btn" to={'/t/' + track + '/practice'}>Code practice</Link><Link className="btn" to={'/t/' + track + '/trace-bench'}>Guided traces</Link></div>
    </PageHead>

    <section className="visual-lab-banner">
      <div><span className="eyebrow">A VISUAL WAY INTO PYTHON</span><h2>Build it. Read it. Run it.</h2><p>Start with blocks, then connect each shape to the Python syntax it creates. Your workspace is saved in this browser.</p></div>
      <div className="visual-lab-stats"><span><strong>01</strong> arrange blocks</span><span><strong>02</strong> inspect Python</span><span><strong>03</strong> run safely</span></div>
    </section>

    <div className="tabs visual-lab-tabs" role="tablist" aria-label="Visual Lab modes">
      <button className="tab" role="tab" aria-selected={tab === 'blocks'} onClick={() => setTab('blocks')}>Build with blocks</button>
      <button className="tab" role="tab" aria-selected={tab === 'models'} onClick={() => setTab('models')}>Explore a concept</button>
    </div>

    {tab === 'blocks' ? <section className="visual-workbench">
      <div className="panel visual-builder">
        <div className="row between visual-section-head"><div><span className="eyebrow">BLOCK WORKSPACE</span><h2>Choose an example, then make it yours</h2></div><span className="chip">Drag and drop</span></div>
        <div className="filters visual-controls">
          <label className="field visual-example"><span>Start with an example</span><select className="input" value={exampleId} onChange={(event) => loadExample(event.target.value as ExampleId)}>{examples.map((example) => <option value={example.id} key={example.id}>{example.title}</option>)}</select></label>
          <p className="small muted">{currentExample.description}</p>
        </div>
        <div className="blockly-frame"><div ref={hostRef} className="blockly-host" aria-label="Drag and drop Python programming blocks" /></div>
        <div className="row between visual-workspace-foot"><p className="tiny muted">Use the toolbox to add conditions, loops, variables, math, text, lists, or functions. The block editor also supports keyboard and screen-reader navigation.</p><button className="btn sm" onClick={() => loadExample('count')}>Reset to loop example</button></div>
      </div>

      <aside className="visual-output-column">
        <section className="panel visual-code-panel">
          <div className="row between"><div><span className="eyebrow">GENERATED PYTHON</span><h2>What your blocks mean</h2></div><button className="btn sm" onClick={() => void copyCode()} disabled={!generatedCode}>{copied ? 'Copied' : 'Copy code'}</button></div>
          <pre className="visual-generated-code"><code>{generatedCode || '# Connect blocks to build a Python program.'}</code></pre>
          <p className="tiny muted">This code comes from your current workspace. Copy it into Practice when you are ready to edit Python line by line.</p>
        </section>
        <section className="panel visual-run-panel">
          <div className="row between"><div><span className="eyebrow">SAFE RUN</span><h2>See the output</h2></div><span className="chip">Python sandbox</span></div>
          <label className="field"><span>Standard input <span className="muted">(optional)</span></span><textarea className="input scratch-input" value={stdin} onChange={(event) => setStdin(event.target.value)} placeholder="Input for input()" /></label>
          <button className="btn primary" disabled={running || !generatedCode.trim()} onClick={() => void runBlocks()}>{running ? 'Running safely…' : 'Run generated Python'}</button>
          {runError && <div className="alert error" role="alert">{runError}</div>}
          {runResult && <div className={'alert ' + (runResult.error || runResult.status !== 'ok' ? 'error' : 'info')} role="status"><strong>{runResult.error || runResult.status !== 'ok' ? 'Run stopped' : 'Program output'}</strong>{runResult.error ? <p>{runResult.error}</p> : <><pre className="glance-output">{runResult.stdout || '(no output)'}</pre>{runResult.status !== 'ok' && <p className="small">{runResult.message}</p>}</>}</div>}
          <p className="tiny muted">Runs are temporary and do not count as submitted practice answers.</p>
        </section>
      </aside>
    </section> : <section className="visual-concept-layout">
      <aside className="panel visual-concept-picker"><span className="eyebrow">CONCEPT MENU</span><h2>What should we explore?</h2><div className="visual-concept-options" role="tablist" aria-label="Visual concepts">
        {models.map((model) => <button key={model.id} className="visual-concept-option" role="tab" aria-selected={model.id === modelId} onClick={() => setModelId(model.id)}><strong>{model.title}</strong><span>{model.lesson}</span></button>)}
      </div></aside>
      <section className="visual-concept-main">
        <div className="alert info"><strong>Guided concept model</strong>These small scenes teach one idea at a time; they do not trace custom block programs. Build and run your own program in the other tab.</div>
        {selectedModel.id === 'condition' ? <ConditionModel /> : <LessonVisualizer key={selectedModel.id} lesson={selectedModel.match} />}
        <div className="panel visual-related"><div><span className="eyebrow">KEEP LEARNING</span><h2>Go deeper in the lesson</h2><p className="small muted">The model is a small learning example. The lesson explains the concept, common mistakes, and related practice.</p></div><Link className="btn primary" to={'/t/' + track + '/learn/' + selectedModel.topic + '/' + selectedModel.slug}>Open {selectedModel.lesson}</Link></div>
      </section>
    </section>}

    <section className="visual-lab-footer panel"><div><span className="eyebrow">HOW TO USE THE LAB</span><h2>Start small, then explain what changed</h2></div><div className="visual-lab-steps"><p><strong>Build:</strong> drag one block from the toolbox and connect it.</p><p><strong>Predict:</strong> say what value or output you expect.</p><p><strong>Run:</strong> compare your prediction with Python’s output.</p><p><strong>Transfer:</strong> open the related lesson or solve a practice problem without the blocks.</p></div></section>
  </div>;
}

function ConditionModel() {
  const [weather, setWeather] = useState<'rain' | 'sun'>('rain');
  const raining = weather === 'rain';
  return <section className="panel condition-model" aria-labelledby="condition-model-title">
    <div className="row between"><div><span className="eyebrow">CONDITIONS</span><h2 id="condition-model-title">A condition chooses one path</h2></div><span className="chip">Try both branches</span></div>
    <p>A Boolean expression is checked once. If it is true, Python runs the <code>if</code> block; otherwise it runs the <code>else</code> block.</p>
    <label className="field condition-switch"><span>What is the weather?</span><select className="input" value={weather} onChange={(event) => setWeather(event.target.value as 'rain' | 'sun')}><option value="rain">Raining</option><option value="sun">Sunny</option></select></label>
    <div className="condition-code"><div className={'condition-branch ' + (raining ? 'active' : '')}><code>if is_raining:</code><strong>Bring an umbrella</strong>{raining && <span className="condition-token">TRUE · selected</span>}</div><div className={'condition-branch ' + (!raining ? 'active' : '')}><code>else:</code><strong>Bring sunglasses</strong>{!raining && <span className="condition-token">FALSE · selected</span>}</div></div>
    <div className="alert info"><strong>Python prints</strong><code>{raining ? 'Bring an umbrella' : 'Bring sunglasses'}</code></div>
    <p className="small muted">The condition evaluates to <code>{String(raining)}</code>, so exactly one branch runs.</p>
  </section>;
}
