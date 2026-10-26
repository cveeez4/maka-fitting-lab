"""Original neutral crew-neck tee construction study on a fixed uncalibrated body.
Not based on a product photograph, not a production sewing pattern or fit system.
Run Blender 4.5 after node tools/pilot/export_body.mjs.
"""
import bpy,bmesh,math,json,os,sys,argparse,time
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from collections import defaultdict
p=argparse.ArgumentParser();p.add_argument('--body',default='generated/pilot/body.json');p.add_argument('--out',default='generated/tee');p.add_argument('--frames',type=int,default=96);p.add_argument('--source-only',action='store_true')
args=p.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
os.makedirs(args.out,exist_ok=True);start=time.time();data=json.load(open(args.body));bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.render.fps=24;scene.frame_end=args.frames

def material(name,color,rough=.88):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*color,1);n.inputs['Roughness'].default_value=rough;n.inputs['Sheen Weight'].default_value=.12;return m
clothmat=material('TEE_cotton',(.46,.47,.45));ribmat=material('TEE_rib',(.38,.39,.37));bodymat=material('Mannequin',(.22,.23,.22));shortmat=material('Modesty_base_not_trouser_prototype',(.085,.095,.10))
def mesh(name,verts,faces,mat):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob);me.materials.append(mat)
 bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
 for poly in me.polygons:poly.use_smooth=True
 return ob
body=mesh('Mannequin_fixed',data['vertices'],data['faces'],bodymat)
col=body.modifiers.new('Body collision','COLLISION');body.collision.thickness_outer=.004;body.collision.cloth_friction=8
# Original mannequin faces remain intact. A dark material zone below the tee is
# a modesty finish, not a trouser mesh and not a way to hide shirt intersections.
body.data.materials.append(shortmat)
for poly in body.data.polygons:
 z=sum(body.data.vertices[i].co.z for i in poly.vertices)/len(poly.vertices)
 if .48<z<.845:poly.material_index=1
# Tee profile: closed front/back, proper open neckline, short connected sleeves, open hem.
profiles=[(.815,.219,.175),(.92,.216,.172),(1.06,.214,.174),(1.18,.218,.179),(1.26,.218,.177),(1.315,.210,.160),(1.35,.173,.128),(1.39,.085,.086)]
def profile(z):
 for (h,a,b),(h2,a2,b2) in zip(profiles,profiles[1:]):
  if h<=z<=h2:
   t=(z-h)/(h2-h);return a+(a2-a)*t,b+(b2-b)*t
 return profiles[0][1:] if z<profiles[0][0] else profiles[-1][1:]
R=44;C=96;v=[];f=[];uv=[]
for j in range(R+1):
 t=j/R;z=1.39-(1.39-.815)*t;rx,ry=profile(z)
 for i in range(C):
  angle=2*math.pi*i/C
  front=max(0,math.cos(angle));collarDrop=.038*front**2*max(0,1-t/.14)**1.4
  # Small construction slack, not claimed as a physically solved fold.
  slack=.0022*math.sin(angle*7+.8)*min(1,t*3)
  v.append(((rx+slack)*math.sin(angle),.033-(ry+slack)*math.cos(angle),z-collarDrop));uv.append((i/C,t))
for j in range(R):
 for i in range(C):
  a=j*C+i;b=j*C+(i+1)%C;c=(j+1)*C+(i+1)%C;d=(j+1)*C+i
  z=sum(v[k][2] for k in (a,b,c,d))/4;angle=2*math.pi*(i+.5)/C
  hole=any(((angle-side)/.48)**2+((z-1.245)/.080)**2<1 for side in [math.pi/2,3*math.pi/2])
  if not hole:f.append((a,b,c,d))
# Compact mesh before constructing the sleeves.
used=sorted(set(k for face in f for k in face));remap={a:b for b,a in enumerate(used)};v=[v[k] for k in used];uv=[uv[k] for k in used];f=[tuple(remap[k] for k in face) for face in f]
edges=defaultdict(int)
for face in f:
 for a,b in zip(face,face[1:]+face[:1]):edges[tuple(sorted((a,b)))]+=1
adj=defaultdict(list)
for (a,b),count in edges.items():
 if count==1:adj[a].append(b);adj[b].append(a)
loops=[];visited=set()
for first in adj:
 if first in visited:continue
 loop=[];previous=None;cur=first
 while cur not in visited:
  visited.add(cur);loop.append(cur);nxt=[i for i in adj[cur] if i!=previous]
  if not nxt:break
  previous,cur=cur,nxt[0]
 loops.append(loop)
