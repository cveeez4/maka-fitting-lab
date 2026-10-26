import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
const root=path.dirname(new URL(import.meta.url).pathname);
const meta=JSON.parse(fs.readFileSync(path.join(root,'packed/manifest.json'),'utf8'));
const input=Buffer.from(meta.parts.map(p=>fs.readFileSync(path.join(root,'packed',p),'utf8')).join(''),'base64');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
if(sha(input)!==meta.sha256)throw Error('Asset pack checksum mismatch');
const entries=JSON.parse(zlib.gunzipSync(input).toString('utf8'));
for(const e of entries){if(!/^(vendor|assets)\//.test(e.path)||e.path.split('/').includes('..'))throw Error('Unsafe packed path');const data=Buffer.from(e.data,'base64');if(sha(data)!==e.sha256)throw Error('Checksum mismatch: '+e.path);const target=path.join(root,e.path);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,data);}
console.log(`Restored ${entries.length} original asset files (checksummed).`);
