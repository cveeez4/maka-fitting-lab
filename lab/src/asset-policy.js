export const limits=Object.freeze({bytes:20*1024*1024,triangles:150000,materials:32,textures:24,textureDimension:2048});
export function inspectGLB(buffer){
 if(!(buffer instanceof ArrayBuffer)||buffer.byteLength<20)throw Error('الملف مش GLB صالح.');
 if(buffer.byteLength>limits.bytes)throw Error('الحد الأقصى للملف 20 ميجابايت.');
 const d=new DataView(buffer);if(d.getUint32(0,true)!==0x46546c67||d.getUint32(4,true)!==2||d.getUint32(8,true)!==buffer.byteLength)throw Error('مطلوب ملف GLB 2.0 كامل.');
 let json;for(let o=12;o<buffer.byteLength;){if(o+8>buffer.byteLength)throw Error('بنية GLB غير مكتملة.');const len=d.getUint32(o,true),type=d.getUint32(o+4,true);if(o+8+len>buffer.byteLength)throw Error('بنية GLB غير مكتملة.');if(type===0x4e4f534a)json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,o+8,len)).trim());o+=8+len;}
 if(!json||json.asset?.version!=='2.0')throw Error('بيانات GLB غير صالحة.');
 for(const item of [...json.buffers||[],...json.images||[]])if(item.uri&&!item.uri.startsWith('data:'))throw Error('الملف فيه روابط خارجية. صدّري GLB بخامات مضمّنة.');
 const unsupported=['KHR_draco_mesh_compression','EXT_meshopt_compression','KHR_texture_basisu'];if((json.extensionsUsed||[]).some(x=>unsupported.includes(x)))throw Error('صدّري GLB من غير Draco أو Meshopt أو KTX2 في التجربة الحالية.');
 if((json.materials?.length||0)>limits.materials||(json.textures?.length||0)>limits.textures)throw Error('عدد الخامات أو الصور أكبر من ميزانية التجربة.');
 let triangles=0;for(const mesh of json.meshes||[])for(const p of mesh.primitives||[]){if(p.mode!==undefined&&p.mode!==4)throw Error('مطلوب شبكة مثلثات Triangle mesh.');const n=json.accessors?.[p.indices??p.attributes?.POSITION]?.count;if(!Number.isSafeInteger(n)||n<0)throw Error('عدد رؤوس غير صالح.');triangles+=n/3;}
 if(triangles>limits.triangles)throw Error('الشبكة أكبر من 150 ألف مثلث.');
 return {triangles:Math.floor(triangles),materials:json.materials?.length||0,textures:json.textures?.length||0};
}
export function inspectLoaded(root){let triangles=0,meshes=0;root.traverse(o=>{if(!o.isMesh)return;meshes++;const pos=o.geometry?.attributes?.position;if(!pos)throw Error('شبكة من غير رؤوس.');for(const n of pos.array)if(!Number.isFinite(n))throw Error('الشبكة فيها أرقام غير صالحة.');triangles+=(o.geometry.index?.count??pos.count)/3;for(const m of Array.isArray(o.material)?o.material:[o.material])for(const v of Object.values(m||{})){if(v?.isTexture){const im=v.image;if(im&&Math.max(im.width||0,im.height||0)>limits.textureDimension)throw Error('صور الخامات أكبر من 2048 بكسل.');}}});if(!meshes||triangles>limits.triangles)throw Error('الموديل فارغ أو أكبر من ميزانية المثلثات.');return {triangles:Math.round(triangles),meshes};}
