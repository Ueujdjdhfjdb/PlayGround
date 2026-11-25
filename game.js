import * as THREE from 'three';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],canvas=$('#scene');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
const scene=new THREE.Scene();scene.background=new THREE.Color('#9ad9ef');scene.fog=new THREE.Fog('#a4d8df',42,145);const camera=new THREE.PerspectiveCamera(54,innerWidth/innerHeight,.1,240);camera.position.set(0,7,13);scene.add(new THREE.HemisphereLight('#d9faff','#324b41',2.05));const sun=new THREE.DirectionalLight('#fff0ce',3.3);sun.position.set(-18,34,15);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-55;sun.shadow.camera.right=55;sun.shadow.camera.top=55;sun.shadow.camera.bottom=-55;scene.add(sun);const fill=new THREE.DirectionalLight('#8ad9ff',.85);fill.position.set(22,12,-18);scene.add(fill);
const mats={};function mat(color,rough=.8,metal=0){if(color?.isMaterial)return color;const k=color+rough+metal;return mats[k] ||= new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal})}
const world=new THREE.Group(),actors=new THREE.Group(),fxGroup=new THREE.Group();scene.add(world,actors,fxGroup);let seed=918273;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}function range(a,b){return a+(b-a)*rand()}function choice(a){return a[Math.floor(rand()*a.length)]}
const sph=new THREE.SphereGeometry(1,16,12),box=new THREE.BoxGeometry(1,1,1),cone=new THREE.ConeGeometry(1,1,8),cyl=new THREE.CylinderGeometry(1,1,1,12);
function mesh(geo,material,parent=world,pos=[0,0,0],scale=[1,1,1]){const m=new THREE.Mesh(geo,mat(material));m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}function ball(p,c,pos,s){return mesh(sph,c,p,pos,s)}function cube(p,c,pos,s,r=.8,mt=0){return mesh(box,mat(c,r,mt),p,pos,s)}
const palette={forest:{sky:'#9ad9ef',fog:'#a4d8df',ground:'#61ad70',accent:'#3b845f'},city:{sky:'#7b9ee5',fog:'#8298c5',ground:'#414f6a',accent:'#54627b'},base:{sky:'#8998a9',fog:'#778490',ground:'#565d62',accent:'#765348'}};
let region='forest',enemies=[],rings=[],particles=[],player=null,boss=null,playing=false,paused=false,selectedRegion='forest';const state={hp:100,maxHp:100,chaos:0,ring:0,kills:0,level:1,transform:'',attackCd:0,invuln:0,boost:false,moveX:0,moveZ:0,jump:false,dead:false};const avatar={species:'hedgehog',fur:'#178cff',bot:'#e85554',gear:'classic',face:'confident',mask:false,badnik:'crab'};
function addRock(x,z,s=1){let m=mesh(new THREE.DodecahedronGeometry(1),mat(choice(['#89978b','#708a81','#9a9b88'])),world,[x,s*.36,z],[s,s*.65,s*.85]);m.rotation.set(rand(),rand(),rand())}
function makeTree(x,z,scale=1){const g=new THREE.Group();world.add(g);g.position.set(x,0,z);g.scale.setScalar(scale);mesh(cyl,mat('#72533d'),g,[0,.95,0],[.25,1.9,.25]);for(let i=0;i<3;i++){let c=mesh(cone,mat(choice(['#278765','#2c9b6b','#3aa878','#348d68'])),g,[0,1.55+i*.43,0],[1.05-i*.13,1.35,.95-i*.13]);c.rotation.y=rand()*6}}
function makeBuilding(x,z,w,h,d,color){const g=new THREE.Group();world.add(g);g.position.set(x,h/2,z);cube(g,color,[0,0,0],[w,h,d],.75,.15);cube(g,choice(['#d9b866','#9fe8ea','#ffbd70']),[0,h*.53,0],[w*.85,.18,d*.85],.35,.25);for(let f=0;f<Math.floor(h/2.5);f++)for(let s of [-1,1])cube(g,choice(['#8cd4e5','#ffc977','#d69eea']),[s*w*.26,-h/2+1.3+f*2.35,d/2+.011],[w*.23,.85,.035],.3,.2)}
function makeFactory(x,z,s=1){const g=new THREE.Group();world.add(g);g.position.set(x,0,z);const metal=mat('#596773',.45,.55),rust=mat('#a75d43',.65,.25);cube(g,rust,[0,.8,0],[3*s,1.6*s,2.4*s]);for(let i=0;i<2;i++){mesh(cyl,metal,g,[-.7*s,2.3*s,-.4*s+i*.7*s],[.25*s,2.6*s,.25*s]);cube(g,mat('#737f85',.4,.55),[-.7*s,3.55*s,-.4*s+i*.7*s],[.7*s,.18*s,.7*s])}cube(g,mat('#f2b94f'),[1.52*s,.8*s,.2*s],[.09*s,.65*s,.5*s],.35,.15)}
function disposeTree(o){o.traverse?.(m=>{if(m.geometry)m.geometry.dispose()})}function clearWorld(){for(const o of [...world.children]){world.remove(o);disposeTree(o)}for(const o of [...actors.children]){actors.remove(o);disposeTree(o)}enemies=[];rings=[];particles=[];if(boss){disposeTree(boss.group);boss=null}}
function generateWorld(type='forest'){clearWorld();region=type;seed=type==='forest'?918273:type==='city'?188422:448731;const p=palette[type];scene.background.set(p.sky);scene.fog.color.set(p.fog);let ground=mesh(new THREE.PlaneGeometry(220,220,36,36),mat(p.ground),world,[0,0,0]);ground.rotation.x=-Math.PI/2;const pos=ground.geometry.attributes.position;for(let i=0;i<pos.count;i++){let x=pos.getX(i),z=pos.getY(i);pos.setZ(i,Math.sin(x*.11)*.32+Math.cos(z*.13)*.28+Math.sin((x+z)*.055)*.48)}ground.geometry.computeVertexNormals();cube(world,p.accent,[0,-.24,0],[220,.5,220]);
 if(type==='forest'){for(let i=0;i<108;i++){let x=range(-67,67),z=range(-67,67);if(Math.hypot(x,z)>13)makeTree(x,z,range(.68,1.45))}for(let i=0;i<32;i++){let x=range(-72,72),z=range(-72,72);if(Math.hypot(x,z)>9)addRock(x,z,range(.45,1.6))}for(let i=0;i<8;i++){let x=range(-47,47),z=range(-48,48);if(Math.hypot(x,z)<16)continue;let g=new THREE.Group();world.add(g);g.position.set(x,0,z);cube(g,'#887357',[0,.8,0],[4,1.6,3]);cube(g,'#5f5244',[0,1.75,0],[4.4,.25,3.4]);cube(g,'#b9a17c',[0,.55,1.52],[.75,1.1,.08])}}
 else if(type==='city'){cube(world,'#252e40',[0,.02,0],[100,.08,100]);for(let a=-45;a<=45;a+=15){cube(world,'#303b4e',[a,.07,0],[5,.09,100]);cube(world,'#303b4e',[0,.071,a],[100,.09,5]);for(let t=-44;t<45;t+=7){cube(world,'#e2c868',[a,.13,t],[.15,.03,2.2]);cube(world,'#e2c868',[t,.13,a],[2.2,.03,.15])}}for(let x=-42;x<=42;x+=15)for(let z=-42;z<=42;z+=15){if(Math.abs(x)<8&&Math.abs(z)<8)continue;makeBuilding(x+range(-1,1),z+range(-1,1),range(6.5,10),range(8,28),range(6,10),choice(['#52647a','#6a6989','#536b7b','#81627c','#45586b']))}for(let i=0;i<22;i++){let x=choice([-7,7,-22,22]),z=range(-45,45);cube(world,'#263344',[x,2.3,z],[.12,4.6,.12]);ball(world,mat('#69dff1',.3,.25),[x,4.7,z],[.22,.14,.22])}}
 else{cube(world,'#343c43',[0,.02,0],[100,.08,100]);for(let a=-42;a<=42;a+=14){cube(world,'#424b50',[a,.1,0],[.2,.12,100]);cube(world,'#424b50',[0,.1,a],[100,.12,.2])}for(let i=0;i<12;i++){let x=range(-43,43),z=range(-43,43);if(Math.hypot(x,z)>12)makeFactory(x,z,range(.75,1.6))}for(let i=0;i<10;i++){let x=choice([-44,44,range(-42,42)]),z=choice([-44,44,range(-42,42)]),g=new THREE.Group();world.add(g);cube(g,'#8b4937',[x,6,z],[1.3,12,1.3]);for(let y=1;y<11;y+=2)cube(g,'#e18646',[x,y,z],[2,.15,2])}}
 for(let i=0;i<26;i++){let a=i/26*Math.PI*2,x=Math.cos(a)*82,z=Math.sin(a)*82;if(type==='forest')makeTree(x,z,range(1.5,2.5));else cube(world,type==='city'?'#323b54':'#3e474b',[x,range(7,22),z],[range(7,13),range(15,42),range(7,13)])}
 spawnRings();spawnEnemies();if(player){actors.add(player);player.position.set(0,0,0);player.rotation.set(0,0,0)}updateLabels()}
