// スーパースターの発光と、能力説明ポップアップ（#hap）が、投げる・打つ邪魔をしないことの確認
//  ・発光：球が来る間（投球モーション〜ボールが飛んでいる間）は消える。それ以外も弱い（金色の光の中で、白いボールが見えなくなる不具合の回帰）
//  ・ポップアップ：投手の頭と、ストライクゾーンに、かからない（320・390・1280 幅）
import assert from 'node:assert/strict';
import {launchBrowser,attachErrors} from './lib.mjs';
const {b,url}=await launchBrowser();
const MAX_OPACITY=0.21;
try{
  const errors=[];
  // ---- 発光（打つ側：CPU対戦の先攻）----
  {
    const p=await b.newPage({viewport:{width:390,height:844}});attachErrors(p,errors);
    await p.goto(url);await p.waitForFunction(()=>window.__dbg);await p.evaluate(()=>__dbg.makeStars());
    await p.click('#go2');await p.click('#goBtn');await p.click('#goBtn');await p.click('#go2');
    // 打つ側では、投手の振りかぶりは phase 'wait' の最後（pk>0）。ボールが飛んでいる間は 'fly'
    const isLive=s=>s.phase==='fly'||s.phase==='deliver'||(s.phase==='wait'&&s.pk>0.02);
    const rest=[],live=[];let sawDeliver=false,sawFly=false,glowBack=false;
    for(let i=0;i<900&&!(sawDeliver&&sawFly&&glowBack);i++){
      const s=await p.evaluate(()=>__dbg.starGlow());
      for(const a of [s.bat,s.pit]){if(a.v)assert.ok(a.o<=MAX_OPACITY,`発光が強すぎる: ${a.o}（${s.phase}）`);}
      if(isLive(s)){live.push(s);sawDeliver||=s.phase==='wait';sawFly||=s.phase==='fly';}
      else if(live.length&&s.k>0.9)glowBack=true;
      if((s.batStar||s.pitStar)&&!isLive(s)&&s.k>0.9)rest.push(s);
      await p.waitForTimeout(40);
    }
    assert.ok(sawDeliver&&sawFly,'投球の流れ（振りかぶり→ボールが飛ぶ）を観測できなかった');
    assert.ok(Math.min(...live.map(s=>s.k))<0.05,'球が来る間に、発光が消えていない');
    for(const s of live)for(const a of [s.bat,s.pit])if(a.v&&s.k<0.05)assert.ok(a.o<0.01,'球が来る間も発光している');
    assert.ok(glowBack,'投球が終わったあと、発光が戻らない');
    assert.ok(rest.some(s=>(s.bat.v&&s.bat.o>0.05)||(s.pit.v&&s.pit.o>0.05)),'スーパースターの発光が、そもそも出ていない（弱くしすぎ）');
    await p.close();
  }
  // ---- 発光（投げる側：練習の投球。1番打者がスーパースター）----
  {
    const p=await b.newPage({viewport:{width:390,height:844}});attachErrors(p,errors);
    await p.goto(url);await p.waitForFunction(()=>window.__dbg);await p.evaluate(()=>__dbg.makeStars());
    await p.evaluate(()=>__dbg.gopit());
    await p.waitForFunction(()=>__dbg.phase==='ready',null,{polling:50,timeout:20000});
    await p.waitForTimeout(600);
    const before=await p.evaluate(()=>__dbg.starGlow());
    assert.ok(before.batStar&&before.bat.v&&before.bat.o>0.05&&before.bat.o<=MAX_OPACITY,'投げる前：打者の発光が弱く出ている');
    await p.evaluate(()=>__dbg.pitch());
    const during=[];
    for(let i=0;i<40;i++){const s=await p.evaluate(()=>__dbg.starGlow());if(s.phase==='deliver'||s.phase==='fly')during.push(s);await p.waitForTimeout(40);}
    assert.ok(during.length>0,'投球中を観測できなかった');
    assert.ok(Math.min(...during.map(s=>s.k))<0.05,'投げている間に、打者の発光が消えていない');
    await p.close();
  }
  // ---- ポップアップが、投手・ゾーンにかからない ----
  {
    const p=await b.newPage({viewport:{width:390,height:844}});attachErrors(p,errors);
    await p.goto(url);await p.waitForFunction(()=>window.__dbg);await p.evaluate(()=>{__dbg.gopit();__dbg.optOff();});
    const worst=[];
    for(const [width,height] of [[320,568],[390,844],[1280,800]]){
      await p.setViewportSize({width,height});
      const v=await p.evaluate(()=>__dbg.pitcherView('home',0,false));
      await p.evaluate(()=>__dbg.hap('ニャンキーズ【猫の身のこなし】','盗塁が決まりやすく、ファインプレーも出やすい'));
      await p.waitForTimeout(500);
      const r=await p.evaluate(()=>{
        const st=document.querySelector('#stage').getBoundingClientRect(),h=document.querySelector('#hap').getBoundingClientRect();
        const rel=e=>{if(!e||e.hidden||!e.textContent.trim())return null;const q=e.getBoundingClientRect();return q.height?{top:q.top-st.top,bottom:q.bottom-st.top}:null;};
        return {top:h.top-st.top,bottom:h.bottom-st.top,stageH:st.height,cmt:rel(document.querySelector('#cmt')),hint:rel(document.querySelector('#hint'))};
      });
      const apart=(a,bb)=>r.bottom<=bb.top||r.top>=bb.bottom;
      assert.ok(apart(r,{top:v.head.top,bottom:v.head.bottom}),`${width}px：ポップアップが投手の頭にかかる ${JSON.stringify({r,head:v.head})}`);
      // 背の低い画面（ゲーム画面の高さ400px未満。320×568でサイコロが出ているとき）は、ゾーンの下に空きがなく、実況がゾーンにかかっている。この場合は、投手の頭にかからないことだけを確かめる
      if(r.stageH>=400){
        assert.ok(apart(r,{top:v.zone.top,bottom:v.zone.bottom}),`${width}px：ポップアップがストライクゾーンにかかる ${JSON.stringify({r,zone:v.zone})}`);
        assert.ok(r.bottom<=r.stageH,`${width}px：ポップアップが画面の下にはみ出す`);
        for(const k of ['cmt','hint'])if(r[k])assert.ok(apart(r,r[k]),`${width}px：ポップアップが${k}と重なる ${JSON.stringify(r)}`);
      }
      worst.push({width,top:Math.round(r.top),bottom:Math.round(r.bottom),zoneBottom:Math.round(v.zone.bottom),stageH:Math.round(r.stageH)});
    }
    console.log(JSON.stringify(worst));
    await p.close();
  }
  assert.deepEqual(errors,[]);console.log('[]');
}finally{await b.close();}
