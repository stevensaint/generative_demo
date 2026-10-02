import { useEffect, useState } from 'react';
import type { Screen, DemoPresentation, NavigationTarget } from '../../../../packages/contracts/src/presentation.js';

export type Navigate = (target: NavigationTarget) => void;
type ViewProps = { screen: Screen; onNavigate: Navigate; disabled: boolean; filter?: string; onFilter?: (query: string) => void; highlights?: string[] };

export function Navigation({ items, currentScreen, onNavigate, disabled }: {
  items: DemoPresentation['navigation']; currentScreen?: string; onNavigate: Navigate; disabled: boolean;
}) {
  return <nav className="navigation" aria-label="Workspace navigation">{items.map(item =>
    <button key={item.target.screenId} aria-current={item.target.screenId === currentScreen ? 'page' : undefined}
      disabled={disabled} onClick={() => onNavigate(item.target)}>{item.label}<span aria-hidden="true">›</span></button>,
  )}</nav>;
}

function Fields({ screen, highlights = [] }: { screen: Screen; highlights?: string[] }) {
  return <div className="field-sections">{screen.sections.map(section => <section className="panel" key={section.title}>
    <h2>{section.title}</h2><dl>{section.fields.map(field => <div className={highlights.includes(field.label) ? 'highlighted' : undefined} key={field.label}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl>
  </section>)}</div>;
}

function DataTable({ screen, onNavigate, disabled, query = '' }: ViewProps & { query?: string }) {
  const table = screen.table;
  if (!table) return null;
  const filtered = table.rows.filter(row => Object.values(row.cells).join(' ').toLowerCase().includes(query.toLowerCase()));
  const hasLinks = table.rows.some(row => row.link);
  return <div className="panel table-panel"><div className="table-scroll"><table>
    <caption>{table.caption}</caption><thead><tr>{table.columns.map(column => <th scope="col" key={column.key}>{column.label}</th>)}{hasLinks && <th scope="col"><span className="sr-only">Open record</span></th>}</tr></thead>
    <tbody>{filtered.map(row => <tr key={row.id} className={`row-${row.tone}`}>{table.columns.map((column, index) =>
      index === 0 ? <th scope="row" key={column.key}>{row.cells[column.key]}</th> : <td key={column.key}>{row.cells[column.key]}</td>,
    )}{hasLinks && <td>{row.link && <button className="text-button" disabled={disabled} onClick={() => onNavigate(row.link!.target)}>{row.link.label}<span aria-hidden="true"> ↗</span></button>}</td>}</tr>)}
    {filtered.length === 0 && <tr><td colSpan={table.columns.length + (hasLinks ? 1 : 0)} className="empty-table">No records match this filter.</td></tr>}</tbody>
  </table></div></div>;
}

function Steps({ screen }: { screen: Screen }) {
  if (!screen.steps.length) return null;
  return <section className="panel"><h2>Workflow context</h2><ol className="workflow-steps">{screen.steps.map((step, index) =>
    <li key={step.label} className={`step-${step.state}`}><span className="step-number" aria-hidden="true">{step.state === 'complete' ? '✓' : index + 1}</span>
      <div><h3>{step.label}</h3><p>{step.detail}</p><span className="step-state">{step.state}</span></div></li>,
  )}</ol></section>;
}

export function WorkQueue(props: ViewProps) { return <><Fields screen={props.screen} highlights={props.highlights} /><DataTable {...props} /></>; }
export function RecordList(props: ViewProps) {
  const [draft, setDraft] = useState(props.filter ?? '');
  useEffect(() => setDraft(props.filter ?? ''), [props.filter]);
  return <><form className="list-filter" onSubmit={event => { event.preventDefault(); props.onFilter?.(draft); }}><label>Filter records<input type="search" placeholder="Search this list" value={draft} maxLength={100} disabled={props.disabled} onChange={event => setDraft(event.target.value)} /></label><button className="secondary" disabled={props.disabled}>Apply filter</button></form><DataTable {...props} query={props.filter ?? ''} /></>;
}
export function RecordDetail(props: ViewProps) { return <><Fields screen={props.screen} highlights={props.highlights} /><DataTable {...props} /></>; }
export function ExecutionPanel(props: ViewProps) { return <><Fields screen={props.screen} highlights={props.highlights} /><Steps screen={props.screen} /></>; }
export function ResultsGrid(props: ViewProps) { return <DataTable {...props} />; }
export function WorkflowPanel(props: ViewProps) { return <><Fields screen={props.screen} highlights={props.highlights} /><Steps screen={props.screen} /></>; }
export function ReviewPanel(props: ViewProps) { return <Fields screen={props.screen} highlights={props.highlights} />; }
export function AuditHistory(props: ViewProps) { return <DataTable {...props} />; }

export function ScreenView(props: ViewProps) {
  const components = {
    'work-queue': WorkQueue, 'record-list': RecordList, 'record-detail': RecordDetail,
    execution: ExecutionPanel, results: ResultsGrid, workflow: WorkflowPanel, review: ReviewPanel, audit: AuditHistory,
  };
  const Component = components[props.screen.kind];
  return <>
    {props.screen.notice && <aside className={`notice notice-${props.screen.notice.tone}`}><strong>{props.screen.notice.title}</strong><p>{props.screen.notice.body}</p></aside>}
    <Component {...props} />
    <div className="screen-links">{props.screen.links.map((link, index) => <button key={link.label} className={index ? 'secondary' : ''} disabled={props.disabled} onClick={() => props.onNavigate(link.target)}>{link.label}{index === 0 && <span aria-hidden="true"> →</span>}</button>)}</div>
  </>;
}
