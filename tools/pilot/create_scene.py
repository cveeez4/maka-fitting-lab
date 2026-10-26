"""Author an approximate, connected open-abaya draft for an offline cloth pilot.
This is a geometric pattern-block experiment, not MAKA's production pattern.
Run with Blender 4.5, after node tools/pilot/export_body.mjs.
"""
import bpy, bmesh, math, json, os, sys, argparse
from mathutils import Vector
from collections import defaultdict
p=argparse.ArgumentParser();p.add_argument('--output',default='generated/pilot/authored.blend');p.add_argument('--body',default='generated/pilot/body.json');p.add_argument('--guided-skirt',action='store_true')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
bodydata=json.load(open(a.body))

def meshobj(name,verts,faces,material=None):
    me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update()
    ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob)
    bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
    for poly in me.polygons:poly.use_smooth=True
    if material:me.materials.append(material)
    return ob

def mat(name,color,roughness,metal=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*color,1);n.inputs['Roughness'].default_value=roughness;n.inputs['Metallic'].default_value=metal
    n.inputs['Sheen Weight'].default_value=.22 if metal==0 else 0
    return m
main=mat('MAKA_outer_crepe',(0.23,.006,.055),.68);innerMat=mat('MAKA_inner_ivory',(.72,.69,.62),.88);silver=mat('MAKA_silver_cuffs',(.40,.39,.37),.36,.78)
body=meshobj('MAKA_COLLIDER_body',bodydata['vertices'],bodydata['faces']);body.hide_render=True
# Smooth monotone interpolation by y, no inferred product dimensions.
def radii(y,inner=False):
    pts=[(.055,.385,.230),(.55,.302,.192),(.90,.263,.174),(1.11,.235,.151),(1.255,.225,.133),(1.335,.215,.090),(1.395,.072,.062)]
    if inner:pts=[(.065,.295,.205),(.55,.250,.176),(.90,.225,.158),(1.11,.205,.142),(1.255,.205,.126),(1.335,.194,.086),(1.375,.070,.060)]
    for (y0,x0,z0),(y1,x1,z1) in zip(pts,pts[1:]):
        if y0<=y<=y1:
            t=(y-y0)/(y1-y0);t=t*t*(3-2*t);return x0+(x1-x0)*t,z0+(z1-z0)*t
    return pts[0][1:] if y<pts[0][0] else pts[-1][1:]

def create_torso(inner=False):
    rows,cols=(52,64) if not inner else (44,64);top=1.395 if not inner else 1.375;hem=.055 if not inner else .065
    verts=[];faces=[];uvs=[]
    for j in range(rows+1):
        t=j/rows;y=top+(hem-top)*t;rx,rz=radii(y,inner);gap=0 if inner else .11+.36*min(1,t*1.6)
        for i in range(cols+1):
            theta=gap+(2*math.pi-2*gap)*i/cols
            # An initial material surplus. Subsequent offline cloth simulation, not this wave, determines the drape.
            folds=(.002 if inner else .006)*math.sin(theta*13+.4*math.sin(t*5))*t**.65
            asym=.0015*math.sin(theta*3+1.2)*t
            verts.append(((rx+folds+asym)*math.sin(theta),-(-.033+(rz+folds)*math.cos(theta)),y))
            uvs.append((i/cols*6,t*18))
    for j in range(rows):
        for i in range(cols):
            k=j*(cols+1)+i
            center=Vector(verts[k])+Vector(verts[k+1])+Vector(verts[k+cols+1])+Vector(verts[k+cols+2]);center/=4
            x,z,y=center.x,-center.y,center.z
            hole=False
            if True:
                # Side armholes cut in the torso mesh. The sleeves share these boundary vertices.
                sideTheta=(i+.5)/cols*(2*math.pi-(.11+.36*min(1,(j+.5)/rows*1.6))*2)+(.11+.36*min(1,(j+.5)/rows*1.6))
                for sideAngle in [math.pi/2,3*math.pi/2]:
                    if ((sideTheta-sideAngle)/.52)**2+((y-1.245)/.104)**2<1:hole=True
            if not hole:faces.append([k,k+1,k+cols+2,k+cols+1])
    # Remove unused vertices, keeping IDs compact and UVs aligned.
    used=sorted(set(v for f in faces for v in f));remap={v:i for i,v in enumerate(used)}
    verts=[verts[v] for v in used];uvs=[uvs[v] for v in used];faces=[[remap[v] for v in f] for f in faces]
    return verts,faces,uvs
