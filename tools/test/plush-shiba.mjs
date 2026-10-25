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
  for(const species of ['tiger','neko','usagi','kuma','floppy','human','alien','panda']){
    await p.click('#goBtn');await p.waitForFunction(sp=>__dbg.plushState().species===sp&&__dbg.plushState().plush,species);
    assert.equal((await p.evaluate(()=>__dbg.plushState())).base,false);
    await p.screenshot({path:'tools/test/plush-'+species+'.png'});
  }
  assert.ok(await p.evaluate(()=>__dbg.plushContact())<1e-6,'contact path is unchanged for both batting sides');
  assert.deepEqual(errors,[]);console.log('✓ All nine plush species, three viewports and rotation');console.log('[]');
}finally{await b.close();}