function spawnRings(){for(let i=0;i<30;i++){let a=range(0,Math.PI*2),r=range(5,42),x=Math.cos(a)*r,z=Math.sin(a)*r;const ring=mesh(new THREE.TorusGeometry(.38,.09,8,18),mat('#ffd54f',.25,.55),world,[x,1.2,z],[1,1,1]);ring.rotation.x=Math.PI/2;rings.push({mesh:ring,x,z,phase:rand()*8})}}
function spawnEnemies(){const types=region==='forest'?['crab','motobug','buzz']:region==='city'?['buzz','motobug','crab']:['crab','buzz','motobug'];for(let i=0;i<8;i++){let a=range(0,6.28),r=range(12,48),type=types[i%types.length],group=new THREE.Group();actors.add(group);const model=makeBot(group,type,region==='base'?'#d78547':undefined);group.position.set(Math.cos(a)*r,0,Math.sin(a)*r);enemies.push({group,model,type,hp:type==='buzz'?2:3,max:type==='buzz'?2:3,phase:rand()*6,attack:range(1,3),dead:false})}}
function createBoss(){if(boss)return;let group=new THREE.Group();actors.add(group);group.position.set(0,0,-13);let red=mat('#d84842',.42,.25),dark=mat('#414d59',.35,.65),gold=mat('#f7c95a',.35,.35);ball(group,red,[0,3.2,0],[1.8,2.4,1.45]);ball(group,dark,[0,1.3,0],[1.6,1.2,1.2]);for(let s of [-1,1]){mesh(cyl,dark,group,[s*1.5,2.8,0],[.45,1.8,.45]).rotation.z=s*.3;ball(group,gold,[s*1.6,1.1,.3],[.58,.44,.55]);ball(group,red,[s*1.65,.45,0],[.72,.35,.72])}ball(group,'#fff',[0,3.8,1.25],[.52,.32,.2]);ball(group,'#ff453d',[0,3.8,1.42],[.25,.2,.08]);const core=ball(group,'#38f0ff',[0,2.8,1.48],[.5,.57,.16]);boss={group,core,hp:100,max:100,phase:1,open:0,attack:2.5,dead:false};$('#boss-hud').classList.remove('hidden');$('#objective-text').textContent='DERROTE O EGG HAMMER TITAN';toast('CHEFE DESCOBERTO — EGG HAMMER TITAN')}
function spawnRingsBurst(pos,count=4){for(let i=0;i<count;i++){const m=mesh(new THREE.TorusGeometry(.25,.07,7,16),mat('#ffd54f',.25,.5),fxGroup,[pos.x,1.1+i*.12,pos.z]);m.rotation.x=Math.PI/2;rings.push({mesh:m,x:pos.x+(rand()-.5)*3,z:pos.z+(rand()-.5)*3,phase:0,drop:true})}}
function toast(text){const t=$('#toast');t.textContent=text;t.classList.remove('hidden');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.add('hidden'),1800)}
function burst(position,color='#76e8f4',n=12){for(let i=0;i<n;i++){let m=mesh(new THREE.IcosahedronGeometry(range(.05,.13),0),new THREE.MeshBasicMaterial({color}),fxGroup,[position.x,position.y+range(.2,1.5),position.z]);particles.push({mesh:m,v:new THREE.Vector3(range(-2,2),range(.5,4),range(-2,2)),life:range(.35,.8)})}}
function setHud(){const h=Math.max(0,state.hp);$('#health-fill').style.width=(h/state.maxHp*100)+'%';$('#health-text').textContent=`${Math.ceil(h)} / ${state.maxHp}`;$('#chaos-fill').style.width=state.chaos+'%';$('#chaos-text').textContent=Math.floor(state.chaos)+'%';$('#ring-count').textContent=String(state.ring).padStart(3,'0');$('#level-number').textContent=String(state.level).padStart(2,'0');$('#super-btn').classList.toggle('ready',state.chaos>=45);$('#hyper-btn').classList.toggle('ready',state.chaos>=85)}
function updateLabels(){const names={forest:'GREEN HILL FRONTIER',city:'NEON METROPOLIS',base:'EGGMAN INDUSTRIES'};$('#region-label').textContent=names[region]||names.forest;$('#region-toast-name').textContent=names[region]||names.forest}
function enterWorld(){selectedRegion=$$('.region-card.active')[0]?.dataset.region||'forest';$('#loading-overlay').classList.remove('hidden');setTimeout(()=>{generateWorld(selectedRegion);state.hp=100;state.chaos=0;state.ring=0;state.kills=0;state.dead=false;state.transform='';if(!player)player=avatar.species==='badnik'?makeBot(actors,avatar.badnik,avatar.bot):makeHero(actors);else{actors.add(player);player.position.set(0,0,0)}$('#intro-screen').classList.add('hidden');$('#creator-screen').classList.add('hidden');$('#map-screen').classList.add('hidden');$('#pause-screen').classList.add('hidden');$('#gameover-screen').classList.add('hidden');$('#hud').classList.remove('hidden');$('#hud-player-name').textContent=avatar.species.toUpperCase();playing=true;paused=false;$('#loading-overlay').classList.add('hidden');const rt=$('#region-toast');rt.classList.remove('hidden');setTimeout(()=>rt.classList.add('hidden'),2300);setHud()},480)}
function attack(){if(!playing||paused||state.attackCd>0)return;state.attackCd=.38;const forward=new THREE.Vector3(0,0,-1).applyQuaternion(player.quaternion);let hit=false;for(const e of enemies){if(e.dead)continue;const d=e.group.position.distanceTo(player.position);if(d<3.1){e.hp-=state.transform?2:1;hit=true;burst(e.group.position,'#ff9b62',8);if(e.hp<=0){e.dead=true;state.kills++;state.chaos=Math.min(100,state.chaos+12);state.ring+=3;spawnRingsBurst(e.group.position,3);actors.remove(e.group);if(state.kills>=5&&!boss)createBoss();if(state.kills%3===0)state.level++;toast('BADNIK DESTRUÍDO +3 ANÉIS')}}}if(boss&&!boss.dead&&boss.open>0&&player.position.distanceTo(boss.group.position)<5){boss.hp-=state.transform==='hyper'?14:state.transform==='super'?10:6;boss.open=0;hit=true;burst(boss.core.getWorldPosition(new THREE.Vector3()),'#56f5ff',18);if(boss.hp<=0){boss.dead=true;$('#boss-hud').classList.add('hidden');state.chaos=100;toast('TITAN DERROTADO — REGIÃO LIBERTADA!');$('#objective-text').textContent='MISSÃO CONCLUÍDA — EXPLORE!'}}if(!hit)burst(player.position,'#6beaf2',4)}
function transform(kind){if(!playing||!player)return;if(state.transform===kind){state.transform='';player.userData.aura.visible=false;document.body.classList.remove('super-mode','hyper-mode');toast('TRANSFORMAÇÃO DESATIVADA');return}const cost=kind==='hyper'?85:45;if(state.chaos<cost){toast(`ENERGIA INSUFICIENTE — ${cost}% NECESSÁRIO`);return}state.chaos-=cost;state.transform=kind;player.userData.aura.visible=true;player.userData.aura.material.color.set(kind==='hyper'?'#e76aff':'#fff16a');player.userData.aura.material.opacity=kind==='hyper'?.35:.23;document.body.classList.toggle('hyper-mode',kind==='hyper');document.body.classList.toggle('super-mode',kind==='super');burst(player.position,kind==='hyper'?'#dc5cff':'#ffeb60',28);toast(kind==='hyper'?'HYPER FORM — CAOS ABSOLUTO':'SUPER FORM — PODER ILIMITADO');state.transformTimer=kind==='hyper'?16:14;setHud()}

