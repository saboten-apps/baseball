import assert from 'node:assert/strict';
import {launchBrowser,attachErrors} from './lib.mjs';
const {b,url}=await launchBrowser();
try{
  const p=await b.newPage({viewport:{width:390,height:844}}),errors=[];attachErrors(p,errors);
  await p.goto(url);await p.waitForFunction(()=>window.__dbg);await p.evaluate(()=>{__dbg.gopit();__dbg.optOff();});
  const measurements=[];
  for(const [width,height] of [[320,568],[390,844],[1280,800]]){
    await p.setViewportSize({width,height});
    measurements.push(...await p.evaluate(({width,measure})=>{const result=[];for(const team of ['home','away','neko','usagi','kuma','tiger','floppy','alien','human'])for(const beast of [false,true])for(const left of [false,true])for(const k of [0,.35,.7,1]){if(measure){let lo=0,hi=1;for(let i=0;i<10;i++){const factor=(lo+hi)/2,v=__dbg.batterView(team,k,beast,left,factor);if(v.gap>=4)lo=factor;else hi=factor;}result.push({width,team,beast,left,k,factor:lo});}else result.push({width,team,beast,left,k,...__dbg.batterView(team,k,beast,left)});}return result;},{width,measure:process.argv.includes('--measure')}));
    await p.evaluate(()=>__dbg.batterView('away',0,false,true));await p.screenshot({path:`tools/test/batter-${width}.png`});
  }
  if(process.argv.includes('--measure')){
    const limits={};for(const v of measurements){const key=v.team+':'+v.beast;limits[key]=Math.min(limits[key]??1,v.factor);}console.log(JSON.stringify(limits));
  }else{measurements.sort((a,b)=>a.gap-b.gap);console.log(JSON.stringify({samples:measurements.length,worst:measurements[0]}));for(const v of measurements){assert.ok(v.gap>=3,JSON.stringify(v));assert.ok(v.alignment.arm<=.17,JSON.stringify(v));assert.ok(v.alignment.body>=.35,JSON.stringify(v));assert.ok(v.alignment.neck<1e-6,JSON.stringify(v));assert.ok(v.alignment.torso<.20,JSON.stringify(v));assert.ok(v.alignment.grip<1e-6,JSON.stringify(v));}}
  assert.deepEqual(errors,[]);console.log('[]');
}finally{await b.close();}
