import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHead } from '../components/ui';
import { traceScenarios } from '../data/traceScenarios';

export function TraceBench() {
  const { track = 'python' } = useParams();
  const [selected, setSelected] = useState(traceScenarios[0].id);
  const scenario = traceScenarios.find((item) => item.id === selected) ?? traceScenarios[0];
  return <div className="page">
    <p className="small"><Link to={`/t/${track}/interview-glance`}>← Interview Glance</Link></p>
    <PageHead title="Trace Bench">
      <p>Step through familiar Python patterns before you code. Each walkthrough is a guided dry run with a visible state table.</p>
    </PageHead>
    <div className="alert info"><strong>Guided dry run</strong>This is a curated teaching trace of the example shown below. It is not a live Python interpreter and does not represent Python’s complete internal state.</div>
    <div className="trace-layout">
      <aside className="panel trace-picker"><h2>Choose a pattern</h2><div className="trace-options" role="tablist" aria-label="Trace examples">
        {traceScenarios.map((item) => <button key={item.id} className="trace-option" role="tab" aria-selected={scenario.id === item.id} onClick={() => setSelected(item.id)}><strong>{item.title}</strong><span>{item.topic}</span></button>)}
      </div></aside>
      <section className="panel trace-main" aria-live="polite">
        <div className="row between"><div><span className="eyebrow">{scenario.topic}</span><h2>{scenario.title}</h2></div><span className="chip">{scenario.steps.length} steps</span></div>
        <p>{scenario.goal}</p>
        <div className="trace-code-wrap"><span className="small muted">Example code</span><pre className="glance-code"><code>{scenario.code}</code></pre></div>
        <div className="trace-table-wrap"><table className="table trace-table"><thead><tr>{scenario.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{scenario.steps.map((step) => <tr key={`${scenario.id}-${step.iteration}`}><th scope="row">{step.iteration}</th><td>{step.values}</td><td>{step.action}</td><td>{step.result}</td></tr>)}</tbody></table></div>
        <div className="alert ok"><strong>Interview takeaway</strong>{scenario.takeaway}</div>
      </section>
    </div>
  </div>;
}