// Corrige o modelo heroico (a declaração foi corrompida no truncamento anterior)
function makeHero(parent,fur=avatar.fur,gear=avatar.gear,mask=avatar.mask){
  const g=new THREE.Group();parent.add(g);g.userData.kind='hero';
  const blue=mat(fur,.52),cream=mat('#f3d9ac'),skin=mat('#f5c69a'),white=mat('#fff');
  const shoe=mat(gear==='neon'?'#38f0e2':gear==='trail'?'#d35c42':'#e9433e',.43);
  const glove=mat(gear==='trail'?'#d8c6a9':'#fff',.5);
  ball(g,blue,[0,.78,0],[.38,.47,.29]);ball(g,cream,[0,.83,.265],[.245,.32,.065]);
  const head=new THREE.Group();g.add(head);head.position.set(0,1.45,0);g.userData.head=head;
  ball(head,fur,[0,.18,0],[.43,.44,.38]);
  for(let i=0;i<5;i++){let sp=mesh(cone,blue,head,[(i-2)*.13,.14,-.27],[.18,.61,.16]);sp.rotation.x=-Math.PI*.33;sp.rotation.z=(i-2)*-.15}
  for(const x of [-.19,.19]){ball(head,white,[x,.25,.31],[.135,.24,.085]);ball(head,'#16a6b0',[x+.02,.21,.388],[.052,.105,.032]);ball(head,'#102133',[x+.025,.20,.414],[.026,.061,.018]);ball(head,white,[x+.04,.25,.43],[.02,.03,.01])}
  ball(head,skin,[0,-.045,.39],[.25,.17,.16]);ball(head,'#182439',[0,.015,.54],[.075,.055,.07]);
  if(mask){const visor=mesh(new THREE.TorusGeometry(.29,.045,7,24),mat('#201b31',.35,.2),head,[0,.23,.365],[1,.55,.5]);visor.rotation.x=.2}
  let arms=[],legs=[];
  for(const s of [-1,1]){let a=mesh(cyl,blue,g,[s*.4,.79,0],[.13,.42,.13]);a.rotation.z=-s*.42;arms.push(a);ball(g,glove,[s*.5,.53,.04],[.17,.16,.17]);let l=mesh(cyl,blue,g,[s*.18,.28,0],[.14,.34,.14]);legs.push(l);ball(g,shoe,[s*.19,.12,.12],[.28,.13,.42]);ball(g,white,[s*.19,.15,.37],[.18,.055,.12])}
  g.userData.arms=arms;g.userData.legs=legs;
  const aura=mesh(new THREE.SphereGeometry(.9,18,14),new THREE.MeshBasicMaterial({color:'#fff16a',transparent:true,opacity:.18,wireframe:true}),g,[0,.8,0],[1,1.25,1]);aura.visible=false;g.userData.aura=aura;
  return g;
}

