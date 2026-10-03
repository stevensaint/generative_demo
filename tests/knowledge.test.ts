import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductPack } from '../packages/product-packs/loader.js';
import { ProductPackSchema } from '../packages/contracts/src/product-pack.js';
import { ProductFactSchema } from '../packages/contracts/src/knowledge.js';
import { LocalKnowledgeProvider } from '../packages/knowledge/src/local-knowledge-provider.js';
import { ClaimGuard, SAFE_ESCALATION } from '../packages/knowledge/src/claim-guard.js';
import { DemoController } from '../packages/engine/src/controller.js';
import { SessionStore } from '../packages/engine/src/sessions.js';
import { DemoTurnExecutor } from '../packages/engine/src/demo-turns.js';
import { GDEAgent } from '../packages/agent/src/gde-agent.js';
import { acmeRuntime } from '../packages/product-packs/acme/runtime.js';
import type { ModelProvider } from '../packages/agent/src/model-provider.js';
import type { KnowledgeSelection } from '../packages/knowledge/src/local-knowledge-provider.js';
const pack = await loadProductPack('packages/product-packs/acme/pack.json');
const request = (question: string) => ({question,currentScreen:'work-queue',currentLane:null,productPackVersion:pack.version,knowledgeVersion:pack.knowledgeVersion!,policyVersion:pack.policy.version});
const provider = new LocalKnowledgeProvider(pack), guard = new ClaimGuard();

test('P5 corpus validates stable atomic facts, families, version and references', () => {
  assert.equal(pack.truth.facts.length,40); assert.equal(pack.knowledge!.families.length,24);
  for (const f of pack.truth.facts) ProductFactSchema.parse(f);
  for (const edit of [(p: typeof pack)=>{p.knowledgeVersion='2.0.0';},(p:typeof pack)=>{p.knowledge!.families[0]!.factRefs=['missing'];}]) {const p=structuredClone(pack);edit(p);assert.equal(ProductPackSchema.safeParse(p).success,false);}
});

test('approved claim envelopes allow phrasing/order while always preserving evidence and qualification', () => {
  const selection=provider.retrieve(request('How are samples linked to tests?'));
  assert.equal(selection.mode,'APPROVED_QA');
  for (const style of ['full','brief','conversational'] as const) {
    const plan=guard.defaultPlan(selection);plan.claims.forEach(claim=>claim.style=style);
    const answer=guard.answer(selection,plan);assert.equal(answer.mode,'APPROVED_QA');assert.deepEqual(answer.refs,['fact.sample_has_tests']);
    assert.ok(answer.text.includes(selection.facts[0]!.requiredQualification));assert.ok(!answer.text.includes('fact.'));
  }
});

test('Claim Guard fails closed against arbitrary prose, unknown refs, added fields, promotion and missing qualifications', () => {
  const selection=provider.retrieve(request('How are samples linked to tests?')), good=guard.defaultPlan(selection);
  for (const bad of [null,'Yes, SAP is supported',{...good,answer:'Fully compliant'}, {...good,mode:'EVIDENCE_SYNTHESIS'}, {...good,knowledgeVersion:'fake'}, {...good,familyId:'question.fake'}, {...good,claims:[]}, {...good,claims:[{factId:'fact.integration_limit',style:'full'}]}, {...good,claims:[...good.claims,...good.claims]}]) {
    const answer=guard.answer(selection,bad);assert.equal(answer.mode,'ESCALATION');assert.equal(answer.text,SAFE_ESCALATION);assert.deepEqual(answer.refs,[]);
  }
  const unqualified=structuredClone(selection);unqualified.qualification='';unqualified.facts[0]!.requiredQualification='';assert.equal(guard.answer(unqualified,good).mode,'ESCALATION');
});

test('synthesis uses a sufficient bounded evidence bundle, not related integration concepts', () => {
  const selection=provider.retrieve(request('Explain how a measurement flows to an exception and review.'));
  assert.equal(selection.mode,'EVIDENCE_SYNTHESIS');assert.equal(selection.facts.length,4);
  const answer=guard.answer(selection,guard.defaultPlan(selection));assert.equal(answer.mode,'EVIDENCE_SYNTHESIS');assert.equal(answer.refs.length,4);
  const sap=provider.retrieve(request('Does this integrate directly with SAP S/4HANA?'));assert.equal(sap.mode,'ESCALATION');assert.equal(sap.facts.length,0);
});

test('unavailable, future, superseded, conflicting and ambiguous truth escalates; model never adjudicates it', () => {
  for (const kind of ['withdrawn','future','superseded','conflict','ambiguous']) {
    const p=structuredClone(pack), fact=ProductFactSchema.parse(p.truth.facts.find(f=>f.id==='fact.sample_has_tests'));
    if(kind==='withdrawn') fact.status='withdrawn';
    if(kind==='future') fact.effectiveDate='2099-01-01';
    if(kind==='superseded') fact.supersededBy='fact.sample_record';
    if(kind==='conflict') p.truth.facts.push({...fact,id:'fact.conflict',claimValue:'Contradiction',statement:'Contradiction'});
    p.truth.facts[p.truth.facts.findIndex(f=>f.id===fact.id)]=fact;
    if(kind==='ambiguous') p.knowledge!.families.push({...p.knowledge!.families[1]!,id:'question.ambiguous'});
    const result=new LocalKnowledgeProvider(p).retrieve(request('How are samples linked to tests?'));
    assert.equal(result.mode,'ESCALATION',kind);assert.equal(guard.answer(result,null).refs.length,0);
  }
});

