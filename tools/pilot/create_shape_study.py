"""Static shape-review authoring, 0.7. Not a sewing pattern or cloth simulation.
Uses the preserved experimental body collider; visibly exported as a mannequin.
Run export_body.mjs, then this script with Blender 4.5.
"""
import bpy, bmesh, math, json, os, sys, argparse
from mathutils import Vector
from collections import defaultdict
p=argparse.ArgumentParser();p.add_argument('--output',default='generated/shape/shape-study.blend');p.add_argument('--body',default='generated/pilot/body.json');p.add_argument('--guided-skirt',action='store_true')
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
main=mat('MAKA_outer_cloth',(.24,.007,.065),.75);innerMat=mat('MAKA_inner_ivory',(.77,.75,.70),.88);silver=mat('MAKA_trim_woven',(.36,.35,.33),.82,.03)
body=meshobj('MAKA_COLLIDER_body',bodydata['vertices'],bodydata['faces']);body.hide_render=False; body.data.materials.append(mat('MAKA_mannequin',(.30,.29,.27),.83)); body['role']='fixed, uncalibrated reference mannequin'
# Smooth monotone interpolation by y, no inferred product dimensions.
def radii(y,inner=False):
    # Smooth cubic Hermite profile: no per-row eased ledges. Artist-authored, not inferred dimensions.
    pts=[(.045,.335,.207),(.38,.312,.197),(.72,.286,.229),(1.03,.254,.215),(1.19,.242,.232),(1.28,.224,.202),(1.335,.232,.166),(1.395,.083,.091)]
    if inner:pts=[(.055,.277,.196),(.45,.256,.191),(.85,.242,.215),(1.12,.225,.206),(1.26,.220,.204),(1.335,.215,.154),(1.385,.080,.090)]
    if y<=pts[0][0]:return pts[0][1:]
    if y>=pts[-1][0]:return pts[-1][1:]
    for k in range(len(pts)-1):
        if pts[k][0]<=y<=pts[k+1][0]:
            h=pts[k+1][0]-pts[k][0]; t=(y-pts[k][0])/h;out=[]
            for c in (1,2):
                def slope(i):
                    l=max(0,i-1);r=min(len(pts)-1,i+1)
                    return (pts[r][c]-pts[l][c])/(pts[r][0]-pts[l][0])
                a,b=pts[k][c],pts[k+1][c]
                out.append((2*t**3-3*t*t+1)*a+(t**3-2*t*t+t)*h*slope(k)+(-2*t**3+3*t*t)*b+(t**3-t*t)*h*slope(k+1))
            return out

def create_torso(inner=False):
    rows,cols=(52,64) if not inner else (44,64);top=1.395 if not inner else 1.375;hem=.055 if not inner else .065
    verts=[];faces=[];uvs=[]
    for j in range(rows+1):
        t=j/rows;y=top+(hem-top)*t;rx,rz=radii(y,inner);gap=0 if inner else .12+.13*min(1,t*1.6)
        for i in range(cols+1):
            theta=gap+(2*math.pi-2*gap)*i/cols
            # An initial material surplus. Subsequent offline cloth simulation, not this wave, determines the drape.
            folds=(.003 if inner else .009)*(math.sin(theta*11+.27*math.sin(t*4))+.35*math.sin(theta*19+1.3))*t**.8
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
                sideTheta=(i+.5)/cols*(2*math.pi-(.12+.13*min(1,(j+.5)/rows*1.6))*2)+(.12+.13*min(1,(j+.5)/rows*1.6))
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
    end=Vector((hand[0]+side*.003,hand[1]-.003,hand[2]+.030));axis=end-center;v=Vector((side*abs(axis.z),0,abs(axis.x))).normalized();up=Vector((0,-1,0))
    phis=[math.atan2((verts[k][2]-center.z)/.104,(-(verts[k][1]-center.y))/.105) for k in loop]
    for j in range(1,23):
        t=j/22;c=center.lerp(end,t);c.x+=side*.015*math.sin(math.pi*t);blend=min(1,t/.24);blend=blend*blend*(3-2*blend);ring=[]
        for i,phi in enumerate(phis):
            ry=.104*(1-t)+.056*t;rz=.104*(1-t)+.058*t
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

# Construction-review export: deliberately static; no old simulation report is attached.
innerverts,innerfaces,inneruv=create_torso(True)
inner=meshobj('MAKA_inner_dress',innerverts,innerfaces,innerMat)

# Surface thickness/subdivision on the cloth. Topology joins are retained, not painted over.
def finish(ob,sub=1,thickness=.001):
    if sub:
        m=ob.modifiers.new('Cloth surface subdivision','SUBSURF');m.levels=sub;m.render_levels=sub
    m=ob.modifiers.new('Fabric edge thickness','SOLIDIFY');m.thickness=thickness;m.offset=0