function makeBot(parent,type=avatar.badnik,color=avatar.bot){
  const g=new THREE.Group();parent.add(g);g.userData.kind='badnik';
  const red=mat(color,.48,.25),dark=mat('#303c49',.35,.65),steel=mat('#b9c9cf',.35,.65),eye=mat('#ff4c3e',.3,.2),yellow=mat('#ffd25a',.4,.15);
  if(type==='buzz'){
    ball(g,red,[0,.8,0],[.45,.36,.33]);ball(g,'#f4c19b',[0,.72,.28],[.24,.19,.12]);ball(g,'#fff',[0,.94,.3],[.14,.11,.08]);ball(g,eye,[0,.94,.37],[.06,.07,.03]);
    for(const s of [-1,1]){let wing=mesh(new THREE.OctahedronGeometry(1),steel,g,[s*.62,.98,0],[.52,.1,.28]);wing.rotation.z=s*.15;let arm=mesh(cyl,dark,g,[s*.38,.55,0],[.07,.3,.07]);arm.rotation.z=s*.5}ball(g,yellow,[0,1.27,-.02],[.13,.18,.13]);
  }else if(type==='motobug'){
    let body=mesh(new THREE.CapsuleGeometry(.43,.34,4,8),red,g,[0,.45,0],[1,1,.8]);body.rotation.z=Math.PI/2;ball(g,dark,[0,.22,-.1],[.55,.14,.42]);
    for(const s of [-1,1]){let w=mesh(cyl,mat('#232c38',.3,.6),g,[s*.39,.2,.04],[.18,.2,.2]);w.rotation.z=Math.PI/2}ball(g,'#f6d4a0',[0,.66,.29],[.21,.19,.09]);ball(g,eye,[0,.72,.37],[.08,.08,.04]);
  }else{
    ball(g,red,[0,.62,0],[.47,.37,.38]);ball(g,dark,[0,.34,0],[.44,.15,.35]);ball(g,steel,[0,.74,.34],[.32,.19,.14]);
    for(const s of [-1,1]){let claw=mesh(cyl,dark,g,[s*.58,.35,0],[.09,.35,.08]);claw.rotation.z=s*.8;let tip=mesh(cone,steel,g,[s*.74,.19,.02],[.1,.22,.1]);tip.rotation.z=Math.PI;mesh(cyl,dark,g,[s*.28,.14,-.13],[.06,.25,.06])}
    for(const s of [-1,1]){ball(g,'#fff',[s*.14,.83,.38],[.1,.12,.07]);ball(g,eye,[s*.14,.83,.44],[.04,.06,.025])}
  }
  const aura=mesh(new THREE.SphereGeometry(.85,12,10),new THREE.MeshBasicMaterial({color:'#ff654b',transparent:true,opacity:.11,wireframe:true}),g,[0,.6,0],[1,1.1,1]);aura.visible=false;g.userData.aura=aura;
  return g;
}

