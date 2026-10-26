"""Checksummed text transport for the complete static GLB and Blender source."""
from pathlib import Path
import json,gzip,base64,hashlib
root=Path(__file__).resolve().parents[1];out=root/'shape/assets';out.mkdir(exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
files=[]
for name in ['shape-study.glb','shape-study.blend']:
 b=(root/'generated/shape'/name).read_bytes();files.append({'name':name,'sha256':sha(b),'data':base64.b64encode(b).decode()})
b=gzip.compress(json.dumps(files,separators=(',',':')).encode(),compresslevel=9,mtime=0);text=base64.b64encode(b).decode();parts=[]
for p in out.glob('shape07-*.b64'):p.unlink()
for i in range(0,len(text),390000):
 name=f'shape07-{i//390000+1:02}.b64';(out/name).write_text(text[i:i+390000]);parts.append(name)
(out/'manifest.json').write_text(json.dumps({'sha256':sha(b),'parts':parts,'files':[{'name':f['name'],'sha256':f['sha256']} for f in files]},indent=2)+'\n');print('Packed complete source and GLB:',len(parts),'parts,',len(text),'characters')
