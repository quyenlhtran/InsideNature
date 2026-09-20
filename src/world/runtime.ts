import * as T from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import '../ui/styles.css';
import * as mixer from '../audio/mixer.ts';
import * as guide from '../ai/guide.ts';
import {generateScene} from '../ai/scene.ts';
import {renderGeneratedScene, type GeneratedSceneHandle} from './generated-scene.ts';

type Biome='underwater'|'woodland'|'sky';
type FieldObject={name:string;icon:string;kind:'animal'|'plant';biome:Biome;fact:string;question:string;choices:string[];answer:number;object:T.Group;home:T.Vector3;phase:number};

document.querySelector<HTMLDivElement>('#app')!.innerHTML=`
  <main class="world" id="world"><div class="noise"></div></main>
  <header class="brand"><div class="brand-mark">N</div><div><strong>Inside Nature</strong><small>Living field atlas · 01</small></div></header>
  <div class="top-status"><span class="ai-status" id="ai-status">Personal guide ready</span><span class="live">Ecosystem live</span><button class="round-control help-button" id="help-button" type="button" aria-label="How to play" aria-controls="help" aria-expanded="false">?</button><button class="round-control sound" id="sound" type="button" aria-label="Toggle ambient sound">♪</button></div>
  <aside class="biome-card"><div class="eyebrow" id="zone-code">Biome 02 · Temperate</div><h2 id="zone-name">Woodland</h2><p id="zone-copy">Follow the river, listen closely, and meet the lives that keep this forest in balance.</p><div class="progress-label"><span>Field journal</span><span id="progress-count">0 / 0</span></div><div class="progress-track"><i id="progress-bar"></i></div><div class="discoveries" id="discoveries"></div></aside>
  <nav class="depth-nav" aria-label="Travel between biomes"><button data-biome="sky">⌁<span>Canopy & sky</span></button><i></i><button data-biome="woodland" class="active">♧<span>Forest floor</span></button><i></i><button data-biome="underwater">≋<span>Below the surface</span></button></nav>
  <div class="crosshair"></div><div class="interact-hint" id="hint"><b>E</b><span></span></div>
  <div class="controls"><div class="keys"><b class="key">W</b><b class="key">A</b><b class="key">S</b><b class="key">D</b></div><span>Move</span><div class="keys"><b class="key">Space</b><b class="key">Shift</b></div><span>Rise / descend</span><div class="keys"><b class="key">Click</b><b class="key">E</b></div><span>Discover</span></div>
  <div class="altitude"><b id="altitude">+03.5 m</b><span>Relative depth</span></div>
  <section class="help" id="help" role="dialog" aria-modal="true" aria-labelledby="help-title" hidden><article class="help-card"><button class="help-close" id="help-close" type="button" aria-label="Close how to play">×</button><div class="eyebrow">Explorer guide</div><h2 id="help-title">How to play</h2><div class="help-steps"><div><b>01</b><span><strong>Explore</strong>Use <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> to move. Move your mouse to look around.</span></div><div><b>02</b><span><strong>Travel up and down</strong>Hold <kbd>Space</kbd> to fly up. Hold <kbd>Shift</kbd> to go down into the forest or river.</span></div><div><b>03</b><span><strong>Find living things</strong>Walk close to an animal or plant. Press <kbd>E</kbd> or click it to meet it and read its story.</span></div><div><b>04</b><span><strong>Answer to collect</strong>Choose the right answer to add that animal or plant to your journal. A wrong answer does not collect it—try the new question!</span></div><div><b>05</b><span><strong>Complete your adventure</strong>Collect all 15 animals and plants. Watch the journal counter on the left to see how many are still hiding.</span></div></div><p>Tip: use the three biome buttons on the right to jump between the sky, forest, and river.</p></article></section>
  <section class="generated-hud" id="generated-hud" hidden><div class="eyebrow">Created from your image</div><h2 id="generated-title"></h2><p id="generated-summary"></p><button id="new-scene" type="button">Create another scene</button></section>
  <section class="generated-info" id="generated-info" hidden><button id="generated-info-close" type="button" aria-label="Close object information">×</button><div class="eyebrow">You discovered</div><h3 id="generated-object-name"></h3><p id="generated-object-description"></p></section>
  <section class="intro" id="intro">
    <div class="intro-inner intro-stage window-card entry-stage" id="entry-stage"><div class="kicker">Choose your adventure</div><h1>Step <em>inside.</em></h1><p class="intro-copy">Play a ready-made learning world or turn your own picture into an interactive 3D scene.</p><div class="mode-grid"><button class="mode-card" id="choose-example" type="button"><small>Beginner example</small><strong>Explore Inside Nature</strong><span>Meet 15 animals and plants across the forest, river, and sky.</span><i>Play example →</i></button><button class="mode-card create-mode" id="choose-create" type="button"><small>Create your own</small><strong>Upload a picture</strong><span>Transform a diagram or nature image into an explorable 3D learning scene.</span><i>Start creating →</i></button></div></div>
    <div class="intro-inner intro-stage window-card profile-stage" id="profile-stage" hidden><div class="kicker">Before you explore</div><h2>Shape your field guide.</h2><p class="intro-copy">A few details help the guide connect each discovery to what interests you.</p><form class="profile" id="profile"><label><span>What should we call you?</span><input id="visitor-name" maxlength="40" placeholder="Explorer" autocomplete="given-name"></label><label><span>What are you curious about?</span><input id="visitor-interests" maxlength="240" placeholder="food webs, big cats, climate…"></label><label><span>How should we explain?</span><select id="visitor-style"><option value="curious">Curious & vivid</option><option value="simple">Simple & concise</option><option value="scientific">Scientific</option><option value="storylike">Like a nature story</option></select></label><button class="begin" id="begin" type="submit"><span>Start my exploration</span><i>→</i></button><small class="profile-note">Your field guide will adapt discoveries to your interests.</small></form></div>
    <div class="intro-inner intro-stage window-card creator-stage" id="creator-stage" hidden><button class="stage-back" id="creator-back" type="button">← Back</button><div class="kicker">Create your own world</div><h2>Turn a picture into 3D.</h2><p class="intro-copy">Upload a clear nature photo or learning diagram. We will identify its important parts and build an interactive scene.</p><form class="scene-creator" id="scene-creator"><label class="upload-drop" for="scene-image"><input id="scene-image" type="file" accept="image/png,image/jpeg" required><span id="upload-prompt"><b>Choose a PNG or JPEG</b><small>Diagrams with clear shapes and labels work best.</small></span><img id="scene-preview" alt="Selected image preview" hidden></label><p class="creator-error" id="creator-error" role="alert"></p><button class="begin" id="generate-scene" type="submit"><span>Build my 3D scene</span><i>→</i></button></form></div>
    <div class="intro-stage window-card loading-stage" id="loading-stage" role="status" aria-live="polite" hidden><div class="loading-orbit"><i></i><i></i><i></i></div><div class="kicker" id="loading-kicker">Preparing your journey</div><h2 id="loading-title">Connecting the living world<span class="loading-ellipsis" aria-hidden="true"><i></i><i></i><i></i></span></h2><p id="loading-copy">Building a field guide around your curiosity.</p></div>
  </section>
   <section class="dialogue" id="dialogue" aria-modal="true" role="dialog"><article class="dialogue-card"><button class="dialogue-close" id="dialogue-close" aria-label="Close">×</button><div class="dialogue-tag" id="dialogue-tag"></div><div class="dialogue-heading"><h3 id="dialogue-name"></h3><span class="nim-badge" id="nim-badge">Field guide</span><button class="listen" id="listen-sfx" type="button">Hear sound</button></div><p id="dialogue-fact"></p><div class="choices" id="choices"></div><p class="result" id="result" role="status" aria-live="polite"></p></article></section>`;

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
const swayables:{object:T.Object3D;phase:number;strength:number}[]=[];
const cloudDrifters:{object:T.Object3D;phase:number}[]=[];
const wingBeats:{pivot:T.Object3D;rest:number;amp:number;speed:number;phase:number}[]=[];

