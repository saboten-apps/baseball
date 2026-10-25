/* Shared plush character style. Shared joints and hand/ball targets stay in world space. */
let plushShibaAssets=null;
function buildPlushShiba(f){
  if(!plushShibaAssets){
    const material=c=>new THREE.MeshToonMaterial({color:new THREE.Color(c).convertSRGBToLinear().multiplyScalar(.55),gradientMap:GRAD});
    plushShibaAssets={ball:new THREE.SphereGeometry(1,16,12),ear:new THREE.ConeGeometry(1,1,6),
      fur:material('#e58a33'),cream:material('#ffebba'),inner:material('#efc2ac'),pink:material('#e6a395'),
      ink:material('#372c26'),shine:new THREE.MeshBasicMaterial({color:'#fff9e8'}),
      line:new THREE.MeshBasicMaterial({color:new THREE.Color('#654b36').convertSRGBToLinear(),side:THREE.BackSide})};
  }
  const palettes={shiba:['#e58a33','#ffebba'],panda:['#fff2d2','#fff2d2'],neko:['#d992a2','#fff0d5'],usagi:['#fff1d5','#fff6df'],kuma:['#a66c3c','#edce96'],tiger:['#e7a132','#ffebba'],floppy:['#d5aa70','#fff0cf'],human:['#e8bc98','#f7dfb6'],alien:['#87b9a0','#d9edbf']};
  const colors=palettes[f.sp]||palettes.shiba;
  if(!plushShibaAssets.palettes)plushShibaAssets.palettes={};
  if(!plushShibaAssets.palettes[f.sp])plushShibaAssets.palettes[f.sp]=colors.map(c=>new THREE.MeshToonMaterial({color:new THREE.Color(c).convertSRGBToLinear().multiplyScalar(.55),gradientMap:GRAD}));
  const palette=plushShibaAssets.palettes[f.sp],a={...plushShibaAssets,fur:palette[0],cream:palette[1]},root=new THREE.Group();f.g.add(root);
  const mesh=(geo,mat,parent,x,y,z,sx,sy,sz,line=true)=>{
    const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);
    if(line){const edge=new THREE.Mesh(geo,a.line);edge.scale.setScalar(1.055);m.add(edge);}return m;
  };
  const ball=(mat,parent,x,y,z,sx,sy,sz,line=true)=>mesh(a.ball,mat,parent,x,y,z,sx,sy,sz,line);
  const body=ball(a.fur,root,0,0,0,.27,.32,.24);
  ball(a.cream,body,0,-.04,.96,.72,.78,.15);
  const head=new THREE.Group();root.add(head);
  ball(a.fur,head,0,0,0,.44,.40,.35);
  ball(a.cream,head,0,-.15,.30,.28,.13,.075);
  ball(a.ink,head,0,-.11,.383,.038,.029,.024);
  const eyes=[],lids=[];
  for(const s of [-1,1]){
    if(f.sp==='usagi'){
      ball(a.fur,head,s*.22,.52,-.015,.11,.34,.095);
      ball(a.inner,head,s*.22,.54,.07,.058,.25,.025,false);
    }else if(f.sp==='panda'||f.sp==='kuma'){
      ball(f.sp==='panda'?a.ink:a.fur,head,s*.31,.31,-.035,.14,.14,.09);
      ball(a.inner,head,s*.31,.32,.04,.075,.075,.025,false);
    }else if(f.sp==='floppy'){
      const ear=ball(a.fur,head,s*.38,.06,-.035,.12,.29,.105);ear.rotation.z=s*.25;
    }else if(f.sp==='human'){
      ball(a.cream,head,s*.40,-.035,0,.07,.10,.065);
    }else if(f.sp==='alien'){
      ball(a.fur,head,s*.22,.41,-.015,.025,.14,.025);
      ball(a.cream,head,s*.24,.55,-.015,.065,.065,.06);
    }else{
      const ear=mesh(a.ear,a.fur,head,s*.29,.36,-.015,.15,.30,.12);ear.rotation.z=-s*.12;
      mesh(a.ear,a.inner,ear,0,.05,.66,.56,.65,.25,false);
    }
    if(f.sp==='panda'){
      const patch=ball(a.ink,head,s*.16,.035,.305,.09,.115,.035,false);patch.rotation.z=-s*.25;
    }
    if(f.sp==='tiger')for(let j=0;j<3;j++){
      const stripe=ball(a.ink,head,s*(.31+j*.026),.13-j*.10,.23,.065,.018,.035,false);stripe.rotation.z=s*.32;
    }
    if(f.sp==='neko')for(let j=0;j<2;j++){
      const whisker=ball(a.ink,head,s*.32,-.12-j*.045,.30,.10,.007,.008,false);whisker.rotation.z=s*(.10-j*.24);
    }
    const eye=ball(a.ink,head,s*.155,.035,.329,.035,.052,.025,false);eyes.push(eye);
    ball(a.shine,eye,-.20,.30,.89,.25,.24,.16,false);
    ball(a.pink,head,s*.29,-.095,.268,.035,.023,.016,false);
    const lid=mesh(MOUTHG,a.ink,head,s*.155,.025,.35,.90,.90,.90,false);lid.rotation.z=Math.PI;lid.visible=false;lids.push(lid);
  }
  for(const s of [-1,1]){const mouth=mesh(MOUTHG,a.ink,head,s*.019,-.155,.38,.8,.8,.8,false);mouth.rotation.z=Math.PI;}
  if(f.sp==='human'){
    ball(a.ink,head,0,.23,-.025,.425,.23,.34);
    for(const x of [-.24,-.08,.08,.24])ball(a.ink,head,x,.235,.27,.105,.10,.08,false);
  }
  const limb=f.sp==='panda'?a.ink:a.fur;
  const arms=[-1,1].map(()=>ball(limb,root,0,0,0,.105,.22,.11)),paws=[-1,1].map(()=>ball(limb,root,0,0,0,.105,.115,.10));
  const legs=[-1,1].map(()=>ball(limb,root,0,0,0,.13,.18,.13)),feet=[-1,1].map(()=>ball(a.cream,root,0,0,0,.13,.13,.15));
  const tail=ball(a.cream,root,0,0,0,.10,.10,.10);
  tail.visible=f.sp!=='human'&&f.sp!=='alien';
  return {root,head,body,arms,paws,legs,feet,tail,eyes,lids};
}
function setPlushShibaFace(f,ex){
  if(!f.plush)return;const p=f.plush,closed=ex==='blink'||ex==='joy';
  p.eyes.forEach(m=>{m.visible=!closed;m.scale.y=ex==='focus'?.040:.052;});p.lids.forEach(m=>m.visible=closed);
}
function posePlushShiba(f,J,yaw,headYaw){
  if(!f.plushVariants)f.plushVariants={};
  if(f.plush)f.plush.root.visible=false;
  if(!f.plushVariants[f.sp])f.plushVariants[f.sp]=buildPlushShiba(f);
  f.plush=f.plushVariants[f.sp];
  const active=true;f.plush.root.visible=true;setPlushShibaFace(f,f.ex);
  [f.body,f.belt,f.head,...f.ua,...f.fa,...f.paw,...f.th,...f.sh,...f.shoe,...(f.ej||[]),...(f.kj||[])].forEach(m=>m.visible=!active);
  if(!active)return;
  f.curl.visible=f.longT.visible=f.ball.visible=false;
  const p=f.plush,bulk=f.beastOn?1.15:1;
  p.body.position.copy(J.pelvis).lerp(J.neck,.48);p.body.position.y-=.06;p.body.rotation.y=yaw;p.body.scale.set(.27*bulk,.34,.24*bulk);
  p.head.position.copy(J.neck);p.head.position.y+=.18;p.head.rotation.y=headYaw;p.head.scale.setScalar(f.beastOn?1.05:1);
  if(f===batterF)p.head.position.x=(J.head.x<0?-1:1)*Math.max(1.02,Math.abs(J.head.x));
  for(let i=0;i<2;i++){
    const s=i===0?'L':'R',shoulder=J['s'+s],hand=J['h'+s],hip=J['hip'+s],foot=J['f'+s];
    const arm=p.arms[i],leg=p.legs[i];
    arm.position.copy(shoulder).lerp(hand,.53);arm.quaternion.setFromUnitVectors(_Y,_d.subVectors(hand,shoulder).normalize());arm.scale.set(.105*bulk,Math.max(.12,shoulder.distanceTo(hand)*.53),.11*bulk);
    p.paws[i].position.copy(hand);leg.position.copy(hip).lerp(foot,.68);leg.quaternion.setFromUnitVectors(_Y,_d.subVectors(foot,hip).normalize());leg.scale.set(.12,Math.max(.10,hip.distanceTo(foot)*.38),.13);
    p.feet[i].position.copy(foot);p.feet[i].position.y+=.075;p.feet[i].rotation.y=yaw;
  }
  p.tail.position.copy(J.pelvis);p.tail.position.x-=Math.sin(yaw)*.24;p.tail.position.z-=Math.cos(yaw)*.24;p.tail.position.y+=.03;
}
