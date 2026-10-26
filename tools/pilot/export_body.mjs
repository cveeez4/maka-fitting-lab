import fs from 'node:fs';
import {reconstructVertices} from '../../vendor/body-model/src/shape.js';
import {createSkeleton} from '../../vendor/body-model/src/skeleton.js';
import {loadBodyModelFromDisk} from '../../vendor/body-model/src/node.js';
import {bodyCoefficients,defaults} from '../../src/measurements.js';
const model=await loadBodyModelFromDisk(undefined,{gender:'female'});
const v=reconstructVertices(model.baseModel,model.coefficients,bodyCoefficients(model,defaults));
let min=Infinity,max=-Infinity;for(let i=1;i<v.length;i+=3){min=Math.min(min,v[i]);max=Math.max(max,v[i]);}const scale=1.65/(max-min);
const verts=[];for(let i=0;i<v.length;i+=3)verts.push([v[i]*scale,-v[i+2]*scale,(v[i+1]-min)*scale]);
const faces=[];for(let i=0;i<model.indices.length;i+=3)faces.push([model.indices[i],model.indices[i+1],model.indices[i+2]]);
const skeleton=createSkeleton(model.baseModel,v);const bones={};for(const [name,i] of skeleton.indexOf){const b=skeleton.bones[i].world;bones[name]=[b[12]*scale,-b[14]*scale,(b[13]-min)*scale];}
fs.mkdirSync('generated/pilot',{recursive:true});fs.writeFileSync('generated/pilot/body.json',JSON.stringify({vertices:verts,faces,bones,measurements:defaults,limitations:'Experimental statistical collider; circumferences are not calibrated.'}));console.log('Exported original body collider and pose');
