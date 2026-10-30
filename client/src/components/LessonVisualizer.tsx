import { useState } from 'react';

/** Small, interactive memory model for the beginner object/reference lessons. */
export function LessonVisualizer({ lesson }: { lesson: string }) {
  const [removed, setRemoved] = useState(false);
  const [unreachable, setUnreachable] = useState(false);
  const [mutated, setMutated] = useState(false);
  const [loopIndex, setLoopIndex] = useState(-1);
  const [generatorIndex, setGeneratorIndex] = useState(0);
  const [callDepth, setCallDepth] = useState(0);
  const runtimeLesson = /memory|runtime|python-internals/i.test(lesson);
  const generatorLesson = /iterator|generator/i.test(lesson);
  const loopLesson = /loop|range|condition|while/i.test(lesson);
  const functionLesson = /function|scope|closure|recursion|decorator/i.test(lesson);
  const slicingLesson = /indexing-and-slicing|slice-step|slicing/i.test(lesson);
  const objectLesson = runtimeLesson || /object|name|value|mutab|reference|alias/i.test(lesson);
  if (!objectLesson && !slicingLesson && !loopLesson && !functionLesson && !generatorLesson) return null;
  const loopValues = [2, 4, 5, 6];
  const generatorValues = [1, 4, 9];
  return <section className="panel lesson-visualizer" aria-label="Interactive Python visualisation">
    <div className="row between"><div><span className="eyebrow">VISUAL MODEL</span><h2>{objectLesson ? 'Names point to objects' : slicingLesson ? 'A slice selects positions' : loopLesson ? 'Follow a loop one step at a time' : generatorLesson ? 'A generator yields values on demand' : 'Function calls create frames'}</h2></div><span className="chip">Interactive</span></div>
    {objectLesson ? <>
      {runtimeLesson && <div className="runtime-flow" aria-label="Python source compilation and execution stages">
        <div><small>1 · SOURCE</small><code>app.py</code><span>Python text</span></div><b aria-hidden="true">→</b>
        <div><small>2 · COMPILE</small><code>code object</code><span>parse + bytecode</span></div><b aria-hidden="true">→</b>
        <div><small>3 · RUN TIME</small><code>Python VM</code><span>objects + calls</span></div>
      </div>}
      <p className="small muted">Python names refer to objects. An assignment adds a name; mutating a shared object is visible through every name that points to it.</p>
      <div className="memory-board">
        <div className="memory-names"><span className="memory-label">NAMES</span>{!unreachable && <><div className="memory-node">a</div>{!removed && <div className="memory-node">b</div>}</>}</div>
        <div className="memory-arrows" aria-hidden="true">{!unreachable && <><span>↘</span>{!removed && <span>↙</span>}</>}</div>
        <div className={`memory-object ${unreachable ? 'unreferenced' : ''}`}><span className="memory-label">{unreachable ? 'UNREACHABLE OBJECT' : 'LIST OBJECT'}</span><code>[10{mutated ? ', 20' : ''}]</code></div>
      </div>
      <div className="row"><button className="btn sm" disabled={unreachable} onClick={() => setMutated((value) => !value)}>{mutated ? 'Undo append' : `Append through ${removed ? 'a' : 'b'}`}</button><button className="btn sm" onClick={() => { setRemoved((value) => !value); setUnreachable(false); setMutated(false); }}>{removed ? 'Restore b = a' : 'Delete b'}</button><button className="btn sm" onClick={() => { setUnreachable((value) => !value); setRemoved(false); setMutated(false); }}>{unreachable ? 'Restore a reference' : 'Delete the last name'}</button></div>
      <p className="small" aria-live="polite">{unreachable ? 'No name points to this object now. A garbage collector may reclaim it when safe.' : removed ? 'Only a still refers to this list, so it stays alive.' : mutated ? 'Both names see the same mutation: a and b refer to one list.' : 'Both names refer to the same list object. is checks identity; == checks value equality.'}</p>
      <div className="gc-note"><strong>Garbage collection idea:</strong> when no live references remain, an object can be reclaimed. CPython primarily uses reference counting and also detects reference cycles; this picture shows reachability, not exact runtime internals.</div>
    </> : slicingLesson ? <>
      <p className="small muted">For <code>items[start:stop:step]</code>, start is included, stop is excluded, and step controls direction and spacing.</p>
      <div className="slice-board" aria-label="Slice positions 0 through 5, selecting indices 1 and 3">
        {['A', 'B', 'C', 'D', 'E', 'F'].map((value, index) => <div key={value} className={`slice-cell ${index === 1 || index === 3 ? 'selected' : ''}`}><code>{value}</code><small>{index}</small></div>)}
      </div>
      <p className="small"><code>items[1:5:2]</code> selects <code>B, D</code>: indices 1 and 3, stopping before index 5.</p>
    </> : loopLesson ? <>
      <p className="small muted">Step through <code>for value in [2, 4, 5, 6]</code> and watch the condition decide which values enter the result.</p>
      <div className="visual-sequence">{loopValues.map((value, index) => <div key={value} className={`slice-cell ${index === loopIndex ? 'selected' : index < loopIndex && value % 2 === 0 ? 'selected' : ''}`}><code>{value}</code><small>{index < loopIndex ? value % 2 === 0 ? 'kept' : 'skipped' : index === loopIndex ? 'current' : 'waiting'}</small></div>)}</div>
      <div className="row"><button className="btn sm primary" onClick={() => setLoopIndex((index) => index >= loopValues.length - 1 ? -1 : index + 1)}>{loopIndex >= loopValues.length - 1 ? 'Restart loop' : 'Run next iteration'}</button><code>evens = [2, 4, 6]</code></div>
      <p className="small" aria-live="polite">{loopIndex < 0 ? 'The loop has not started.' : loopIndex >= loopValues.length - 1 ? 'The loop is complete. The odd value 5 failed the filter.' : `Now checking ${loopValues[loopIndex]}: ${loopValues[loopIndex] % 2 === 0 ? 'the condition is true, so it is kept.' : 'the condition is false, so it is skipped.'}`}</p>
    </> : generatorLesson ? <>
      <p className="small muted">Calling <code>next()</code> resumes the generator until its next <code>yield</code>. Values are produced only when requested.</p>
      <div className="visual-sequence">{generatorValues.map((value, index) => <div key={value} className={`slice-cell ${index < generatorIndex ? 'selected' : ''}`}><code>{value}</code><small>{index < generatorIndex ? 'yielded' : 'not yet made'}</small></div>)}</div>
      <div className="row"><button className="btn sm primary" onClick={() => setGeneratorIndex((index) => index >= generatorValues.length ? 0 : index + 1)}>{generatorIndex >= generatorValues.length ? 'Restart generator' : 'Call next()'}</button><code>yield n * n</code></div>
      <p className="small" aria-live="polite">{generatorIndex === 0 ? 'Nothing is produced until the caller asks for a value.' : generatorIndex >= generatorValues.length ? 'The generator is exhausted; another next() raises StopIteration.' : `next() produced ${generatorValues[generatorIndex - 1]}; the generator is paused at the next yield.`}</p>
    </> : functionLesson ? <>
      <p className="small muted">A function call pauses its caller and creates a frame for its local names. Returning removes that frame and resumes the caller.</p>
      <div className="call-stack"><div className={`call-frame ${callDepth === 0 ? 'selected' : ''}`}><strong>main()</strong><code>answer = double(4)</code><small>{callDepth === 0 ? 'running' : 'paused'}</small></div>{callDepth > 0 && <div className="call-frame selected"><strong>double(value=4)</strong><code>return value * 2</code><small>local value: 4</small></div>}</div>
      <div className="row"><button className="btn sm primary" onClick={() => setCallDepth((depth) => depth === 0 ? 1 : 0)}>{callDepth ? 'Return 8 to main()' : 'Call double(4)'}</button><code>print(answer)  # {callDepth ? 'waiting…' : '8 after return'}</code></div>
      <p className="small" aria-live="polite">{callDepth ? 'The caller is paused while the function uses its own local name.' : 'The function frame has returned; main() continues with answer = 8.'}</p>
    </> : null}
  </section>;
}
