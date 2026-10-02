import type { Control, Session } from '../../../../packages/contracts/src/index.js';
import type { ProductPack } from '../../../../packages/contracts/src/product-pack.js';
import type { Command } from '../../../../packages/contracts/src/state.js';
export type SendCommand = (type: Command['type'], args: Command['args']) => void;
export function ActionPanel({ controls, disabled, send }: { controls: Control[]; disabled: boolean; send: SendCommand }) {
  if (!controls.length) return null;
  return <section className="panel action-panel"><h2>Workflow actions</h2><div className="action-forms">{controls.map(control => <form key={control.id} onSubmit={event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const inputs = Object.fromEntries(control.inputs.map(input => [input.id, input.type === 'number' ? Number(data.get(input.id)) : String(data.get(input.id))]));
    send(control.commandType, { ...control.args, ...inputs });
  }}>
    {control.inputs.map(input => <label key={input.id}>{input.label}<input name={input.id} type={input.type === 'number' ? 'number' : 'text'} step="any" required maxLength={1000} defaultValue={input.default ?? ''} disabled={disabled || !control.enabled} /></label>)}
    <button disabled={disabled || !control.enabled} type="submit">{control.label}</button>
    {control.reason && <p>{control.reason}</p>}
  </form>)}</div></section>;
}
export function ContextControls({ pack, session, siteIds, disabled, send }: { pack: ProductPack; session: Session; siteIds: string[]; disabled: boolean; send: SendCommand }) {
  return <div className="context-controls"><label>Demo role<select value={session.demoState.currentRole ?? ''} disabled={disabled} onChange={event => send('SWITCH_ROLE', { roleId: event.target.value })}>{pack.roles.map(role => <option key={role.id} value={role.id}>{role.label}</option>)}</select></label>
    <label>Demo site<select value={session.demoState.currentSite ?? ''} disabled={disabled} onChange={event => send('SWITCH_SITE', { siteId: event.target.value })}>{pack.sites.filter(site => siteIds.includes(site.id)).map(site => <option key={site.id} value={site.id}>{site.label}</option>)}</select></label>
    <button className="secondary" disabled={disabled || !session.demoState.history.length} onClick={() => send('RETURN', {})}>Return</button>
    <button className="secondary" disabled={disabled} onClick={() => send('RESET', {})}>Reset demo</button>
    <span>Revision {session.revision}</span>
  </div>;
}
export function ParameterControls({ pack, session, disabled, send }: { pack: ProductPack; session: Session; disabled: boolean; send: SendCommand }) {
  return <details className="panel parameter-controls"><summary>Synthetic run settings</summary><p>Applying one setting restarts the synthetic workflow. Add an external partner before selecting an external sample source.</p><div>{pack.parameters.map(parameter => <form key={parameter.id} onSubmit={event => {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    send('SET_PARAMETER', { parameterId: parameter.id, value: parameter.kind === 'integer' ? Number(data.get('value')) : String(data.get('value')) });
  }}><label>{parameter.label}{parameter.kind === 'integer' ? <input name="value" type="number" required min={parameter.min} max={parameter.max} defaultValue={session.demoState.parameters[parameter.id]} disabled={disabled} /> : <select name="value" defaultValue={session.demoState.parameters[parameter.id]} disabled={disabled}>{parameter.values.map(value => <option key={value}>{value}</option>)}</select>}</label><button className="secondary" disabled={disabled}>Apply {parameter.label}</button></form>)}</div></details>;
}
