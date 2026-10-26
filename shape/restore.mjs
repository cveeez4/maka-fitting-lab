import fs from 'node:fs';import zlib from 'node:zlib';import crypto from 'node:crypto';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');const manifest=JSON.parse(fs.readFileSync('shape/assets/manifest.json','utf8'));
const b=Buffer.from(manifest.parts.map(p=>{if(!/^shape07-\d+\.b64$/.test(p))throw Error('Invalid shape pack path');return fs.readFileSync('shape/assets/'+p,'utf8')}).join(''),'base64');
if(sha(b)!==manifest.sha256)throw Error('Shape pack checksum mismatch');
fs.mkdirSync('generated/shape',{recursive:true});for(const f of JSON.parse(zlib.gunzipSync(b))){if(!['shape-study.glb','shape-study.blend'].includes(f.name))throw Error('Invalid shape asset name');const data=Buffer.from(f.data,'base64');if(sha(data)!==f.sha256)throw Error('Shape asset checksum mismatch');fs.writeFileSync('generated/shape/'+f.name,data);}