armloops=[]
for loop in loops:
 center=sum((Vector(v[k]) for k in loop),Vector())/len(loop)
 if abs(center.x)>.16 and 1.15<center.z<1.33 and len(loop)<100:armloops.append((loop,center))
assert len(armloops)==2,[(len(l),tuple(c)) for l,c in armloops]
# A sleeve shares the existing armhole indices; no detached cylinder or overlaid shoulder patch.
torso_face_count=len(f)
for loop,center in armloops:
 side=1 if center.x>0 else -1;N=len(loop);end=Vector((side*.310,.020,1.130));axis=(end-center).normalized();up=Vector((0,-1,0));across=Vector((side*abs(axis.z),0,abs(axis.x))).normalized()
 # Order is inherited from the torso boundary; unwrap angular coordinates for a regular ring.
 phis=[math.atan2((v[k][2]-center.z)/.080,-(v[k][1]-center.y)/.090) for k in loop]
 for index,k in enumerate(loop):
  phi=phis[index];v[k]=(v[k][0],center.y-.090*math.cos(phi),center.z+.080*math.sin(phi))
 previous=loop
 for row in range(1,15):
  t=row/14;c=center.lerp(end,t);ring=[];blend=min(1,t/.4);blend=blend*blend*(3-2*blend)
  for i,phi in enumerate(phis):
   q=c+up*math.cos(phi)*(.090*(1-t)+.078*t)+across*math.sin(phi)*(.080*(1-t)+.074*t)
   initial=Vector(v[loop[i]])+(c-center);q=initial.lerp(q,blend)
   ring.append(len(v));v.append(tuple(q));uv.append((i/N,t*.33))
  for i in range(N):f.append((previous[i],previous[(i+1)%N],ring[(i+1)%N],ring[i]))
  previous=ring
# These orientation checks reject a mirrored sleeve frame before cloth is run.
 assert across.z>0, 'Sleeve cross-section points downward (twisted sleeve)'
shirt=mesh('TEE_connected_shell',v,f,clothmat);shirt.data.materials.append(ribmat)
# Named construction bands: thin fabric hems, not metal rings.
for poly in shirt.data.polygons:
 center=sum((shirt.data.vertices[i].co for i in poly.vertices),Vector())/len(poly.vertices)
 if (poly.index<torso_face_count and sum(uv[i][1] for i in poly.vertices)/len(poly.vertices)<.045) or center.z<.830:poly.material_index=1
uvlayer=shirt.data.uv_layers.new(name='PatternUV')
for poly in shirt.data.polygons:
 for li in poly.loop_indices:uvlayer.data[li].uv=uv[shirt.data.loops[li].vertex_index]
# Structural gate: one shell, exactly four intentional openings and no branched edges.
counts=defaultdict(int);neighbors=defaultdict(set)
for face in f:
 for aa,bb in zip(face,face[1:]+face[:1]):counts[tuple(sorted((aa,bb)))]+=1;neighbors[aa].add(bb);neighbors[bb].add(aa)
seen=set();components=0
for vertex in range(len(v)):
 if vertex in seen:continue
 components+=1;stack=[vertex];seen.add(vertex)
 while stack:
  for other in neighbors[stack.pop()]:
   if other not in seen:seen.add(other);stack.append(other)
boundary=defaultdict(set)
for (aa,bb),count in counts.items():
 if count==1:boundary[aa].add(bb);boundary[bb].add(aa)
assert all(count<=2 for count in counts.values()),'Non-manifold construction edge'
assert all(len(n)==2 for n in boundary.values()),'Branched garment opening'
bs=set();openings=0
for vertex in boundary:
 if vertex in bs:continue
 openings+=1;stack=[vertex];bs.add(vertex)
 while stack:
  for other in boundary[stack.pop()]:
   if other not in bs:bs.add(other);stack.append(other)
assert components==1 and openings==4,(components,openings)
topology={'components':components,'openBoundaryLoops':openings,'openings':['neck','hem','left cuff','right cuff'],'branchedBoundaryVertices':0,'edgesWithMoreThanTwoFaces':0,'bodyVertices':len(data['vertices']),'bodyFaces':len(data['faces']),'bodyFacesRemoved':0,'sleeveFrameUpward':True,'note':'Topology is not a physical clearance or visual acceptance gate'}
json.dump(topology,open(args.out+'/topology.json','w'),indent=2)