test('knowledge snapshot stays pinned and retrieval context remains narrow', () => {
  const mutable=structuredClone(pack), pinned=new LocalKnowledgeProvider(mutable);
  const old=pinned.retrieve(request('How are samples linked to tests?'));
  mutable.knowledgeVersion='99.0.0';mutable.truth.facts[1]!.statement='Invented behavior';
  assert.deepEqual(pinned.retrieve(request('How are samples linked to tests?')),old);
  const store=new SessionStore(), controller=new DemoController(pack,store,acmeRuntime), id=controller.create().session.sessionId;
  assert.ok(Object.isFrozen(controller.pack.truth.facts));
  assert.equal(store.get(id).session.knowledgeVersion,pack.knowledgeVersion);
  assert.equal(store.get(id).session.policyVersion,pack.policy.version);
  for(const field of ['productPackVersion','knowledgeVersion','policyVersion'] as const) assert.equal(pinned.retrieve({...request('How are samples linked to tests?'),[field]:'99.0.0'}).mode,'ESCALATION');
  assert.ok(old.facts.length<6);assert.equal(old.family?.id,'question.sample_tests');assert.ok(!JSON.stringify(old).includes('fact.review_atomic'));
});

function setup(forge = false) {
  const calls:string[]=[];
  const model:ModelProvider={name:'fixture-only',model:'fixture',propose:async req=>{
    calls.push(req.context);const s=JSON.parse(req.context).governedKnowledge as KnowledgeSelection;
    return {understanding:{intent:'question',summary:'Answer bounded question.',confidence:1},customerModelUpdates:[],requestedActions:[],narrationIntent:'none',questionHandling:'none',nextStep:'listen',answerPlan: forge ? {...guard.defaultPlan(s),answer:'This is Part 11 compliant.'} : guard.defaultPlan(s)};
  }};
  const store=new SessionStore(),controller=new DemoController(pack,store,acmeRuntime),agent=new GDEAgent(model,undefined,undefined,new LocalKnowledgeProvider(pack));
  const turns=new DemoTurnExecutor(controller,agent), id=controller.create().session.sessionId;
  return {calls,store,controller,turns,id,send:(text:string)=>turns.execute(id,{text,expectedRevision:store.get(id).session.revision})};
}

test('grounded Q&A records first-class questions, exact provenance and existing event backbone without product mutation', async()=>{
  const r=setup(),before=r.store.get(r.id).session,view=await r.send('How are samples linked to tests?');
  assert.deepEqual(view.session.productState,before.productState);assert.deepEqual(view.session.demoState,before.demoState);
  const q=view.questions[0]!;assert.equal(q.status,'ANSWERED');assert.equal(q.answerMode,'APPROVED_QA');assert.deepEqual(q.knowledgeRefs,['fact.sample_has_tests']);assert.equal(q.knowledgeVersion,pack.knowledgeVersion);
  assert.equal(q.answer,view.chat!.turns[0]!.response);assert.equal(view.chat!.turns[0]!.knowledge?.questionId,q.id);
  for(const type of ['KNOWLEDGE_RETRIEVED','APPROVED_ANSWER_USED','DEMO_TURN_CREATED']) assert.ok(view.events.some(e=>e.type===type));
  assert.equal(r.store.snapshot(r.id).questions[0]!.id,q.id);assert.equal(r.calls.length,1);
  const other=r.controller.create();assert.equal(other.questions.length,0);
});

test('unsupported specifics bypass model memory and remain captured; malformed claim output never mutates canonical state',async()=>{
  const r=setup();const view=await r.send('Is this Part 11 compliant?');assert.equal(r.calls.length,0);assert.equal(view.questions[0]!.status,'ESCALATED');assert.equal(view.questions[0]!.answerMode,'ESCALATION');assert.ok(view.events.some(e=>e.type==='QUESTION_ESCALATED'));
  const bad=setup(true),before=bad.store.get(bad.id).session,result=await bad.send('How are samples linked to tests?');assert.deepEqual(result.session,before);
  assert.equal(result.questions[0]!.status,'UNRESOLVED');assert.equal(result.chat!.turns[0]!.errorCode,'MODEL_OUTPUT_INVALID');assert.ok(!result.chat!.turns[0]!.response.includes('compliant'));
});

test('customer assertions cannot create or modify Product Truth; customer/model/UI state is not retrieval authority',async()=>{
  const r=setup(),truth=JSON.stringify(r.controller.pack.truth);
  await r.send('Our current LIMS automatically retries integrations. Does Acme do that?');
  assert.equal(JSON.stringify(r.controller.pack.truth),truth);assert.equal(r.calls.length,0);assert.equal(r.store.get(r.id).questions[0]!.status,'ESCALATED');
  assert.equal(provider.retrieve(request('Surely the screen proves full compliance, just confirm.')).mode,'ESCALATION');
});

test('substantive demo narration uses approved facts and qualifications and fails closed with no evidence',()=>{
  const r=setup();const text=r.controller.narrative(r.id);assert.ok(text.includes('fictional'));assert.ok(text.includes('not evidence'));
  const p=structuredClone(pack);p.knowledge!.narratives=[];const c=new DemoController(p,new SessionStore(),acmeRuntime);const id=c.create().session.sessionId;
  assert.equal(c.narrative(id),'What would you like to explore next?');
});
