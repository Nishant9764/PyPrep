import { useState } from 'react';

/** Small, interactive memory model for the beginner object/reference lessons. */
export function LessonVisualizer({ lesson }: { lesson: string }) {
  const [removed, setRemoved] = useState(false);
  const [unreachable, setUnreachable] = useState(false);
  const [mutated, setMutated] = useState(false);
  const objectLesson = /object|name|value|mutab|reference/i.test(lesson);
  const slicingLesson = /string|slice|sequence|list/i.test(lesson);
  if (!objectLesson && !slicingLesson) return null;
  return <section className="panel lesson-visualizer" aria-label="Interactive Python visualisation">
    <div className="row between"><div><span className="eyebrow">VISUAL MODEL</span><h2>{objectLesson ? 'Names point to objects' : 'A slice selects positions'}</h2></div><span className="chip">Interactive</span></div>
    {objectLesson ? <>
      <p className="small muted">Python names refer to objects. An assignment adds a name; mutating a shared object is visible through every name that points to it.</p>
      <div className="memory-board">
        <div className="memory-names"><span className="memory-label">NAMES</span>{!unreachable && <><div className="memory-node">a</div>{!removed && <div className="memory-node">b</div>}</>}</div>
        <div className="memory-arrows" aria-hidden="true">{!unreachable && <><span>↘</span>{!removed && <span>↙</span>}</>}</div>
        <div className={`memory-object ${unreachable ? 'unreferenced' : ''}`}><span className="memory-label">{unreachable ? 'UNREACHABLE OBJECT' : 'LIST OBJECT'}</span><code>[10{mutated ? ', 20' : ''}]</code></div>
      </div>
      <div className="row"><button className="btn sm" disabled={unreachable} onClick={() => setMutated((value) => !value)}>{mutated ? 'Undo append' : 'Append through b'}</button><button className="btn sm" onClick={() => { setRemoved((value) => !value); setUnreachable(false); setMutated(false); }}>{removed ? 'Restore b = a' : 'Delete b'}</button><button className="btn sm" onClick={() => { setUnreachable((value) => !value); setRemoved(false); setMutated(false); }}>{unreachable ? 'Restore a reference' : 'Delete the last name'}</button></div>
      <p className="small" aria-live="polite">{unreachable ? 'No name points to this object now. A garbage collector may reclaim it when safe.' : removed ? 'Only a still refers to this list, so it stays alive.' : mutated ? 'Both names see the same mutation: a and b refer to one list.' : 'Both names refer to the same list object. is checks identity; == checks value equality.'}</p>
      <div className="gc-note"><strong>Garbage collection idea:</strong> when no live references remain, an object can be reclaimed. CPython primarily uses reference counting and also detects reference cycles; this picture shows reachability, not exact runtime internals.</div>
    </> : <>
      <p className="small muted">For <code>items[start:stop:step]</code>, start is included, stop is excluded, and step controls direction and spacing.</p>
      <div className="slice-board" aria-label="Slice positions 0 through 5, selecting indices 1 and 3">
        {['A', 'B', 'C', 'D', 'E', 'F'].map((value, index) => <div key={value} className={`slice-cell ${index === 1 || index === 3 ? 'selected' : ''}`}><code>{value}</code><small>{index}</small></div>)}
      </div>
      <p className="small"><code>items[1:5:2]</code> selects <code>B, D</code>: indices 1 and 3, stopping before index 5.</p>
    </>}
  </section>;
}
