import * as T from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import '../ui/styles.css';
import * as mixer from '../audio/mixer.ts';
import * as guide from '../ai/guide.ts';
import {generateScene, type SceneProvider} from '../ai/scene.ts';
import {renderGeneratedScene, type GeneratedSceneHandle} from './generated-scene.ts';

type Biome='underwater'|'woodland'|'sky';
type FieldObject={name:string;icon:string;kind:'animal'|'plant';biome:Biome;fact:string;question:string;choices:string[];answer:number;object:T.Group;home:T.Vector3;phase:number};

document.querySelector<HTMLDivElement>('#app')!.innerHTML=`
  <main class="world" id="world"><div class="noise"></div></main>
  <header class="brand"><div class="brand-mark">N</div><div><strong>Inside Nature</strong><small>Living field atlas · 01</small></div></header>
  <div class="top-status"><span class="ai-status" id="ai-status">Personal guide ready</span><span class="live">Ecosystem live</span><button class="round-control home-button" id="home-button" type="button" aria-label="Return to home" title="Return to home" hidden>⌂</button><button class="round-control help-button" id="help-button" type="button" aria-label="How to play" aria-controls="help" aria-expanded="false">?</button><button class="round-control sound" id="sound" type="button" aria-label="Toggle ambient sound">♪</button></div>
  <aside class="biome-card"><div class="eyebrow" id="zone-code">Biome 02 · Temperate</div><h2 id="zone-name">Woodland</h2><p id="zone-copy">Follow the river, listen closely, and meet the lives that keep this forest in balance.</p><div class="progress-label"><span>Field journal</span><span id="progress-count">0 / 0</span></div><div class="progress-track"><i id="progress-bar"></i></div><div class="discoveries" id="discoveries"></div></aside>
  <nav class="depth-nav" aria-label="Travel between biomes"><button data-biome="sky" aria-keyshortcuts="1"><b class="key">1</b><span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M7.8 18.5h9.4c2.3 0 4.1-1.8 4.1-4.1 0-2-1.4-3.7-3.3-4.1C17.6 7.8 15.4 6 12.7 6c-2.3 0-4.3 1.3-5.2 3.3C5.2 9.6 3.5 11.5 3.5 13.8c0 2.6 2.1 4.7 4.3 4.7Z"/></svg></span><span class="nav-tip">Canopy & sky</span></button><button data-biome="woodland" class="active" aria-keyshortcuts="2"><b class="key">2</b><span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.2 7.2 11h2.1L5.8 16.2h4.3V21h3.8v-4.8h4.3L14.7 11h2.1L12 3.2Z"/></svg></span><span class="nav-tip">Forest floor</span></button><button data-biome="underwater" aria-keyshortcuts="3"><b class="key">3</b><span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3.5 9c1.8 1.6 3.7 1.6 5.5 0s3.7-1.6 5.5 0 3.7 1.6 5.5 0"/><path d="M3.5 13.5c1.8 1.6 3.7 1.6 5.5 0s3.7-1.6 5.5 0 3.7 1.6 5.5 0"/><path d="M3.5 18c1.8 1.6 3.7 1.6 5.5 0s3.7-1.6 5.5 0 3.7 1.6 5.5 0"/></svg></span><span class="nav-tip">Below the surface</span></button></nav>
  <div class="crosshair"></div><div class="interact-hint" id="hint"><b>E</b><span></span></div>
  <div class="look-hint" id="look-hint"><b>Esc</b><span>Unlock mouse</span></div>
  <div class="controls"><div class="keys"><b class="key">W</b><b class="key">A</b><b class="key">S</b><b class="key">D</b></div><span>Move</span><div class="keys"><b class="key">Space</b><b class="key">Shift</b></div><span>Rise / descend</span><div class="keys"><b class="key">Click</b><b class="key">E</b></div><span>Discover</span></div>
  <div class="altitude"><b id="altitude">+03.5 m</b><span>Relative depth</span></div>
  <section class="help" id="help" role="dialog" aria-modal="true" aria-labelledby="help-title" hidden><article class="help-card"><button class="help-close" id="help-close" type="button" aria-label="Close how to play">×</button><div class="eyebrow">Explorer guide</div><h2 id="help-title">How to play</h2><div class="help-steps"><div><b>01</b><span><strong>Explore</strong>Use <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> to move. Move your mouse to look around.</span></div><div><b>02</b><span><strong>Travel up and down</strong>Hold <kbd>Space</kbd> to fly up. Hold <kbd>Shift</kbd> to go down into the forest or river.</span></div><div><b>03</b><span><strong>Find living things</strong>Walk close to an animal or plant. Press <kbd>E</kbd> or click it to meet it and read its story.</span></div><div><b>04</b><span><strong>Answer to collect</strong>Choose the right answer to add that animal or plant to your journal. A wrong answer does not collect it—try the new question!</span></div><div><b>05</b><span><strong>Complete your adventure</strong>Collect all 15 animals and plants. Watch the journal counter on the left to see how many are still hiding.</span></div></div><p>Tip: use the three biome buttons on the right to jump between the sky, forest, and river.</p></article></section>
  <section class="generated-hud" id="generated-hud" hidden><div class="eyebrow" id="generated-engine">Created from your image</div><h2 id="generated-title"></h2><p id="generated-summary"></p><button id="toggle-layers" type="button" aria-pressed="false" hidden>Separate layers</button><button id="new-scene" type="button">Create another scene</button></section>
  <section class="generated-info" id="generated-info" hidden><button id="generated-info-close" type="button" aria-label="Close object information">×</button><div class="eyebrow">You discovered</div><h3 id="generated-object-name"></h3><p id="generated-object-description"></p></section>
  <section class="intro" id="intro">
    <div class="intro-inner intro-stage window-card entry-stage" id="entry-stage"><div class="kicker">Choose your adventure</div><h1>Step <em>inside.</em></h1><p class="intro-copy">Play a ready-made learning world or turn your own picture into an interactive 3D scene.</p><div class="mode-grid"><button class="mode-card" id="choose-example" type="button"><small>Beginner example</small><strong>Explore Inside Nature</strong><span>Meet animals and plants across the forest, river, and sky.</span><i>Play example →</i></button><button class="mode-card create-mode" id="choose-create" type="button"><small>Create your own</small><strong>Upload a picture</strong><span>Transform a diagram or nature image into an explorable 3D learning scene.</span><i>Start creating →</i></button></div></div>
    <div class="intro-inner intro-stage window-card profile-stage" id="profile-stage" hidden><button class="stage-back" id="profile-back" type="button">← Home</button><div class="kicker">Before you explore</div><h2>Shape your field guide.</h2><p class="intro-copy">A few details help the guide connect each discovery to what interests you.</p><form class="profile" id="profile"><label><span>What should we call you?</span><input id="visitor-name" maxlength="40" placeholder="Explorer" autocomplete="given-name"></label><label><span>What are you curious about?</span><input id="visitor-interests" maxlength="240" placeholder="Food webs, big cats, climate…"></label><label><span>How should we explain?</span><select id="visitor-style"><option value="curious">Curious & vivid</option><option value="simple">Simple & concise</option><option value="scientific">Scientific</option><option value="storylike">Like a nature story</option></select></label><button class="begin" id="begin" type="submit"><span>Start my exploration</span><i>→</i></button><small class="profile-note">Your field guide will adapt discoveries to your interests.</small></form></div>
    <div class="intro-inner intro-stage window-card creator-stage" id="creator-stage" hidden><button class="stage-back" id="creator-back" type="button">← Home</button><div class="kicker">Create your own world</div><h2>Turn a picture into 3D.</h2><p class="intro-copy">Upload a clear nature photo or learning diagram. Then choose one model to make a single conversion attempt.</p><form class="scene-creator" id="scene-creator"><label class="upload-drop" for="scene-image"><input id="scene-image" type="file" accept="image/png,image/jpeg" required><span id="upload-prompt"><b>Choose a PNG or JPEG</b><small>Diagrams with clear shapes and labels work best.</small></span><img id="scene-preview" alt="Selected image preview" hidden></label><p class="creator-error" id="creator-error" role="alert"></p><div class="model-actions"><button class="begin model-option" name="provider" value="nvidia" type="submit"><span><b>Try NVIDIA Nemotron</b><small>Specialized visual planning</small></span><i>→</i></button><button class="begin model-option gemini-option" name="provider" value="gemini" type="submit"><span><b>Try Gemini Pro</b><small>Higher-quality alternative</small></span><i>→</i></button></div><p class="model-note">If one model cannot convert the picture, it will stop. Your upload stays here so you can choose the other model.</p></form></div>
    <div class="intro-stage window-card loading-stage" id="loading-stage" role="status" aria-live="polite" hidden><div class="loading-orbit"><i></i><i></i><i></i></div><div class="kicker" id="loading-kicker">Preparing your journey</div><h2 id="loading-title">Connecting the living world<span class="loading-ellipsis" aria-hidden="true"><i></i><i></i><i></i></span></h2><p id="loading-copy">Building a field guide around your curiosity.</p></div>
  </section>
  <section class="dialogue" id="dialogue" aria-modal="true" role="dialog"><article class="dialogue-card"><button class="dialogue-close" id="dialogue-close" aria-label="Close">×</button><div class="dialogue-tag" id="dialogue-tag"></div><div class="dialogue-heading"><h3 id="dialogue-name"></h3><span class="nim-badge" id="nim-badge">Field guide</span><button class="listen" id="listen-sfx" type="button">Hear sound</button></div><p id="dialogue-fact"></p><div class="choices" id="choices"></div><p class="result" id="result" role="status" aria-live="polite"></p></article></section>`;

document.querySelector('.model-actions')?.insertAdjacentHTML('beforeend','<button class="begin model-option openrouter-option" name="provider" value="openrouter" type="submit"><span><b>Try OpenRouter auto</b><small>Router chooses for this task</small></span><i>→</i></button>');

const world=document.querySelector<HTMLElement>('#world')!;
const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;world.prepend(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color('#91c7c8');scene.fog=new T.FogExp2('#8bb8a7',.018);
const camera=new T.PerspectiveCamera(65,innerWidth/innerHeight,.05,160);camera.position.set(0,3.5,15);

const hemi=new T.HemisphereLight(0xc6e9f2,0x23452f,2.3);scene.add(hemi);
const sun=new T.DirectionalLight(0xffe8ac,3.2);sun.position.set(-18,28,12);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-35;sun.shadow.camera.right=35;sun.shadow.camera.top=35;sun.shadow.camera.bottom=-35;sun.shadow.bias=-.0015;scene.add(sun);
const fill=new T.DirectionalLight(0xaee0ff,.5);fill.position.set(16,9,-14);scene.add(fill);
const rim=new T.DirectionalLight(0xfff1c9,.55);rim.position.set(6,4,-20);scene.add(rim);

const mat=(color:T.ColorRepresentation,roughness=.82)=>new T.MeshStandardMaterial({color,roughness,metalness:0});
const mesh=(geometry:T.BufferGeometry,material:T.Material,cast=true)=>{const value=new T.Mesh(geometry,material);value.castShadow=cast;value.receiveShadow=true;return value;};
const sphere=(r:number,color:T.ColorRepresentation,widthSeg=22,heightSeg=16)=>mesh(new T.SphereGeometry(r,widthSeg,heightSeg),mat(color));
const box=(x:number,y:number,z:number,color:T.ColorRepresentation)=>mesh(new T.BoxGeometry(x,y,z),mat(color));
const cylinder=(top:number,bottom:number,height:number,color:T.ColorRepresentation,segments=14)=>mesh(new T.CylinderGeometry(top,bottom,height,segments),mat(color));
let seed=481516;const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646};
const range=(min:number,max:number)=>min+random()*(max-min);
const tint=(hex:string,amount:number)=>new T.Color(hex).offsetHSL(0,(random()-.5)*amount*.4,(random()-.5)*amount).getStyle();
const noise2=(x:number,z:number)=>Math.sin(x*.11)*Math.cos(z*.13)+Math.sin(x*.045+z*.08)*1.4+Math.sin((x+z)*.021)*2.1;
// The scene's hemisphere light bounces dark green off the ground, which turns pale
// hide, plumage and fur green from below. A trace of self-colour holds the hue.
const selfLit=(color:T.ColorRepresentation,amount=.17)=>new T.Color(color).multiplyScalar(amount);
const lit=(color:T.ColorRepresentation,roughness=.8)=>new T.MeshStandardMaterial({color,roughness,emissive:selfLit(color)});
// Dark above, pale below: the countershading nearly every wild animal wears.
function countershade(geometry:T.BufferGeometry,belly:string,back:string,low:number,high:number){const position=geometry.attributes.position as T.BufferAttribute;const colors=new Float32Array(position.count*3);const under=new T.Color(belly),over=new T.Color(back),c=new T.Color();for(let i=0;i<position.count;i++){c.copy(under).lerp(over,T.MathUtils.smoothstep(position.getY(i),low,high));colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b}geometry.setAttribute('color',new T.BufferAttribute(colors,3));return geometry}
// A tapered bone spanning two joint positions — the spine of every jointed limb.
function bone(from:T.Vector3,to:T.Vector3,fromRadius:number,toRadius:number,material:T.Material,segments=8){const axis=to.clone().sub(from),length=axis.length();const m=mesh(new T.CylinderGeometry(toRadius,fromRadius,length,segments),material);m.position.copy(from).addScaledVector(axis,.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),axis.normalize());return m}
const swayables:{object:T.Object3D;phase:number;strength:number}[]=[];
const cloudDrifters:{object:T.Object3D;phase:number}[]=[];
// Anything that rocks about one axis: wings, fins, swishing tails.
const wingBeats:{pivot:T.Object3D;axis?:'x'|'y';rest:number;amp:number;speed:number;phase:number}[]=[];

// The forest floor's height field. The terrain mesh displaces its vertices with it, and
// anything rooted in the ground reads the same function, so it lands flush instead of at y=0.
const GROUND_BASE=-.05;
const groundBump=(x:number,z:number)=>(noise2(x*.4,z*.35)*.24+noise2(x*1.3,z*1.1)*.07)*T.MathUtils.smoothstep(Math.abs(x-2),1.5,7);
const groundHeight=(x:number,z:number)=>GROUND_BASE+groundBump(x,z);
// A trunk flare starts a little above its group origin, so bury the root slightly: soil then
// meets bark on a slope instead of leaving a sliver of daylight under the tree.
const ROOT_DEPTH=.12;
const rootHeight=(x:number,z:number,scale:number)=>groundHeight(x,z)-ROOT_DEPTH*scale;
const grounded=(x:number,z:number,offset=0):[number,number,number]=>[x,groundHeight(x,z)+offset,z];
const rooted=(x:number,z:number,scale:number):[number,number,number]=>[x,rootHeight(x,z,scale),z];

