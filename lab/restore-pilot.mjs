import fs from 'node:fs';import zlib from 'node:zlib';import crypto from 'node:crypto';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(fs.readFileSync('lab/assets/pilot-manifest.json','utf8'));
const input=Buffer.from(manifest.parts.map(n=>fs.readFileSync('lab/assets/'+n,'utf8')).join(''),'base64');if(sha(input)!==manifest.sha256)throw Error('Pilot pack checksum mismatch');
for(const file of JSON.parse(zlib.gunzipSync(input))){if(!/^lab\/assets\/abaya-[\w.-]+$/.test(file.path))throw Error('Unsafe asset path');const b=Buffer.from(file.data,'base64');if(sha(b)!==file.sha256)throw Error('Pilot file checksum mismatch');fs.writeFileSync(file.path,b);}
const b64=fs.readFileSync('lab/assets/abaya-pilot.glb').toString('base64');const report=JSON.parse(fs.readFileSync('lab/assets/abaya-pilot.report.json','utf8'));
fs.mkdirSync('generated',{recursive:true});fs.writeFileSync('generated/pilot-glb.js','export const pilotBase64='+JSON.stringify(b64)+';\nexport const pilotReport='+JSON.stringify(report)+';\n');console.log('Restored authored Blender source and actual cloth bake, with SHA256 verification');