// The forest floor's height field. The terrain mesh displaces its vertices with it, and
// anything rooted in the ground reads the same function, so it lands flush instead of at y=0.
const GROUND_BASE=-.05;
const groundBump=(x:number,z:number)=>(noise2(x*.4,z*.35)*.24+noise2(x*1.3,z*1.1)*.07)*T.MathUtils.smoothstep(Math.abs(x-2),1.5,7);
const groundHeight=(x:number,z:number)=>GROUND_BASE+groundBump(x,z);
// A trunk flare starts a little above its group origin, so bury the root slightly: soil then
// meets bark on a slope instead of leaving a sliver of daylight under the tree.
const ROOT_DEPTH=.12;
const rootHeight=(x:number,z:number,scale:number)=>groundHeight(x,z)-ROOT_DEPTH*scale;
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
for(let i=0;i<42;i++){let x=(random()-.5)*58,z=(random()-.5)*58;if(Math.abs(x-2)<8)x+=x<2?-8:8;tree(x,z,.72+random()*.65)}

function grassTuft(x:number,z:number){const g=new T.Group();const bladeCount=3+Math.floor(random()*3);for(let i=0;i<bladeCount;i++){const height=.5+random()*.55;const blade=mesh(new T.ConeGeometry(.06,height,6),mat(tint(random()>.4?'#6f984e':'#92aa50',.14)),false);blade.position.set(range(-.13,.13),height/2,range(-.13,.13));blade.rotation.z=range(-.2,.2);blade.rotation.y=random()*Math.PI;g.add(blade)}g.position.set(x,.02,z);scene.add(g);swayables.push({object:g,phase:random()*Math.PI*2,strength:.055});return g}
for(let i=0;i<60;i++){const x=(random()-.5)*56,z=(random()-.5)*56;if(Math.abs(x-2)<7.5)continue;grassTuft(x,z)}

function flower(x:number,z:number){const g=new T.Group();const stemHeight=.4+random()*.25;const stem=cylinder(.022,.03,stemHeight,tint('#48733d',.1),8);stem.position.y=stemHeight/2;g.add(stem);for(const side of[-1,1]){const leaf=mesh(new T.SphereGeometry(.09,8,6),mat('#4f7a3f'),false);leaf.scale.set(1.8,.25,.7);leaf.position.set(side*.09,stemHeight*.45,0);leaf.rotation.y=side*.6;g.add(leaf)}const petals=5+Math.floor(random()*3);const hue=random();const petalColor=hue>.66?'#f5d7dc':hue>.33?'#f4dd73':'#eef0e8';for(let p=0;p<petals;p++){const petal=sphere(.085,tint(petalColor,.08),8,6);petal.scale.set(1.7,.5,1);const a=p*(Math.PI*2/petals);petal.position.set(Math.cos(a)*.12,stemHeight+.02,Math.sin(a)*.12);petal.rotation.y=a;g.add(petal)}const center=sphere(.05,'#f0c23e',8,6);center.position.y=stemHeight+.03;g.add(center);g.position.set(x,0,z);scene.add(g);swayables.push({object:g,phase:random()*Math.PI*2,strength:.03});return g}
for(let i=0;i<26;i++){const x=(random()-.5)*46,z=(random()-.5)*46;if(Math.abs(x-2)<6)continue;flower(x,z)}

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

