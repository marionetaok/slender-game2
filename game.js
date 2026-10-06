(() => {
"use strict";

let scene, camera, renderer, clock;
let player, flashlight, flashlightTarget;
let started = false, ended = false;
let pages = 0;
let battery = 100;
let stamina = 100;
let flashlightOn = true;
let yaw = 0, pitch = 0;
let slenderman;
let pageObjects = [];
let trees = [];
let keys = Object.create(null);
let mouseLocked = false;
let lastTime = performance.now();
let audioCtx = null;
let windGain = null;

const $ = id => document.getElementById(id);
const gameEl = $("game");
const startScreen = $("startScreen");
const endScreen = $("endScreen");
const startButton = $("startButton");
const restartButton = $("restartButton");
const loadStatus = $("loadStatus");
const hint = $("hint");

function setStatus(t){ if(loadStatus) loadStatus.textContent=t; }

function init() {
  if (!window.THREE) {
    setStatus("No se pudo cargar el motor 3D. Comprueba tu conexión a Internet.");
    return;
  }

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020403);
  scene.fog = new THREE.FogExp2(0x020403, 0.026);

  camera = new THREE.PerspectiveCamera(72, innerWidth/innerHeight, 0.05, 700);
  camera.rotation.order = "YXZ";

  renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:"high-performance"});
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.7));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  gameEl.appendChild(renderer.domElement);

  clock = new THREE.Clock();

  const hemi = new THREE.HemisphereLight(0x66706b,0x050505,0.20);
  scene.add(hemi);

  makeGround();
  makeForest();
  makeLandmarks();
  makePages();
  makeSlenderman();
  makeFlashlight();

  renderer.domElement.addEventListener("click", () => {
    if (started && !ended) requestPointerLockSafe();
  });

  startButton.addEventListener("click", startGame);
  restartButton.addEventListener("click", () => location.reload());

  document.addEventListener("keydown", onKeyDown, {passive:false});
  document.addEventListener("keyup", e => { keys[e.code] = false; });

  document.addEventListener("mousemove", e => {
    if (!started || ended) return;
    if (mouseLocked) {
      yaw -= e.movementX * 0.0022;
      pitch -= e.movementY * 0.0020;
      pitch = Math.max(-1.42, Math.min(1.42, pitch));
    }
  });

  document.addEventListener("pointerlockchange", () => {
    mouseLocked = document.pointerLockElement === renderer.domElement;
    if (started && !ended) {
      hint.textContent = mouseLocked
        ? "WASD mover · ratón mirar · F linterna · Shift correr · ESC libera el ratón"
        : "HAZ CLIC EN EL JUEGO para volver a mirar · WASD mover · F linterna";
    }
  });

  addTouchControls();
  addFullscreenButton();
  window.addEventListener("resize", onResize);

  setStatus("Listo. Pulsa «ENTRAR EN EL BOSQUE».");
  animate();
}

function makeGround(){
  const geo = new THREE.PlaneGeometry(700,700);
  const mat = new THREE.MeshLambertMaterial({color:0x111712});
  const ground = new THREE.Mesh(geo,mat);
  ground.rotation.x=-Math.PI/2;
  ground.position.y=-0.15;
  scene.add(ground);

  const grid = new THREE.GridHelper(700,140,0x182018,0x0b100c);
  grid.position.y=-0.14;
  grid.material.opacity=.18;
  grid.material.transparent=true;
  scene.add(grid);
}

function makeTree(x,z,s=1){
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(.25*s,.48*s,8*s,7),
    new THREE.MeshLambertMaterial({color:0x17130e})
  );
  trunk.position.y=4*s;
  g.add(trunk);

  const crownMat=new THREE.MeshLambertMaterial({color:0x101912});
  for(let i=0;i<5;i++){
    const c=new THREE.Mesh(new THREE.ConeGeometry((2.1-i*.22)*s,(3.8-i*.3)*s,7),crownMat);
    c.position.y=(7+i*.85)*s;
    c.position.x=(Math.random()-.5)*.45*s;
    g.add(c);
  }
  g.position.set(x,0,z);
  g.rotation.y=Math.random()*Math.PI;
  scene.add(g);
  trees.push(g);
}

function makeForest(){
  const rand=seeded(81723);
  for(let i=0;i<300;i++){
    let x=(rand()-.5)*520, z=(rand()-.5)*520;
    if(Math.hypot(x,z)<28){ i--; continue; }
    makeTree(x,z,.65+rand()*1.15);
  }
}