// Forest floor: noise-shaded rolling terrain either side of a winding river.
function terrain(width:number,depth:number,centerX:number){const geometry=new T.PlaneGeometry(width,depth,Math.round(width*1.4),Math.round(depth*1.4));geometry.rotateX(-Math.PI/2);const position=geometry.attributes.position as T.BufferAttribute;const colors=new Float32Array(position.count*3);const c=new T.Color();for(let i=0;i<position.count;i++){const localX=position.getX(i),z=position.getZ(i),x=localX+centerX;const riverDistance=Math.abs(x-2);position.setY(i,groundBump(x,z));const patch=noise2(x*.55+40,z*.55-40);const groundColor=riverDistance<4.6?'#a08652':patch>.68?'#3d6a3e':patch<-.68?'#6c9250':'#527849';c.set(groundColor).offsetHSL(0,0,noise2(x*2.2,z*2.2)*.05);colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b}geometry.setAttribute('color',new T.BufferAttribute(colors,3));geometry.computeVertexNormals();const ground=new T.Mesh(geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:.96}));ground.receiveShadow=true;ground.position.set(centerX,GROUND_BASE,0);scene.add(ground);return ground}
terrain(31.5,66,-19.25);terrain(27.5,66,21.25);
// Riverbank cliff faces: give the land visible depth below the surface instead of a paper-thin edge.
function bankFace(x:number,normalDir:number,depth:number,topMargin:number){const height=depth+topMargin;const geometry=new T.PlaneGeometry(66,height,44,10);const position=geometry.attributes.position as T.BufferAttribute;const colors=new Float32Array(position.count*3);const c=new T.Color();for(let i=0;i<position.count;i++){const along=position.getX(i),down=position.getY(i);const soil=noise2(along*.3,down*.5);const soilColor=soil>.35?'#6b4a2c':soil<-.35?'#4a3420':'#5a3d26';c.set(soilColor).offsetHSL(0,0,noise2(along*1.6,down*1.6)*.04);colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b}geometry.setAttribute('color',new T.BufferAttribute(colors,3));geometry.rotateY(normalDir*Math.PI/2);const wall=new T.Mesh(geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:.95}));wall.position.set(x,(topMargin-depth)/2,0);wall.receiveShadow=true;scene.add(wall);return wall}
bankFace(-3.5,1,12,-.05);bankFace(7.5,-1,12,-.05);
const riverMaterial=new T.MeshPhysicalMaterial({color:'#45baca',transparent:true,opacity:.78,roughness:.12,metalness:.05,transmission:.2,clearcoat:.6,clearcoatRoughness:.25,side:T.DoubleSide});
const river=new T.Mesh(new T.PlaneGeometry(11,66,26,44),riverMaterial);river.rotation.x=-Math.PI/2;river.position.set(2,-.05,0);scene.add(river);
const riverGeometry=river.geometry as T.PlaneGeometry,riverPosition=riverGeometry.attributes.position as T.BufferAttribute;
for(const side of[-1,1]){const bank=mesh(new T.CylinderGeometry(.16,.2,66,16),mat(tint('#b08a50',.1)));bank.rotation.x=Math.PI/2;bank.position.set(2+side*5.5,.18,0);scene.add(bank);for(let i=0;i<22;i++){const pebble=sphere(.06+random()*.13,tint(random()>.5?'#8f8064':'#a89873',.16),8,6);pebble.scale.set(range(1,1.5),.6,range(1,1.4));pebble.position.set(2+side*5.5+range(-.6,.6),.05,range(-32,32));scene.add(pebble)}}
const bridge=new T.Group();for(let i=-7;i<=7;i++){const plank=box(1.1,.16,2.8,tint('#9a6338',.1));plank.position.set(i*1.02,.55,2);plank.rotation.z=Math.sin(i*.45)*.045;bridge.add(plank)}for(const z of[.85,3.15]){const rail=box(16,.12,.12,'#774729');rail.position.set(0,1.18,z);bridge.add(rail);for(let i=-7;i<=7;i++){const baluster=box(.08,.55,.08,'#6b3f24');baluster.position.set(i*1.02,.9,z);bridge.add(baluster)}}for(const x of[-7.3,7.3])for(const z of[.85,3.15]){const post=cylinder(.14,.16,1.3,'#5c3820',10);post.position.set(x,.05,z);bridge.add(post)}bridge.position.set(2,.5,0);scene.add(bridge);

function foliagePuff(radius:number,color:string){return sphere(radius*range(.55,1),tint(color,.16),10,8)}
function tree(x:number,z:number,scale:number){const g=new T.Group();const lean=range(-.05,.05);const barkColor=tint('#66452d',.12);
 const flare=cylinder(.5,.62,.5,tint('#5c3f28',.08),12);flare.position.y=.28;g.add(flare);
 const trunk=cylinder(.24,.46,3.6,barkColor,12);trunk.position.y=2.05;trunk.rotation.z=lean;g.add(trunk);
 for(const[y,r,c]of[[3.4,1.65,'#2f6741'],[4.3,1.35,'#3f7b49'],[5.1,.95,'#57945a']]as[number,number,string][]){const count=Math.max(2,Math.round(r*2.6));for(let i=0;i<count;i++){const puff=foliagePuff(r,c);puff.position.set(range(-r*.55,r*.55),y+range(-r*.25,r*.25),range(-r*.55,r*.55));g.add(puff)}}
 for(let b=0;b<2;b++){const angle=b*Math.PI+range(-.3,.3);const branch=cylinder(.05,.13,range(1,1.5),barkColor,8);branch.position.set(Math.cos(angle)*.3,2.9+b*.3,Math.sin(angle)*.3);branch.rotation.z=Math.PI/2-.55;branch.rotation.y=angle;g.add(branch);for(let i=0;i<2;i++){const puff=foliagePuff(.85,'#3f7b49');puff.position.set(Math.cos(angle)*1.5+range(-.3,.3),3.2+b*.3+range(-.2,.2),Math.sin(angle)*1.5+range(-.3,.3));g.add(puff)}}
 g.position.set(x,rootHeight(x,z,scale),z);g.scale.setScalar(scale);scene.add(g);return g}
// Where the deer stands. The clearing below and its own placement read the same spot,
// so moving the deer moves the gap in the trees with it.
const DEER_X=-7.5,DEER_Z=-3.5;
// Keep the river corridor clear, the two bridge landings with it, and a clearing around
// the deer so it is not buried in canopy. Each nudge reuses the sampled position, so the
// rest of the forest lands exactly where it did before.
for(let i=0;i<42;i++){let x=(random()-.5)*58,z=(random()-.5)*58;if(Math.abs(x-2)<8)x+=x<2?-8:8;if(Math.abs(z-2)<3.6&&x>-13&&x<17)z+=z<2?-5.5:5.5;if(Math.hypot(x-DEER_X,z-DEER_Z)<4.6)x-=7;tree(x,z,.72+random()*.65)}

function isLand(x:number,z:number){
  // Keep all grassy ground cover outside the river channel. The river sits in a
  // central band roughly x = 2 ± 5.5 and z = ±33, so any point in that footprint
  // is water and should not receive flowers or grass.
  return !(Math.abs(x-2) < 5.5 && Math.abs(z) < 33);
}
function grassTuft(x:number,z:number){if(!isLand(x,z))return null;const g=new T.Group();const bladeCount=3+Math.floor(random()*3);for(let i=0;i<bladeCount;i++){const height=.5+random()*.55;const blade=mesh(new T.ConeGeometry(.06,height,6),mat(tint(random()>.4?'#6f984e':'#92aa50',.14)),false);blade.position.set(range(-.13,.13),height/2,range(-.13,.13));blade.rotation.z=range(-.2,.2);blade.rotation.y=random()*Math.PI;g.add(blade)}g.position.set(x,groundHeight(x,z)+.02,z);scene.add(g);swayables.push({object:g,phase:random()*Math.PI*2,strength:.055});return g}
for(let i=0;i<120;i++){const x=(random()-.5)*56,z=(random()-.5)*56;if(!isLand(x,z))continue;grassTuft(x,z)}
for(let i=0;i<60;i++){const x=(random()-.5)*18,z=(random()-.5)*14;if(!isLand(x+2,z+1))continue;grassTuft(x+2,z+1)}

function flower(x:number,z:number){if(!isLand(x,z))return null;const g=new T.Group();const stemHeight=.4+random()*.25;const stem=cylinder(.022,.03,stemHeight,tint('#48733d',.1),8);stem.position.y=stemHeight/2;g.add(stem);for(const side of[-1,1]){const leaf=mesh(new T.SphereGeometry(.09,8,6),mat('#4f7a3f'),false);leaf.scale.set(1.8,.25,.7);leaf.position.set(side*.09,stemHeight*.45,0);leaf.rotation.y=side*.6;g.add(leaf)}const petals=5+Math.floor(random()*3);const hue=random();const petalColor=hue>.66?'#f5d7dc':hue>.33?'#f4dd73':'#eef0e8';for(let p=0;p<petals;p++){const petal=sphere(.085,tint(petalColor,.08),8,6);petal.scale.set(1.7,.5,1);const a=p*(Math.PI*2/petals);petal.position.set(Math.cos(a)*.12,stemHeight+.02,Math.sin(a)*.12);petal.rotation.y=a;g.add(petal)}const center=sphere(.05,'#f0c23e',8,6);center.position.y=stemHeight+.03;g.add(center);g.position.set(x,groundHeight(x,z),z);scene.add(g);swayables.push({object:g,phase:random()*Math.PI*2,strength:.03});return g}
for(let i=0;i<70;i++){const x=(random()-.5)*46,z=(random()-.5)*46;if(!isLand(x,z))continue;flower(x,z)}
for(let i=0;i<40;i++){const x=(random()-.5)*18,z=(random()-.5)*14;if(!isLand(x+2,z+1))continue;flower(x+2,z+1)}

// Underwater world: noise-shaded seabed, rock piles, swaying kelp, and coral accents.
// Constrained to the river's own footprint (between the two banks) so nothing sits beneath dry land.
const riverBankHalf=5.5,riverBandHalf=4.8,seabedHalfLength=33;
const wallEndGeometry=new T.BoxGeometry(riverBankHalf*2,1,.3),wallMaterial=mat('#3d7770');
const wallFront=mesh(wallEndGeometry,wallMaterial,false);wallFront.position.set(2,-11.5,-seabedHalfLength);scene.add(wallFront);
const wallBack=mesh(wallEndGeometry,wallMaterial,false);wallBack.position.set(2,-11.5,seabedHalfLength);scene.add(wallBack);
const floorGeometry=new T.PlaneGeometry(riverBankHalf*2,seabedHalfLength*2,Math.round(riverBankHalf*2*3),Math.round(seabedHalfLength*2*1.4));floorGeometry.rotateX(-Math.PI/2);const floorPosition=floorGeometry.attributes.position as T.BufferAttribute;const floorColors=new Float32Array(floorPosition.count*3);const floorColor=new T.Color();for(let i=0;i<floorPosition.count;i++){const localX=floorPosition.getX(i),z=floorPosition.getZ(i),x=localX+2;floorPosition.setY(i,Math.sin(x*.5)*.03+noise2(x*.3,z*.3)*.05);const patch=noise2(x*.5+80,z*.5-80);floorColor.set(patch>.5?'#3d5c52':patch<-.4?'#6a6650':'#4d7167').offsetHSL(0,0,noise2(x,z)*.04);floorColors[i*3]=floorColor.r;floorColors[i*3+1]=floorColor.g;floorColors[i*3+2]=floorColor.b}floorGeometry.setAttribute('color',new T.BufferAttribute(floorColors,3));floorGeometry.computeVertexNormals();const seabedFloor=new T.Mesh(floorGeometry,new T.MeshStandardMaterial({vertexColors:true,roughness:.96}));seabedFloor.position.set(2,-11.5,0);seabedFloor.receiveShadow=true;scene.add(seabedFloor);
for(let i=0;i<26;i++){const cx=2+(random()-.5)*riverBandHalf*2,cz=(random()-.5)*48,count=1+Math.floor(random()*3);for(let j=0;j<count;j++){const rock=sphere(.22+random()*.6,tint(random()>.5?'#517a74':'#8c8c72',.12),10,7);rock.scale.set(range(1,1.6),range(.4,.65),range(1,1.5));rock.rotation.y=random()*Math.PI;rock.position.set(cx+range(-.5,.5),-10.75+random()*.1,cz+range(-.5,.5));scene.add(rock)}}
function weed(x:number,z:number){const g=new T.Group();const segments=3+Math.floor(random()*3);const color=tint(random()>.5?'#2d8771':'#6aa764',.12);let y=0;for(let i=0;i<segments;i++){const h=.5+random()*.4;const blade=mesh(new T.ConeGeometry(Math.max(.02,.09-i*.015),h,7),mat(color),false);blade.position.y=y+h/2;blade.rotation.z=range(-.14,.14);g.add(blade);y+=h*.85}g.position.set(x,-10+random()*.3,z);scene.add(g);swayables.push({object:g,phase:random()*Math.PI*2,strength:.1});return g}
for(let i=0;i<38;i++)weed(2+(random()-.5)*riverBandHalf*2,(random()-.5)*45);
function coral(x:number,z:number){const g=new T.Group();const baseColor=tint(random()>.5?'#e0704f':'#d94f7a',.14);const branches=3+Math.floor(random()*3);for(let i=0;i<branches;i++){const h=.4+random()*.6;const branch=cylinder(.03,.08,h,baseColor,7);branch.position.set(range(-.2,.2),h/2,range(-.2,.2));branch.rotation.z=range(-.5,.5);branch.rotation.x=range(-.5,.5);g.add(branch)}g.position.set(x,-10.9,z);scene.add(g)}
for(let i=0;i<15;i++)coral(2+(random()-.5)*riverBandHalf*2,(random()-.5)*40);
const bubbles:T.Mesh[]=[];for(let i=0;i<48;i++){const bubble=new T.Mesh(new T.SphereGeometry(.04+random()*.09,10,7),new T.MeshBasicMaterial({color:'#c8f5ed',transparent:true,opacity:.5,wireframe:true}));bubble.position.set(2+(random()-.5)*riverBandHalf*2,-10+random()*9,(random()-.5)*45);bubble.userData.speed=.25+random()*.5;bubbles.push(bubble);scene.add(bubble)}