function animalBody(color:string,accent:string){const g=new T.Group();const body=sphere(.65,color,22,16);body.scale.set(1.35,.78,.72);body.rotation.y=Math.PI/2;g.add(body);const neck=cylinder(.28,.36,.5,tint(color,.08),10);neck.position.set(0,.3,-.62);neck.rotation.x=.7;g.add(neck);const head=sphere(.43,color,20,14);head.position.set(0,.42,-.85);g.add(head);const snout=sphere(.24,tint(color,.08),14,10);snout.scale.set(1,.75,1.3);snout.position.set(0,.3,-1.18);g.add(snout);const eye=sphere(.055,'#101b17',8,6);eye.position.set(.3,.5,-1.05);g.add(eye);const eye2=eye.clone();eye2.position.x=-.3;g.add(eye2);const nose=sphere(.09,accent,8,6);nose.position.set(0,.28,-1.32);g.add(nose);return g}
function deer(){const g=animalBody('#a86a35','#33251d');g.scale.setScalar(.85);for(const x of[-.4,.4])for(const z of[-.3,.35]){const leg=cylinder(.07,.09,1.2,tint('#74472d',.08),8);leg.position.set(x,-.72,z);g.add(leg);const paw=sphere(.08,'#2c2018',6,5);paw.position.set(x,-1.3,z);g.add(paw)}for(const x of[-.23,.23]){const antler=cylinder(.035,.055,.8,'#d2b27b',6);antler.position.set(x,1,-.85);antler.rotation.z=x*1.5;g.add(antler);const tine=cylinder(.02,.03,.32,'#d2b27b',5);tine.position.set(x+(x<0?-.14:.14),1.28,-.7);tine.rotation.z=x*2.2;g.add(tine)}return g}
function fox(){const g=animalBody('#c55e32','#342018');for(const x of[-.35,.35])for(const z of[-.25,.3]){const leg=cylinder(.06,.075,.9,tint('#9e432b',.08),8);leg.position.set(x,-.65,z);g.add(leg);const paw=sphere(.07,'#241610',6,5);paw.position.set(x,-1.08,z);g.add(paw)}for(const x of[-.42,.42]){const ear=mesh(new T.ConeGeometry(.2,.55,7),mat('#9e432b'));ear.position.set(x,.9,-.77);g.add(ear);const earInner=mesh(new T.ConeGeometry(.11,.32,6),mat('#2c1a12'));earInner.position.set(x,.85,-.7);g.add(earInner)}const tail=mesh(new T.ConeGeometry(.35,1.8,10),mat('#d87542'));tail.rotation.x=-Math.PI/2;tail.position.set(0,.15,1.25);g.add(tail);const tailTip=sphere(.2,'#f4ede2',8,6);tailTip.position.set(0,.15,2.05);g.add(tailTip);return g}
function rabbit(){const g=animalBody('#9b8f7d','#594b42');g.scale.setScalar(.65);for(const x of[-.28,.28])for(const z of[-.15,.2]){const leg=cylinder(.05,.06,.5,tint('#7d7264',.08),7);leg.position.set(x,-.42,z);g.add(leg)}for(const x of[-.2,.2]){const ear=sphere(.18,'#a79c8c',10,8);ear.scale.set(1,2.8,.6);ear.position.set(x,1,-.72);g.add(ear);const earInner=sphere(.11,'#c9a99a',8,6);earInner.scale.set(1,2.6,.5);earInner.position.set(x,1,-.66);g.add(earInner)}const tail=sphere(.15,'#f4f0e6',8,6);tail.position.set(0,.1,.9);g.add(tail);return g}
function fish(color:string){const g=new T.Group();const body=sphere(.62,color,18,14);body.scale.set(1.55,.72,.45);g.add(body);const tail=mesh(new T.ConeGeometry(.55,1,4),mat(color));tail.rotation.z=-Math.PI/2;tail.position.x=-1.15;g.add(tail);const dorsal=mesh(new T.ConeGeometry(.3,.5,4),mat(tint(color,.15)));dorsal.rotation.x=Math.PI;dorsal.position.set(0,.42,0);g.add(dorsal);for(const side of[-1,1]){const fin=mesh(new T.ConeGeometry(.18,.4,4),mat(tint(color,.1)));fin.rotation.z=side*1.1;fin.position.set(.15,-.05,side*.3);g.add(fin)}const eye=sphere(.07,'#101b17',8,6);eye.position.set(.68,.2,.35);g.add(eye);return g}
function turtle(){const g=new T.Group();const shell=sphere(.7,'#527945',16,12);shell.scale.set(1.25,.45,1);g.add(shell);for(let i=0;i<5;i++){const scute=sphere(.14,tint('#3f5c37',.1),8,6);scute.scale.set(1,.4,1);const a=(i/5)*Math.PI*2;scute.position.set(Math.cos(a)*.4,.28,Math.sin(a)*.55);g.add(scute)}const head=sphere(.3,'#7aa068',10,8);head.position.x=1;g.add(head);for(const z of[-.65,.65])for(const x of[-.45,.45]){const fin=mesh(new T.ConeGeometry(.18,.65,6),mat('#71935f'));fin.rotation.z=Math.PI/2;fin.position.set(x,0,z);g.add(fin)}return g}
function ray(){const g=new T.Group();const wing=mesh(new T.SphereGeometry(.9,20,10),mat('#487b84'));wing.scale.set(1.7,.16,1);g.add(wing);for(let i=0;i<6;i++){const spot=sphere(.05,'#c9e9e5',6,5);spot.position.set(range(-1,1),.09,range(-.7,.7));g.add(spot)}const tail=cylinder(.03,.07,2.3,'#365e65',8);tail.rotation.z=Math.PI/2;tail.position.x=-1.6;g.add(tail);return g}
// Birds are built from one shared vane: a tapered feather rooted at the origin,
// pointing +Y, so a whole wing costs a single geometry and only scale/rotation.
const featherGeometry=(()=>{const s=new T.Shape();s.moveTo(0,0);s.bezierCurveTo(.15,.08,.22,.45,.13,.9);s.quadraticCurveTo(.06,1.02,-.01,1);s.bezierCurveTo(-.11,.58,-.13,.2,0,0);return new T.ShapeGeometry(s,12)})();
// The scene's hemisphere light bounces dark green off the ground, which turns pale
// plumage green from below. A trace of self-colour keeps white feathers white.
const selfLit=(color:T.ColorRepresentation,amount=.17)=>new T.Color(color).multiplyScalar(amount);
const lit=(color:T.ColorRepresentation,roughness=.8)=>new T.MeshStandardMaterial({color,roughness,emissive:selfLit(color)});
const plume=(color:T.ColorRepresentation,roughness=.78,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness,emissive:selfLit(color),side:T.DoubleSide});
// Returns a placed copy rather than a mesh: a wing is hundreds of vanes, so they are
// merged per material into one draw call instead of one each.
// sweep fans the vane outboard across the wing, lift curls its tip upward.
function feather(x:number,y:number,z:number,length:number,width:number,sweep:number,lift=0){const placement=new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(Math.PI/2-lift,sweep,0,'YXZ')),new T.Vector3(width,length,1));return featherGeometry.clone().applyMatrix4(placement)}
function plumeMesh(vanes:T.BufferGeometry[],material:T.Material){const merged=mesh(mergeGeometries(vanes),material,false);vanes.forEach(v=>v.dispose());return merged}
// Dark above, pale below: the countershading every wild bird wears.
function countershade(geometry:T.BufferGeometry,belly:string,back:string,low:number,high:number){const position=geometry.attributes.position as T.BufferAttribute;const colors=new Float32Array(position.count*3);const under=new T.Color(belly),over=new T.Color(back),c=new T.Color();for(let i=0;i<position.count;i++){c.copy(under).lerp(over,T.MathUtils.smoothstep(position.getY(i),low,high));colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b}geometry.setAttribute('color',new T.BufferAttribute(colors,3));return geometry}
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
function tiger(){const g=animalBody('#d97827','#26180f');g.scale.setScalar(1.18);for(const x of[-.5,.5])for(const z of[-.3,.35]){const leg=cylinder(.1,.13,1.25,'#d97827',8);leg.position.set(x,-.78,z);g.add(leg);const paw=sphere(.12,'#f4ede2',7,6);paw.position.set(x,-1.42,z);g.add(paw)}for(let i=-2;i<=2;i++){const stripe=box(.07,.48,.72,'#2b2019');stripe.position.set(i*.25,.28,.05);stripe.rotation.z=i*.1;g.add(stripe)}for(const x of[-.27,.27]){const ear=mesh(new T.ConeGeometry(.2,.45,7),mat('#2b2019'));ear.position.set(x,.88,-.82);g.add(ear)}return g}
function frog(){const g=new T.Group();const body=sphere(.42,'#5d9b48',16,12);body.scale.set(1,.65,1.15);g.add(body);for(const x of[-.28,.28]){const eye=sphere(.14,'#9bc66c',10,8);eye.position.set(x,.34,-.25);g.add(eye);const pupil=sphere(.05,'#172418',6,5);pupil.position.set(x,.38,-.37);g.add(pupil)}for(const x of[-.5,.5]){const leg=box(.55,.12,.16,'#4f873e');leg.position.set(x,-.18,.22);g.add(leg);for(let t=0;t<3;t++){const toe=box(.16,.06,.08,'#4f873e');toe.position.set(x+(x<0?-.28:.28),-.2,.28+t*.13-.13);g.add(toe)}}for(const x of[-.32,.32]){const arm=cylinder(.06,.07,.3,'#5d9b48',6);arm.rotation.z=Math.PI/2;arm.position.set(x,.02,-.28);g.add(arm)}return g}
// Barred owl: no ear tufts, dark eyes in a ringed facial disc, broad rounded wings.
function owl(){const g=bird({mantle:'#6f5840',belly:'#e9e0cf',throat:'#ded3be',hood:'#766046',flight:'#8a7154',underwing:'#ddd2bb',tail:'#7d6549',beak:'#e6c25a',iris:'#241a12',leg:'#cdbfa6',face:'disc',disc:'#d9ccb5',discRim:'#5c4730',scale:.85,girth:1.16,head:1.38,span:1.7,chord:.82,primaries:9,secondaries:9,rectrices:12,tailLength:.82,fork:0,spread:.4,dihedral:.06,flapAmp:.38,flapSpeed:3.1});
 for(let i=0;i<3;i++){const bar=sphere(.2,'#6d5236',10,8);bar.scale.set(1.15,.17,.3);bar.position.set(0,-.245-i*.04,-.52+i*.17);g.add(bar)}
 for(let i=0;i<4;i++){const streak=sphere(.16,'#6d5236',8,7);streak.scale.set(.2,.22,1.5);streak.position.set((i-1.5)*.13,-.32,.12);g.add(streak)}return g}
