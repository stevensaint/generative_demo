import { loadProductPack } from '../dist/packages/product-packs/loader.js';
import { parsePackParameters } from '../dist/packages/contracts/src/product-pack.js';
const path = process.argv[2] ?? 'packages/product-packs/acme/pack.json';
try {
  const pack = await loadProductPack(path);
  const parameters = parsePackParameters(pack, process.argv[3] ? JSON.parse(process.argv[3]) : {});
  console.log(JSON.stringify({ status: 'PASS', packId: pack.metadata.packId, version: pack.version, lanes: pack.lanes.map(lane => lane.label), roles: pack.roles.map(role => role.label), entityTypes: pack.productModel.entityTypes.length, records: pack.productModel.records.length, actions: pack.productModel.actions.length, transitions: pack.productModel.transitions.length, parameters, execution: pack.policy.execution }, null, 2));
} catch {
  console.error('Pack validation failed. Check JSON, schema version, bounds, and references.');
  process.exitCode = 1;
}
