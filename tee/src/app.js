import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {asset,report} from '../../generated/tee-data.js';
import {createRenderScheduler} from '../../lab/src/render-scheduler.js';
const $=s=>document.querySelector(s);const viewport=$('#viewport');
const scene=new THREE.Scene();scene.background=new THREE.Color('#e5e9e3');const camera=new THREE.PerspectiveCamera(34,1,.02,12);
let renderer,root,scheduler,controls,visible=true,contextLost=false,activeView='front',mode='clay';const shirts=[];const originals=new Map(),clays=new Map();
const views={front:[0,1.20,1.93,0,1.17,0],three:[1.25,1.26,1.62,0,1.17,0],side:[1.98,1.20,0,0,1.17,0],back:[0,1.20,-1.93,0,1.17,0],neck:[.09,1.53,.66,0,1.35,0],armhole:[1.02,1.27,.83,.22,1.22,0]};
function setView(name){activeView=name;const v=views[name];camera.position.set(...v.slice(0,3));controls.target.set(...v.slice(3));controls.update();document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===name)));scheduler.invalidate(650);}
function setMode(next){mode=next;for(const o of shirts)o.material=next==='clay'?clays.get(o):originals.get(o);document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===next)));scheduler.invalidate();}
function resize(){const w=viewport.clientWidth,h=viewport.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w<440?40:34;camera.updateProjectionMatrix();scheduler?.invalidate();}
async function init(){
 renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;viewport.append(renderer.domElement);
 controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.15;controls.minDistance=.25;controls.maxDistance=3.5;controls.maxPolarAngle=Math.PI*.83;
 scene.add(new THREE.HemisphereLight(0xffffff,0x889482,2));const key=new THREE.DirectionalLight(0xfffaf2,2.3);key.position.set(-2.5,3,3);scene.add(key);const fill=new THREE.DirectionalLight(0xf0f4ff,.7);fill.position.set(2,1.3,-2);scene.add(fill);
 const gltf=await new GLTFLoader().parseAsync(Uint8Array.from(atob(asset),c=>c.charCodeAt(0)).buffer,'');root=gltf.scene;scene.add(root);let triangles=0;let bodyMesh=root.getObjectByName('Mannequin_fixed');
 root.traverse(o=>{if(!o.isMesh)return;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;if(!o.name.startsWith('TEE_'))return;shirts.push(o);const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){m.color.set(m.name==='TEE_rib'?'#cdd0c6':'#e5e5d9');m.roughness=.95;m.metalness=0;}originals.set(o,o.material);const gray=mats.map(m=>new THREE.MeshStandardMaterial({name:m.name+'_clay',color:m.name==='TEE_rib'?'#858e83':'#a4aca0',roughness:.95,metalness:0,side:m.side}));clays.set(o,Array.isArray(o.material)?gray:gray[0]);});
 if(!shirts.length||!bodyMesh)throw Error('بيانات التيشيرت أو المانيكان ناقصة');
 window.__tee={ready:true,frames:0,triangles,shirtMeshes:shirts.length,mode:()=>mode,view:()=>activeView,bodyVisible:()=>bodyMesh.visible,report};
 scheduler=createRenderScheduler({render:()=>{controls.update();renderer.render(scene,camera);window.__tee.frames++;},isActive:()=>visible&&!document.hidden&&!contextLost});controls.addEventListener('change',()=>scheduler.invalidate());controls.addEventListener('start',()=>scheduler.invalidate());
 new ResizeObserver(resize).observe(viewport);new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible)scheduler.resume();else scheduler.pause();}).observe(viewport);document.addEventListener('visibilitychange',()=>document.hidden?scheduler.pause():scheduler.resume());
 $('#body-toggle').onchange=()=>{bodyMesh.visible=$('#body-toggle').checked;scheduler.invalidate();};document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
 $('#simulation-note').textContent=report.offlineDrape?`اتنفّذت تجربة Blender خارج المتصفح لمدة ${report.framesExecuted} إطارًا، مع تثبيت أعلى الكتف والرقبة. المعروض نتيجة ثابتة، مش محاكاة مباشرة. التجربة لا تثبت معايرة القماش أو استقراره أو خلوّه من التداخلات.`:'هندسة ثابتة لمراجعة القصّة فقط؛ لم تُعتمد نتيجة محاكاة القماش.';
 $('#asset-info').textContent=`المشهد: ${Math.round(triangles).toLocaleString('en-US')} مثلث شامل المانيكان. عدد المضلعات مش معيارًا للجودة البصرية.`;
 $('#kind').textContent=report.offlineDrape?'تجربة انسدال أولى — غير معتمدة':'هندسة أولية — غير معتمدة';
 $('#save').onclick=()=>{renderer.render(scene,camera);const a=document.createElement('a');a.download='maka-tee-01-'+mode+'.png';a.href=renderer.domElement.toDataURL('image/png');a.click();};
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;scheduler.pause();$('#loading').hidden=false;$('#loading').textContent='العرض اتوقف مؤقتًا؛ بننتظر رجوع الرسوم.';});renderer.domElement.addEventListener('webglcontextrestored',()=>{contextLost=false;$('#loading').hidden=true;scheduler.resume();});
 resize();setMode('clay');setView('front');$('#loading').hidden=true;
}
init().catch(e=>{$('#loading').textContent='تعذّر تشغيل المعاينة: '+e.message;console.error(e);});