// Sky landmarks: puffier, drifting clouds with per-puff shading.
for(let i=0;i<15;i++){const cloud=new T.Group();const puffCount=5+Math.floor(random()*4);for(let j=0;j<puffCount;j++){const puff=new T.Mesh(new T.SphereGeometry(1+range(-.25,.65),12,8),new T.MeshStandardMaterial({color:tint('#fff7df',.05),roughness:1,transparent:true,opacity:range(.78,.94)}));puff.scale.y=.45+random()*.2;puff.position.set(j*1.3+range(-.5,.5),random()*.65,range(-.6,.6));cloud.add(puff)}cloud.position.set((random()-.5)*60,12+random()*15,(random()-.5)*60);cloud.scale.setScalar(range(.8,1.35));scene.add(cloud);cloudDrifters.push({object:cloud,phase:random()*Math.PI*2})}

// ── Mammals ──────────────────────────────────────────────────────────────────
type Pelt={coat:string;belly:string;muzzle:string;nose:string;iris:string;foot:string;inner:string;sock?:string;stripe?:string;stripes?:number;
 girth:number;depth:number;head:number;neck:number;neckTilt:number;leg:number;legGirth:number;hoofed:boolean;
 ear:'tall'|'pointed'|'round';earSize:number;earTilt:number;earBack?:string;eyeSet:number;snout:number;snoutWidth:number;whiskers?:boolean};
// Barrel chest, tucked waist, heavy hindquarters: the shape under any four-legged coat.
const beastProfile:[number,number][]=[[.002,-.92],[.17,-.88],[.3,-.76],[.4,-.58],[.45,-.34],[.46,-.06],[.43,.2],[.455,.44],[.44,.66],[.31,.85],[.002,.95]];
// Resampled along a spline: a coarse lathe cannot carry stripes in its vertex colours,
// and the extra rings smooth the barrel at the same time.
const beastRings=new T.CatmullRomCurve3(beastProfile.map(([r,y])=>new T.Vector3(r,y,0))).getPoints(95).map(v=>new T.Vector2(Math.max(v.x,.002),v.y));
function beastTorso(p:Pelt){const geometry=new T.LatheGeometry(beastRings,30);geometry.rotateX(Math.PI/2);geometry.scale(p.girth*.86,p.depth,1);geometry.computeVertexNormals();countershade(geometry,p.belly,p.coat,-.46*p.depth,-.18*p.depth);
 // Stripes are bands wrapped around the whole barrel and skewed down the flanks,
 // not decals laid along the spine.
 if(p.stripes){const position=geometry.attributes.position as T.BufferAttribute,color=geometry.attributes.color as T.BufferAttribute,dark=new T.Color(p.stripe!),c=new T.Color();
  for(let i=0;i<position.count;i++){const band=T.MathUtils.smoothstep(Math.sin(position.getZ(i)*p.stripes+Math.abs(position.getX(i))*2.4),.3,.62);c.fromBufferAttribute(color,i).lerp(dark,band*.92);color.setXYZ(i,c.r,c.g,c.b)}}
 return geometry}
// plan lists the joints as [alongBody, down] fractions of the leg, so a hock can zig-zag.
function limb(parent:T.Object3D,x:number,y:number,z:number,length:number,girth:number,plan:[number,number][],upper:T.Material,lower:T.Material,footMaterial:T.Material,hoofed:boolean){
 const points=plan.map(([dz,dy])=>new T.Vector3(x,y+dy*length,z+dz*length)),last=points.length-1;
 for(let i=0;i<last;i++){const wide=girth*(1-i*.19),narrow=girth*(1-(i+1)*.19),skin=i>=last-1?lower:upper;
  parent.add(bone(points[i],points[i+1],wide,narrow,skin,7));
  if(i){const knuckle=mesh(new T.SphereGeometry(wide*1.05,8,6),skin);knuckle.position.copy(points[i]);parent.add(knuckle)}}
 const toe=points[last];
 if(hoofed)for(const half of[-1,1]){const hoof=mesh(new T.CylinderGeometry(girth*.46,girth*.56,girth*1.7,7),footMaterial);hoof.position.set(toe.x+half*girth*.38,toe.y-girth*.7,toe.z);parent.add(hoof)}
 else{const pad=mesh(new T.SphereGeometry(.5,10,8),footMaterial);pad.scale.set(girth*2.1,girth*1.1,girth*2.8);pad.position.set(toe.x,toe.y-girth*.4,toe.z+girth*.3);parent.add(pad);
  for(let t=0;t<3;t++){const digit=mesh(new T.SphereGeometry(.5,7,6),footMaterial);digit.scale.set(girth*.85,girth*.6,girth*1.4);digit.position.set(toe.x+(t-1)*girth*.62,toe.y-girth*.42,toe.z+girth*1.05);parent.add(digit)}}}
function beastHead(p:Pelt,fur:T.Material,muzzleMaterial:T.Material,innerMaterial:T.Material){const skull=new T.Group();
 const cranium=mesh(new T.SphereGeometry(.3,18,14),fur);cranium.scale.set(.84,.9,1);skull.add(cranium);
 const cheek=mesh(new T.SphereGeometry(.26,14,10),fur);cheek.scale.set(.88,.68,.9);cheek.position.set(0,-.1,-.12);skull.add(cheek);
 const snout=mesh(new T.CylinderGeometry(p.snoutWidth*.74,p.snoutWidth,p.snout,12),fur);snout.rotation.x=-Math.PI/2-.22;snout.position.set(0,-.1-p.snout*.12,-.2-p.snout*.46);skull.add(snout);
 // Pale chin and lip band under a coat-coloured muzzle, not a white sausage.
 const chin=mesh(new T.SphereGeometry(.5,12,9),muzzleMaterial);chin.scale.set(p.snoutWidth*1.3,p.snoutWidth*.72,p.snout*.92);chin.position.set(0,-.17-p.snout*.2,-.22-p.snout*.5);skull.add(chin);
 const nose=mesh(new T.SphereGeometry(.5,10,8),lit(p.nose,.32));nose.scale.set(p.snoutWidth*1.25,p.snoutWidth*.8,p.snoutWidth*.5);nose.position.set(0,-.12-p.snout*.26,-.21-p.snout*.96);skull.add(nose);
 const mouth=mesh(new T.BoxGeometry(p.snoutWidth*.85,.016,p.snout*.42),lit('#2b221c',.85),false);mouth.position.set(0,-.21-p.snout*.24,-.26-p.snout*.58);skull.add(mouth);
 for(const side of[-1,1]){
  // eyeSet slides the eyes from forward-facing (hunter) round to the flanks of the skull (prey).
  const out=new T.Vector3(side*p.eyeSet*.95,.12,-1+p.eyeSet*.82).normalize(),at=new T.Vector3(side*(.13+.13*p.eyeSet),.08,-.25+.15*p.eyeSet);
  const socket=mesh(new T.SphereGeometry(.072,10,8),lit('#1a1511',.6));socket.position.copy(at);skull.add(socket);
  const iris=mesh(new T.SphereGeometry(.053,10,8),lit(p.iris,.34));iris.position.copy(at).addScaledVector(out,.028);skull.add(iris);
  const pupil=mesh(new T.SphereGeometry(.027,8,6),lit('#0a0806',.4));pupil.position.copy(at).addScaledVector(out,.044);skull.add(pupil);
  const glint=mesh(new T.SphereGeometry(.013,6,5),new T.MeshBasicMaterial({color:'#ffffff'}),false);glint.position.copy(at).addScaledVector(out,.048).add(new T.Vector3(side*.022,.028,0));skull.add(glint);
  const hinge=new T.Group();hinge.position.set(side*.19,.15,.01);hinge.rotation.z=side*p.earTilt;hinge.rotation.x=-.2;skull.add(hinge);
  const pinna=p.ear==='pointed'?mesh(new T.ConeGeometry(.5,1,8),fur):mesh(new T.SphereGeometry(.5,12,9),fur);
  const lining=p.ear==='pointed'?mesh(new T.ConeGeometry(.5,1,7),innerMaterial):mesh(new T.SphereGeometry(.5,10,8),innerMaterial);
  if(p.ear==='tall'){pinna.scale.set(.17,p.earSize,.08);lining.scale.set(.1,p.earSize*.8,.05)}
  else if(p.ear==='pointed'){pinna.scale.set(.3,p.earSize,.18);lining.scale.set(.19,p.earSize*.76,.12)}
  else{pinna.scale.set(p.earSize,p.earSize,p.earSize*.36);lining.scale.set(p.earSize*.66,p.earSize*.66,p.earSize*.3)}
  pinna.position.y=p.earSize*(p.ear==='pointed'?.5:.4);lining.position.set(0,pinna.position.y*(p.ear==='pointed'?.92:1),-.045);
  hinge.add(pinna,lining);
  // A tiger's false eye-spot rides on the back of the ear, so it turns with it.
  if(p.earBack){const back=mesh(new T.SphereGeometry(.5,10,8),lit(p.earBack));back.scale.set(p.earSize*.9,p.earSize*.9,p.earSize*.2);back.position.set(0,pinna.position.y,.05);hinge.add(back);
   const spot=mesh(new T.SphereGeometry(.5,10,8),lit('#f7f2e9'));spot.scale.set(p.earSize*.3,p.earSize*.3,p.earSize*.16);spot.position.set(0,pinna.position.y,.07);hinge.add(spot)}
  if(p.whiskers)for(let w=0;w<3;w++)skull.add(bone(new T.Vector3(side*p.snoutWidth*.72,-.13-p.snout*.24,-.2-p.snout*.72),new T.Vector3(side*(.26+w*.05),-.08-p.snout*.24+w*.04,-.3-p.snout*.78),.007,.003,lit('#efe9dc',.5),4));}
 return skull}
function tailChain(parent:T.Object3D,root:T.Vector3,length:number,radius:number,droop:number,material:T.Material|T.Material[],taper=.72,segments=6){let last=root.clone();
 for(let i=0;i<segments;i++){const t=(i+1)/segments,next=new T.Vector3(root.x,root.y-droop*t*t*length,root.z+t*length);
  parent.add(bone(last,next,radius*(1-i/segments*taper),radius*(1-t*taper),Array.isArray(material)?material[i%material.length]:material,7));last=next}
 return last}
function quadruped(p:Pelt){const g=new T.Group();
 const hide=new T.MeshStandardMaterial({vertexColors:true,roughness:.93,emissive:selfLit(p.belly,.045)});
 const fur=lit(p.coat,.93),sock=lit(p.sock??p.coat,.93),footMaterial=lit(p.foot,.66),innerMaterial=lit(p.inner,.9),muzzleMaterial=lit(p.muzzle,.9);
 g.add(mesh(beastTorso(p),hide));
 const rootY=-.16*p.depth;
 const fore:[number,number][]=[[0,0],[.05,-.34],[-.05,-.7],[0,-.94]],hind:[number,number][]=[[0,0],[-.12,-.3],[.14,-.62],[.01,-.9]];
 for(const side of[-1,1]){
  limb(g,side*p.girth*.3,rootY,-.5,p.leg,p.legGirth,fore,fur,sock,footMaterial,p.hoofed);
  limb(g,side*p.girth*.32,rootY,.5,p.leg,p.legGirth*1.1,hind,fur,sock,footMaterial,p.hoofed);
  const haunch=mesh(new T.SphereGeometry(.5,12,10),fur);haunch.scale.set(p.girth*.38,p.depth*.5,p.depth*.58);haunch.position.set(side*p.girth*.28,rootY+.1,.5);g.add(haunch);
  const shoulder=mesh(new T.SphereGeometry(.5,12,10),fur);shoulder.scale.set(p.girth*.32,p.depth*.42,p.depth*.48);shoulder.position.set(side*p.girth*.27,rootY+.12,-.5);g.add(shoulder)}
 const neckBase=new T.Vector3(0,.06*p.depth,-.6),neckTop=new T.Vector3(0,.06*p.depth+p.neck*.86,-.6-p.neck*.5);
 g.add(bone(neckBase,neckTop,p.girth*.36,p.girth*.26,fur,10));
 const skull=beastHead(p,fur,muzzleMaterial,innerMaterial);skull.position.copy(neckTop);skull.rotation.x=p.neckTilt;skull.scale.setScalar(p.head);g.add(skull);
 return{group:g,skull,fur,footMaterial,rump:new T.Vector3(0,.2*p.depth,.86)}}
// Antlers carried by a mature buck: a beam sweeping up and back with tines off the top.
function rack(skull:T.Object3D,side:number,material:T.Material){const beam=[new T.Vector3(side*.12,.22,.04),new T.Vector3(side*.26,.46,.02),new T.Vector3(side*.34,.64,-.2),new T.Vector3(side*.3,.72,-.54)];
 const pedicle=mesh(new T.SphereGeometry(.062,9,7),material);pedicle.position.copy(beam[0]);skull.add(pedicle);
 for(let i=0;i<3;i++)skull.add(bone(beam[i],beam[i+1],.056-i*.011,.045-i*.011,material,7));
 // Tines rise off the top of the beam and hook forward, the way a buck's rack does.
 for(const[at,rise,reach]of[[beam[1],.28,-.1],[beam[2],.32,-.16],[beam[3],.2,-.12]]as[T.Vector3,number,number][]){
  const tip=at.clone().add(new T.Vector3(side*.03,rise,reach*.35)),curl=tip.clone().add(new T.Vector3(side*.01,rise*.3,reach));
  skull.add(bone(at,tip,.034,.022,material,6),bone(tip,curl,.022,.009,material,6))}}
function deer(){const{group,skull,fur}=quadruped({coat:'#a8703c',belly:'#efe6d6',muzzle:'#f2ece0',nose:'#2a2320',iris:'#20180f',foot:'#241c16',inner:'#d9c4ae',
 girth:.78,depth:.92,head:.8,neck:.62,neckTilt:-.1,leg:.95,legGirth:.06,hoofed:true,ear:'tall',earSize:.54,earTilt:.62,eyeSet:.92,snout:.34,snoutWidth:.115});
 const antlerMaterial=lit('#9c8258',.7);for(const side of[-1,1])rack(skull,side,antlerMaterial);
 // The name is the field mark: brown above, a white fan underneath.
 const swish=new T.Group();swish.position.set(0,.26,.86);swish.rotation.x=-.45;group.add(swish);
 const flag=mesh(new T.SphereGeometry(.5,14,10),fur);flag.scale.set(.2,.42,.1);flag.position.y=-.16;swish.add(flag);
 const underside=mesh(new T.SphereGeometry(.5,14,10),lit('#f7f3ea'));underside.scale.set(.19,.4,.09);underside.position.set(0,-.17,.035);swish.add(underside);
 wingBeats.push({pivot:swish,axis:'y',rest:0,amp:.22,speed:1.1,phase:random()*Math.PI*2});
 group.scale.setScalar(1.12);return group}