function makeRock(x,z,s){
  const m=new THREE.Mesh(
    new THREE.DodecahedronGeometry(s,0),
    new THREE.MeshLambertMaterial({color:0x1b211d})
  );
  m.position.set(x,s*.65,z);
  m.scale.y=.55;
  scene.add(m);
}

function makeLandmarks(){
  // Cabina
  const cabin=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(10,6,8),new THREE.MeshLambertMaterial({color:0x201b14}));
  body.position.y=3;
  cabin.add(body);
  const roof=new THREE.Mesh(new THREE.ConeGeometry(7.5,4,4),new THREE.MeshLambertMaterial({color:0x11110f}));
  roof.rotation.y=Math.PI/4; roof.position.y=8;
  cabin.add(roof);
  cabin.position.set(55,0,-65); scene.add(cabin);

  // Torre
  const tower=new THREE.Group();
  const tm=new THREE.MeshLambertMaterial({color:0x252925});
  for(let i=0;i<4;i++){
    const p=new THREE.Mesh(new THREE.BoxGeometry(.45,22,.45),tm);
    p.position.set(i%2?4:-4,11,i>1?4:-4);
    tower.add(p);
  }
  for(let y=5;y<22;y+=5){
    const bar=new THREE.Mesh(new THREE.BoxGeometry(8,.3,8),tm); bar.position.y=y; tower.add(bar);
  }
  tower.position.set(-75,0,65); scene.add(tower);

  // Generador
  const gen=new THREE.Mesh(new THREE.BoxGeometry(5,3,3),new THREE.MeshLambertMaterial({color:0x30332e}));
  gen.position.set(-55,1.5,-55); scene.add(gen);

  makeRock(35,40,3); makeRock(-30,20,2); makeRock(20,-70,3);
}

function makePageAt(x,z,i){
  const group=new THREE.Group();
  const paper=new THREE.Mesh(
    new THREE.PlaneGeometry(1.15,1.65),
    new THREE.MeshBasicMaterial({color:0xe6e1cf,side:THREE.DoubleSide})
  );
  paper.position.y=2.0;
  paper.rotation.y=Math.random()*Math.PI*2;
  group.add(paper);

  const glow=new THREE.PointLight(0xd8d1a8,1.3,7);
  glow.position.y=2; group.add(glow);
  group.position.set(x,0,z);
  group.userData.collected=false;
  group.userData.index=i;
  scene.add(group);
  pageObjects.push(group);
}

function makePages(){
  const positions=[
    [20,-25],[-38,-20],[70,10],[-75,-45],[45,75],[-10,85],[85,-80],[-85,75]
  ];
  positions.forEach((p,i)=>makePageAt(p[0],p[1],i));
}

function makeSlenderman(){
  slenderman=new THREE.Group();

  const black=new THREE.MeshLambertMaterial({color:0x050505});
  const white=new THREE.MeshLambertMaterial({color:0xd9d9d2});

  const torso=new THREE.Mesh(new THREE.CylinderGeometry(.55,.72,3.8,10),black);
  torso.position.y=5;
  slenderman.add(torso);

  const head=new THREE.Mesh(new THREE.SphereGeometry(.62,16,12),white);
  head.scale.set(.78,1.18,.72); head.position.y=7.35;
  slenderman.add(head);

  const armGeo=new THREE.CylinderGeometry(.17,.22,4.1,8);
  for(const side of [-1,1]){
    const arm=new THREE.Mesh(armGeo,black);
    arm.position.set(side*1.0,5.1,0);
    arm.rotation.z=side*.18;
    slenderman.add(arm);

    const hand=new THREE.Mesh(new THREE.SphereGeometry(.2,8,6),black);
    hand.position.set(side*1.25,3.1,0);
    slenderman.add(hand);
  }

  const legGeo=new THREE.CylinderGeometry(.22,.3,4.3,8);
  for(const side of [-1,1]){
    const leg=new THREE.Mesh(legGeo,black);
    leg.position.set(side*.38,2.0,0);
    slenderman.add(leg);
  }

  slenderman.visible=false;
  scene.add(slenderman);
}

function makeFlashlight(){
  flashlight=new THREE.SpotLight(0xffffff,4.8,42,Math.PI/7,.55,1.2);
  flashlight.position.set(0,-.12,0);
  camera.add(flashlight);

  flashlightTarget=new THREE.Object3D();
  flashlightTarget.position.set(0,0,-15);
  camera.add(flashlightTarget);
  flashlight.target=flashlightTarget;
  scene.add(camera);
}

