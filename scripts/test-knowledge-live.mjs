// Real Claude acceptance for governed questions. Synthetic fixtures only.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createApp } from '../dist/apps/server/src/app.js';
import { loadProductPack } from '../dist/packages/product-packs/loader.js';
import { runtimeFor } from '../dist/packages/product-packs/runtimes.js';
import { ClaudeProvider } from '../dist/packages/agent/src/claude-provider.js';
const report={status:'NOT_RUN',date:new Date().toISOString(),provider:'claude',turns:[]};let server;
try {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) throw new Error('KEY_NOT_CONFIGURED');
  const pack=await loadProductPack('packages/product-packs/acme/pack.json');
  ({server}=createApp({pack,runtime:runtimeFor(pack),provider:new ClaudeProvider(process.env.ANTHROPIC_API_KEY.trim(),process.env.GDE_CLAUDE_MODEL ?? 'claude-sonnet-4-6')}));
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const base=`http://127.0.0.1:${server.address().port}`;
  const start=await (await fetch(base+'/api/sessions',{method:'POST'})).json();let view=start;
  const bank=JSON.parse(await readFile('tests/fixtures/p5-qa-bank.json','utf8'));
  const questions=[...bank,{group:'synthesis',text:'Explain how a measurement flows to an exception and review.',mode:'EVIDENCE_SYNTHESIS',refs:['fact.test_result','fact.result_specification','fact.exception_creation','fact.review_conditions']}];
  for(const row of questions) {
    const response=await fetch(base+'/api/sessions/'+start.session.sessionId+'/turns',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${start.accessToken}`},body:JSON.stringify({text:row.text,expectedRevision:view.session.revision})});
    assert.equal(response.status,200);view=await response.json();const turn=view.chat.turns.at(-1),question=view.questions.at(-1);
    report.turns.push({group:row.group,text:row.text,status:turn.status,errorCode:turn.errorCode,providerHttpStatus:turn.providerHttpStatus,proposal:turn.proposal,response:turn.response,question,knowledge:turn.knowledge});
    console.log(`${report.turns.length}. ${turn.status}: ${row.text}`);
    assert.equal(turn.status,'completed',turn.errorCode ?? 'Turn failed');
    assert.equal(question.answerMode,row.mode);assert.deepEqual(question.knowledgeRefs.slice().sort(),row.refs.slice().sort());
    assert.equal(question.knowledgeVersion,start.session.knowledgeVersion);
    assert.deepEqual(view.session.productState,start.session.productState);assert.deepEqual(view.session.demoState,start.session.demoState);
    if(row.mode && row.mode!=='ESCALATION') {
      for(const ref of row.refs)assert.ok(turn.response.includes(pack.truth.facts.find(fact=>fact.id===ref).requiredQualification));
    } else if(row.mode==='ESCALATION')assert.equal(question.status,'ESCALATED');else assert.equal(question.status,'UNRESOLVED');
  }
  report.status='PASS';report.knowledgeVersion=start.session.knowledgeVersion;
} catch(error) {
  report.status=report.turns.some(turn=>turn.errorCode==='PROVIDER_UNAVAILABLE')?'BLOCKED':'FAIL';
  report.reason=error.message==='KEY_NOT_CONFIGURED'?'KEY_NOT_CONFIGURED':report.turns.at(-1)?.errorCode ?? 'ACCEPTANCE_ASSERTION_FAILED';
  if(error.code==='ERR_ASSERTION')report.assertion={message:error.message.slice(0,1000),actual:error.actual,expected:error.expected};
  console.error(`P5 live acceptance ${report.status}: ${report.reason}`);process.exitCode=1;
} finally {
  if(server)await new Promise(resolve=>server.close(resolve));
  await writeFile('docs/P5-live-evidence.json',JSON.stringify(report,null,2)+'\n');
}