function fox(){const{group,skull,fur}=quadruped({coat:'#c9622c',belly:'#f4efe6',muzzle:'#f3ede3',nose:'#231b17',iris:'#c08a2e',foot:'#241b15',inner:'#e8c9b4',sock:'#2e221b',
 girth:.66,depth:.74,head:1.02,neck:.28,neckTilt:-.04,leg:.68,legGirth:.05,hoofed:false,ear:'pointed',earSize:.4,earTilt:.28,eyeSet:.5,snout:.4,snoutWidth:.085,whiskers:true});
 const cheek=mesh(new T.SphereGeometry(.5,12,9),lit('#f4efe6'));cheek.scale.set(.34,.2,.3);cheek.position.set(0,-.16,-.3);skull.add(cheek);
 const brush=new T.Group();group.add(brush);
 const tip=tailChain(brush,new T.Vector3(0,.06,.84),1,.26,.5,fur,.3,6);
 const white=mesh(new T.SphereGeometry(.5,12,9),lit('#f7f2e8'));white.scale.setScalar(.34);white.position.copy(tip);brush.add(white);
 wingBeats.push({pivot:brush,axis:'y',rest:0,amp:.13,speed:.8,phase:random()*Math.PI*2});
 group.scale.setScalar(.72);return group}
function rabbit(){const{group,skull}=quadruped({coat:'#9a8a73',belly:'#f2ece0',muzzle:'#d8cdb9',nose:'#c98f90',iris:'#241a14',foot:'#8a7c68',inner:'#e0b5ae',
 girth:.95,depth:1,head:.92,neck:.08,neckTilt:.34,leg:.34,legGirth:.05,hoofed:false,ear:'tall',earSize:.68,earTilt:.2,eyeSet:1,snout:.15,snoutWidth:.085,whiskers:true});
 const nape=mesh(new T.SphereGeometry(.5,12,9),lit('#a8663f'));nape.scale.set(.3,.2,.26);nape.position.set(0,.16,.1);skull.add(nape);
 const puff=mesh(new T.SphereGeometry(.19,12,10),lit('#f8f4ea'));puff.position.set(0,.22,.9);group.add(puff);
 group.scale.setScalar(.62);return group}
// ── River life ───────────────────────────────────────────────────────────────
// One rounded membrane, scaled and turned into every fin below.
const finGeometry=(()=>{const s=new T.Shape();s.moveTo(-.5,0);s.bezierCurveTo(-.54,.46,-.42,.9,-.16,1);s.quadraticCurveTo(0,1.05,.16,1);s.bezierCurveTo(.42,.9,.54,.46,.5,0);s.closePath();return new T.ShapeGeometry(s,12)})();
function fin(material:T.Material,width:number,reach:number,rotation:[number,number,number,T.EulerOrder],position:[number,number,number]){const f=new T.Mesh(finGeometry,material);f.scale.set(width,reach,1);f.rotation.set(...rotation);f.position.set(...position);f.receiveShadow=true;return f}
function painted(size:number,draw:(context:CanvasRenderingContext2D)=>void){const canvas=document.createElement('canvas');canvas.width=canvas.height=size;draw(canvas.getContext('2d')!);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;return texture}
// Brook trout. A lathe's u wraps the body (0 = belly, .5 = spine) and v runs nose to
// tail, so the whole pattern can be painted in one canvas.
function fish(){const g=new T.Group();
 const hide=painted(256,c=>{const grad=c.createLinearGradient(0,0,256,0);
  for(const[stop,color]of[[0,'#cf5f2b'],[.13,'#dd9c58'],[.28,'#8f8a52'],[.5,'#3a4f2f'],[.72,'#8f8a52'],[.87,'#dd9c58'],[1,'#cf5f2b']]as[number,string][])grad.addColorStop(stop,color);
  c.fillStyle=grad;c.fillRect(0,0,256,256);
  c.strokeStyle='#d8debb';c.lineWidth=3.4;c.lineCap='round';
  for(let i=0;i<30;i++){let x=112+range(-16,16);const y=range(0,256);c.beginPath();c.moveTo(x,y);for(let s=1;s<6;s++){x+=range(-13,13);c.lineTo(x,y+s*4.5)}c.stroke()}
  // Red spots ringed in blue: the mark no other trout in this river carries.
  for(let i=0;i<34;i++){const x=(random()>.5?58:198)+range(-24,24),y=range(6,250);
   c.fillStyle='#86adcf';c.beginPath();c.arc(x,y,5.4,0,6.29);c.fill();
   c.fillStyle='#cf4529';c.beginPath();c.arc(x,y,2.5,0,6.29);c.fill()}});
 const profile:[number,number][]=[[.002,-1.02],[.1,-.94],[.19,-.76],[.26,-.48],[.29,-.12],[.275,.22],[.22,.52],[.14,.76],[.08,.9],[.055,1]];
 const body=new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),26);body.rotateX(Math.PI/2);body.scale(.52,1,1);body.computeVertexNormals();
 g.add(mesh(body,new T.MeshStandardMaterial({map:hide,roughness:.3,metalness:.18,emissive:selfLit('#6b6a46',.18)})));
 const finMaterial=new T.MeshStandardMaterial({color:'#c2662f',roughness:.5,emissive:selfLit('#c2662f',.2),side:T.DoubleSide});
 const edged=new T.MeshStandardMaterial({color:'#f2e7d4',roughness:.5,emissive:selfLit('#f2e7d4',.2),side:T.DoubleSide});
 const sway=new T.Group();sway.position.z=.88;g.add(sway);
 // Squaretail: the blunt caudal fin that gives the brook trout its other name.
 sway.add(fin(finMaterial,.46,.3,[Math.PI/2,-Math.PI/2,0,'XYZ'],[0,0,.04]));
 wingBeats.push({pivot:sway,axis:'y',rest:0,amp:.3,speed:2.6,phase:random()*Math.PI*2});
 g.add(fin(finMaterial,.32,.19,[0,-Math.PI/2,0,'XYZ'],[0,.24,-.04]));
 const adipose=mesh(new T.SphereGeometry(.5,8,6),finMaterial);adipose.scale.set(.04,.1,.16);adipose.position.set(0,.22,.6);g.add(adipose);
 g.add(fin(finMaterial,.2,.15,[Math.PI,-Math.PI/2,0,'XYZ'],[0,-.2,.46]));
 for(const side of[-1,1]){
  g.add(fin(edged,.22,.26,[Math.PI/2,side*1.15,0,'YXZ'],[side*.13,-.14,-.46]));
  g.add(fin(edged,.17,.19,[Math.PI/2,side*1,0,'YXZ'],[side*.1,-.2,.14]))}
 const gill=mesh(new T.TorusGeometry(.2,.014,5,14),lit('#5c5236',.5),false);gill.scale.set(1,1.1,1);gill.position.set(0,-.02,-.62);g.add(gill);
 for(const side of[-1,1]){const eye=mesh(new T.SphereGeometry(.072,10,8),lit('#e3d49a',.3));eye.position.set(side*.14,.1,-.8);g.add(eye);
  const pupil=mesh(new T.SphereGeometry(.04,8,6),lit('#12100c',.4));pupil.position.set(side*.16,.1,-.83);g.add(pupil)}
 return g}
function turtle(){const g=new T.Group();
 const shellMaterial=lit('#4e6b3c',.85),scuteMaterial=lit('#628550',.8),skinMaterial=lit('#6f8f5e',.88);
 const carapace=mesh(new T.SphereGeometry(.5,22,16),shellMaterial);carapace.scale.set(1.5,.82,1.9);carapace.position.y=.1;g.add(carapace);
 // Vertebral scutes down the spine with costal scutes either side, as a real shell is plated.
 for(let i=0;i<5;i++){const t=(i/4-.5)*1.34,vert=mesh(new T.CylinderGeometry(.15,.17,.05,6),scuteMaterial);vert.position.set(0,.5-t*t*.3,t);vert.rotation.y=Math.PI/6;g.add(vert);
  for(const side of[-1,1]){if(i>3)continue;const costal=mesh(new T.CylinderGeometry(.14,.16,.05,6),scuteMaterial);costal.position.set(side*(.42-t*t*.12),.36-t*t*.34,t+.17);costal.rotation.set(0,Math.PI/6,side*.62);g.add(costal)}}
 const rim=mesh(new T.TorusGeometry(.78,.06,7,26),shellMaterial);rim.rotation.x=Math.PI/2;rim.scale.set(.94,1.2,1);rim.position.y=.02;g.add(rim);
 const plastron=mesh(new T.SphereGeometry(.5,18,12),lit('#d8c98c',.86));plastron.scale.set(1.28,.3,1.68);plastron.position.y=-.14;g.add(plastron);
 const neck=bone(new T.Vector3(0,.04,-.7),new T.Vector3(0,.12,-1.02),.11,.09,skinMaterial);g.add(neck);
 const head=mesh(new T.SphereGeometry(.5,14,11),skinMaterial);head.scale.set(.3,.26,.4);head.position.set(0,.13,-1.16);g.add(head);
 const beak=mesh(new T.SphereGeometry(.5,10,8),lit('#c6b478',.7));beak.scale.set(.15,.1,.1);beak.position.set(0,.09,-1.33);g.add(beak);
 for(const side of[-1,1]){const eye=mesh(new T.SphereGeometry(.035,8,6),lit('#1a1611',.4));eye.position.set(side*.1,.2,-1.26);g.add(eye);
  // Yellow head and neck striping, the giveaway of a basking river turtle.
  for(let s=0;s<3;s++){const stripe=mesh(new T.SphereGeometry(.5,8,6),lit('#e2c765',.8));stripe.scale.set(.03,.03,.34);stripe.position.set(side*(.06+s*.05),.19-s*.08,-1.1);g.add(stripe)}}
 for(const side of[-1,1])for(const z of[-.52,.6]){const limb=bone(new T.Vector3(side*.5,-.02,z),new T.Vector3(side*.78,-.2,z+(z<0?-.16:.14)),.1,.08,skinMaterial);g.add(limb);
  const webbed=mesh(new T.SphereGeometry(.5,10,8),skinMaterial);webbed.scale.set(.3,.08,.3);webbed.position.set(side*.88,-.23,z+(z<0?-.22:.2));g.add(webbed);
  for(let claw=0;claw<3;claw++){const nail=mesh(new T.ConeGeometry(.018,.07,5),lit('#d9cfae',.6),false);nail.rotation.x=z<0?-Math.PI/2:Math.PI/2;nail.position.set(side*(.86+claw*.04),-.23,z+(z<0?-.38:.36));g.add(nail)}}
 const tail=mesh(new T.ConeGeometry(.07,.3,7),skinMaterial);tail.rotation.x=-Math.PI/2;tail.position.set(0,-.02,.94);g.add(tail);
 return g}
// Ocellate river stingray: a round disc, eyes and spiracles on top, ringed spots,
// and a whip tail. The disc margins ripple, which is how a ray actually swims.
function ray(){const g=new T.Group();
 const skinMaterial=lit('#375441',.9),paleMaterial=lit('#b9ae90',.9);
 const core=mesh(new T.SphereGeometry(.5,20,14),skinMaterial);core.scale.set(1.1,.34,1.7);g.add(core);
 for(const side of[-1,1]){const flap=new T.Group();g.add(flap);
  const disc=new T.Shape();disc.moveTo(0,-.8);disc.bezierCurveTo(side*.8,-.75,side*1.25,-.2,side*1.15,.35);disc.bezierCurveTo(side*1,.8,side*.4,.95,0,.9);disc.closePath();
  const wing=new T.ExtrudeGeometry(disc,{depth:.1,bevelEnabled:false,curveSegments:14});wing.rotateX(Math.PI/2);wing.translate(0,.05,0);
  countershade(wing,'#b9ae90','#2f4a38',-.02,.03);
  const plate=mesh(wing,new T.MeshStandardMaterial({vertexColors:true,roughness:.9,emissive:selfLit('#46573f',.12)}));flap.add(plate);
  for(let i=0;i<5;i++){const at=new T.Vector3(side*range(.45,1),.048,range(-.6,.7));
   const ring=mesh(new T.TorusGeometry(.12,.024,6,16),lit('#c4b070',.8),false);ring.rotation.x=Math.PI/2;ring.scale.y=.35;ring.position.copy(at);flap.add(ring);
   const pip=mesh(new T.SphereGeometry(.5,8,6),lit('#22362a',.8));pip.scale.set(.13,.02,.13);pip.position.copy(at);flap.add(pip)}
  wingBeats.push({pivot:flap,rest:0,amp:side*.22,speed:1.5,phase:random()*Math.PI*2});
  const eye=mesh(new T.SphereGeometry(.055,8,6),lit('#2a2118',.4));eye.position.set(side*.16,.17,-.5);g.add(eye);
  const spiracle=mesh(new T.SphereGeometry(.5,8,6),lit('#35503c',.8));spiracle.scale.set(.11,.04,.13);spiracle.position.set(side*.18,.16,-.33);g.add(spiracle);
  for(let s=0;s<4;s++){const slit=mesh(new T.BoxGeometry(.07,.01,.022),paleMaterial,false);slit.position.set(side*(.13+s*.06),-.15,-.14+s*.05);g.add(slit)}}
 const mouth=mesh(new T.BoxGeometry(.28,.02,.05),paleMaterial,false);mouth.position.set(0,-.15,-.42);g.add(mouth);
 const whip=new T.Group();g.add(whip);
 tailChain(whip,new T.Vector3(0,.05,.8),1.9,.075,.05,skinMaterial,.9,7);
 const barb=mesh(new T.ConeGeometry(.045,.28,6),lit('#d9cfae',.55));barb.rotation.x=-Math.PI/2;barb.position.set(0,.04,1.5);whip.add(barb);
 wingBeats.push({pivot:whip,axis:'y',rest:0,amp:.16,speed:1.1,phase:random()*Math.PI*2});
 return g}