function startGame(){
  started=true;
  startScreen.classList.add("hidden");
  setStatus("");
  initAudio();
  requestPointerLockSafe();
  hint.textContent="Haz clic para mirar · WASD mover · F linterna · Shift correr";
  lastTime=performance.now();
}

function requestPointerLockSafe(){
  try{
    if(renderer && renderer.domElement.requestPointerLock){
      const p=renderer.domElement.requestPointerLock();
      if(p && typeof p.catch==="function") p.catch(()=>{});
    }
  }catch(e){}
}

function onKeyDown(e){
  if(["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","ShiftLeft","ShiftRight","KeyF","Space"].includes(e.code)){
    e.preventDefault();
  }
  keys[e.code]=true;

  if(e.code==="KeyF" && !e.repeat && started && !ended){
    flashlightOn=!flashlightOn;
    flashlight.visible=flashlightOn;
  }
}

function update(dt){
  if(!started || ended) return;

  // Mirada
  camera.rotation.y=yaw;
  camera.rotation.x=pitch;

  let x=0,z=0;
  if(keys.KeyW||keys.ArrowUp) z-=1;
  if(keys.KeyS||keys.ArrowDown) z+=1;
  if(keys.KeyA||keys.ArrowLeft) x-=1;
  if(keys.KeyD||keys.ArrowRight) x+=1;

  const moving=x!==0||z!==0;
  const sprint=(keys.ShiftLeft||keys.ShiftRight) && moving && stamina>1;
  const speed=sprint?10.5:5.0;

  if(sprint) stamina=Math.max(0,stamina-dt*28);
  else stamina=Math.min(100,stamina+dt*17);

  if(moving){
    const len=Math.hypot(x,z); x/=len; z/=len;
    const forward=new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0),yaw);
    const right=new THREE.Vector3(1,0,0).applyAxisAngle(new THREE.Vector3(0,1,0),yaw);
    player.position.addScaledVector(forward,z*-speed*dt);
    player.position.addScaledVector(right,x*speed*dt);
  }

  player.position.x=THREE.MathUtils.clamp(player.position.x,-245,245);
  player.position.z=THREE.MathUtils.clamp(player.position.z,-245,245);

  // Recoger páginas
  for(const pg of pageObjects){
    if(pg.userData.collected) continue;
    const d=player.position.distanceTo(pg.position);
    if(d<2.8){
      pg.userData.collected=true;
      pg.visible=false;
      pages++;
      $("pages").textContent=pages+" / 8";
      battery=Math.min(100,battery+7);
      if(pages===8){
        finish(true);
        return;
      }
    }
  }

  // Batería
  if(flashlightOn) battery=Math.max(0,battery-dt*1.9);
  if(battery<=0){
    flashlightOn=false;
    flashlight.visible=false;
  }

  // Slenderman aparece a partir de la segunda página y se acerca progresivamente
  if(pages>=2){
    const chance=.06+pages*.025;
    if(Math.random()<chance*dt) spawnSlender();
  }

  if(slenderman.visible){
    const toPlayer=new THREE.Vector3().subVectors(player.position,slenderman.position);
    const dist=toPlayer.length();
    slenderman.lookAt(player.position.x,slenderman.position.y+4,player.position.z);

    const approach=Math.max(0.5,1.5+pages*.28);
    if(dist>7){
      toPlayer.normalize();
      slenderman.position.addScaledVector(toPlayer,approach*dt);
    }
    const dangerAmount=Math.max(0,1-dist/35);
    $("danger").style.opacity=String(Math.min(.9,dangerAmount*.8));
    if(dist<2.7){
      finish(false);
      return;
    }
    // Teletransportes ocasionales lejos del jugador para crear apariciones
    if(dist>90 && Math.random()<.002*dt*60) repositionSlender();
  } else {
    $("danger").style.opacity="0";
  }

  // Animación ambiental
  const t=performance.now()*.001;
  trees.forEach((tr,i)=>{ tr.rotation.z=Math.sin(t*.15+i)*.003; });

  $("batteryBar").style.width=battery+"%";
  $("staminaBar").style.width=stamina+"%";
}

function spawnSlender(){
  if(slenderman.visible) return;
  repositionSlender();
  slenderman.visible=true;
}

