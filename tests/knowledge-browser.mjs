// Test-only browser fixture. No API key, model call, production fallback or proxy.
import { resolve } from 'node:path';
import { createApp } from '../dist/apps/server/src/app.js';
import { loadProductPack } from '../dist/packages/product-packs/loader.js';
import { runtimeFor } from '../dist/packages/product-packs/runtimes.js';
import { ClaimGuard } from '../dist/packages/knowledge/src/claim-guard.js';
const pack=await loadProductPack('packages/product-packs/acme/pack.json'),guard=new ClaimGuard();
const {server}=createApp({pack,runtime:runtimeFor(pack),staticDir:resolve('dist/web'),provider:{name:'browser-fixture',model:'fixture-only',propose:async request=>{
  const context=JSON.parse(request.context);
  return {understanding:{intent:'question',summary:'Fixture selects approved claims.',confidence:1},customerModelUpdates:[],requestedActions:[],narrationIntent:'none',questionHandling:'none',nextStep:'listen',answerPlan:guard.defaultPlan(context.governedKnowledge)};
}}});
server.listen(0,'127.0.0.1',()=>console.log(`P5 fixture preview: http://127.0.0.1:${server.address().port}/`));
