(() => {
"use strict";

let scene, camera, renderer, clock;
let flashlight, playerLight;
let started = false, ended = false;
let yaw = 0, pitch = 0;
let keys = Object.create(null);
let pages = [];
let collected = 0;
let stamina = 100;
let battery = 100;
let slender;
let slenderActive = false;
let audioCtx = null;
let windGain, droneOsc;
let lastStep = 0;
const WORLD = 115;

const $ = id => document.getElementById(id);
const pagesUI = $("pages");
const staminaUI = $("stamina");
const batteryUI = $("battery");
const staticUI = $("static");
const dangerUI = $("danger");
const startUI = $("start");
const endUI = $("end");

function init(){
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020403);
  scene.fog = new THREE.FogExp2(0x030504, 0.027);

  camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, .08, 500);
  camera.position.set(0,1.7,8);
  camera.rotation.order = "YXZ";

  renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  $("game").appendChild(renderer.domElement);

  const hemi = new THREE.HemisphereLight(0x6f8190,0x020302,.28);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight(0x7d8790,.32);
  moon.position.set(-50,80,-30);
  moon.castShadow = true;
  scene.add(moon);

  makeGround();
  makeForest();
  makeLandmarks();
  makePages();
  makeSlender();

  flashlight = new THREE.SpotLight(0xffffff,5,42,Math.PI/8,.65,1.2);
  flashlight.castShadow = true;
  flashlight.shadow.mapSize.set(1024,1024);
  scene.add(flashlight);
  scene.add(flashlight.target);

  playerLight = new THREE.PointLight(0x9eb4c5,.12,7);
  scene.add(playerLight);

  addEvents();
  animate();
}

function makeGround(){
  const g = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD*2,WORLD*2),
    new THREE.MeshStandardMaterial({color:0x0c100d,roughness:1})
  );
  g.rotation.x = -Math.PI/2;
  g.receiveShadow = true;
  scene.add(g);
}

function makeForest(){
  for(let i=0;i<260;i++){
    const x=(Math.random()-.5)*WORLD*1.75;
    const z=(Math.random()-.5)*WORLD*1.75;
    if(Math.hypot(x,z)<10) continue;
    makeTree(x,z, .75+Math.random()*.65);
  }
  for(let i=0;i<95;i++){
    const x=(Math.random()-.5)*WORLD*1.75;
    const z=(Math.random()-.5)*WORLD*1.75;
    makeRock(x,z);
  }
}

function makeTree(x,z,s){
  const group=new THREE.Group();
  const h=(5+Math.random()*6)*s;
  const trunk=new THREE.Mesh(
    new THREE.CylinderGeometry(.18*s,.38*s,h,7),
    new THREE.MeshStandardMaterial({color:0x211811,roughness:1})
  );
  trunk.position.y=h/2;
  trunk.castShadow=true;
  group.add(trunk);
  for(let i=0;i<3;i++){
    const cone=new THREE.Mesh(
      new THREE.ConeGeometry((2.1-i*.35)*s,3.5*s,8),
      new THREE.MeshStandardMaterial({color:0x071008,roughness:1})
    );
    cone.position.y=h-.5+i*1.2;
    cone.castShadow=true;
    group.add(cone);
  }
  group.position.set(x,0,z);
  group.rotation.y=Math.random()*Math.PI;
  scene.add(group);
}

function makeRock(x,z){
  const r=new THREE.Mesh(
    new THREE.DodecahedronGeometry(.35+Math.random()*1.1,0),
    new THREE.MeshStandardMaterial({color:0x202420,roughness:1})
  );
  r.position.set(x,.35,z);
  r.scale.y=.45+Math.random();
  r.rotation.set(Math.random(),Math.random(),Math.random());
  r.castShadow=true;
  scene.add(r);
}

function makeLandmarks(){
  // Three simple structures inspired by the classic game's navigational landmarks.
  makeCabin(-42,28);
  makeGenerator(38,-18);
  makeTower(-8,-46);
}

function makeCabin(x,z){
  const g=new THREE.Group();
  const box=new THREE.Mesh(
    new THREE.BoxGeometry(8,4.5,7),
    new THREE.MeshStandardMaterial({color:0x151815,roughness:1})
  );
  box.position.y=2.25; box.castShadow=true; g.add(box);
  const roof=new THREE.Mesh(
    new THREE.ConeGeometry(5.8,3.5,4),
    new THREE.MeshStandardMaterial({color:0x080a08})
  );
  roof.position.y=6; roof.rotation.y=Math.PI/4; roof.castShadow=true; g.add(roof);
  g.position.set(x,0,z); scene.add(g);
}

function makeGenerator(x,z){
  const g=new THREE.Group();
  const base=new THREE.Mesh(
    new THREE.BoxGeometry(3,2,2),
    new THREE.MeshStandardMaterial({color:0x161818,metalness:.4,roughness:.8})
  );
  base.position.y=1; g.add(base);
  for(let i=0;i<3;i++){
    const pipe=new THREE.Mesh(
      new THREE.CylinderGeometry(.12,.12,3,8),
      new THREE.MeshStandardMaterial({color:0x292d2c,metalness:.5})
    );
    pipe.position.set(-.8+i*.8,2.4,0);
    g.add(pipe);
  }
  g.position.set(x,0,z); scene.add(g);
}