smooth=outer.modifiers.new('Low-frequency join relaxation','SMOOTH');smooth.factor=.28;smooth.iterations=4
bpy.context.view_layer.objects.active=outer;bpy.ops.object.modifier_apply(modifier=smooth.name)
finish(outer,1,.0010);finish(inner,1,.0008)

# Static proximity correction on the actual subdivided surfaces; not a cloth solve.
# Keep the visible mannequin intact, never mask body faces to conceal penetrations.
from mathutils.bvhtree import BVHTree
bpy.context.view_layer.update()
bodytree=BVHTree.FromObject(body,bpy.context.evaluated_depsgraph_get())
clearance_counts={}
for cloth in [inner,outer]:
    bpy.context.view_layer.objects.active=cloth
    for modifier in list(cloth.modifiers):bpy.ops.object.modifier_apply(modifier=modifier.name)
    moved=0
    for vertex in cloth.data.vertices:
        point,normal,idx,dist=bodytree.find_nearest(vertex.co)
        if point is not None and (vertex.co-point).dot(normal)<.004:
            vertex.co=point+normal*.006;moved+=1
    clearance_counts[cloth.name]=moved
    cloth.data.update()

# Flat ribbon surfaces with width, twists and curled tails (not beveled wire).
def ribbon(name,points,widths,material):
    vv=[];ff=[]
    for j,p in enumerate(points):
        p=Vector(p);prev=Vector(points[max(0,j-1)]);nxt=Vector(points[min(len(points)-1,j+1)])
        tangent=(nxt-prev).normalized();across=Vector((tangent.z,0,-tangent.x)).normalized()
        if across.length<.01:across=Vector((1,0,0))
        for side in [-1,1]:vv.append(tuple(p+across*widths[j]*side/2))
        if j:ff.append((2*j-2,2*j-1,2*j+1,2*j))
    ob=meshobj(name,vv,ff,material);finish(ob,1,.0006);return ob
for side in [-1,1]:
    pts=[]
    for k in range(41):
        t=k/40;ang=t*2*math.pi
        pts.append((side*(.007+.036*(1-math.cos(ang))),-.090-.010*math.sin(ang),1.375+.013*math.sin(ang)))
    ribbon('MAKA_ribbon_loop_'+str(side),pts,[.011]*len(pts),main)
    pts=[]
    for k in range(36):
        t=k/35;pts.append((side*(.008+.016*t+.007*math.sin(t*5)), -.094-.011*math.sin(t*4),1.371-.125*t))
    ribbon('MAKA_ribbon_tail_'+str(side),pts,[.010-.002*k/35 for k in range(36)],main)

ribbon('MAKA_ribbon_center_knot',[(-.010,-.106,1.375),(0,-.110,1.376),(.010,-.106,1.375)],[.014,.017,.014],main)

# Decorated textile cuff, low metallic response and raised woven motifs, not a chrome bangle.
thread=mat('MAKA_embroidery_thread',(.58,.56,.52),.76,.05)
beadmat=mat('MAKA_embroidery_highlight',(.65,.62,.54),.48,.18)
vv=[];ff=[]
def diamond(center,u,v,w,h):
    k=len(vv);vv.extend([tuple(center+u*w),tuple(center+v*h),tuple(center-u*w),tuple(center-v*h),tuple(center+Vector((0,-.0015,0)))])
    ff.extend([(k,k+1,k+4),(k+1,k+2,k+4),(k+2,k+3,k+4),(k+3,k,k+4)])
for loop in cuff_loops:
    cuff=[Vector(outer.data.vertices[i].co) for i in loop];center=sum(cuff,Vector())/len(cuff)
    side=1 if center.x>0 else -1
    axis=(center-Vector((side*.203,.03,1.245))).normalized()
    u=Vector((0,-1,0));v=axis.cross(u).normalized()
    for row in range(4):
        for k in range(64):
            angle=2*math.pi*(k+.5*(row%2))/64
            radial=u*math.cos(angle)*.059+v*math.sin(angle)*.057
            tangent=(-u*math.sin(angle)+v*math.cos(angle)).normalized()
            p=center-axis*(.004+row*.006)+radial
            diamond(p,tangent,axis,.0024,.003)
emb=meshobj('MAKA_decorative_woven_cuffs',vv,ff,thread)
# Mannequin is an explicit reference only, same fixed original statistical body, not a fit claim.
body.hide_set(False)
scene['study']='Shape review 0.7; static authoring; not physical simulation or size fitting'
scene['review']='Needs human visual approval; backside and construction remain approximations'
os.makedirs(os.path.dirname(a.output),exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(a.output))
path=os.path.join(os.path.dirname(a.output),'shape-study.glb')
bpy.ops.export_scene.gltf(filepath=os.path.abspath(path),export_format='GLB',export_apply=True,export_animations=False,export_yup=True)
print('STATIC_BODY_PROJECTION',clearance_counts)
print('SHAPE_EXPORT',path)
