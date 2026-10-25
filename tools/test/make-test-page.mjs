import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');

let s = fs.readFileSync(path.join(ROOT, 'dist/artifact.html'), 'utf8').replace(/\r\n/g, '\n');
const mock = fs.readFileSync(path.join(HERE, 'mock.js'), 'utf8').replace(/\r\n/g, '\n');

const hook = `window.__dbg={audioState:()=>({silent:storySilent,context:ac?ac.state:null,commentary:cmtBusy()}),showStage,storyStart:startStory,get session(){return storySession},get ending(){return storyEnding&&storyEnding.phase},get gallery(){return mascotGallery&&mascotGallery.active?{index:mascotGallery.index,species:mascotGallery.f.sp}:null},useBeast:activateBeast,beastActive,contact,get online(){return online},get G(){return G},get mode(){return mode},get phase(){return phase},get story(){return story},get STAGES(){return STAGES},get play(){return typeof play!=='undefined'?play:null},score:()=>onlineScore(), state:()=>({brawl,hbpUntil,pend:!!(typeof play!=='undefined'&&play&&play.pend),sign,curBunt,steal:!!steal,stealAnim:!!stealAnim,cpuStealPlan,cpuBuntPlan,pickoff:!!pickoff,timeOut,phase,story:!!story,match:!!match,online}), optOff:()=>{OPT.dice=false;OPT.hap=false;saveOpt();degraded=true;key.castShadow=false;renderer.shadowMap.enabled=false;renderer.setPixelRatio(1);resize();}, ff:()=>{if(pendBanner)flushBanner();if(phase==='deliver'&&pending){const p=pending;pending=null;launchBall(p);}else if(phase==='wait'){nextAt=0;cpuPitch();}else if(phase==='result'){nextAt=0;afterResult();}}, headPos:()=>{const h=pitcherF.head.position;return [h.x,h.y,h.z]}, face:(team,ex)=>{window.__fh=1;setTeam(pitcherF,team);pitcherF.ex=null;setFace(pitcherF,ex);}, gopit:()=>{story=null;match=null;setMode('pit');startGame();}, pitch:()=>{cpuStealPlan=cpuBuntPlan=false;pending={key:'str',speed:130,tx:0,ty:0,sg:null};phase='deliver';deliverStart=now_();},
 throwP:(key,speed,tx,ty)=>{const sg=onl.oppSign;const p=online?prepareOnlinePitch({key,speed,tx,ty,sg,vn:vanishArm}):{key,speed,tx,ty,sg};send('pitch',{p,beast:onlineBeastState()});pending=p;phase='deliver';deliverStart=now_();},
 hit:(c,rnd)=>{const R=Math.random;Math.random=rnd?rnd:()=>Math.max(0.15,R());try{resolve(c,ball.tgt.clone());}finally{Math.random=R;}},
 roster:()=>({b:curBatter(),p:curPitcher(),t:G.teams}), relieve:()=>userRelief(), sig:()=>({sign,oppSign:onl.oppSign,pn:onl.pn,steal:!!steal,curBunt}),hands:()=>({lefty:lefty(),leftBat:leftBat(),rel:squashJ(pitcherJ(1),MOUND_Y).hR.x,bx:batterJ(now_(),0).J.pelvis.x}),vis:()=>({path:!!pathMesh,ghost:ghostRing.visible,ball:ballMesh.visible,bz:ballMesh.position.z,ph:phase}),dice:v=>showDiceBanner({v,text:'テスト'}),shown:()=>({shownLeft,shownStar}),m:()=>match,snd:async(list)=>{const SR=44100,seg=1.4,ctx=new OfflineAudioContext(1,Math.ceil(SR*seg*list.length),SR);list.forEach(([q,k],i)=>batSound(ctx,ctx.destination,0.05+i*seg,q,k));const buf=await ctx.startRendering();const d=buf.getChannelData(0);let pk=0;for(const v of d)pk=Math.max(pk,Math.abs(v));const n=d.length,ab=new ArrayBuffer(44+n*2),dv=new DataView(ab);const w=(o,t)=>{for(let i=0;i<t.length;i++)dv.setUint8(o+i,t.charCodeAt(i))};w(0,'RIFF');dv.setUint32(4,36+n*2,true);w(8,'WAVEfmt ');dv.setUint32(16,16,true);dv.setUint16(20,1,true);dv.setUint16(22,1,true);dv.setUint32(24,SR,true);dv.setUint32(28,SR*2,true);dv.setUint16(32,2,true);dv.setUint16(34,16,true);w(36,'data');dv.setUint32(40,n*2,true);for(let i=0;i<n;i++)dv.setInt16(44+i*2,Math.max(-1,Math.min(1,d[i]/Math.max(pk,1e-6)*0.9))*32767,true);let t2='';const u=new Uint8Array(ab);for(let i=0;i<u.length;i+=8192)t2+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return {b64:btoa(t2),peak:pk};},seq:(lv,ps,n)=>{const old=diffLv;setDiff(lv);const r={sw:0,hit:0,miss:0,good:0};for(let i=0;i<n;i++){G.seq=null;let k;for(const q of ps){ball={T:[q[2],q[3]],key:q[0],speed:q[1],vn:false,start:0,dur:1};cpuBat();k=ball.cpu;}if(!k.swing)continue;r.sw++;const q=ps[ps.length-1];const c=contact(k.dt,k.d,k.vy,q[1],false,false,cpuLv().pow);if(c.kind==='miss')r.miss++;else if(c.kind==='play'&&c.bases>0)r.hit++;if(c.q>0.7)r.good++;}ball=null;batAnim=null;setDiff(old);return r;},sim:(lv,n)=>{const old=diffLv;setDiff(lv);const r={pitches:n,swing:0,hit:0,hr:0,foul:0,miss:0,chase:0,oz:0};for(let i=0;i<n;i++){const iz=Math.random()<0.6;const tx=iz?rnd(-0.9,0.9):rnd(-1.5,1.5),ty=iz?rnd(-0.9,0.9):rnd(-1.4,1.5);const ks=Object.keys(TYPES),key=ks[Math.floor(Math.random()*ks.length)],T=TYPES[key],sp=rnd(T.min,T.max);ball={T:[tx,ty],key,speed:sp,vn:false,start:0,dur:1};cpuBat();const k=ball.cpu;const oz=Math.max(Math.abs(tx),Math.abs(ty))>1.05;if(oz)r.oz++;if(!k.swing)continue;r.swing++;if(oz)r.chase++;const c=contact(k.dt,k.d,k.vy,sp,false,false,cpuLv().pow);if(c.kind==='miss')r.miss++;else if(c.kind==='foul')r.foul++;else if(c.bases>0){r.hit++;if(c.bases===4)r.hr++;}}ball=null;batAnim=null;setDiff(old);return r;},bgm:()=>({ready:fileReady(),music:musicNow&&musicNow.name,crowd:!!crowdNow,loaded:Object.keys(bgmRec).sort().join()}),bgmHR:()=>bgmHR(),role:()=>{matchRole();phase=mode==='bat'?'wait':'ready';nextAt=now_()+0.5;},cel:()=>celebrate(now_(),4),bt:(k,sw,view)=>{document.querySelector("#overlay").hidden=true;phase="fly";window.__pk=k;if(!window.__pkP){window.__pkP=1;const o=pitcherK;pitcherK=(n)=>window.__pk!=null?window.__pk:o(n);}if(!window.__btP){window.__btP=1;const ob=batterJ;batterJ=(n,kk)=>ob(batAnim&&window.__bsw!=null?batAnim.t0+window.__bsw:n,kk);}window.__bsw=sw;batAnim=sw>=0?{t0:now_(),plan:makeSwingPlan(V(0,0.85,0))}:null;const sx=shownLeft?-1:1;window.__cam=view==1?{pos:V(2.2*sx,0.9,-0.3),look:V(-0.8*sx,0.6,-0.05),fov:50}:view==2?{pos:V(-0.75*sx,0.9,-3.6),look:V(-0.8*sx,0.6,0.0),fov:42}:null;if(!window.__camP){window.__camP=1;const oc=updateCamera;updateCamera=(n,d)=>{if(!window.__cam)return oc(n,d);const c=window.__cam;camera.position.copy(c.pos);camera.lookAt(c.look);camera.near=0.1;camera.fov=c.fov;camera.updateProjectionMatrix();};}},stl:(k)=>{const o=pitcherK;pitcherK=()=>k;G.bases=[3,0,0];sign=null;stealMsg="";phase="wait";timeOut=false;stealPress(now_());pitcherK=o;return [sign,+stealJump.toFixed(3),stealMsg,phase,!!pickoff];},pk:(k,side)=>{document.querySelector("#overlay").hidden=true;window.__pk=k;if(!window.__pkP){window.__pkP=1;const o=pitcherK;pitcherK=(n)=>window.__pk!=null?window.__pk:o(n);}window.__cam=side?{pos:V(5.2,1.0,RUBBER_Z+0.6),look:V(0,MOUND_Y+0.55,RUBBER_Z+0.6),fov:34}:{pos:V(0,1.2,RUBBER_Z+6.5),look:V(0,MOUND_Y+0.6,RUBBER_Z),fov:28};if(!window.__camP){window.__camP=1;const oc=updateCamera;updateCamera=(n,d)=>{if(!window.__cam)return oc(n,d);const c=window.__cam;camera.position.copy(c.pos);camera.lookAt(c.look);camera.near=0.1;camera.fov=c.fov;camera.updateProjectionMatrix();};}},lineup:(cz)=>{document.querySelector("#overlay").hidden=true;window.__figs=window.__figs||["home","away","neko","usagi","kuma"].map((t,i)=>makeFig({team:t,glove:true,shadow:true}));window.__figs.forEach((f,i)=>{const x=(i-2.6)*0.95,z=-6;poseFig(f,squashJ(fielderJ(x,z,0,0,0,0.3,0),0),0,0);});camShot={pos:V(0,1.0,cz||-2.6),look:V(0,0.62,-6),fov:42,at:0};},fw:()=>{let L=0,mx=0;for(let i=0;i<FW_N;i++)if(fwT[i]>=0){L++;mx=Math.max(mx,fwCol[i*3])}return {L,now:now_(),t0:fwT[0],p:[fwPos[0],fwPos[1],fwPos[2]],mx,q:fwQueue.length,vis:fwPts.visible}},hap:t=>{G.hap={t,inn:G.inning,left:2};hud();queueHap(HAP.find(h=>h.t===t),0)},ghap:()=>G.hap,spend:n=>{for(let i=0;i<n;i++)spendStamina(145,'str');}};
requestAnimationFrame(frame);
})();`;