function makeTower(x,z){
  const g=new THREE.Group();
  for(let i=0;i<4;i++){
    const post=new THREE.Mesh(
      new THREE.BoxGeometry(.25,8,.25),
      new THREE.MeshStandardMaterial({color:0x171a18,metalness:.2})
    );
    post.position.set(i%2?1.8:-1.8,4,i>1?1.8:-1.8);
    g.add(post);
  }
  const top=new THREE.Mesh(
    new THREE.BoxGeometry(4.2,.25,4.2),
    new THREE.MeshStandardMaterial({color:0x1b1e1c})
  );
  top.position.y=8; g.add(top);
  g.position.set(x,0,z); scene.add(g);
}

function makePages(){
  const pos=[
    [-30,-28],[28,-30],[46,8],[-45,10],
    [2,42],[38,38],[-48,-22],[-4,-48]
  ];
  pos.forEach((p,i)=>{
    const g=new THREE.Group();
    const paper=new THREE.Mesh(
      new THREE.PlaneGeometry(.72,.98),
      new THREE.MeshStandardMaterial({
        color:0xe8e6dc,side:THREE.DoubleSide,
        emissive:0x252525
      })
    );
    paper.position.y=1.2;
    g.add(paper);
    const light=new THREE.PointLight(0xdde4e8,.35,4);
    light.position.y=1.2; g.add(light);
    g.position.set(p[0],0,p[1]);
    g.userData.index=i;
    scene.add(g); pages.push(g);
  });
}

function makeSlender(){
  const g=new THREE.Group();
  const black=new THREE.MeshStandardMaterial({color:0x030303,roughness:.95});
  const white=new THREE.MeshStandardMaterial({color:0xcfcfc8,roughness:.8});
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.34,.52,3.5,10),black);
  body.position.y=3.0; body.castShadow=true; g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.42,18,18),white);
  head.position.y=5.05; head.scale.set(.86,1.12,.82); head.castShadow=true; g.add(head);
  const tie=new THREE.Mesh(new THREE.ConeGeometry(.11,1.25,4),black);
  tie.position.set(0,3.9,-.35); tie.rotation.x=Math.PI/2; g.add(tie);
  const armGeo=new THREE.CylinderGeometry(.11,.17,3.3,8);
  const la=new THREE.Mesh(armGeo,black), ra=new THREE.Mesh(armGeo,black);
  la.position.set(-.78,3,.02); la.rotation.z=-.08;
  ra.position.set(.78,3,.02); ra.rotation.z=.08;
  g.add(la,ra);
  const legGeo=new THREE.CylinderGeometry(.13,.19,3.4,8);
  const ll=new THREE.Mesh(legGeo,black), rl=new THREE.Mesh(legGeo,black);
  ll.position.set(-.27,.9,0); rl.position.set(.27,.9,0);
  g.add(ll,rl);
  g.visible=false;
  g.position.set(0,0,-35);
  scene.add(g); slender=g;
}

function addEvents(){
  addEventListener("resize",onResize);
  addEventListener("keydown",e=>{keys[e.code]=true;if(e.code==="KeyF"&&!e.repeat)toggleFlashlight();});
  addEventListener("keyup",e=>keys[e.code]=false);
  addEventListener("mousemove",e=>{
    if(!started || ended || document.pointerLockElement!==renderer.domElement) return;
    yaw-=e.movementX*.0022;
    pitch-=e.movementY*.0022;
    pitch=Math.max(-1.45,Math.min(1.45,pitch));
    camera.rotation.y=yaw; camera.rotation.x=pitch;
  });
  $("startBtn").onclick=startGame;
  $("restartBtn").onclick=()=>location.reload();
  $("fullscreen").onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen?.();
}

function startGame(){
  started=true;
  startUI.classList.add("hidden");
  try{renderer.domElement.requestPointerLock();}catch(e){}
  initAudio();
}

function toggleFlashlight(){
  if(battery<=0) return;
  flashlight.visible=!flashlight.visible;
}

function updatePlayer(dt){
  const v=new THREE.Vector3();
  if(keys.KeyW)v.z-=1;if(keys.KeyS)v.z+=1;
  if(keys.KeyA)v.x-=1;if(keys.KeyD)v.x+=1;
  const moving=v.length()>0;
  if(moving)v.normalize();

  const running=(keys.ShiftLeft||keys.ShiftRight)&&moving&&stamina>2;
  let speed=running?8.2:4.7;

  if(running) stamina-=dt*27;
  else stamina+=dt*18;
  stamina=Math.max(0,Math.min(100,stamina));

  v.applyAxisAngle(new THREE.Vector3(0,1,0),yaw);
  camera.position.addScaledVector(v,speed*dt);
  camera.position.x=THREE.MathUtils.clamp(camera.position.x,-WORLD,WORLD);
  camera.position.z=THREE.MathUtils.clamp(camera.position.z,-WORLD,WORLD);
  camera.position.y=1.7;

  flashlight.position.copy(camera.position);
  playerLight.position.copy(camera.position);
  const forward=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
  flashlight.target.position.copy(camera.position).addScaledVector(forward,12);

  if(moving && performance.now()-lastStep>(running?280:430)){
    lastStep=performance.now();
    footstep(running);
  }
  staminaUI.style.width=stamina+"%";
}