const keys={};
let velocityY=0,grounded=true,previewScene=null,previewCamera=null,previewRenderer=null,previewModel=null;

function rebuildPreview(){
  const canvas=$('#preview-scene');if(!canvas)return;
  if(!previewRenderer){previewRenderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});previewRenderer.setPixelRatio(Math.min(devicePixelRatio,1.5));previewRenderer.setSize(canvas.clientWidth||320,canvas.clientHeight||342,true);previewScene=new THREE.Scene();previewCamera=new THREE.PerspectiveCamera(35,1,.1,50);previewCamera.position.set(0,2.3,6);previewScene.add(new THREE.HemisphereLight('#d8ffff','#1c3a50',2.5));const light=new THREE.DirectionalLight('#fff',3);light.position.set(-4,6,5);previewScene.add(light)}
  if(previewModel){previewScene.remove(previewModel);disposeTree(previewModel)}
  previewModel=avatar.species==='badnik'?makeBot(previewScene,avatar.badnik,avatar.bot):makeHero(previewScene,avatar.fur,avatar.gear,avatar.mask);
  previewModel.position.y=-.2;
  const rect=canvas.getBoundingClientRect();if(rect.width&&rect.height){previewRenderer.setSize(rect.width,rect.height,false);previewCamera.aspect=rect.width/rect.height;previewCamera.updateProjectionMatrix()}
}