verts,faces,uvs=create_torso(False)
# Identify boundary loops. The two armholes are closed loops separate from the front/neck/hem boundary.
edgecount=defaultdict(int)
for f in faces:
    for x,y in zip(f,f[1:]+f[:1]):edgecount[tuple(sorted((x,y)))]+=1
adj=defaultdict(list)
for (x,y),n in edgecount.items():
    if n==1:adj[x].append(y);adj[y].append(x)
loops=[];visited=set()
for first in adj:
    if first in visited:continue
    loop=[];cur=first;prev=None
    for _ in range(len(adj)+2):
        if cur in visited:break
        visited.add(cur);loop.append(cur);nxt=[x for x in adj[cur] if x!=prev]
        if not nxt:break
        prev,cur=cur,nxt[0]
    loops.append(loop)
armholes=[]
for loop in loops:
    mean=sum((Vector(verts[i]) for i in loop),Vector())/len(loop)
    if abs(mean.x)>.16 and 1.12<mean.z<1.36 and len(loop)<100:armholes.append((loop,mean))
if len(armholes)!=2:raise RuntimeError('Expected two connected armhole boundaries, found '+str([(len(l),tuple(m)) for l,m in armholes]))
cuff_faces=[];cuff_loops=[]
for loop,center in armholes:
    side=1 if center.x>0 else -1;N=len(loop);prev=loop
    # Project the cut boundary onto a continuous oval, reducing staircase ridges.
    for k in loop:
        q=Vector(verts[k]);phi=math.atan2((q.z-center.z)/.104,-(q.y-center.y)/.105)
        q.z=center.z+.104*math.sin(phi);q.y=center.y-.105*math.cos(phi);verts[k]=tuple(q)
    # Final cuff is near the source skeleton wrist, rather than a straight detached cylinder.
    hand=bodydata['bones']['mixamorig'+('Left' if side>0 else 'Right')+'Hand']
    end=Vector((hand[0]+side*.018,hand[1]-.003,hand[2]+.025));axis=end-center;v=Vector((side*abs(axis.z),0,abs(axis.x))).normalized();up=Vector((0,-1,0))
    phis=[math.atan2((verts[k][2]-center.z)/.104,(-(verts[k][1]-center.y))/.105) for k in loop]
    for j in range(1,23):
        t=j/22;c=center.lerp(end,t);c.x+=side*.015*math.sin(math.pi*t);blend=min(1,t/.24);blend=blend*blend*(3-2*blend);ring=[]
        for i,phi in enumerate(phis):
            ry=.104*(1-t)+.090*t;rz=.104*(1-t)+.072*t
            q=c+up*(math.cos(phi)*rz)+v*(math.sin(phi)*ry)
            initial=Vector(verts[loop[i]])+(c-center)
            q=initial.lerp(q,blend)
            q+=up*(.0035*math.sin(phi*9+t*3)*t)
            ring.append(len(verts));verts.append(tuple(q));uvs.append((i/N*3,t*9))
        for i in range(N):
            faces.append([prev[i],prev[(i+1)%N],ring[(i+1)%N],ring[i]])
            if j>=21:cuff_faces.append(len(faces)-1)
        prev=ring
    cuff_loops.append(prev)
outer=meshobj('MAKA_CLOTH_outer_connected_sleeves',verts,faces,main);outer.data.materials.append(silver)
for i in cuff_faces:outer.data.polygons[i].material_index=1
uv=outer.data.uv_layers.new(name='FabricUV')
for poly in outer.data.polygons:
    for li in poly.loop_indices:uv.data[li].uv=uvs[outer.data.loops[li].vertex_index]
pins=outer.vertex_groups.new(name='MAKA_PIN')
for v in outer.data.vertices:
    y=v.co.z
    if y>1.365:pins.add([v.index],1,'REPLACE')
    elif y>1.325 and abs(v.co.x)>.12:pins.add([v.index],1.0,'REPLACE')
    elif y>1.20 and abs(v.co.x)<.09 and v.co.y<-.07:pins.add([v.index],.25,'REPLACE')
    elif .86<y<.96 and abs(v.co.x)>.38:pins.add([v.index],.15,'REPLACE')
    if a.guided_skirt and y>.78:pins.add([v.index],1.0,'REPLACE')
# Inner dress: authored underlayer and collision support; not represented as a simulated cloth mesh in the report.
iv,ifa,iuv=create_torso(True);inner=meshobj('MAKA_COLLIDER_inner_dress',iv,ifa,innerMat)
uv=inner.data.uv_layers.new(name='FabricUV')
for poly in inner.data.polygons:
    for li in poly.loop_indices:uv.data[li].uv=iuv[inner.data.loops[li].vertex_index]