// Birds are built from one shared vane: a tapered feather rooted at the origin,
// pointing +Y, so a whole wing costs a single geometry and only scale/rotation.
const featherGeometry=(()=>{const s=new T.Shape();s.moveTo(0,0);s.bezierCurveTo(.15,.08,.22,.45,.13,.9);s.quadraticCurveTo(.06,1.02,-.01,1);s.bezierCurveTo(-.11,.58,-.13,.2,0,0);return new T.ShapeGeometry(s,12)})();
const plume=(color:T.ColorRepresentation,roughness=.78,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness,emissive:selfLit(color),side:T.DoubleSide});
// Returns a placed copy rather than a mesh: a wing is hundreds of vanes, so they are
// merged per material into one draw call instead of one each.
// sweep fans the vane outboard across the wing, lift curls its tip upward.
function feather(x:number,y:number,z:number,length:number,width:number,sweep:number,lift=0){const placement=new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(Math.PI/2-lift,sweep,0,'YXZ')),new T.Vector3(width,length,1));return featherGeometry.clone().applyMatrix4(placement)}
function plumeMesh(vanes:T.BufferGeometry[],material:T.Material){const merged=mesh(mergeGeometries(vanes),material,false);vanes.forEach(v=>v.dispose());return merged}
function birdTorso(belly:string,back:string,girth:number){const profile:[number,number][]=[[.002,-.74],[.13,-.7],[.23,-.6],[.3,-.44],[.345,-.2],[.355,.05],[.33,.3],[.275,.52],[.19,.72],[.095,.87],[.002,.96]];const geometry=new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),24);geometry.rotateX(Math.PI/2);geometry.scale(.88*girth,girth,1);geometry.computeVertexNormals();return countershade(geometry,belly,back,-.06*girth,.15*girth)}
// The inner wing is solid flesh and coverts; only the trailing half is loose feathers.
// Without this slab the wing disappears whenever it is seen edge-on.
function wingPlate(side:number,span:number,chord:number,thickness:number,tipChord:number){const s=new T.Shape();s.moveTo(0,-chord*.12);s.quadraticCurveTo(side*span*.36,-chord*.16,side*span*.66,-chord*.04);s.lineTo(side*span*.62,tipChord);s.quadraticCurveTo(side*span*.3,chord*.5,0,chord*.46);s.closePath();const geometry=new T.ExtrudeGeometry(s,{depth:thickness,bevelEnabled:false,curveSegments:10});geometry.rotateX(Math.PI/2);geometry.translate(0,thickness/2,0);return geometry}
function tailPlate(length:number,spread:number,fork:number,thickness:number){const s=new T.Shape();s.moveTo(0,0);for(let i=0;i<=12;i++){const t=i/6-1,reach=length*(1-fork+fork*Math.pow(Math.abs(t),1.5))*.62;s.lineTo(Math.sin(t*spread)*reach,Math.cos(t*spread)*reach)}s.closePath();const geometry=new T.ExtrudeGeometry(s,{depth:thickness,bevelEnabled:false});geometry.rotateX(Math.PI/2);geometry.translate(0,thickness/2,0);return geometry}
type Plumage={mantle:string;belly:string;throat:string;hood:string;flight:string;underwing:string;tail:string;beak:string;iris:string;leg:string;face:'raptor'|'passerine'|'disc';disc?:string;discRim?:string;gloss?:boolean;scale:number;girth:number;head:number;span:number;chord:number;primaries:number;secondaries:number;rectrices:number;tailLength:number;fork:number;spread:number;dihedral:number;flapAmp:number;flapSpeed:number};
function bird(p:Plumage){const g=new T.Group(),phase=random()*Math.PI*2,owlFace=p.face==='disc',pointed=p.face==='passerine';
 const bodyMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:p.gloss?.34:.82,metalness:p.gloss?.4:0,emissive:selfLit(p.belly,.13)});
 const flightPlume=plume(p.flight,p.gloss?.4:.7,p.gloss?.32:0),covertPlume=plume(p.mantle,.8,p.gloss?.28:0),underPlume=plume(p.underwing,.86),tailPlume=plume(p.tail,.74,p.gloss?.28:0);
 const beakMaterial=new T.MeshStandardMaterial({color:p.beak,roughness:.3,metalness:.14});
 const torso=mesh(birdTorso(p.belly,p.mantle,p.girth),bodyMaterial);torso.userData.silhouette=true;g.add(torso);
 const neck=mesh(new T.CylinderGeometry(.21*p.head,.3,.4,12),lit(p.hood));neck.rotation.x=.5;neck.position.set(0,.11,-.66);g.add(neck);
 // Everything from the shoulders forward scales together: an owl's skull dwarfs a swallow's.
 const skull=new T.Group();skull.position.set(0,.22,-1);skull.scale.setScalar(p.head);g.add(skull);
 const head=mesh(new T.SphereGeometry(.27,18,14),lit(p.hood));head.scale.set(.94,.96,owlFace?.94:1.04);skull.add(head);
 const throat=mesh(new T.SphereGeometry(.2,12,10),lit(p.throat));throat.scale.set(.92,.62,.86);throat.position.set(0,-.18,-.02);skull.add(throat);
 if(owlFace){const discMaterial=lit(p.disc!,.92),rimMaterial=mat(p.discRim!,.85);
  const face=mesh(new T.SphereGeometry(.26,16,12),discMaterial);face.scale.set(1.1,1.12,.4);face.position.set(0,.01,-.15);skull.add(face);
  for(const side of[-1,1]){const cup=mesh(new T.SphereGeometry(.185,14,10),discMaterial);cup.scale.set(1,1.12,.46);cup.position.set(side*.125,.02,-.22);skull.add(cup);
   for(let r=0;r<2;r++){const ring=mesh(new T.TorusGeometry(.088+r*.058,.012,6,18),rimMaterial,false);ring.position.set(side*.125,.02,-.29+r*.013);skull.add(ring)}
   const eye=mesh(new T.SphereGeometry(.072,12,10),lit(p.iris));eye.position.set(side*.125,.03,-.28);skull.add(eye);
   const glint=mesh(new T.SphereGeometry(.017,6,5),new T.MeshBasicMaterial({color:'#f6fbff'}),false);glint.position.set(side*.15,.06,-.33);skull.add(glint)}
  const bill=mesh(new T.ConeGeometry(.058,.22,8),beakMaterial);bill.rotation.x=-Math.PI/2-.55;bill.position.set(0,-.08,-.27);skull.add(bill);
 }else{for(const side of[-1,1]){const socket=sphere(.095,'#171310',10,8);socket.position.set(side*.165,.07,-.13);skull.add(socket);
   const eye=mesh(new T.SphereGeometry(.075,10,8),lit(p.iris));eye.position.set(side*.175,.07,-.16);skull.add(eye);
   const pupil=sphere(.036,'#0a0907',8,6);pupil.position.set(side*.185,.068,-.21);skull.add(pupil);
   const glint=mesh(new T.SphereGeometry(.015,6,5),new T.MeshBasicMaterial({color:'#ffffff'}),false);glint.position.set(side*.205,.1,-.21);skull.add(glint);
   // The heavy supraorbital brow is what gives a raptor its fixed glare.
   if(!pointed){const brow=sphere(.115,p.mantle,12,8);brow.scale.set(.9,.3,.8);brow.position.set(side*.175,.14,-.13);brow.rotation.z=side*.28;brow.rotation.y=side*.25;skull.add(brow)}}
  if(pointed){const upper=mesh(new T.ConeGeometry(.085,.28,8),beakMaterial);upper.rotation.x=-Math.PI/2+.06;upper.scale.set(1.5,1,.55);upper.position.set(0,-.02,-.36);skull.add(upper);
   const lower=mesh(new T.ConeGeometry(.06,.2,7),beakMaterial);lower.rotation.x=-Math.PI/2;lower.scale.set(1.4,1,.5);lower.position.set(0,-.075,-.31);skull.add(lower);
  }else{const cere=sphere(.125,p.beak,12,8);cere.scale.set(.9,.85,.7);cere.position.set(0,.03,-.17);skull.add(cere);
   const upper=mesh(new T.ConeGeometry(.115,.42,10),beakMaterial);upper.rotation.x=-Math.PI/2+.1;upper.position.set(0,-.01,-.37);skull.add(upper);
   const hook=mesh(new T.ConeGeometry(.072,.24,8),beakMaterial);hook.rotation.x=-Math.PI/2-.75;hook.position.set(0,-.1,-.5);skull.add(hook);
   const lower=mesh(new T.ConeGeometry(.075,.3,8),beakMaterial);lower.rotation.x=-Math.PI/2+.04;lower.scale.set(1,1,.8);lower.position.set(0,-.105,-.31);skull.add(lower)}}
 const wrist=p.span*.46,handLength=p.span-wrist,bone=Math.max(.045,p.chord*.13),vane=p.chord*.13,lip=vane*.5+.014;
 for(const side of[-1,1]){const wing=new T.Group();wing.position.set(side*.2,.16,-.26);g.add(wing);
  const plate=wingPlate(side,p.span,p.chord,vane,pointed?p.chord*.1:p.chord*.3);
  countershade(plate,p.underwing,p.mantle,-vane*.2,vane*.2);
  const slab=mesh(plate,new T.MeshStandardMaterial({vertexColors:true,roughness:p.gloss?.4:.8,metalness:p.gloss?.3:0,emissive:selfLit(p.underwing,.13)}));slab.position.z=.04;slab.userData.silhouette=true;wing.add(slab);
  const shoulder=sphere(bone*1.7,p.mantle,14,10);shoulder.scale.set(1.25,.62,1.2);shoulder.position.set(side*.06,0,.08);wing.add(shoulder);
  const arm=cylinder(bone*.68,bone,wrist*1.04,p.mantle,9);arm.rotation.z=-side*Math.PI/2;arm.position.set(side*wrist*.52,0,-.06);wing.add(arm);
  // The hand is swept back from the wrist; its feathers are baked through this transform.
  const hand=new T.Matrix4().makeRotationY(-side*.24).setPosition(side*wrist,0,.02);
  const flightVanes:T.BufferGeometry[]=[],covertVanes:T.BufferGeometry[]=[],underVanes:T.BufferGeometry[]=[];
  // Secondaries trail off the forearm, with covert rows lapped over their roots above and below.
  for(let i=0;i<p.secondaries;i++){const t=i/(p.secondaries-1),x=side*(.14+t*(wrist-.14));
   flightVanes.push(feather(x,0,.08,p.chord*(.66+.32*t),p.chord*(.9-.16*t),side*(-.16+.36*t),.02+.06*t));
   covertVanes.push(feather(x,lip,-.02,p.chord*(.3+.18*t),p.chord*.7,side*(-.12+.3*t),.05));
   if(i%2===0)underVanes.push(feather(x,-lip,-.01,p.chord*(.28+.16*t),p.chord*.78,side*(-.12+.3*t),-.04))}
  // Primaries fan from the wrist; a raptor's outer ones splay and curl into fingers.
  for(let i=0;i<p.primaries;i++){const t=i/(p.primaries-1),x=side*(.03+t*handLength);
   flightVanes.push(feather(x,pointed?.05*t:.17*t*t,.05,p.chord*(pointed?1.16-.5*t:1.02-.34*t*t),p.chord*(.86-.38*t),side*(.26+.66*t),pointed?.04+.12*t:.05+.5*t*t).applyMatrix4(hand));
   if(t<.62)covertVanes.push(feather(x,lip,-.03,p.chord*(.3-.12*t),p.chord*.55,side*(.22+.4*t),.06).applyMatrix4(hand))}
  for(let a=0;a<2;a++)covertVanes.push(feather(side*(wrist-.04+a*.06),lip,-.14,p.chord*.26,p.chord*.34,side*(.85+a*.25),.1));
  wing.add(plumeMesh(flightVanes,flightPlume),plumeMesh(covertVanes,covertPlume),plumeMesh(underVanes,underPlume));
  wingBeats.push({pivot:wing,rest:side*p.dihedral,amp:side*p.flapAmp,speed:p.flapSpeed,phase})}
 const rump=mesh(new T.SphereGeometry(.19*p.girth,12,10),lit(p.mantle));rump.scale.set(1,.74,1.15);rump.position.set(0,.02,.8);g.add(rump);
 const fan=mesh(tailPlate(p.tailLength,p.spread,p.fork,p.tailLength*.06),lit(p.tail,.76));fan.position.set(0,.01,.84);g.add(fan);
 const rectrices:T.BufferGeometry[]=[];
 for(let i=0;i<p.rectrices;i++){const t=(i/(p.rectrices-1))*2-1;
  rectrices.push(feather(t*.09,.01,.84,p.tailLength*(1-p.fork+p.fork*Math.pow(Math.abs(t),1.5)),p.tailLength*.42,t*p.spread,.02-Math.abs(t)*.03))}
 g.add(plumeMesh(rectrices,tailPlume));
 for(const side of[-1,1]){const thigh=sphere(.13*p.girth,p.belly,10,8);thigh.scale.set(.8,1,1.1);thigh.position.set(side*.14*p.girth,-.18*p.girth,.14);g.add(thigh);
  if(pointed){const foot=sphere(.055,p.leg,8,6);foot.scale.set(.8,.6,1.5);foot.position.set(side*.13,-.27,.3);g.add(foot);continue}
  const tarsus=cylinder(.042,.052,.26,p.leg,7);tarsus.rotation.x=-.9;tarsus.position.set(side*.14,-.3,.28);g.add(tarsus);
  for(let toe=0;toe<3;toe++){const digit=cylinder(.026,.032,.2,p.leg,6);digit.rotation.x=-Math.PI/2-.4;digit.rotation.y=(toe-1)*.42;digit.position.set(side*.14+(toe-1)*.045,-.41,.36);g.add(digit);
   const talon=mesh(new T.ConeGeometry(.022,.09,6),mat('#2a231c'),false);talon.rotation.x=-Math.PI/2-1.1;talon.rotation.y=(toe-1)*.42;talon.position.set(side*.14+(toe-1)*.05,-.46,.28);g.add(talon)}}
 // The body and wing slabs already draw the whole silhouette, so the eyes, bill and
 // talons stay out of the shadow pass.
 g.traverse(o=>{const m=o as T.Mesh;if(m.isMesh)m.castShadow=m.userData.silhouette===true});
 g.scale.setScalar(p.scale);return g}
// Adult bald eagle: white hood and tail, dark body, flat soaring wings with fingered tips.
const eagle=()=>bird({mantle:'#4a3524',belly:'#3d2c1e',throat:'#f6f2e9',hood:'#f6f2e9',flight:'#4b3726',underwing:'#5d4531',tail:'#f8f5ee',beak:'#f0b429',iris:'#f3de92',leg:'#eeb02f',face:'raptor',scale:.82,girth:1,head:1,span:2.2,chord:.95,primaries:10,secondaries:10,rectrices:12,tailLength:1,fork:0,spread:.32,dihedral:.03,flapAmp:.17,flapSpeed:1.5});
// Tree swallow: glossy blue-green above, clean white below, pointed wings, notched tail.
const swallow=()=>bird({mantle:'#2a7fa6',belly:'#fbfcfa',throat:'#fbfcfa',hood:'#2a7fa6',flight:'#33495a',underwing:'#cdd7dc',tail:'#33495a',beak:'#1b2126',iris:'#14181b',leg:'#3b3937',face:'passerine',gloss:true,scale:.62,girth:.64,head:.86,span:1.6,chord:.5,primaries:9,secondaries:6,rectrices:8,tailLength:.8,fork:.45,spread:.34,dihedral:.1,flapAmp:.6,flapSpeed:7.4});
function butterfly(){const g=new T.Group(),phase=random()*Math.PI*2;const body=cylinder(.06,.08,.65,'#2c211b',8);body.rotation.x=Math.PI/2;g.add(body);
 for(const side of[-1,1]){const hinge=new T.Group();hinge.position.y=.03;g.add(hinge);
  const fore=sphere(.34,side<0?'#e5903c':'#efb24c',12,8);fore.scale.set(1.15,.1,.85);fore.position.set(side*.36,0,-.16);hinge.add(fore);
  const hind=sphere(.26,'#e08a35',10,8);hind.scale.set(1,.1,.9);hind.position.set(side*.3,0,.22);hinge.add(hind);
  const spot=sphere(.07,'#2c211b',8,6);spot.scale.set(.9,.3,.6);spot.position.set(side*.62,.02,-.24);hinge.add(spot);
  wingBeats.push({pivot:hinge,rest:0,amp:side*.8,speed:9,phase})}
 for(const side of[-1,1]){const antenna=cylinder(.008,.008,.3,'#2c211b',4);antenna.position.set(side*.05,.12,-.32);antenna.rotation.x=-.5;antenna.rotation.z=side*.3;g.add(antenna)}return g}
