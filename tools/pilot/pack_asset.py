"""Pack the authored source and actual GLB bake as public, checksummed text transport."""
from pathlib import Path
import gzip,json,base64,hashlib,struct
root=Path(__file__).resolve().parents[2]
# A render-only finalization: closed outer/cuff surfaces use backface culling.
glbpath=root/'generated/pilot/abaya-pilot.glb';raw=glbpath.read_bytes();chunks=[];offset=12
while offset<len(raw):
 length,kind=struct.unpack_from('<II',raw,offset);payload=raw[offset+8:offset+8+length]
 if kind==0x4E4F534A:
  doc=json.loads(payload)
  for mat in doc.get('materials',[]):
   if mat.get('name','').startswith(('MAKA_outer','MAKA_silver')):mat['doubleSided']=False
  payload=json.dumps(doc,separators=(',',':')).encode();payload+=b' '*((-len(payload))%4)
 chunks.append(struct.pack('<II',len(payload),kind)+payload);offset+=8+length
body=b''.join(chunks);glbpath.write_bytes(struct.pack('<III',0x46546C67,2,len(body)+12)+body)
reportpath=root/'generated/pilot/abaya-pilot.glb.report.json';report=json.loads(reportpath.read_text())
report['diagnosticSpace']='Raw diagnostic plus separately reported postprocessed body/inner nearest-surface heuristics'
report['settlingAccepted']=False # Motion-only gate is not full settling/clearance acceptance
report['motionOnlyGatePassed']=report['convergence']['limitedMotionGatePassed']
report['fitReleaseAccepted']=False
report['renderPostprocessing']={'subdivisionLevels':1,'approximateThicknessMm':.8,'decimationRatio':1.0,'outerBackfaceCulling':True,'viewerSelfShadows':False,'order':['subdivision','solidify','backface_culling']}
reportpath.write_text(json.dumps(report,indent=2))
items=[('generated/pilot/abaya-pilot.glb','lab/assets/abaya-pilot.glb'),('generated/pilot/authored.blend','lab/assets/abaya-authored.blend'),('generated/pilot/abaya-pilot.glb.report.json','lab/assets/abaya-pilot.report.json')]
fullpath=root/'generated/pilot/full-experiment.glb.report.json'
if fullpath.exists():
 full=json.loads(fullpath.read_text());full['promotionAccepted']=False;full['decision']='Rejected: motion gate failed; final body/inner clearance and self-intersections not accepted.'
 target=root/'generated/pilot/full-rejected.report.json';target.write_text(json.dumps(full,indent=2));items.append(('generated/pilot/full-rejected.report.json','lab/assets/abaya-full-rejected.report.json'))
files=[]
for source,target in items:
 b=(root/source).read_bytes();files.append({'path':target,'sha256':hashlib.sha256(b).hexdigest(),'data':base64.b64encode(b).decode()})
compressed=gzip.compress(json.dumps(files,separators=(',',':')).encode(),compresslevel=9,mtime=0);encoded=base64.b64encode(compressed).decode();out=root/'lab/assets';out.mkdir(exist_ok=True)
for p in out.glob('pilot06-*.b64'):p.unlink()
parts=[]
for i in range(0,len(encoded),720000):
 name=f'pilot06-{i//720000+1:02}.b64';(out/name).write_text(encoded[i:i+720000]);parts.append(name)
(out/'pilot-manifest.json').write_text(json.dumps({'sha256':hashlib.sha256(compressed).hexdigest(),'parts':parts,'files':[{'path':e['path'],'sha256':e['sha256']} for e in files]},indent=2))
print(json.dumps({'parts':len(parts),'gzipBytes':len(compressed)}))
