import type { ProductPack } from '../../../../packages/contracts/src/product-pack.js';
import type { Navigate } from './primitives.js';

// Pack-authored guide; lane selection is sent through the demo controller.
export function DemoGuide({ pack, onNavigate, disabled, onLane, currentRole }: { onLane?: (laneId: string) => void; currentRole?: string | null; pack: ProductPack; onNavigate: Navigate; disabled: boolean }) {
  return <details className="demo-guide panel"><summary>Explore demo paths</summary>
    <p className="guide-intro">{pack.presentation.fixtureDescription}</p>
    <div className="guide-paths">{pack.lanes.map(lane => {
      const entry = lane.nodes.find(node => node.id === lane.entryNodeId)!;
      return <section key={lane.id}><h2>{lane.label}</h2><p>{lane.description}</p>
        <p className="guide-roles">{lane.roles.map(id => pack.roles.find(role => role.id === id)!.label).join(' · ')}</p>
        <button className="secondary" disabled={disabled || (!!onLane && (!currentRole || !lane.roles.includes(currentRole)))} onClick={() => onLane ? onLane(lane.id) : onNavigate(entry.target)}>Explore {lane.label}</button>
      </section>;
    })}</div>
    <details className="guide-scope"><summary>Demo scope and approved answers</summary>
      <p>{pack.policy.execution === 'deterministic' ? 'These are supported demo bounds. Apply run settings to restart with a deterministic synthetic configuration.' : 'These are supported demo bounds. Execution is not available in this Pack.'}</p>
      <dl>{pack.parameters.map(parameter => <div key={parameter.id}><dt>{parameter.label}</dt><dd>{parameter.kind === 'integer' ? `${parameter.min}–${parameter.max}` : parameter.values.join(' / ')} · default: {parameter.default}</dd></div>)}</dl>
      {pack.truth.approvedQA.map(qa => <section className="guide-answer" key={qa.id}><h3>{qa.question}</h3><p>{qa.answer}</p></section>)}
      <p className="guide-escalation">{pack.truth.escalation.message}</p>
    </details>
  </details>;
}
