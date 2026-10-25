import assert from 'node:assert/strict';
import {launchBrowser,attachErrors} from './lib.mjs';
const {b,url}=await launchBrowser();
try{
  const p=await b.newPage({viewport:{width:390,height:844}}),errors=[];attachErrors(p,errors);
  await p.goto(url);await p.waitForFunction(()=>window.__dbg);await p.evaluate(()=>{__dbg.optOff();__dbg.plushPreview();});
  await p.waitForFunction(()=>__dbg.plushState().plush);
  assert.equal((await p.evaluate(()=>__dbg.plushState())).base,false);
  for(const [width,height] of [[320,568],[390,844],[1280,800]]){await p.setViewportSize({width,height});await p.screenshot({path:`tools/test/plush-shiba-${width}.png`});}
  await p.click('#go3');await p.screenshot({path:'tools/test/plush-shiba-side.png'});
  await p.click('#goBtn');await p.waitForFunction(()=>__dbg.gallery.species==='tiger');assert.equal((await p.evaluate(()=>__dbg.plushState())).base,true);assert.equal((await p.evaluate(()=>__dbg.plushState())).plush,false);
  assert.deepEqual(errors,[]);console.log('✓ Shiba plush preview, three viewports, rotation and switching back to the original tiger');console.log('[]');
}finally{await b.close();}