function repositionSlender(){
  const angle=Math.random()*Math.PI*2;
  const dist=45+Math.random()*35;
  slenderman.position.set(
    player.position.x+Math.cos(angle)*dist,
    0,
    player.position.z+Math.sin(angle)*dist
  );
}

function finish(win){
  ended=true;
  try{ if(document.pointerLockElement) document.exitPointerLock(); }catch(e){}
  endScreen.classList.remove("hidden");
  $("endTitle").textContent=win?"HAS SOBREVIVIDO":"TE ENCONTRÓ";
  $("endText").textContent=win
    ?"Has encontrado las 8 páginas. El bosque guarda silencio."
    :"El bosque ya no te pertenece. Has encontrado "+pages+" de 8 páginas.";
}

function animate(){
  requestAnimationFrame(animate);
  const now=performance.now();
  const dt=Math.min(.05,(now-lastTime)/1000);
  lastTime=now;

  if(!player){
    player=camera;
    player.position.set(0,1.65,8);
  }
  update(dt);
  renderer.render(scene,camera);
}

function onResize(){
  if(!camera||!renderer)return;
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
}

function seeded(seed){
  return function(){
    seed|=0;
    seed=seed+0x6D2B79F5|0;
    let t=Math.imul(seed^seed>>>15,1|seed);
    t=t+Math.imul(t^t>>>7,61|t)^t;
    return ((t^t>>>14)>>>0)/4294967296;
  };
}

function initAudio(){
  if(audioCtx) return;
  try{
    audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    const osc=audioCtx.createOscillator();
    windGain=audioCtx.createGain();
    osc.type="sine";
    osc.frequency.value=55;
    windGain.gain.value=.018;
    osc.connect(windGain).connect(audioCtx.destination);
    osc.start();
  }catch(e){}
}

function addFullscreenButton(){
  const b=document.createElement("button");
  b.textContent="⛶";
  b.title="Pantalla completa";
  b.setAttribute("aria-label","Pantalla completa");
  Object.assign(b.style,{
    position:"fixed",right:"16px",top:"16px",zIndex:"8",
    margin:"0",padding:"8px 11px",fontSize:"18px",
    background:"rgba(0,0,0,.45)",color:"#fff",
    border:"1px solid rgba(255,255,255,.2)"
  });
  b.addEventListener("click",async()=>{
    try{
      if(!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    }catch(e){}
  });
  document.body.appendChild(b);
}

function addTouchControls(){
  if(!("ontouchstart" in window)) return;
  const wrap=document.createElement("div");
  Object.assign(wrap.style,{position:"fixed",left:"12px",bottom:"45px",zIndex:"9",display:"grid",gridTemplateColumns:"52px 52px 52px",gridTemplateRows:"52px 52px",gap:"6px"});
  const make=(label,code,col,row)=>{
    const b=document.createElement("button");
    b.textContent=label;
    Object.assign(b.style,{margin:"0",padding:"0",width:"52px",height:"52px",background:"rgba(0,0,0,.48)",color:"#fff",border:"1px solid rgba(255,255,255,.25)",gridColumn:col,gridRow:row,touchAction:"none"});
    const down=e=>{e.preventDefault();keys[code]=true};
    const up=e=>{e.preventDefault();keys[code]=false};
    b.addEventListener("touchstart",down,{passive:false});
    b.addEventListener("touchend",up,{passive:false});
    b.addEventListener("touchcancel",up,{passive:false});
    wrap.appendChild(b);
  };
  make("W","KeyW",2,1); make("A","KeyA",1,2); make("S","KeyS",2,2); make("D","KeyD",3,2);
  document.body.appendChild(wrap);

  const f=document.createElement("button");
  f.textContent="🔦";
  Object.assign(f.style,{position:"fixed",right:"18px",bottom:"48px",zIndex:"9",width:"58px",height:"58px",margin:"0",padding:"0",borderRadius:"50%",background:"rgba(0,0,0,.55)",color:"#fff",border:"1px solid rgba(255,255,255,.3)",fontSize:"22px",touchAction:"none"});
  f.addEventListener("touchstart",e=>{e.preventDefault();if(started&&!ended){flashlightOn=!flashlightOn;flashlight.visible=flashlightOn;}},{passive:false});
  document.body.appendChild(f);
}

try { init(); } catch(err) {
  console.error(err);
  setStatus("Error al iniciar el juego: "+(err.message||err));
}
})();