function pauseGame(force){
  if(!playing)return;
  paused=typeof force==='boolean'?force:!paused;
  $('#pause-screen').classList.toggle('hidden',!paused);
}

function setSelectedRegion(regionName){selectedRegion=regionName;$$('.region-card').forEach(c=>c.classList.toggle('active',c.dataset.region===regionName))}

function respawn(){state.dead=false;state.hp=state.maxHp;state.transform='';state.chaos=0;if(player)player.position.set(0,0,0);player.userData.aura.visible=false;document.body.classList.remove('super-mode','hyper-mode');$('#gameover-screen').classList.add('hidden');$('#hud').classList.remove('hidden');playing=true;paused=false;setHud()}

document.addEventListener('keydown',e=>{keys[e.code]=true;if(e.repeat)return;if(e.code==='KeyJ')attack();if(e.code==='Space'){state.jump=true;e.preventDefault()}if(e.code==='ShiftLeft'||e.code==='ShiftRight')state.boost=true;if(e.code==='KeyQ')transform('super');if(e.code==='KeyE')transform('hyper');if(e.code==='Escape')pauseGame();});
document.addEventListener('keyup',e=>{keys[e.code]=false;if(e.code==='ShiftLeft'||e.code==='ShiftRight')state.boost=false;if(e.code==='Space')state.jump=false});

