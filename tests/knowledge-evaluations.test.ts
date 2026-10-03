import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadProductPack } from '../packages/product-packs/loader.js';
import { LocalKnowledgeProvider } from '../packages/knowledge/src/local-knowledge-provider.js';
import { ClaimGuard, SAFE_ESCALATION } from '../packages/knowledge/src/claim-guard.js';
const pack=await loadProductPack('packages/product-packs/acme/pack.json'),provider=new LocalKnowledgeProvider(pack),guard=new ClaimGuard();
const bank=JSON.parse(await readFile('tests/fixtures/p5-qa-bank.json','utf8')) as {group:string;text:string;classification?:string;mode:string|null;refs:string[]}[];
for(const group of ['normal','ambiguous','boundary','adversarial']) test(group==='adversarial' ? 'Make GDE Lie — unsupported product claims are forbidden' : `P5 semantic evaluation — ${group}`,()=>{
  const cases=bank.filter(row=>row.group===group);assert.equal(cases.length,group==='normal'?20:10);
  for(const row of cases) {
    const selection=provider.retrieve({question:row.text,currentLane:null,currentScreen:'work-queue',productPackVersion:pack.version,knowledgeVersion:pack.knowledgeVersion!,policyVersion:pack.policy.version});
    assert.equal(selection.mode,row.mode,row.text);if(row.classification)assert.equal(selection.classification,row.classification,row.text);
    assert.deepEqual(selection.facts.map(f=>f.id),row.refs,row.text);
    if(row.mode===null)continue;
    const answer=guard.answer(selection,guard.defaultPlan(selection));assert.equal(answer.mode,row.mode,row.text);
    if(row.mode==='ESCALATION') {assert.equal(answer.text,SAFE_ESCALATION);assert.deepEqual(answer.refs,[]);} else {
      assert.ok(answer.refs.length);for(const fact of selection.facts)assert.ok(answer.text.includes(fact.requiredQualification));
      assert.ok(!/fully compliant|SAP compatibility|production validated|three months/i.test(answer.text));
    }
  }
});