function otter(){const g=animalBody('#76513b','#241a14');g.scale.set(.9,.75,1.15);const tail=mesh(new T.ConeGeometry(.22,1.7,8),mat('#654331'));tail.rotation.x=-Math.PI/2;tail.position.set(0,-.05,1.3);g.add(tail);for(const x of[-.3,.3])for(const z of[-.2,.25]){const leg=cylinder(.07,.08,.5,tint('#5c4230',.08),7);leg.position.set(x,-.55,z);g.add(leg)}return g}

type FieldSpec=Omit<FieldObject,'object'|'home'|'phase'|'kind'>&{kind?:'animal'|'plant';position:[number,number,number];make:()=>T.Group};
const creatureSpecs:FieldSpec[]=[
 {name:'White-tailed Deer',icon:'🦌',biome:'woodland',position:[-5,1,1],make:deer,fact:'I munch on leaves and help return nutrients to the soil. When I sense danger, my alert ears can warn other animals nearby.',question:'How does the deer help the forest?',choices:['It returns nutrients to the soil','It pollinates the river'],answer:0},
 {name:'Red Fox',icon:'🦊',biome:'woodland',position:[10,.9,-5],make:fox,fact:'I hunt mice and other small animals. This keeps any one group from growing too large and helps the forest stay balanced.',question:'How does the fox help the forest?',choices:['It keeps animal groups balanced','It stops trees from growing'],answer:0},
 {name:'Eastern Cottontail',icon:'🐇',biome:'woodland',position:[-11,.7,-8],make:rabbit,fact:'I like places where meadows meet the forest. I can find food in the grass and quickly hide under bushes when danger comes.',question:'Why does the rabbit live near the forest edge?',choices:['It finds food and hiding places','It needs open pavement'],answer:0},
 {name:'Brook Trout',icon:'🐟',biome:'underwater',position:[2,-5,-3],make:()=>fish('#d68e50'),fact:'I need cold, clean water with plenty of oxygen. Trees shade the stream like an umbrella and stop my home from getting too warm.',question:'How do trees help the trout?',choices:['Their shade keeps the water cool','They make the river warmer'],answer:0},
 {name:'River Turtle',icon:'🐢',biome:'underwater',position:[-2,-8,4],make:turtle,fact:'I travel between water and sunny banks. Logs and stones above the water help me warm my body after a cold swim.',question:'Why does the turtle visit the bank?',choices:['To warm its body','To grow feathers'],answer:0},
 {name:'Freshwater Ray',icon:'RAY',biome:'underwater',position:[6,-7,-9],make:ray,fact:'My flat body helps me glide over the river floor. I search the soft sand and mud for tiny creatures to eat.',question:'Where does the ray search for food?',choices:['On the river floor','Inside the clouds'],answer:0},
 {name:'Bald Eagle',icon:'🦅',biome:'sky',position:[-3,16,-4],make:eagle,fact:'Warm air rises and lifts my wide wings. I can circle high above the river without flapping all the time.',question:'What helps the eagle stay in the air?',choices:['Warm rising air','Cold sinking stones'],answer:0},
 {name:'Tree Swallow',icon:'🐦',biome:'sky',position:[9,12,2],make:swallow,fact:'I catch insects while flying. Many of those insects begin life near water, so the river helps fill the sky with my food.',question:'How does the river help the swallow?',choices:['It is home to young insects','It grows underwater acorns'],answer:0},
 {name:'Monarch Butterfly',icon:'🦋',biome:'sky',position:[-10,9,-7],make:butterfly,fact:'I travel a very long way each year. Patches of milkweed and nectar flowers are like snack stops along my journey.',question:'What helps the monarch on its long trip?',choices:['Patches of flowers','One enormous tree'],answer:0},
 {name:'Bengal Tiger',icon:'🐅',biome:'woodland',position:[13,1.2,8],make:tiger,fact:'I am one of the forest’s top hunters. Protecting my large home also protects many smaller animals and plants that live here.',question:'Why does protecting a tiger help the forest?',choices:['Many species share its home','Its stripes make trees grow'],answer:0},
 {name:'Green Frog',icon:'🐸',biome:'woodland',position:[5,.45,-1],make:frog,fact:'My thin skin takes in water and is sensitive to pollution. If frogs begin to disappear, scientists know the habitat may be in trouble.',question:'What can frogs tell scientists?',choices:['If the habitat is healthy','How old the clouds are'],answer:0},
 {name:'Barred Owl',icon:'🦉',biome:'sky',position:[-14,8,5],make:owl,fact:'The soft edges of my feathers quiet the sound of my wings. This helps me listen for food and fly close without being heard.',question:'What is special about the owl’s feathers?',choices:['They make flight quieter','They glow underwater'],answer:0},
 {name:'River Otter',icon:'🦦',biome:'underwater',position:[-2,-3,-8],make:otter,fact:'I need clean rivers with plenty of fish and safe places along the bank. Seeing me can be a sign that the river is healthy.',question:'What does an otter need?',choices:['A clean river with fish','Dry desert dunes'],answer:0},
 {name:'Eastern Hemlock',icon:'🌲',kind:'plant',biome:'woodland',position:rooted(-8,7,1.35),make:()=>tree(0,0,1.35),fact:'My branches stay green all year. They shade the stream to keep it cool and give birds a safe place during winter.',question:'How does this tree help the stream?',choices:['Its shade keeps the water cool','It removes all oxygen'],answer:0},
 {name:'Young Pine',icon:'🌱',kind:'plant',biome:'woodland',position:rooted(16,-10,.9),make:()=>tree(0,0,.9),fact:'My roots hold the soil together when rain falls. My old needles also break down and feed the forest floor.',question:'What do pine roots help stop?',choices:['Soil washing away','Moonlight'],answer:0},
];
const creatures:FieldObject[]=creatureSpecs.map((spec,index)=>{const object=spec.make();object.position.fromArray(spec.position);object.traverse(child=>{child.userData.creature=index});scene.add(object);return{...spec,kind:spec.kind??'animal',object,home:object.position.clone(),phase:random()*Math.PI*2}});
const sceneLights=new Set<T.Object3D>([hemi,sun,fill,rim]);const exampleSceneObjects=scene.children.filter(child=>!sceneLights.has(child));