$('#start-btn').addEventListener('click',()=>{$('#intro-screen').classList.add('hidden');$('#creator-screen').classList.remove('hidden');rebuildPreview()});
$('#creator-back').addEventListener('click',()=>{$('#creator-screen').classList.add('hidden');$('#intro-screen').classList.remove('hidden')});
$('#create-btn').addEventListener('click',()=>{$('#creator-screen').classList.add('hidden');$('#map-screen').classList.remove('hidden')});
$('#map-back').addEventListener('click',()=>{$('#map-screen').classList.add('hidden');$('#creator-screen').classList.remove('hidden');rebuildPreview()});
$$('.species-tab').forEach(b=>b.addEventListener('click',()=>{$$('.species-tab').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');avatar.species=b.dataset.species;$('#hedgehog-options').classList.toggle('hidden',avatar.species!=='hedgehog');$('#badnik-options').classList.toggle('hidden',avatar.species!=='hedgehog');$('#preview-name').textContent=avatar.species.toUpperCase();rebuildPreview()}));
$$('#fur-swatches .swatch').forEach(b=>b.addEventListener('click',()=>{$$('#fur-swatches .swatch').forEach(x=>x.classList.remove('active'));b.classList.add('active');avatar.fur=b.dataset.color;rebuildPreview()}));
$$('#bot-swatches .swatch').forEach(b=>b.addEventListener('click',()=>{$$('#bot-swatches .swatch').forEach(x=>x.classList.remove('active'));b.classList.add('active');avatar.bot=b.dataset.color;rebuildPreview()}));
$('#gear-select').addEventListener('change',e=>{avatar.gear=e.target.value;rebuildPreview()});
$('#face-select').addEventListener('change',e=>{avatar.face=e.target.value});
$('#mask-toggle').addEventListener('change',e=>{avatar.mask=e.target.checked;rebuildPreview()});
$('#badnik-select').addEventListener('change',e=>{avatar.badnik=e.target.value;rebuildPreview()});
$$('.region-card').forEach(c=>c.addEventListener('click',()=>setSelectedRegion(c.dataset.region)));
$('#enter-world-btn').addEventListener('click',enterWorld);
$('#pause-btn').addEventListener('click',()=>pauseGame());
$('#resume-btn').addEventListener('click',()=>pauseGame(false));
$('#change-region-btn').addEventListener('click',()=>{paused=false;playing=false;$('#pause-screen').classList.add('hidden');$('#hud').classList.add('hidden');$('#map-screen').classList.remove('hidden')});
$('#hud-map-btn').addEventListener('click',()=>pauseGame());
$('#retry-btn').addEventListener('click',respawn);
$('#super-btn').addEventListener('click',()=>transform('super'));
$('#hyper-btn').addEventListener('click',()=>transform('hyper'));

$$('.touch-pad button').forEach(b=>{const dir=b.dataset.move;const down=e=>{e.preventDefault();state.moveX=dir==='left'||dir==='right'?dir==='left'?-1:1:0;state.moveZ=dir==='forward'||dir==='back'?dir==='forward'?-1:1:0};const up=e=>{e.preventDefault();state.moveX=0;state.moveZ=0};b.addEventListener('pointerdown',down);b.addEventListener('pointerup',up);b.addEventListener('pointerleave',up)});
$$('.touch-actions button').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();const a=b.dataset.action;if(a==='jump')state.jump=true;if(a==='attack')attack();if(a==='boost')state.boost=true}));
document.querySelectorAll('.touch-actions [data-action="jump"],.touch-actions [data-action="boost"]').forEach(b=>b.addEventListener('pointerup',()=>{if(b.dataset.action==='jump')state.jump=false;if(b.dataset.action==='boost')state.boost=false}));

function getGroundHeight(x,z){return Math.sin(x*.11)*.32+Math.cos(z*.13)*.28+Math.sin((x+z)*.055)*.48}

