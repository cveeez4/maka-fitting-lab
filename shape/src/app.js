import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {asset,reference} from '../../generated/shape-data.js';
import {createRenderScheduler} from '../../lab/src/render-scheduler.js';
const $=s=>document.querySelector(s); const viewport=$('#viewport');
$('#reference').src=reference;$('#reference-full').src=reference;
const openReference=()=>$('#reference-dialog').showModal();$('#reference-button').onclick=openReference;$('#expand-reference').onclick=openReference;$('#close-reference').onclick=()=>$('#reference-dialog').close();
const scene=new THREE.Scene();scene.background=new THREE.Color('#ebe7e0');
const camera=new THREE.PerspectiveCamera(32,1,.02,12);
let renderer,root,scheduler,controls,visible=true;let activeView='front';let mode='clay';const originals=new Map(),clays=new Map();
const views={front:[0,.90,3.35,0,.84,0],three:[1.9,1.02,2.85,0,.84,0],side:[3.35,.94,0,0,.84,0],back:[0,.94,-3.35,0,.84,0],neck:[.12,1.43,.55,0,1.33,0],cuff:[1.02,1.10,1.05,.35,.97,0]};
function setView(name){activeView=name;const v=views[name];camera.position.set(...v.slice(0,3));controls.target.set(...v.slice(3));controls.update();document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===name)));scheduler.invalidate(650);}
function setMode(next){mode=next;root.traverse(o=>{if(o.isMesh&&originals.has(o))o.material=next==='clay'?clays.get(o):originals.get(o);});document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===next)));$('#mode-label').textContent=next==='clay'?'خامة رمادية محايدة':'لون تقريبي وزخرفة هندسية — مش مسح للخامة';scheduler.invalidate();}
function resize(){const w=viewport.clientWidth,h=viewport.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w<440?37:32;camera.updateProjectionMatrix();scheduler?.invalidate();}
async function init(){
renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.10;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;viewport.append(renderer.domElement);
controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.12;controls.minDistance=.2;controls.maxDistance=4.5;controls.maxPolarAngle=Math.PI*.85;
scene.add(new THREE.HemisphereLight(0xffffff,0xb9b0a3,2.2));
const key=new THREE.DirectionalLight(0xfff5e8,3);key.position.set(-2.2,3,3);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-1.3,right:1.3,top:2,bottom:-1,near:.1,far:8});key.shadow.bias=-.00015;key.shadow.normalBias=.002;key.shadow.radius=4;scene.add(key);
const fill=new THREE.DirectionalLight(0xe8edff,.7);fill.position.set(2,1.6,-1);scene.add(fill);
const floor=new THREE.Mesh(new THREE.CircleGeometry(1.0,96),new THREE.MeshStandardMaterial({color:'#e1dcd3',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.007;floor.receiveShadow=true;scene.add(floor);
const parsed=await new GLTFLoader().parseAsync(Uint8Array.from(atob(asset),c=>c.charCodeAt(0)).buffer,'');root=parsed.scene;scene.add(root);let triangles=0;
root.traverse(o=>{if(!o.isMesh)return;const mats=Array.isArray(o.material)?o.material:[o.material];o.castShadow=true;o.receiveShadow=false;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3; originals.set(o,o.material);const clay=mats.map(m=>new THREE.MeshStandardMaterial({name:m.name+'_clay',color:m.name.includes('mannequin')?'#827e78':m.name.includes('inner')?'#d2cfc8':'#aaa7a0',roughness:.92,metalness:0,side:m.side}));clays.set(o,Array.isArray(o.material)?clay:clay[0]);});
scheduler=createRenderScheduler({render:()=>{controls.update();renderer.render(scene,camera);window.__shape.frames++;},isActive:()=>visible&&!document.hidden});controls.addEventListener('change',()=>scheduler.invalidate());controls.addEventListener('start',()=>scheduler.invalidate());
new ResizeObserver(resize).observe(viewport);new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible)scheduler.resume();else scheduler.pause();}).observe(viewport);document.addEventListener('visibilitychange',()=>document.hidden?scheduler.pause():scheduler.resume());
window.__shape={ready:true,frames:0,triangles,mode:()=>mode,activeView:()=>activeView,mannequin:()=>$('#body-toggle').checked};
$('#asset-info').textContent=`عدد مثلثات المشهد شامل المانيكان والتفاصيل: ${Math.round(triangles).toLocaleString('en-US')}. لا تُعد كثافة المجسم دليلًا على الواقعية.`;
setMode('clay');resize();setView('front');$('#loading').hidden=true;
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
$('#body-toggle').onchange=()=>{root.traverse(o=>{if(o.name.startsWith('MAKA_COLLIDER_body'))o.visible=$('#body-toggle').checked;});scheduler.invalidate();};$('#reset').onclick=()=>setView('front');
$('#save').onclick=()=>{renderer.render(scene,camera);const a=document.createElement('a');a.download='maka-shape-review-'+mode+'.png';a.href=renderer.domElement.toDataURL('image/png');a.click();};
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();scheduler.pause();$('#loading').hidden=false;$('#loading').textContent='العرض اتوقف مؤقتًا؛ في انتظار استعادة الرسوم.';});renderer.domElement.addEventListener('webglcontextrestored',()=>{$('#loading').hidden=true;scheduler.resume();});
}
init().catch(e=>{$('#loading').textContent='تعذّر تشغيل العرض: '+e.message;$('#status').textContent='المعاينة لم تُحمّل. جرّبي متصفحًا يدعم WebGL.';console.error(e);});