function tiger(){const{group,skull,fur}=quadruped({coat:'#dd8228',belly:'#f7f2e9',muzzle:'#f7f2e9',nose:'#a05e56',iris:'#c9a13a',foot:'#d98f3c',inner:'#f0d4c8',sock:'#dd8228',stripe:'#241c16',stripes:26,
 girth:1.05,depth:1,head:1.24,neck:.3,neckTilt:.04,leg:.82,legGirth:.095,hoofed:false,ear:'round',earSize:.21,earTilt:.42,earBack:'#241c16',eyeSet:.26,snout:.24,snoutWidth:.16,whiskers:true});
 // Pale brow flashes above the eyes, the other mark that reads at a distance.
 for(const side of[-1,1]){const brow=mesh(new T.SphereGeometry(.5,10,8),lit('#f2ebe0'));brow.scale.set(.15,.07,.1);brow.position.set(side*.16,.16,-.22);skull.add(brow)}
 const swish=new T.Group();group.add(swish);
 const dark=lit('#241c16',.93);
 const tip=tailChain(swish,new T.Vector3(0,.22,.86),1.5,.13,.28,[fur,dark],.4,8);
 const black=mesh(new T.SphereGeometry(.5,10,8),dark);black.scale.setScalar(.15);black.position.copy(tip);swish.add(black);
 wingBeats.push({pivot:swish,axis:'y',rest:0,amp:.2,speed:.7,phase:random()*Math.PI*2});
 group.scale.setScalar(1.05);return group}
function frog(){const g=new T.Group();
 const skinMaterial=lit('#5d9b48',.86),limbMaterial=lit('#558f42',.86),paleMaterial=lit('#e6dc9a',.85);
 const hide=new T.SphereGeometry(.5,20,14);hide.scale(.86,.6,1.1);countershade(hide,'#dcd79a','#5d9b48',-.16,.02);
 g.add(mesh(hide,new T.MeshStandardMaterial({vertexColors:true,roughness:.84,emissive:selfLit('#5d9b48',.12)})));
 const snout=mesh(new T.SphereGeometry(.5,14,10),skinMaterial);snout.scale.set(.52,.3,.34);snout.position.set(0,0,-.5);g.add(snout);
 const lip=mesh(new T.SphereGeometry(.5,14,8),lit('#3a4430',.85));lip.scale.set(.56,.03,.34);lip.position.set(0,-.11,-.44);g.add(lip);
 const throat=mesh(new T.SphereGeometry(.5,12,9),paleMaterial);throat.scale.set(.42,.16,.34);throat.position.set(0,-.17,-.4);g.add(throat);
 for(let i=0;i<7;i++){const blotch=mesh(new T.SphereGeometry(.5,8,6),lit('#3f6b33',.88));blotch.scale.set(range(.1,.2),.04,range(.1,.22));blotch.position.set(range(-.3,.3),.28-range(0,.04),range(-.3,.5));g.add(blotch)}
 for(const side of[-1,1]){
  // A green frog's dorsolateral ridges are what separate it from a bullfrog.
  const ridge=mesh(new T.SphereGeometry(.5,10,8),lit('#7cb45a',.84));ridge.scale.set(.06,.06,.95);ridge.position.set(side*.33,.2,.12);g.add(ridge);
  const socket=mesh(new T.SphereGeometry(.5,12,9),skinMaterial);socket.scale.setScalar(.26);socket.position.set(side*.23,.24,-.28);g.add(socket);
  const iris=mesh(new T.SphereGeometry(.5,12,9),lit('#d6a636',.3));iris.scale.setScalar(.2);iris.position.set(side*.24,.27,-.32);g.add(iris);
  const pupil=mesh(new T.SphereGeometry(.5,10,8),lit('#100f0a',.4));pupil.scale.set(.13,.05,.05);pupil.position.set(side*.245,.272,-.44);g.add(pupil);
  // Tympanum: the eardrum disc behind the eye, bigger than the eye on a male.
  const drum=mesh(new T.SphereGeometry(.5,12,9),lit('#4c7d3c',.8));drum.scale.set(.06,.28,.28);drum.position.set(side*.37,.16,-.16);g.add(drum);
  const boss=mesh(new T.SphereGeometry(.5,8,6),lit('#8fb56a',.8));boss.scale.set(.025,.045,.045);boss.position.set(side*.4,.16,-.16);g.add(boss);
  // Hind legs folded alongside the body, front legs propping up the chest.
  const hip=new T.Vector3(side*.3,-.12,.3),knee=new T.Vector3(side*.46,.04,-.1),heel=new T.Vector3(side*.42,-.22,.42),toeRoot=new T.Vector3(side*.34,-.3,.02);
  g.add(bone(hip,knee,.14,.11,limbMaterial,7),bone(knee,heel,.11,.08,limbMaterial,7),bone(heel,toeRoot,.08,.06,limbMaterial,7));
  const webbed=mesh(new T.SphereGeometry(.5,10,8),limbMaterial);webbed.scale.set(.2,.04,.3);webbed.position.set(side*.32,-.31,-.12);g.add(webbed);
  for(let toe=0;toe<4;toe++){const digit=mesh(new T.SphereGeometry(.5,7,6),limbMaterial);digit.scale.set(.04,.03,.24);digit.position.set(side*(.24+toe*.06),-.31,-.22);g.add(digit)}
  const shoulder=new T.Vector3(side*.24,-.1,-.36),elbow=new T.Vector3(side*.3,-.26,-.44),wrist=new T.Vector3(side*.26,-.36,-.5);
  g.add(bone(shoulder,elbow,.07,.06,limbMaterial,6),bone(elbow,wrist,.06,.05,limbMaterial,6));
  for(let toe=0;toe<3;toe++){const digit=mesh(new T.SphereGeometry(.5,6,5),limbMaterial);digit.scale.set(.035,.03,.14);digit.position.set(side*(.2+toe*.05),-.37,-.58);g.add(digit)}}
 g.scale.setScalar(.72);return g}
// Barred owl: no ear tufts, dark eyes in a ringed facial disc, broad rounded wings.
function owl(){const g=bird({mantle:'#6f5840',belly:'#e9e0cf',throat:'#ded3be',hood:'#766046',flight:'#8a7154',underwing:'#ddd2bb',tail:'#7d6549',beak:'#e6c25a',iris:'#241a12',leg:'#cdbfa6',face:'disc',disc:'#d9ccb5',discRim:'#5c4730',scale:.85,girth:1.16,head:1.38,span:1.7,chord:.82,primaries:9,secondaries:9,rectrices:12,tailLength:.82,fork:0,spread:.4,dihedral:.06,flapAmp:.38,flapSpeed:3.1});
 for(let i=0;i<3;i++){const bar=sphere(.2,'#6d5236',10,8);bar.scale.set(1.15,.17,.3);bar.position.set(0,-.245-i*.04,-.52+i*.17);g.add(bar)}
 for(let i=0;i<4;i++){const streak=sphere(.16,'#6d5236',8,7);streak.scale.set(.2,.22,1.5);streak.position.set((i-1.5)*.13,-.32,.12);g.add(streak)}return g}
function otter(){const{group,fur,footMaterial}=quadruped({coat:'#6b4a35',belly:'#c9b59b',muzzle:'#d9c8b0',nose:'#2b211b',iris:'#2a1f17',foot:'#5a3f2d',inner:'#4a3527',
 girth:.94,depth:.8,head:.88,neck:.16,neckTilt:0,leg:.3,legGirth:.055,hoofed:false,ear:'round',earSize:.13,earTilt:.2,eyeSet:.42,snout:.2,snoutWidth:.135,whiskers:true});
 // Webbing between the toes and a thick rudder tail: an otter is built for the river.
 for(const side of[-1,1])for(const z of[-.5,.5]){const web=mesh(new T.SphereGeometry(.5,10,8),footMaterial);web.scale.set(.19,.04,.22);web.position.set(side*.29,-.42,z+.07);group.add(web)}
 const rudder=new T.Group();group.add(rudder);
 tailChain(rudder,new T.Vector3(0,.04,.84),1.35,.19,.12,fur,.82,7);
 wingBeats.push({pivot:rudder,axis:'y',rest:0,amp:.26,speed:1.4,phase:random()*Math.PI*2});
 group.scale.setScalar(.9);return group}

type FieldSpec=Omit<FieldObject,'object'|'home'|'phase'|'kind'>&{kind?:'animal'|'plant';position:[number,number,number];make:()=>T.Group};
const creatureSpecs:FieldSpec[]=[
 {name:'White-tailed Deer',icon:'🦌',biome:'woodland',position:grounded(DEER_X,DEER_Z,.96),make:deer,fact:'I browse on leaves and return nutrients to the soil. My alert ears also warn nearby animals when danger enters the forest.',question:'What role does the deer play here?',choices:['It recycles nutrients','It pollinates the river'],answer:0},
 {name:'Red Fox',icon:'🦊',biome:'woodland',position:grounded(10,-5,.5),make:fox,fact:'I keep small-animal populations in balance. A healthy predator can be a sign that many layers of this food web are working.',question:'Why are predators important?',choices:['They balance populations','They stop trees growing'],answer:0},
 {name:'Eastern Cottontail',icon:'🐇',biome:'woodland',position:grounded(-17,12,.3),make:rabbit,fact:'The edge between meadow and forest gives me both food and cover. Connected habitats let me move without crossing dangerous open ground.',question:'What does the rabbit need most?',choices:['Only open pavement','Connected habitat'],answer:1},
 {name:'Brook Trout',icon:'🐟',biome:'underwater',position:[2,-5,-3],make:fish,fact:'I need cold, clean, oxygen-rich water. Shade from streamside trees keeps this river cool enough for me.',question:'How do trees help this fish?',choices:['They warm the river','Their shade cools it'],answer:1},
 {name:'River Turtle',icon:'🐢',biome:'underwater',position:[-2,-8,4],make:turtle,fact:'I travel between water and sunny banks. Logs and stones above the water help me warm my body after a cold swim.',question:'Why does the turtle visit the bank?',choices:['To warm its body','To grow feathers'],answer:0},
 {name:'Freshwater Ray',icon:'RAY',biome:'underwater',position:[6,-7,-9],make:ray,fact:'My flattened body lets me glide close to the river floor, where I find small creatures hidden in the sediment.',question:'Where does the ray search for food?',choices:['Near the river floor','Inside the clouds'],answer:0},
 {name:'Bald Eagle',icon:'🦅',biome:'sky',position:[-3,16,-4],make:eagle,fact:'Rising warm air lets me circle without constant flapping. From high above, I can read the river like a map.',question:'What helps the eagle stay aloft?',choices:['Warm rising air','Cold sinking stones'],answer:0},
 {name:'Tree Swallow',icon:'🐦',biome:'sky',position:[9,12,2],make:swallow,fact:'I catch insects in flight. Wetlands below produce abundant insect life, linking the water directly to the sky.',question:'What connects this bird to the river?',choices:['Aquatic insect life','Underwater acorns'],answer:0},
 {name:'Monarch Butterfly',icon:'🦋',biome:'sky',position:[-10,9,-7],make:butterfly,fact:'I navigate across a continent, but I still depend on small patches of milkweed and nectar flowers along the way.',question:'What makes migration possible?',choices:['Connected flower patches','One enormous tree'],answer:0},
 {name:'Bengal Tiger',icon:'🐅',biome:'woodland',position:grounded(17,8,1.2),make:tiger,fact:'As an apex predator, I influence where prey move and feed. Protecting my habitat also protects countless smaller species that share the same forest.',question:'Why can protecting a tiger help an ecosystem?',choices:['Its habitat shelters many species','Its stripes make trees grow'],answer:0},
 {name:'Green Frog',icon:'🐸',biome:'woodland',position:grounded(5,-1,.45),make:frog,fact:'My permeable skin responds quickly to changes in water quality, so scientists can use amphibians as indicators of ecosystem health.',question:'What can frogs help reveal?',choices:['Water and habitat health','The age of the clouds'],answer:0},
 {name:'Barred Owl',icon:'🦉',biome:'sky',position:[-14,8,5],make:owl,fact:'My soft-edged feathers reduce flight noise, helping me hear and approach prey after sunset.',question:'What is special about the owl’s feathers?',choices:['They make flight quieter','They glow underwater'],answer:0},
 {name:'River Otter',icon:'🦦',biome:'underwater',position:[-2,-3,-8],make:otter,fact:'I need clean waterways with healthy fish populations and sheltered banks. My presence can signal a connected river ecosystem.',question:'What does an otter need?',choices:['Clean, connected waterways','Dry desert dunes'],answer:0},
 {name:'Eastern Hemlock',icon:'🌲',kind:'plant',biome:'woodland',position:rooted(-8,7,1.35),make:()=>tree(0,0,1.35),fact:'My evergreen canopy shades streams throughout the year, helping cold-water species while my branches shelter birds in winter.',question:'How does this tree help the stream?',choices:['It provides cooling shade','It removes all oxygen'],answer:0},
 {name:'Young Pine',icon:'🌱',kind:'plant',biome:'woodland',position:rooted(16,-10,.9),make:()=>tree(0,0,.9),fact:'As I grow, my roots hold soil in place and my needles add organic matter that feeds the forest floor.',question:'What do tree roots help prevent?',choices:['Soil erosion','Moonlight'],answer:0},
];
// A jointed animal is assembled from dozens of small parts, which is dozens of draw
// calls twice over once shadows are on. Everything that never moves relative to its
// parent is merged per material; the pivots that animate are left alone.
function bake<Node extends T.Object3D>(root:Node){const pivots=new Set(wingBeats.map(w=>w.pivot));
 const holdsPivot=(node:T.Object3D)=>{let found=false;node.traverse(c=>{if(pivots.has(c))found=true});return found};
 const units:T.Object3D[]=[root];root.traverse(node=>{if(pivots.has(node))units.push(node)});
 for(const unit of units){unit.updateMatrixWorld(true);
  const inverse=new T.Matrix4().copy(unit.matrixWorld).invert(),buckets=new Map<T.Material,T.BufferGeometry[]>();
  const harvest=(node:T.Object3D)=>{for(const child of node.children){if(holdsPivot(child))continue;
   const m=child as T.Mesh;
   if(m.isMesh){const list=buckets.get(m.material as T.Material)??[];list.push(m.geometry.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,m.matrixWorld)));buckets.set(m.material as T.Material,list)}
   harvest(child)}};
  harvest(unit);
  unit.children.filter(child=>!holdsPivot(child)).forEach(child=>unit.remove(child));
  for(const[material,list]of buckets){unit.add(mesh(mergeGeometries(list),material));list.forEach(g=>g.dispose())}}
 return root}