# A duplicate of this underlayer is exported as a fixed layer by the bake script.
inner['MAKA_export_fixed']=True
# Collision contact quality: smooth the draft armhole joins before physical draping.
mod=outer.modifiers.new('MAKA_pre_smooth','SMOOTH');mod.factor=.20;mod.iterations=3
bpy.context.view_layer.objects.active=outer;outer.select_set(True)
bpy.ops.object.modifier_apply(modifier=mod.name)
# Visual construction details; authored approximation, fixed trims, not sewn cloth constraints.
def trim_curve(name,points,radius,material,closed=False):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=2;curve.bevel_depth=radius;curve.bevel_resolution=1
    spline=curve.splines.new('POLY');spline.points.add(len(points)-1)
    for p,q in zip(spline.points,points):p.co=(*q,1)
    spline.use_cyclic_u=closed
    ob=bpy.data.objects.new('MAKA_TRIM_'+name,curve);bpy.context.collection.objects.link(ob);curve.materials.append(material)
    bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob;bpy.ops.object.convert(target='MESH');ob=bpy.context.object;ob['MAKA_export_fixed']=True
    for poly in ob.data.polygons:poly.use_smooth=True
    return ob
# Only upper lapel stitching is fixed; no fixed trim is attached across the simulated hem.
for side,col in [('left',0),('right',64)]:
    line=[]
    for row in range(0,24):
        # Compact torso vertex IDs cannot be indexed by grid after armholes: choose nearest boundary by row height.
        y=1.395+(.055-1.395)*row/52
        candidates=[v.co.copy() for v in outer.data.vertices if abs(v.co.z-y)<.002 and (v.co.x<0 if side=='left' else v.co.x>0) and v.co.y<0 and abs(v.co.x)<.14]
        if candidates:
            q=min(candidates,key=lambda v:abs(v.x));q.y-=.0012;line.append(tuple(q))
    if len(line)>2:trim_curve('lapel_stitch_'+side,line,.00065,main)
for i,loop in enumerate(cuff_loops):trim_curve('cuff_edge_'+str(i),[tuple(outer.data.vertices[k].co) for k in loop],.001,silver,True)
for side in [-1,1]:
    points=[]
    for k in range(25):
        t=2*math.pi*k/24;points.append((side*(.006+.029*(1-math.cos(t))),-.055-.008*math.sin(t),1.377+.014*math.sin(t)))
    trim_curve('neck_loop_'+str(side),points,.0018,main)
    trim_curve('neck_tail_'+str(side),[(side*.006,-.057,1.375),(side*.012,-.065,1.35),(side*.020,-.080,1.315)],.0018,main)
# Batch fixed visual trims by material to avoid one draw group per tiny stitch/tie.
for material,label in [(main,'fabric_details'),(silver,'silver_edges')]:
    obs=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith('MAKA_TRIM_') and o.data.materials and o.data.materials[0]==material]
    if obs:
        bpy.ops.object.select_all(action='DESELECT')
        for ob in obs:ob.select_set(True)
        bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join();bpy.context.object.name='MAKA_TRIM_'+label;bpy.context.object['MAKA_export_fixed']=True
scene['MAKA_construction_details']='Approximate neck tie, upper-lapel stitching and cuff-edge rolls; fixed visual trims, not sewn constraints or a verified product pattern.'
# Solidify/subdivision are applied only after the cloth stage by the bake script.
scene.frame_start=1;scene.frame_end=60;scene.render.fps=30
scene['MAKA_pin_mode']='guided_skirt' if a.guided_skirt else 'full_outer_experiment'
scene['MAKA_asset_status']='Approximate geometric draft, not a production sewing pattern. Outer connected sleeves; fixed inner underlayer.'
scene['MAKA_authoring_report']=json.dumps({'constructionDetails':scene['MAKA_construction_details'],'outerVertices':len(verts),'outerFaces':len(faces),'connectedArmholes':len(armholes),'uv':'FabricUV','pinVertices':sum(1 for v in outer.data.vertices if len(v.groups)),'source':'owner photos for visual guidance; geometry is an authored approximation','fitValidated':False,'simulationScope':'lower skirt only; upper body and sleeves anchored' if a.guided_skirt else 'full outer experiment','supportConstraints':'neck/shoulder anchors, weak upper-lapel and wrist-position guides; guided drape, not unconstrained free cloth'})
os.makedirs(os.path.dirname(os.path.abspath(a.output)),exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(a.output))
print('MAKA_SCENE_REPORT '+scene['MAKA_authoring_report'])