const discoveries=document.querySelector('#discoveries')!;const RAY_ICON='<svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true"><path d="M16 6c3 4 10 5 14 6-3 3-8 4-11 6l-1 9-2 0-1-9c-3-2-8-3-11-6 4-1 11-2 14-6z" fill="#7fb2c9"/><circle cx="13" cy="13" r="1.2" fill="#173042"/><circle cx="19" cy="13" r="1.2" fill="#173042"/></svg>';
const journalGroups:{biome:Biome;label:string}[]=[{biome:'woodland',label:'Woodland'},{biome:'underwater',label:'River'},{biome:'sky',label:'Sky'}];
const shortName=(name:string)=>name.split(' ').pop()!;
discoveries.innerHTML=journalGroups.map(g=>{const members=creatures.map((c,i)=>({c,i})).filter(({c})=>c.biome===g.biome);return `<div class="journal-group"><div class="journal-group-head"><span>${g.label}</span><span data-group-count="${g.biome}">0 / ${members.length}</span></div><div class="journal-grid">${members.map(({c,i})=>`<button type="button" class="discovery" data-index="${i}" disabled aria-label="Undiscovered ${c.kind==='plant'?'plant':'animal'}" title="Undiscovered"><span class="d-icon">${c.icon==='RAY'?RAY_ICON:c.icon}</span><span class="d-name">???</span></button>`).join('')}</div></div>`}).join('');
function markFound(index:number){const c=creatures[index];const badge=document.querySelector<HTMLButtonElement>(`.discovery[data-index="${index}"]`);if(badge){badge.classList.add('found');badge.disabled=false;badge.title=`${c.name} — open field note`;badge.setAttribute('aria-label',`${c.name}, discovered. Open field note`);badge.querySelector('.d-name')!.textContent=shortName(c.name);}
 const total=creatures.filter(o=>o.biome===c.biome).length,done=[...found].filter(i=>creatures[i].biome===c.biome).length;document.querySelector(`[data-group-count="${c.biome}"]`)!.textContent=`${done} / ${total}`;}