const creatures:FieldObject[]=creatureSpecs.map((spec,index)=>{const object=bake(spec.make());object.position.fromArray(spec.position);const turn = spec.name==='Red Fox' ? Math.PI/2 : spec.name==='White-tailed Deer' ? -Math.PI*3/4 : 0;object.rotation.y=turn;object.traverse(child=>{child.userData.creature=index});scene.add(object);return{...spec,kind:spec.kind??'animal',object,home:object.position.clone(),phase:random()*Math.PI*2}});
const sceneLights=new Set<T.Object3D>([hemi,sun,fill,rim]);const exampleSceneObjects=scene.children.filter(child=>!sceneLights.has(child));

const discoveries=document.querySelector('#discoveries')!;const RAY_ICON='<svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true"><path d="M16 6c3 4 10 5 14 6-3 3-8 4-11 6l-1 9-2 0-1-9c-3-2-8-3-11-6 4-1 11-2 14-6z" fill="#7fb2c9"/><circle cx="13" cy="13" r="1.2" fill="#173042"/><circle cx="19" cy="13" r="1.2" fill="#173042"/></svg>';
const journalGroups:{biome:Biome;label:string}[]=[{biome:'woodland',label:'Woodland'},{biome:'underwater',label:'River'},{biome:'sky',label:'Sky'}];
const shortName=(name:string)=>name.split(' ').pop()!;
discoveries.innerHTML=journalGroups.map(g=>{const members=creatures.map((c,i)=>({c,i})).filter(({c})=>c.biome===g.biome);return `<div class="journal-group"><div class="journal-group-head"><span>${g.label}</span><span data-group-count="${g.biome}">0 / ${members.length}</span></div><div class="journal-grid">${members.map(({c,i})=>`<button type="button" class="discovery" data-index="${i}" disabled aria-label="Undiscovered ${c.kind==='plant'?'plant':'animal'}" title="Undiscovered"><span class="d-icon">${c.icon==='RAY'?RAY_ICON:c.icon}</span><span class="d-name">???</span></button>`).join('')}</div></div>`}).join('');
function markFound(index:number){const c=creatures[index];const badge=document.querySelector<HTMLButtonElement>(`.discovery[data-index="${index}"]`);if(badge){badge.classList.add('found');badge.disabled=false;badge.title=`${c.name} — open field note`;badge.setAttribute('aria-label',`${c.name}, discovered. Open field note`);badge.querySelector('.d-name')!.textContent=shortName(c.name);}
 const total=creatures.filter(o=>o.biome===c.biome).length,done=[...found].filter(i=>creatures[i].biome===c.biome).length;document.querySelector(`[data-group-count="${c.biome}"]`)!.textContent=`${done} / ${total}`;}
document.querySelector('#progress-count')!.textContent=`0 / ${creatures.length}`;
 const found=new Set<number>();const keys=new Set<string>();let yaw=0,pitch=-.06,currentBiome:Biome='woodland',nearby=-1,dialogueOpen=false,helpOpen=false,generatedMode=false,layersSeparated=false,dialogueSession=0,modeSession=0,started=false,musicOn=true,listenName='';
let generatedScene:GeneratedSceneHandle|null=null;
const velocity=new T.Vector3(),forward=new T.Vector3(),right=new T.Vector3();const clock=new T.Clock();
const raycaster=new T.Raycaster();const pointer=new T.Vector2();const personalizedCopy=new Map<number,string>();
let visitor:guide.VisitorProfile={name:'Explorer',interests:'wildlife and ecosystems',style:'curious'};
const zones:Record<Biome,{name:string;code:string;copy:string;color:string;fog:string}>={underwater:{name:'River Below',code:'Biome 01 · Freshwater',copy:'Descend through the surface and follow the lives hidden beneath the current.',color:'#176d7d',fog:'#145b68'},woodland:{name:'Woodland',code:'Biome 02 · Temperate',copy:'Follow the river, listen closely, and meet the lives that keep this forest in balance.',color:'#91c7c8',fog:'#8bb8a7'},sky:{name:'Open Sky',code:'Biome 03 · Canopy',copy:'Rise above the branches to see how wind, water, and migration connect distant habitats.',color:'#88c5df',fog:'#a9d2dc'}};
function setBiome(biome:Biome){if(currentBiome===biome)return;const from=currentBiome;currentBiome=biome;if(started){if(from==='underwater'||biome==='underwater')mixer.playSplash();if(biome==='sky')mixer.playWind()}const z=zones[biome];document.querySelector('#zone-name')!.textContent=z.name;document.querySelector('#zone-code')!.textContent=z.code;document.querySelector('#zone-copy')!.textContent=z.copy;world.classList.toggle('underwater',biome==='underwater');document.querySelectorAll<HTMLButtonElement>('[data-biome]').forEach(b=>b.classList.toggle('active',b.dataset.biome===biome));}
function travel(biome:Biome,lockLook=true){const destinations:Record<Biome,T.Vector3>={underwater:new T.Vector3(0,-5,12),woodland:new T.Vector3(0,3.5,15),sky:new T.Vector3(0,14,16)};camera.position.copy(destinations[biome]);pitch=biome==='sky'?-0.12:0;setBiome(biome);if(lockLook)renderer.domElement.requestPointerLock().catch(()=>{});else if(document.pointerLockElement)document.exitPointerLock();}
const biomeByDigit:Record<string,Biome>={Digit1:'sky',Digit2:'woodland',Digit3:'underwater',Numpad1:'sky',Numpad2:'woodland',Numpad3:'underwater'};
function syncLookHint(){document.querySelector('#look-hint')!.classList.toggle('visible',started&&!dialogueOpen&&document.pointerLockElement===renderer.domElement);}

function showGeneratedObject(object:T.Object3D){
 const detail=object.userData.sceneObject;if(!detail)return;
 document.querySelector('#generated-object-name')!.textContent=detail.name;
 document.querySelector('#generated-object-description')!.textContent=detail.description;
 document.querySelector<HTMLElement>('#generated-info')!.hidden=false;
 if(document.pointerLockElement)document.exitPointerLock();
}
function activateGeneratedScene(result:Awaited<ReturnType<typeof generateScene>>){
 generatedScene?.dispose();exampleSceneObjects.forEach(object=>{object.visible=false});generatedMode=true;started=true;keys.clear();
 document.body.classList.add('generated-mode');world.classList.remove('underwater');
 scene.background=new T.Color(result.scene.environment.background);scene.fog=new T.FogExp2(result.scene.environment.background,.012);
 generatedScene=renderGeneratedScene(scene,result.scene);
 const layerButton=document.querySelector<HTMLButtonElement>('#toggle-layers')!;layersSeparated=false;layerButton.hidden=!generatedScene.hasLayers;layerButton.textContent='Separate layers';layerButton.setAttribute('aria-pressed','false');
 camera.position.fromArray(result.scene.camera.position);const target=new T.Vector3().fromArray(result.scene.camera.target),direction=target.clone().sub(camera.position).normalize();yaw=Math.atan2(-direction.x,-direction.z);pitch=Math.asin(T.MathUtils.clamp(direction.y,-1,1));
 document.querySelector('#generated-title')!.textContent=result.scene.title;document.querySelector('#generated-summary')!.textContent=result.scene.summary;
 const modelName=result.source==='gemini'?'Gemini Pro':result.source==='openrouter'?'Open-source router model':'NVIDIA Nemotron';document.querySelector('#generated-engine')!.textContent=result.pipeline?`${modelName} · ${result.pipeline.renderStrategy}`:'Created from your image';
 document.querySelector<HTMLElement>('#generated-hud')!.hidden=false;document.querySelector<HTMLElement>('#generated-info')!.hidden=true;
 document.querySelector<HTMLButtonElement>('#home-button')!.hidden=false;
 document.querySelector('#ai-status')!.textContent=`${modelName} scene ready`;document.querySelector('#intro')!.classList.add('hidden');
}