const clock=new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),.035);
  const t=clock.elapsedTime;

  if(previewRenderer&&previewScene&&!$('#creator-screen').classList.contains('hidden')){previewModel.rotation.y+=dt*.45;previewRenderer.render(previewScene,previewCamera)}

  if(playing&&!paused&&player){
    state.attackCd=Math.max(0,state.attackCd-dt);state.invuln=Math.max(0,state.invuln-dt);
    if(state.transformTimer>0){state.transformTimer-=dt;if(state.transformTimer<=0){state.transform='';player.userData.aura.visible=false;document.body.classList.remove('super-mode','hyper-mode')}}
    let mx=(keys.KeyD?1:0)-(keys.KeyA?1:0)+state.moveX;
    let mz=(keys.KeyS?1:0)-(keys.KeyW?1:0)+state.moveZ;
    const len=Math.hypot(mx,mz);if(len>1){mx/=len;mz/=len}
    const boost=(state.boost||keys.ShiftLeft||keys.ShiftRight)&&state.chaos>0;
    const speed=(state.transform==='hyper'?15:state.transform==='super'?12:7)*(boost?1.55:1);
    if(mx||mz){const angle=Math.atan2(mx,mz);player.rotation.y+=Math.atan2(Math.sin(angle-player.rotation.y),Math.cos(angle-player.rotation.y))*.18;player.position.x+=mx*speed*dt;player.position.z+=mz*speed*dt;if(player.userData.legs){player.userData.legs.forEach((l,i)=>l.rotation.x=Math.sin(t*12+i*Math.PI)*.25)}}
    player.position.x=Math.max(-96,Math.min(96,player.position.x));player.position.z=Math.max(-96,Math.min(96,player.position.z));
    if(state.jump&&grounded){velocityY=7.8+(state.transform?2.5:0);grounded=false;state.jump=false}
    velocityY-=19*dt;player.position.y+=velocityY*dt;
    const gy=getGroundHeight(player.position.x,player.position.z);if(player.position.y<=gy){player.position.y=gy;velocityY=0;grounded=true}

    for(const ring of rings){ring.mesh.rotation.z=t*1.4+ring.phase;if(ring.drop){ring.mesh.position.y=1.1+Math.sin(t*5+ring.phase)*.12}if(!ring.collected&&player.position.distanceTo(ring.mesh.position)<1.2){ring.collected=true;ring.mesh.visible=false;state.ring++;state.chaos=Math.min(100,state.chaos+2);burst(ring.mesh.position,'#ffe66e',5);setHud()}}

    for(const e of enemies){if(e.dead)continue;e.phase+=dt;const dx=player.position.x-e.group.position.x,dz=player.position.z-e.group.position.z,d=Math.hypot(dx,dz);if(d<18){const sp=e.type==='buzz'?2.2:1.55;e.group.position.x+=dx/d*sp*dt;e.group.position.z+=dz/d*sp*dt;e.group.position.y=getGroundHeight(e.group.position.x,e.group.position.z)+(e.type==='buzz'?Math.sin(e.phase*3)*.55:0);e.group.rotation.y=Math.atan2(dx,dz)}e.attack-=dt;if(d<2.0&&e.attack<=0&&state.invuln<=0){state.hp-=e.type==='buzz'?8:10;state.invuln=1.2;e.attack=1.8;burst(player.position,'#ff5d56',12);setHud();if(state.hp<=0){state.dead=true;playing=false;$('#hud').classList.add('hidden');$('#gameover-screen').classList.remove('hidden')}}}

    if(boss&&!boss.dead){boss.attack-=dt;boss.open=Math.max(0,boss.open-dt*.55);boss.phase=boss.hp<35?3:boss.hp<70?2:1;$('#boss-phase').textContent=String(boss.phase).padStart(2,'0');$('#boss-fill').style.width=Math.max(0,boss.hp)+'%';const dx=player.position.x-boss.group.position.x,dz=player.position.z-boss.group.position.z,d=Math.hypot(dx,dz);if(d>5){boss.group.position.x+=dx/d*1.1*dt;boss.group.position.z+=dz/d*1.1*dt}boss.group.rotation.y=Math.atan2(dx,dz);boss.core.visible=boss.open>0;if(boss.attack<=0){boss.open=1.2;boss.attack=boss.phase===3?2:boss.phase===2?2.5:3.2;if(d<6&&state.invuln<=0){state.hp-=boss.phase*7;state.invuln=1.2;setHud();if(state.hp<=0){state.dead=true;playing=false;$('#hud').classList.add('hidden');$('#gameover-screen').classList.remove('hidden')}}}}

    for(const p of [...particles]){p.life-=dt;p.mesh.position.addScaledVector(p.v,dt);p.v.y-=5*dt;p.mesh.scale.multiplyScalar(.96);if(p.life<=0){fxGroup.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();particles.splice(particles.indexOf(p),1)}}

    const target=player.position.clone().add(new THREE.Vector3(0,4.8,9.5));camera.position.lerp(target,.08);camera.lookAt(player.position.x,player.position.y+1.15,player.position.z);
    setHud();
  }else if(!playing&&!paused){camera.position.x=Math.sin(t*.08)*15;camera.position.z=18+Math.cos(t*.08)*5;camera.lookAt(0,2,0)}

  renderer.render(scene,camera);
}
requestAnimationFrame(animate);