const count = (str, sub) => str.split(sub).length - 1;
if (count(s, 'requestAnimationFrame(frame);\n})();') !== 1) throw new Error('Expected 1 occurrence of requestAnimationFrame(frame);\\n})();');
if (count(s, '  faceFor(pitcherF,') !== 1) throw new Error('Expected 1 occurrence of faceFor(pitcherF,');
if (count(s, 'camera.lookAt(camLook);') !== 1) throw new Error('Expected 1 occurrence of camera.lookAt(camLook);');

s = s.replace('  faceFor(pitcherF,', '  if(!window.__fh)faceFor(pitcherF,');
s = s.replace('camera.lookAt(camLook);', 'if(window.__hold){camera.position.set(...window.__hold.p);camera.lookAt(...window.__hold.l);camera.fov=window.__hold.f;camera.near=0.1;camera.updateProjectionMatrix();}else camera.lookAt(camLook);');
s = s.replace('requestAnimationFrame(frame);\n})();', hook.replace('requestAnimationFrame(frame);', `window.__dbg.beastView=()=>({giant:giantActive(),speed:ball&&ball.speed,vanish:ball&&ball.vn,armed:vanishArm,pitcher:!!pitcherF.beastOn,batter:!!batterF.beastOn,batScale:batG.scale.x});
window.__dbg.clock=()=>({now:now_(),nextAt,pausedAt,timeOut});
window.__dbg.musicState=()=>{const buf=musicNow&&musicNow.s.buffer;let peak=0,sum=0,n=0;if(buf){const data=buf.getChannelData(0);for(let i=0;i<data.length;i++){peak=Math.max(peak,Math.abs(data[i]));sum+=data[i]*data[i];n++;}}return {duration:buf&&buf.duration,channels:buf&&buf.numberOfChannels,loop:musicNow&&musicNow.s.loop,peak,rms:Math.sqrt(sum/Math.max(1,n)),output:fileOut&&fileOut.gain.value};};
window.__dbg.noDraw=()=>{renderer.render=()=>{};};
window.__dbg.freezePitches=()=>{const launch=launchBall;launchBall=p=>{launch(p);if(ball)ball.start=now_()+3600;};renderer.render=()=>{};};
window.__dbg.onlineBeast=()=>({active:onlineBeastState(),wanted:{...onl.beastWanted},local:beastActive()});
window.__dbg.beastEffects=()=>({count:beastFx.count,impacts:beastFx.impacts,seen:[...beastFx.seen],cut:!beastCut.hidden,impact:!beastImpact.hidden,reduced:beastMotion.matches,audio:!!beastFx.audio,auras:beastFx.groups?beastFx.groups.filter(g=>g.root.visible).map(g=>g.role):[],groups:beastFx.groups?beastFx.groups.length:0});
window.__dbg.holdBeastEffect=()=>{beastFx.at=Infinity;for(const a of beastCut.getAnimations({subtree:true})){a.pause();a.currentTime=200;}};
window.__dbg.finishOnline=showOnlineOver;
window.__dbg.receiveOnline=onMsg;
window.__dbg.review=()=>({enabled:onlineReview.enabled,pitchEnabled:onlineReview.pitchEnabled,pitchRules:onlineReview.pitchRules,skipEnabled:onlineReview.skipEnabled,left:{...onlineReview.left},active:onlineReview.active,stage:onlineReview.stage,stamp:onlineReview.stamp,callStamp:onlineReview.ctx&&onlineReview.ctx.stamp,pn:onl.pn,aspect:camera.aspect,normalAspect:W/H,call:onlineReview.ctx&&onlineReview.ctx.call,pitchCall:onlineReview.ctx&&onlineReview.ctx.pitchCall,closed:onlineReview.ctx&&onlineReview.ctx.closed,offerClosed:onlineReview.ctx&&onlineReview.ctx.offerClosed,declined:onlineReview.ctx&&onlineReview.ctx.declined});
window.__dbg.pitchReviewSample=()=>{const result=[];for(const [tx,ty] of [[.98,0],[1.02,0],[-.98,0],[-1.02,0],[0,.98],[0,1.02],[0,-.98],[0,-1.02],[1,1],[0,0],[1.11,0]]){let flips=0;const initial=Math.max(Math.abs(tx),Math.abs(ty))<=1;for(let seed=0;seed<10000;seed++)if(pitchReviewDecision(seed,tx,ty,initial).truth!==initial)flips++;result.push({tx,ty,flips});}return result;};
window.__dbg.reviewSetup=(o)=>{Object.assign(G,o);onl.score={home:0,away:0};clearPlay();applyRole();};
const reviewTickForTest=updateOnlineReview,renderForReviewTest=renderer.render.bind(renderer);let reviewHoldForTest='';
updateOnlineReview=now=>reviewTickForTest(reviewHoldForTest&&onlineReview.active&&onlineReview.stage===reviewHoldForTest?onlineReview.at+1.5:now);
window.__dbg.reviewHold=stage=>{reviewHoldForTest=stage;};
window.__dbg.reviewOfferHold=()=>{if(onlineReview.ctx){onlineReview.ctx.until=now_()+3600;nextAt=onlineReview.ctx.until;}};
window.__dbg.freezeReviewOffers=()=>{const result=runOnlineResult;runOnlineResult=(...args)=>{result(...args);if(onlineReview.ctx&&onlineReview.ctx.until)onlineReview.ctx.until=now_()+3600;nextAt=Infinity;};};
window.__dbg.bankedScore=()=>({...onl.score});
window.__dbg.plushContact=()=>{
  const previous={batAnim,shownLeft,buntK,buntT},errors=[];
  for(const left of [false,true])for(const x of [-.25,0,.25]){
    shownLeft=left;buntK=0;buntT=10;batAnim={t0:10,plan:makeSwingPlan(V(x,1,0))};
    const actual=batterJ(10+SWING_LEAD,0),expected=swingAt(SWING_LEAD,batAnim.plan);
    if(left){expected.G=mirX(expected.G);expected.dir=mirX(expected.dir);}
    errors.push(actual.G.distanceTo(expected.G),actual.dir.distanceTo(expected.dir));
  }
  batAnim=previous.batAnim;shownLeft=previous.shownLeft;buntK=previous.buntK;buntT=previous.buntT;
  return Math.max(...errors);
};
window.__dbg.plushPreview=()=>showMascotGallery(0);
window.__dbg.plushState=()=>{const f=mascotGallery.f;return {species:f.sp,plush:!!f.plush&&f.plush.root.visible,base:f.body.visible,head:f.head.visible,meshes:f.plush?f.plush.root.children.length:0,face:f.ex};};
window.__dbg.reviewOfferExpire=()=>{if(onlineReview.ctx){onlineReview.ctx.until=now_()-1;nextAt=Infinity;}};
window.__dbg.pitcherView=(team,k=0,beast=false)=>{
  update=()=>{};camShot=null;play=null;setTeam(pitcherF,team);resize();updateCamera(now_(),0);
  const J=squashJ(pitcherJ(k),MOUND_Y);poseFig(pitcherF,J,0,0);beastForm(pitcherF,beast);posePlushShiba(pitcherF,J,0,0);scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  const points=[],head=pitcherF.plush?pitcherF.plush.head:pitcherF.head;head.traverseVisible(m=>{if(!m.isMesh)return;if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();const b=m.geometry.boundingBox;for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])points.push(V(x,y,z).applyMatrix4(m.matrixWorld).project(camera));});
  const rect=pts=>({left:Math.min(...pts.map(p=>(p.x+1)*W/2)),right:Math.max(...pts.map(p=>(p.x+1)*W/2)),top:Math.min(...pts.map(p=>(1-p.y)*H/2)),bottom:Math.max(...pts.map(p=>(1-p.y)*H/2))});
  return {head:rect(points),zone:rect([-1,1].flatMap(x=>[-1,1].map(y=>zoneToWorld(x,y).project(camera)))),scale:pitcherF.head.scale.x};
};
window.__dbg.batterView=(team,k=0,beast=false,left=false,factor=null)=>{
  update=()=>{};phase='wait';nextAt=Infinity;ball=null;camShot=null;play=null;batAnim=null;shownLeft=left;shownStar=false;setTeam(batterF,team);resize();updateCamera(now_(),0);
  const bj=batterJ(0,k),J=squashJ(bj.J,0,true);poseFig(batterF,J,left?-Math.PI/2:Math.PI/2,Math.PI);beastForm(batterF,beast);fitBatterHead(batterF,J);posePlushShiba(batterF,J,left?-Math.PI/2:Math.PI/2,Math.PI);
  if(factor!==null){batterF.head.scale.setScalar(HEAD_K*(beast?1.25:1)*factor);}
  batG.position.copy(bj.G);batG.quaternion.setFromUnitVectors(_Y,bj.dir);scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  const points=[],visibleHead=batterF.plush?batterF.plush.head:batterF.head;visibleHead.traverseVisible(m=>{if(!m.isMesh)return;if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();const b=m.geometry.boundingBox;for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])points.push(V(x,y,z).applyMatrix4(m.matrixWorld).project(camera));});
  const rect=pts=>({left:Math.min(...pts.map(p=>(p.x+1)*W/2)),right:Math.max(...pts.map(p=>(p.x+1)*W/2)),top:Math.min(...pts.map(p=>(1-p.y)*H/2)),bottom:Math.max(...pts.map(p=>(1-p.y)*H/2))});
  const head=rect(points),zone=rect([-1,1].flatMap(x=>[-1,1].map(y=>zoneToWorld(x,y).project(camera))));
  const plush=batterF.plush;
  const alignment=plush?{arm:Math.max(...plush.arms.map(m=>m.scale.y)),body:plush.body.scale.x,neck:Math.abs(plush.head.position.x-plush.stanceJ.neck.x),torso:Math.abs(plush.head.position.x-plush.body.position.x),grip:Math.max(plush.paws[0].position.distanceTo(J.hL),plush.paws[1].position.distanceTo(J.hR))}:null;
  const aim=zoneToWorld(0,0).project(camera);
  return {head,zone,alignment,aim:{x:aim.x,y:aim.y},scale:batterF.head.scale.x,gap:Math.max(zone.left-head.right,head.left-zone.right)};
};
window.__dbg.renderOn=()=>{renderer.render=renderForReviewTest;};
const reviewDrawForTest=renderReviewField;let holdReviewDrawForTest=false;
renderReviewField=()=>{if(!holdReviewDrawForTest)reviewDrawForTest();};
window.__dbg.reviewDrawHold=v=>{holdReviewDrawForTest=v;};
window.__dbg.rematch=()=>({round:onl.round,finished:onl.finished,wanted:{...onl.rematch},side:onl.side,pn:onl.pn,timeLeft:onl.timeLeft,queues:[onl.queued,onl.waitRes,onl.queuedPick,...onl.queuedSub]});
window.__dbg.stadium=()=>({id:stadiumId,name:stadiumLook.name,type:stadiumLook.type,groups:stadiumGroups.size,visible:[...stadiumGroups.values()].filter(g=>g.visible).length,batches:stadiumGroup?stadiumGroup.children.length:0,sky:scene.background.getHexString(),grass:GRASS.color.getHexString(),grassMap:GRASS.map===grassTex,stands:stands.visible,towers:stadiumTowers.filter(o=>o.visible).length,stars:stadiumStars.visible,fence:FR,center:[FC.x,FC.y,FC.z],distance:fenceDist(0,-1),mound:[mound.position.x,mound.position.y,mound.position.z],lights:[key.intensity,hemi.intensity,fill.intensity,rim.intensity],geometries:renderer.info.memory.geometries,draws:renderer.info.render.calls});
window.__dbg.stadiumShot=wide=>{storyVisual(null);clearPlay();phase=mode==='bat'?'wait':'ready';nextAt=Infinity;document.querySelector('#overlay').hidden=true;window.__hold=wide?{p:[0,48,62],l:[0,17,-112],f:62}:null;syncStadium();};
window.__dbg.storyAfterResult=storyAfterResult;
window.__dbg.lobby=()=>({code:onl.code,side:onl.side,me:onl.me,started:onl.started,peers:onl.ch?onl.ch.presenceState():null});
requestAnimationFrame(frame);`));

const i = s.indexOf('<script>');
const stub = "window.__said=[];window.Audio=function(src){const me=this;this.src=src;this.paused=true;this.ended=false;this.error=null;this._l={};this.addEventListener=(e,f)=>{this._l[e]=f};this.pause=()=>{this.paused=true};this.play=()=>{if(!/(hr_|play_)/.test(src)){this.error={};this._l.error&&this._l.error();return Promise.reject(new Error('404'))}window.__said.push('AUDIO:'+src);this.paused=false;return Promise.resolve()};setTimeout(()=>{if(!/(hr_|play_)/.test(src)){this.error={};this._l.error&&this._l.error()}},10)}; window.SpeechSynthesisUtterance=function(t){this.text=t};Object.defineProperty(window,'speechSynthesis',{value:{speaking:false,speak(u){window.__said.push(u.text)},cancel(){},getVoices(){return []}}});";
s = s.slice(0, i) + '<script>' + mock + stub + '</script>\n' + s.slice(i);
s = s.replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase[^>]*><\/script>/g, '');
s = s.replace('https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js', '/node_modules/three/build/three.min.js');

fs.writeFileSync(path.join(HERE, 'game.html'), s, 'utf8');