# Smooth the low-resolution armhole transition before the solve.
bpy.context.view_layer.objects.active=shirt;smooth=shirt.modifiers.new('Construction relaxation','SMOOTH');smooth.factor=.15;smooth.iterations=3;bpy.ops.object.modifier_apply(modifier=smooth.name)
bpy.context.view_layer.update();tree=BVHTree.FromObject(body,bpy.context.evaluated_depsgraph_get());projected=0
for vertex in shirt.data.vertices:
 point,normal,idx,dist=tree.find_nearest(vertex.co)
 if point is not None and (vertex.co-point).dot(normal)<.007:
  vertex.co=point+normal*.009;projected+=1
pin=shirt.vertex_groups.new(name='Shoulder_and_neck_support')
for vertex in shirt.data.vertices:
 z=vertex.co.z
 if z>1.340:pin.add([vertex.index],1,'REPLACE')
 elif z>1.315:pin.add([vertex.index],(z-1.315)/.025,'REPLACE')
bpy.ops.export_scene.gltf(filepath=os.path.abspath(args.out+'/tshirt-construction.glb'),export_format='GLB',export_apply=True,export_animations=False,export_yup=True)
cloth=shirt.modifiers.new('Offline tee drape','CLOTH');s=cloth.settings;s.quality=12;s.mass=.18;s.tension_stiffness=60;s.compression_stiffness=60;s.shear_stiffness=25;s.bending_stiffness=2;s.tension_damping=10;s.compression_damping=10;s.shear_damping=7;s.air_damping=5;s.vertex_group_mass=pin.name;s.pin_stiffness=1
collision=cloth.collision_settings;collision.use_collision=True;collision.distance_min=.004;collision.collision_quality=5;collision.use_self_collision=True;collision.self_distance_min=.003;collision.self_friction=4
cloth.point_cache.frame_start=1;cloth.point_cache.frame_end=args.frames
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(args.out+'/tshirt-source.blend'),compress=True)
if args.source_only:
 print('SOURCE_ONLY_SAVED',flush=True);sys.exit(0)
previous=None;motion=[]
for frame in range(1,args.frames+1):
 scene.frame_set(frame);evaluated=shirt.evaluated_get(bpy.context.evaluated_depsgraph_get());coords=[v.co.copy() for v in evaluated.data.vertices]
 if previous:motion.append({'frame':frame,'rmsMeters':math.sqrt(sum((a-b).length_squared for a,b in zip(coords,previous))/len(coords))})
 previous=coords
 if frame%12==0:print('TEE_FRAME',frame,flush=True)
# Freeze the evaluated result; source setup was saved before the time stepping.
deps=bpy.context.evaluated_depsgraph_get();baked=bpy.data.meshes.new_from_object(shirt.evaluated_get(deps),depsgraph=deps);shirt.modifiers.clear();shirt.data=baked
sub=shirt.modifiers.new('Render subdivision','SUBSURF');sub.levels=1;sub.render_levels=1
solid=shirt.modifiers.new('Cotton thickness','SOLIDIFY');solid.thickness=.001;solid.offset=0
# Post-solve nearest-body vertex diagnostic only; not a surface collision certificate.
negative=0;minsign=1
for vertex in shirt.data.vertices:
 point,normal,idx,dist=tree.find_nearest(vertex.co)
 if point is not None:
  sign=(vertex.co-point).dot(normal);minsign=min(minsign,sign)
  if sign<0:negative+=1
bpy.ops.export_scene.gltf(filepath=os.path.abspath(args.out+'/tshirt.glb'),export_format='GLB',export_apply=True,export_animations=False,export_yup=True)
report={'study':'TEE-01','reference':'Original generic crew-neck construction brief; no product photo supplied or matched','framesExecuted':args.frames,'fps':24,'offlineDrape':True,'pinned':'neck/upper shoulders above z1.315m; not a free garment solve','initialStaticProjectionVertices':projected,'solverVertexCount':len(shirt.data.vertices),'armholeSharedLoops':len(armloops),'motionLast12':motion[-12:],'rawVertexBodyDiagnostic':{'negativeNearestPlaneVertices':negative,'minSignedNearestPlaneMeters':minsign,'notSurfaceClearanceProof':True},'elapsedSeconds':time.time()-start,'visualAccepted':False,'settlingAccepted':False,'fitAccepted':False,'physicalCalibrationAccepted':False,'selfIntersectionAccepted':False,'bodyFacesMasked':False,'limitations':['Fixed uncalibrated statistical body','Original approximate construction, not commercial pattern','Motion includes pinned vertices; not a free-vertex convergence gate','Render subdivision and thickness not certified clear','Fabric settings illustrative, not calibrated cotton']}
json.dump(report,open(args.out+'/report.json','w'),indent=2);print('TEE_REPORT',json.dumps({k:report[k] for k in ['framesExecuted','solverVertexCount','rawVertexBodyDiagnostic','elapsedSeconds']}),flush=True)