document.querySelector('#progress-count')!.textContent=`0 / ${creatures.length}`;
 const found=new Set<number>();const keys=new Set<string>();let yaw=0,pitch=-.06,currentBiome:Biome='woodland',nearby=-1,dialogueOpen=false,helpOpen=false,generatedMode=false,dialogueSession=0,started=false,musicOn=true,listenName='';
let generatedScene:GeneratedSceneHandle|null=null;
const velocity=new T.Vector3(),forward=new T.Vector3(),right=new T.Vector3();const clock=new T.Clock();
const raycaster=new T.Raycaster();const pointer=new T.Vector2();const personalizedCopy=new Map<number,string>();
let visitor:guide.VisitorProfile={name:'Explorer',interests:'wildlife and ecosystems',style:'curious'};
const zones:Record<Biome,{name:string;code:string;copy:string;color:string;fog:string}>={underwater:{name:'River Below',code:'Biome 01 · Freshwater',copy:'Descend through the surface and follow the lives hidden beneath the current.',color:'#176d7d',fog:'#145b68'},woodland:{name:'Woodland',code:'Biome 02 · Temperate',copy:'Follow the river, listen closely, and meet the lives that keep this forest in balance.',color:'#91c7c8',fog:'#8bb8a7'},sky:{name:'Open Sky',code:'Biome 03 · Canopy',copy:'Rise above the branches to see how wind, water, and migration connect distant habitats.',color:'#88c5df',fog:'#a9d2dc'}};
function setBiome(biome:Biome){if(currentBiome===biome)return;const from=currentBiome;currentBiome=biome;if(started){if(from==='underwater'||biome==='underwater')mixer.playSplash();if(biome==='sky')mixer.playWind()}const z=zones[biome];document.querySelector('#zone-name')!.textContent=z.name;document.querySelector('#zone-code')!.textContent=z.code;document.querySelector('#zone-copy')!.textContent=z.copy;world.classList.toggle('underwater',biome==='underwater');document.querySelectorAll<HTMLButtonElement>('[data-biome]').forEach(b=>b.classList.toggle('active',b.dataset.biome===biome));}
function travel(biome:Biome){const destinations:Record<Biome,T.Vector3>={underwater:new T.Vector3(0,-5,12),woodland:new T.Vector3(0,3.5,15),sky:new T.Vector3(0,14,16)};camera.position.copy(destinations[biome]);pitch=biome==='sky'?-0.12:0;setBiome(biome);renderer.domElement.requestPointerLock().catch(()=>{});}

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
 camera.position.fromArray(result.scene.camera.position);const target=new T.Vector3().fromArray(result.scene.camera.target),direction=target.clone().sub(camera.position).normalize();yaw=Math.atan2(-direction.x,-direction.z);pitch=Math.asin(T.MathUtils.clamp(direction.y,-1,1));
 document.querySelector('#generated-title')!.textContent=result.scene.title;document.querySelector('#generated-summary')!.textContent=result.scene.summary;
 document.querySelector<HTMLElement>('#generated-hud')!.hidden=false;document.querySelector<HTMLElement>('#generated-info')!.hidden=true;
 document.querySelector('#ai-status')!.textContent=result.source==='nvidia'?'Image scene generated':'Starter scene generated';document.querySelector('#intro')!.classList.add('hidden');
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
function closeDialogue(){dialogueOpen=false;dialogueSession+=1;mixer.endEncounter();document.querySelector('#dialogue')!.classList.remove('open');}
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
function restoreExampleWorld(){generatedScene?.dispose();generatedScene=null;generatedMode=false;exampleSceneObjects.forEach(object=>{object.visible=true});document.body.classList.remove('generated-mode');document.querySelector<HTMLElement>('#generated-hud')!.hidden=true;document.querySelector<HTMLElement>('#generated-info')!.hidden=true;scene.background=new T.Color(zones.woodland.color);scene.fog=new T.FogExp2(zones.woodland.fog,.018);camera.position.set(0,3.5,15);yaw=0;pitch=-.06;currentBiome='woodland'}
document.querySelector('#choose-example')!.addEventListener('click',()=>{restoreExampleWorld();showStage(profileStage);document.querySelector<HTMLInputElement>('#visitor-name')!.focus()});
document.querySelector('#choose-create')!.addEventListener('click',()=>showStage(creatorStage));
document.querySelector('#creator-back')!.addEventListener('click',()=>showStage(entryStage));
document.querySelector('#new-scene')!.addEventListener('click',()=>{started=false;document.querySelector('#intro')!.classList.remove('hidden');showStage(creatorStage)});
document.querySelector('#generated-info-close')!.addEventListener('click',()=>{document.querySelector<HTMLElement>('#generated-info')!.hidden=true});
const sceneInput=document.querySelector<HTMLInputElement>('#scene-image')!,scenePreview=document.querySelector<HTMLImageElement>('#scene-preview')!,creatorError=document.querySelector<HTMLElement>('#creator-error')!;let previewUrl='';
sceneInput.addEventListener('change',()=>{creatorError.textContent='';if(previewUrl)URL.revokeObjectURL(previewUrl);const file=sceneInput.files?.[0];if(!file){scenePreview.hidden=true;return}previewUrl=URL.createObjectURL(file);scenePreview.src=previewUrl;scenePreview.hidden=false;document.querySelector<HTMLElement>('#upload-prompt')!.hidden=true});
document.querySelector<HTMLFormElement>('#scene-creator')!.addEventListener('submit',async event=>{
 event.preventDefault();const file=sceneInput.files?.[0];if(!file){creatorError.textContent='Choose an image first.';return}
 const button=document.querySelector<HTMLButtonElement>('#generate-scene')!;button.disabled=true;creatorError.textContent='';mixer.startMusic();showLoading('Reading your picture','Building your 3D world','Finding the important shapes, labels, and learning moments. Detailed diagrams can take about a minute.');
 try{const result=await generateScene(file);activateGeneratedScene(result)}catch(error){showStage(creatorStage);creatorError.textContent=error instanceof Error?error.message:'We could not build that scene. Please try another image.'}finally{button.disabled=false}
});
document.querySelector<HTMLFormElement>('#profile')!.addEventListener('submit',async event=>{
 event.preventDefault();
 mixer.startMusic();document.querySelector('#sound')!.textContent=musicOn?'♫':'♪';
 visitor={name:(document.querySelector<HTMLInputElement>('#visitor-name')!.value.trim()||'Explorer'),interests:(document.querySelector<HTMLInputElement>('#visitor-interests')!.value.trim()||'wildlife and ecosystems'),style:document.querySelector<HTMLSelectElement>('#visitor-style')!.value};
 const button=document.querySelector<HTMLButtonElement>('#begin')!;button.disabled=true;showLoading('Preparing your journey','Connecting the living world','Building a field guide around your curiosity.');
 const minimumLoadingTime=new Promise<void>(resolve=>setTimeout(resolve,900));
 try{const answer=await guide.getPersonalizedText(visitor);await minimumLoadingTime;document.querySelector('#ai-status')!.textContent=answer.source==='nvidia'?'Personal guide online':'Local guide mode';void mixer.speak(answer.text).catch(()=>{});}
 catch{await minimumLoadingTime;document.querySelector('#ai-status')!.textContent='Local guide mode';void mixer.speak(guide.localWelcome(visitor)).catch(()=>{});}
 started=true;document.querySelector('#intro')!.classList.add('hidden');
});
renderer.domElement.addEventListener('click',event=>{if(!started||dialogueOpen||helpOpen)return;const rect=renderer.domElement.getBoundingClientRect();if(document.pointerLockElement===renderer.domElement)pointer.set(0,0);else pointer.set(((event.clientX-rect.left)/rect.width)*2-1,-((event.clientY-rect.top)/rect.height)*2+1);raycaster.setFromCamera(pointer,camera);if(generatedMode&&generatedScene){const generatedHit=raycaster.intersectObjects(generatedScene.interactiveObjects,true)[0];if(generatedHit){showGeneratedObject(generatedHit.object);return}renderer.domElement.requestPointerLock().catch(()=>{});return}const hit=raycaster.intersectObjects(creatures.map(c=>c.object),true).find(intersection=>intersection.object.userData.creature!==undefined);if(hit){openDialogue(Number(hit.object.userData.creature));return}renderer.domElement.requestPointerLock().catch(()=>{});});
document.addEventListener('mousemove',event=>{if(document.pointerLockElement!==renderer.domElement||dialogueOpen||helpOpen)return;yaw-=event.movementX*.0022;pitch=T.MathUtils.clamp(pitch-event.movementY*.002,-Math.PI/2+.04,Math.PI/2-.04)});
document.addEventListener('keydown',event=>{if(event.code==='Escape'&&helpOpen){setHelpOpen(false);return}if(event.code==='Escape'&&!document.querySelector<HTMLElement>('#generated-info')!.hidden){document.querySelector<HTMLElement>('#generated-info')!.hidden=true;return}keys.add(event.code);if(event.code==='KeyE'&&generatedMode&&generatedScene&&!helpOpen){pointer.set(0,0);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(generatedScene.interactiveObjects,true)[0];if(hit)showGeneratedObject(hit.object)}else if(event.code==='KeyE'&&nearby>=0&&!dialogueOpen&&!helpOpen)openDialogue(nearby);if(event.code==='Escape'&&dialogueOpen)closeDialogue()});document.addEventListener('keyup',event=>keys.delete(event.code));

