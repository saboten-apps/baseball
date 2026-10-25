/* Shiba-only reference study. Shared joints and hand/ball targets stay in world space. */
let plushShibaAssets=null;
function buildPlushShiba(f){
  if(!plushShibaAssets){
    const material=c=>new THREE.MeshToonMaterial({color:new THREE.Color(c).convertSRGBToLinear().multiplyScalar(.55),gradientMap:GRAD});
    plushShibaAssets={ball:new THREE.SphereGeometry(1,16,12),ear:new THREE.ConeGeometry(1,1,6),
      fur:material('#e58a33'),cream:material('#ffebba'),inner:material('#efc2ac'),pink:material('#e6a395'),
      ink:material('#372c26'),shine:new THREE.MeshBasicMaterial({color:'#fff9e8'}),
      line:new THREE.MeshBasicMaterial({color:new THREE.Color('#654b36').convertSRGBToLinear(),side:THREE.BackSide})};
  }
  const a=plushShibaAssets,root=new THREE.Group();f.g.add(root);
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
    const ear=mesh(a.ear,a.fur,head,s*.29,.36,-.015,.15,.30,.12);ear.rotation.z=-s*.12;
    mesh(a.ear,a.inner,ear,0,.05,.66,.56,.65,.25,false);
    const eye=ball(a.ink,head,s*.155,.035,.329,.035,.052,.025,false);eyes.push(eye);
    ball(a.shine,eye,-.20,.30,.89,.25,.24,.16,false);
    ball(a.pink,head,s*.29,-.095,.268,.035,.023,.016,false);
    const lid=mesh(MOUTHG,a.ink,head,s*.155,.025,.35,.90,.90,.90,false);lid.rotation.z=Math.PI;lid.visible=false;lids.push(lid);
  }
  for(const s of [-1,1]){const mouth=mesh(MOUTHG,a.ink,head,s*.019,-.155,.38,.8,.8,.8,false);mouth.rotation.z=Math.PI;}
  const arms=[-1,1].map(()=>ball(a.fur,root,0,0,0,.105,.22,.11)),paws=[-1,1].map(()=>ball(a.fur,root,0,0,0,.105,.115,.10));
  const legs=[-1,1].map(()=>ball(a.fur,root,0,0,0,.13,.18,.13)),feet=[-1,1].map(()=>ball(a.cream,root,0,0,0,.13,.13,.15));
  const tail=ball(a.cream,root,0,0,0,.10,.10,.10);
  return {root,head,body,arms,paws,legs,feet,tail,eyes,lids};
}
function setPlushShibaFace(f,ex){
  if(!f.plush)return;const p=f.plush,closed=ex==='blink'||ex==='joy';
  p.eyes.forEach(m=>{m.visible=!closed;m.scale.y=ex==='focus'?.040:.052;});p.lids.forEach(m=>m.visible=closed);
}
function posePlushShiba(f,J,yaw,headYaw){
  if(f.sp==='shiba'&&!f.plush)f.plush=buildPlushShiba(f);
  const active=f.sp==='shiba';if(f.plush)f.plush.root.visible=active;
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