function setFieldNoteLoading(fact:Element,prefix=''){
 fact.replaceChildren();if(prefix)fact.append(document.createTextNode(`${prefix} `));
 const loader=document.createElement('span');loader.className='field-note-loading';loader.setAttribute('aria-label','Preparing question');loader.innerHTML='<b aria-hidden="true"><i></i><i></i><i></i></b>';fact.append(loader);fact.setAttribute('aria-busy','true');
}
async function openDialogue(index:number){
 const c=creatures[index],session=++dialogueSession;dialogueOpen=true;listenName=c.name;
 const listen=document.querySelector<HTMLButtonElement>('#listen-sfx')!;listen.textContent=c.kind==='plant'?'Hear rustle':'Hear sound';listen.setAttribute('aria-label',`Play the ${c.name} sound`);
 const encounter=mixer.beginEncounter(),sfxDone=mixer.playSfx(c.name);
 const speakAfterSfx=(text:string)=>{void sfxDone.then(()=>{if(mixer.isEncounter(encounter))void mixer.speak(text).catch(()=>{});});};
 if(document.pointerLockElement)document.exitPointerLock();
 document.querySelector('#dialogue')!.classList.add('open');
 syncLookHint();
 document.querySelector('#dialogue-tag')!.textContent=`${c.kind==='plant'?'Flora':'Wildlife'} encounter · ${zones[c.biome].name}`;
 document.querySelector('#dialogue-name')!.textContent=c.name;
 const fact=document.querySelector('#dialogue-fact')!,badge=document.querySelector('#nim-badge')!,choices=document.querySelector('#choices')!,result=document.querySelector('#result')!;
 const cached=personalizedCopy.get(index);
 let description=cached??'',attempt=0;const previousQuestions:string[]=[];
 const isCurrent=()=>dialogueOpen&&dialogueSession===session&&document.querySelector('#dialogue-name')!.textContent===c.name;
 const showQuiz=(quiz:guide.QuizQuestion)=>{
  if(!isCurrent())return;fact.removeAttribute('aria-busy');fact.textContent=`${description} ${quiz.question}`;badge.textContent=quiz.source==='nvidia'?'Personalized':'Field guide';result.textContent='';choices.replaceChildren();choices.classList.remove('loading');
  quiz.choices.forEach((label,i)=>{const button=document.createElement('button');button.textContent=label;button.dataset.choice=String(i);button.onclick=async()=>{
   if(i===quiz.answer){button.classList.add('correct');choices.querySelectorAll<HTMLButtonElement>('button').forEach(choice=>choice.disabled=true);result.textContent='Correct · ecosystem link understood';found.add(index);markFound(index);document.querySelector('#progress-count')!.textContent=`${found.size} / ${creatures.length}`;(document.querySelector('#progress-bar') as HTMLElement).style.width=`${found.size/creatures.length*100}%`;return;}
   button.classList.add('wrong');choices.querySelectorAll<HTMLButtonElement>('button').forEach(choice=>choice.disabled=true);result.textContent='Not quite · preparing another question';choices.classList.add('loading');attempt+=1;setFieldNoteLoading(fact,description);
   let next:guide.QuizQuestion;try{next=await guide.getRetryQuiz(visitor,c,previousQuestions,attempt);}catch{next=guide.localRetryQuiz(c,attempt);}
   previousQuestions.push(next.question);showQuiz(next);
  };choices.append(button);});
 };
 result.textContent='';choices.classList.add('loading');setFieldNoteLoading(fact,description);badge.textContent='Field guide';
 let quizReady=false;
 const initialQuizPromise=guide.getRetryQuiz(visitor,c,previousQuestions,attempt).catch(()=>guide.localRetryQuiz(c,attempt)).then(quiz=>{quizReady=true;return quiz;});
 if(!cached){
  try{const answer=await guide.streamPersonalizedText(visitor,c,partial=>{if(isCurrent()){fact.textContent=partial;badge.textContent='Writing';}});description=answer.text;personalizedCopy.set(index,answer.text);}
  catch{description=c.fact;}
  if(!quizReady&&isCurrent())setFieldNoteLoading(fact,description);
 }
 const initialQuiz=await initialQuizPromise;previousQuestions.push(initialQuiz.question);showQuiz(initialQuiz);speakAfterSfx(`${description} ${initialQuiz.question}`);
}
function focusCreature(index:number){const c=creatures[index],p=c.home,dist=7;camera.position.set(p.x,p.y+(c.biome==='sky'?.5:1.2),p.z+dist);yaw=0;pitch=Math.atan2(p.y-camera.position.y,dist);setBiome(c.biome);void openDialogue(index)}
discoveries.addEventListener('click',e=>{const badge=(e.target as HTMLElement).closest<HTMLButtonElement>('.discovery.found');if(badge)focusCreature(Number(badge.dataset.index))});
function closeDialogue(){dialogueOpen=false;dialogueSession+=1;mixer.endEncounter();document.querySelector('#dialogue')!.classList.remove('open');syncLookHint();}
document.querySelector('#dialogue-close')!.addEventListener('click',closeDialogue);
document.querySelector('#listen-sfx')!.addEventListener('click',()=>{if(listenName)void mixer.playSfx(listenName)});
document.querySelector('#dialogue')!.addEventListener('click',e=>{if(e.target===document.querySelector('#dialogue'))closeDialogue()});
const help=document.querySelector<HTMLElement>('#help')!,helpButton=document.querySelector<HTMLButtonElement>('#help-button')!,helpClose=document.querySelector<HTMLButtonElement>('#help-close')!;
function setHelpOpen(open:boolean){helpOpen=open;help.hidden=!open;helpButton.setAttribute('aria-expanded',String(open));if(open){keys.clear();if(document.pointerLockElement)document.exitPointerLock();helpClose.focus()}else helpButton.focus()}
helpButton.addEventListener('click',()=>setHelpOpen(!helpOpen));helpClose.addEventListener('click',()=>setHelpOpen(false));help.addEventListener('click',event=>{if(event.target===help)setHelpOpen(false)});
document.querySelectorAll<HTMLButtonElement>('[data-biome]').forEach(button=>button.onclick=()=>travel(button.dataset.biome as Biome));
const entryStage=document.querySelector<HTMLElement>('#entry-stage')!,profileStage=document.querySelector<HTMLElement>('#profile-stage')!,creatorStage=document.querySelector<HTMLElement>('#creator-stage')!,loadingStage=document.querySelector<HTMLElement>('#loading-stage')!;
const stages=[entryStage,profileStage,creatorStage,loadingStage];
function showStage(stage:HTMLElement){stages.forEach(item=>{item.hidden=item!==stage})}
function showLoading(kicker:string,title:string,copy:string){document.querySelector('#loading-kicker')!.textContent=kicker;document.querySelector('#loading-title')!.innerHTML=`${title}<span class="loading-ellipsis" aria-hidden="true"><i></i><i></i><i></i></span>`;document.querySelector('#loading-copy')!.textContent=copy;showStage(loadingStage)}
function restoreExampleWorld(){generatedScene?.dispose();generatedScene=null;generatedMode=false;layersSeparated=false;exampleSceneObjects.forEach(object=>{object.visible=true});document.body.classList.remove('generated-mode');document.querySelector<HTMLElement>('#generated-hud')!.hidden=true;document.querySelector<HTMLElement>('#generated-info')!.hidden=true;document.querySelector<HTMLButtonElement>('#toggle-layers')!.hidden=true;scene.background=new T.Color(zones.woodland.color);scene.fog=new T.FogExp2(zones.woodland.fog,.018);camera.position.set(0,3.5,15);yaw=0;pitch=-.06;currentBiome='sky';setBiome('woodland')}
function returnHome(){modeSession+=1;started=false;keys.clear();if(dialogueOpen)closeDialogue();helpOpen=false;help.hidden=true;helpButton.setAttribute('aria-expanded','false');mixer.endEncounter();if(document.pointerLockElement)document.exitPointerLock();restoreExampleWorld();document.querySelector('#intro')!.classList.remove('hidden');showStage(entryStage);document.querySelector<HTMLButtonElement>('#home-button')!.hidden=true;document.querySelector('#ai-status')!.textContent='Personal guide ready';syncLookHint()}
document.querySelector('#home-button')!.addEventListener('click',returnHome);
document.querySelector('#choose-example')!.addEventListener('click',()=>{restoreExampleWorld();showStage(profileStage);document.querySelector<HTMLInputElement>('#visitor-name')!.focus()});
document.querySelector('#choose-create')!.addEventListener('click',()=>showStage(creatorStage));
document.querySelector('#profile-back')!.addEventListener('click',()=>showStage(entryStage));
document.querySelector('#creator-back')!.addEventListener('click',()=>showStage(entryStage));
document.querySelector('#new-scene')!.addEventListener('click',()=>{started=false;document.querySelector('#intro')!.classList.remove('hidden');showStage(creatorStage)});
document.querySelector('#toggle-layers')!.addEventListener('click',()=>{if(!generatedScene?.hasLayers)return;layersSeparated=!layersSeparated;generatedScene.setLayersSeparated(layersSeparated);const button=document.querySelector<HTMLButtonElement>('#toggle-layers')!;button.textContent=layersSeparated?'Join layers':'Separate layers';button.setAttribute('aria-pressed',String(layersSeparated))});
document.querySelector('#generated-info-close')!.addEventListener('click',()=>{document.querySelector<HTMLElement>('#generated-info')!.hidden=true});
const sceneInput=document.querySelector<HTMLInputElement>('#scene-image')!,scenePreview=document.querySelector<HTMLImageElement>('#scene-preview')!,creatorError=document.querySelector<HTMLElement>('#creator-error')!;let previewUrl='';
sceneInput.addEventListener('change',()=>{creatorError.textContent='';if(previewUrl)URL.revokeObjectURL(previewUrl);const file=sceneInput.files?.[0];if(!file){scenePreview.hidden=true;return}previewUrl=URL.createObjectURL(file);scenePreview.src=previewUrl;scenePreview.hidden=false;document.querySelector<HTMLElement>('#upload-prompt')!.hidden=true});
document.querySelector<HTMLFormElement>('#scene-creator')!.addEventListener('submit',async event=>{
 event.preventDefault();const file=sceneInput.files?.[0];if(!file){creatorError.textContent='Choose an image first.';return}
 const submitter=(event as SubmitEvent).submitter as HTMLButtonElement|null,submittedProvider=submitter?.value||String(new FormData(event.currentTarget as HTMLFormElement).get('provider')||'nvidia'),provider=(submittedProvider==='gemini'?'gemini':submittedProvider==='openrouter'?'openrouter':'nvidia') as SceneProvider,modelName=provider==='gemini'?'Gemini Pro':provider==='openrouter'?'Open-source router model':'NVIDIA Nemotron';
 const requestSession=modeSession,buttons=[...document.querySelectorAll<HTMLButtonElement>('.model-option')];buttons.forEach(button=>{button.disabled=true});creatorError.textContent='';mixer.startMusic();showLoading(`${modelName} is reading your picture`,'Building your 3D world',`${modelName} is making one conversion attempt. If it cannot produce a valid interactive scene, your picture will stay selected so you can try the other model.`);
 try{const result=await generateScene(file,provider);if(requestSession===modeSession)activateGeneratedScene(result)}catch(error){if(requestSession===modeSession){showStage(creatorStage);creatorError.textContent=error instanceof Error?error.message:'That model could not build a valid scene. Your picture is still selected.'}}finally{buttons.forEach(button=>{button.disabled=false})}
});
document.querySelector<HTMLFormElement>('#profile')!.addEventListener('submit',async event=>{
 event.preventDefault();
 mixer.startMusic();document.querySelector('#sound')!.textContent=musicOn?'♫':'♪';
 visitor={name:(document.querySelector<HTMLInputElement>('#visitor-name')!.value.trim()||'Explorer'),interests:(document.querySelector<HTMLInputElement>('#visitor-interests')!.value.trim()||'wildlife and ecosystems'),style:document.querySelector<HTMLSelectElement>('#visitor-style')!.value};
 const button=document.querySelector<HTMLButtonElement>('#begin')!;button.disabled=true;showLoading('Preparing your journey','Connecting the living world','Building a field guide around your curiosity.');
 const minimumLoadingTime=new Promise<void>(resolve=>setTimeout(resolve,900));
 const guideRequest=guide.getPersonalizedText(visitor).then(answer=>{document.querySelector('#ai-status')!.textContent=answer.source==='nvidia'?'Personal guide online':'Local guide mode';void mixer.speak(answer.text).catch(()=>{});}).catch(()=>{document.querySelector('#ai-status')!.textContent='Local guide mode';void mixer.speak(guide.localWelcome(visitor)).catch(()=>{});});
 await minimumLoadingTime;started=true;document.querySelector<HTMLButtonElement>('#home-button')!.hidden=false;document.querySelector('#intro')!.classList.add('hidden');syncLookHint();void guideRequest;
});
renderer.domElement.addEventListener('click',event=>{if(!started||dialogueOpen||helpOpen)return;const rect=renderer.domElement.getBoundingClientRect();if(document.pointerLockElement===renderer.domElement)pointer.set(0,0);else pointer.set(((event.clientX-rect.left)/rect.width)*2-1,-((event.clientY-rect.top)/rect.height)*2+1);raycaster.setFromCamera(pointer,camera);if(generatedMode&&generatedScene){const generatedHit=raycaster.intersectObjects(generatedScene.interactiveObjects,true)[0];if(generatedHit){showGeneratedObject(generatedHit.object);return}renderer.domElement.requestPointerLock().catch(()=>{});return}const hit=raycaster.intersectObjects(creatures.map(c=>c.object),true).find(intersection=>intersection.object.userData.creature!==undefined);if(hit){openDialogue(Number(hit.object.userData.creature));return}renderer.domElement.requestPointerLock().catch(()=>{});});
document.addEventListener('mousemove',event=>{if(document.pointerLockElement!==renderer.domElement||dialogueOpen||helpOpen)return;yaw-=event.movementX*.0022;pitch=T.MathUtils.clamp(pitch-event.movementY*.002,-Math.PI/2+.04,Math.PI/2-.04)});
document.addEventListener('keydown',event=>{if(event.code==='Escape'&&helpOpen){setHelpOpen(false);return}if(event.code==='Escape'&&!document.querySelector<HTMLElement>('#generated-info')!.hidden){document.querySelector<HTMLElement>('#generated-info')!.hidden=true;return}keys.add(event.code);if(event.code==='KeyE'&&generatedMode&&generatedScene&&!helpOpen){pointer.set(0,0);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(generatedScene.interactiveObjects,true)[0];if(hit)showGeneratedObject(hit.object)}else if(event.code==='KeyE'&&nearby>=0&&!dialogueOpen&&!helpOpen)openDialogue(nearby);if(event.code==='Escape'){if(dialogueOpen)closeDialogue();else if(document.pointerLockElement)document.exitPointerLock();}const jump=biomeByDigit[event.code];if(jump&&started&&!dialogueOpen&&!helpOpen&&!generatedMode){event.preventDefault();travel(jump,false);}});document.addEventListener('keyup',event=>keys.delete(event.code));
document.addEventListener('pointerlockchange',syncLookHint);

document.querySelector('#sound')!.addEventListener('click',()=>{musicOn=!musicOn;document.querySelector('#sound')!.textContent=musicOn?'♫':'♪';mixer.setMusicEnabled(musicOn)});

function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2))}addEventListener('resize',resize);
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04),time=clock.elapsedTime;
 camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);
 if(!dialogueOpen&&!helpOpen&&started){forward.set(-Math.sin(yaw),0,-Math.cos(yaw));right.set(Math.cos(yaw),0,-Math.sin(yaw));velocity.set(0,0,0);if(keys.has('KeyW'))velocity.add(forward);if(keys.has('KeyS'))velocity.sub(forward);if(keys.has('KeyD'))velocity.add(right);if(keys.has('KeyA'))velocity.sub(right);if(keys.has('Space'))velocity.y+=1;if(keys.has('ShiftLeft')||keys.has('ShiftRight'))velocity.y-=1;if(velocity.lengthSq())camera.position.addScaledVector(velocity.normalize(),dt*(keys.has('ControlLeft')?11:6.2));camera.position.x=T.MathUtils.clamp(camera.position.x,-29,29);camera.position.z=T.MathUtils.clamp(camera.position.z,-29,29);camera.position.y=T.MathUtils.clamp(camera.position.y,-10.4,27)}
 if(generatedMode){generatedScene?.update(time);mixer.notifyNearby(-1,null,null);document.querySelector('#hint')!.classList.remove('visible');hemi.intensity=T.MathUtils.lerp(hemi.intensity,2.3,dt*2);sun.intensity=T.MathUtils.lerp(sun.intensity,3.2,dt*2)}else{
 const y=camera.position.y;const biome:Biome=currentBiome==='underwater'?(y>-.15?(y>8?'sky':'woodland'):'underwater'):currentBiome==='sky'?(y<7.2?(y<-.8?'underwater':'woodland'):'sky'):(y<-.8?'underwater':y>8?'sky':'woodland');setBiome(biome);const zone=zones[biome];(scene.background as T.Color).lerp(new T.Color(zone.color),dt*1.5);(scene.fog as T.FogExp2).color.lerp(new T.Color(zone.fog),dt*1.5);(scene.fog as T.FogExp2).density=T.MathUtils.lerp((scene.fog as T.FogExp2).density,biome==='underwater'?.055:.018,dt*2);hemi.intensity=T.MathUtils.lerp(hemi.intensity,biome==='underwater'?1.15:2.3,dt*2);sun.intensity=T.MathUtils.lerp(sun.intensity,biome==='underwater'?.5:3.2,dt*2);
 creatures.forEach(c=>{c.object.position.y=c.home.y+Math.sin(time*(c.biome==='woodland'?1.3:2)+c.phase)*(c.biome==='woodland'?.06:.35);if(c.biome!=='woodland')c.object.rotation.y=Math.sin(time*.35+c.phase)*.45;if(c.biome==='sky')c.object.rotation.z=Math.cos(time*.35+c.phase)*.2});
 wingBeats.forEach(w=>{w.pivot.rotation[w.axis??'z']=w.rest+Math.sin(time*w.speed+w.phase)*w.amp});bubbles.forEach(b=>{b.position.y+=dt*b.userData.speed;if(b.position.y>-.4)b.position.y=-10.5});riverMaterial.opacity=.74+Math.sin(time*.8)*.04;
 for(let i=0;i<riverPosition.count;i++){const x=riverPosition.getX(i),y=riverPosition.getY(i);riverPosition.setZ(i,Math.sin(x*.6+time*1.4)*.03+Math.sin(y*.35+time*.9)*.022)}riverPosition.needsUpdate=true;riverGeometry.computeVertexNormals();
 swayables.forEach(s=>{s.object.rotation.z=Math.sin(time*1.6+s.phase)*s.strength});
 cloudDrifters.forEach(cd=>{cd.object.position.x+=dt*.18;if(cd.object.position.x>34)cd.object.position.x=-34;cd.object.position.y+=Math.sin(time*.15+cd.phase)*.003});
 nearby=-1;let best=6;let plantNear=-1;let plantBest=14;camera.getWorldDirection(forward);creatures.forEach((c,i)=>{const dx=c.object.position.x-camera.position.x,dz=c.object.position.z-camera.position.z,ground=Math.hypot(dx,dz);const to=c.object.position.clone().sub(camera.position),distance=to.length();if(distance<best&&to.normalize().dot(forward)>.35){best=distance;nearby=i}if(c.kind==='plant'&&ground<plantBest){plantBest=ground;plantNear=i}});if(started&&!dialogueOpen)mixer.notifyNearby(plantNear,plantNear>=0?creatures[plantNear].name:null,plantNear>=0?'plant':null);else mixer.notifyNearby(-1,null,null);const hint=document.querySelector('#hint')!;hint.classList.toggle('visible',nearby>=0&&!dialogueOpen);if(nearby>=0)hint.querySelector('span')!.textContent=creatures[nearby].kind==='plant'?`Listen to the ${creatures[nearby].name}`:`Meet the ${creatures[nearby].name}`;}
 document.querySelector('#altitude')!.textContent=`${camera.position.y>=0?'+':'−'}${Math.abs(camera.position.y).toFixed(1).padStart(4,'0')} m`;renderer.render(scene,camera)}animate();