document.querySelector('#sound')!.addEventListener('click',()=>{musicOn=!musicOn;document.querySelector('#sound')!.textContent=musicOn?'♫':'♪';mixer.setMusicEnabled(musicOn)});

function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2))}addEventListener('resize',resize);
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04),time=clock.elapsedTime;
 camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);
 if(!dialogueOpen&&!helpOpen&&started){forward.set(-Math.sin(yaw),0,-Math.cos(yaw));right.set(Math.cos(yaw),0,-Math.sin(yaw));velocity.set(0,0,0);if(keys.has('KeyW'))velocity.add(forward);if(keys.has('KeyS'))velocity.sub(forward);if(keys.has('KeyD'))velocity.add(right);if(keys.has('KeyA'))velocity.sub(right);if(keys.has('Space'))velocity.y+=1;if(keys.has('ShiftLeft')||keys.has('ShiftRight'))velocity.y-=1;if(velocity.lengthSq())camera.position.addScaledVector(velocity.normalize(),dt*(keys.has('ControlLeft')?11:6.2));camera.position.x=T.MathUtils.clamp(camera.position.x,-29,29);camera.position.z=T.MathUtils.clamp(camera.position.z,-29,29);camera.position.y=T.MathUtils.clamp(camera.position.y,-10.4,27)}
 if(generatedMode){generatedScene?.update(time);mixer.notifyNearby(-1,null,null);document.querySelector('#hint')!.classList.remove('visible');hemi.intensity=T.MathUtils.lerp(hemi.intensity,2.3,dt*2);sun.intensity=T.MathUtils.lerp(sun.intensity,3.2,dt*2)}else{
 const y=camera.position.y;const biome:Biome=currentBiome==='underwater'?(y>-.15?(y>8?'sky':'woodland'):'underwater'):currentBiome==='sky'?(y<7.2?(y<-.8?'underwater':'woodland'):'sky'):(y<-.8?'underwater':y>8?'sky':'woodland');setBiome(biome);const zone=zones[biome];(scene.background as T.Color).lerp(new T.Color(zone.color),dt*1.5);(scene.fog as T.FogExp2).color.lerp(new T.Color(zone.fog),dt*1.5);(scene.fog as T.FogExp2).density=T.MathUtils.lerp((scene.fog as T.FogExp2).density,biome==='underwater'?.055:.018,dt*2);hemi.intensity=T.MathUtils.lerp(hemi.intensity,biome==='underwater'?1.15:2.3,dt*2);sun.intensity=T.MathUtils.lerp(sun.intensity,biome==='underwater'?.5:3.2,dt*2);
 creatures.forEach(c=>{c.object.position.y=c.home.y+Math.sin(time*(c.biome==='woodland'?1.3:2)+c.phase)*(c.biome==='woodland'?.06:.35);if(c.biome!=='woodland')c.object.rotation.y=Math.sin(time*.35+c.phase)*.45;if(c.biome==='sky')c.object.rotation.z=Math.cos(time*.35+c.phase)*.2});
 wingBeats.forEach(w=>{w.pivot.rotation.z=w.rest+Math.sin(time*w.speed+w.phase)*w.amp});bubbles.forEach(b=>{b.position.y+=dt*b.userData.speed;if(b.position.y>-.4)b.position.y=-10.5});riverMaterial.opacity=.74+Math.sin(time*.8)*.04;
 for(let i=0;i<riverPosition.count;i++){const x=riverPosition.getX(i),y=riverPosition.getY(i);riverPosition.setZ(i,Math.sin(x*.6+time*1.4)*.03+Math.sin(y*.35+time*.9)*.022)}riverPosition.needsUpdate=true;riverGeometry.computeVertexNormals();
 swayables.forEach(s=>{s.object.rotation.z=Math.sin(time*1.6+s.phase)*s.strength});
 cloudDrifters.forEach(cd=>{cd.object.position.x+=dt*.18;if(cd.object.position.x>34)cd.object.position.x=-34;cd.object.position.y+=Math.sin(time*.15+cd.phase)*.003});
 nearby=-1;let best=6;let plantNear=-1;let plantBest=14;camera.getWorldDirection(forward);creatures.forEach((c,i)=>{const dx=c.object.position.x-camera.position.x,dz=c.object.position.z-camera.position.z,ground=Math.hypot(dx,dz);const to=c.object.position.clone().sub(camera.position),distance=to.length();if(distance<best&&to.normalize().dot(forward)>.35){best=distance;nearby=i}if(c.kind==='plant'&&ground<plantBest){plantBest=ground;plantNear=i}});if(started&&!dialogueOpen)mixer.notifyNearby(plantNear,plantNear>=0?creatures[plantNear].name:null,plantNear>=0?'plant':null);else mixer.notifyNearby(-1,null,null);const hint=document.querySelector('#hint')!;hint.classList.toggle('visible',nearby>=0&&!dialogueOpen);if(nearby>=0)hint.querySelector('span')!.textContent=creatures[nearby].kind==='plant'?`Listen to the ${creatures[nearby].name}`:`Meet the ${creatures[nearby].name}`;}
 document.querySelector('#altitude')!.textContent=`${camera.position.y>=0?'+':'−'}${Math.abs(camera.position.y).toFixed(1).padStart(4,'0')} m`;renderer.render(scene,camera)}animate();