function updatePages(dt){
  pages.forEach(p=>{
    if(p.userData.collected)return;
    p.rotation.y+=dt*.7;
    p.position.y=.15+Math.sin(performance.now()*.003+p.userData.index)*.07;
    if(camera.position.distanceTo(p.position)<1.8){
      p.userData.collected=true;p.visible=false;collected++;
      pagesUI.textContent=`PÁGINAS: ${collected} / 8`;
      pageSound();
      if(collected>=1)slenderActive=true;
      if(collected===8)win();
    }
  });
}

function updateSlender(dt){
  if(!slenderActive||ended)return;
  slender.visible=true;
  const toPlayer=new THREE.Vector3().subVectors(camera.position,slender.position);
  const d=toPlayer.length();
  if(d>42){
    const behind=new THREE.Vector3(0,0,1).applyQuaternion(camera.quaternion);
    behind.multiplyScalar(18+Math.random()*18);
    slender.position.copy(camera.position).add(behind);
    slender.position.y=0;
  }else if(d>5){
    toPlayer.normalize();
    const speed=.65+collected*.32;
    slender.position.addScaledVector(toPlayer,speed*dt);
  }else{
    toPlayer.normalize();
    slender.position.addScaledVector(toPlayer,(1.2+collected*.35)*dt);
  }
  slender.lookAt(camera.position.x,3,camera.position.z);

  const danger=Math.max(0,1-Math.min(d/18,1));
  staticUI.style.opacity=(danger*danger)*.75;
  dangerUI.style.opacity=(danger*danger)*.8;

  // If the player is looking roughly toward him, make the effect stronger.
  const lookDir=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize();
  const toS=new THREE.Vector3().subVectors(slender.position,camera.position).normalize();
  const facing=Math.max(0,lookDir.dot(toS));
  staticUI.style.opacity=Math.max(parseFloat(staticUI.style.opacity)||0,facing*danger*.65);

  if(d<1.75)lose();
}

function updateBattery(dt){
  if(flashlight.visible)battery-=dt*1.5;
  battery=Math.max(0,battery);
  if(battery<=0)flashlight.visible=false;
  batteryUI.style.width=battery+"%";
}

function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),.05);
  if(started&&!ended){
    updatePlayer(dt);
    updatePages(dt);
    updateSlender(dt);
    updateBattery(dt);
  }
  renderer.render(scene,camera);
}

function initAudio(){
  if(audioCtx)return;
  audioCtx=new (window.AudioContext||window.webkitAudioContext)();
  windGain=audioCtx.createGain(); windGain.gain.value=.025;
  windGain.connect(audioCtx.destination);
  const buffer=audioCtx.createBuffer(1,audioCtx.sampleRate*2,audioCtx.sampleRate);
  const data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.15;
  const noise=audioCtx.createBufferSource(); noise.buffer=buffer; noise.loop=true;
  const filter=audioCtx.createBiquadFilter(); filter.type="lowpass"; filter.frequency.value=650;
  noise.connect(filter).connect(windGain); noise.start();
}

function beep(freq,dur,vol=0.04){
  if(!audioCtx)return;
  const o=audioCtx.createOscillator(),g=audioCtx.createGain();
  o.type="sine";o.frequency.value=freq;g.gain.value=vol;
  o.connect(g).connect(audioCtx.destination);o.start();
  g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+dur);
  o.stop(audioCtx.currentTime+dur);
}
function pageSound(){beep(680,.08,.05);setTimeout(()=>beep(980,.12,.035),70)}
function footstep(running){beep(running?95:75,.035,running?.018:.012)}

function lose(){
  if(ended)return;ended=true;
  try{document.exitPointerLock()}catch(e){}
  $("endTitle").textContent="TE ENCONTRÓ";
  $("endText").textContent="Has encontrado "+collected+" de 8 páginas.";
  endUI.classList.remove("hidden");
  beep(45,.8,.08);
}

function win(){
  if(ended)return;ended=true;
  try{document.exitPointerLock()}catch(e){}
  $("endTitle").textContent="HAS SOBREVIVIDO";
  $("endText").textContent="Has encontrado las 8 páginas y escapaste del bosque.";
  endUI.classList.remove("hidden");
  beep(880,.15,.04);setTimeout(()=>beep(1200,.3,.04),160);
}

function onResize(){
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
}

init();
})();