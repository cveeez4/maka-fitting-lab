"""Offline Blender 4.5 pipeline. Requires an authored .blend scene, not photos.

blender -b authored.blend --python tools/blender/bake_cloth.py -- \
  --output dist/abaya-pilot.glb --frames 80

Run reports are saved beside each exported GLB. Inspect reports and visual QA before accepting a bake.
Do not present the resulting static bake as measurement-calibrated fitting.
"""
import argparse
import json
import os
import sys
import time
import math
import bpy
from mathutils.bvhtree import BVHTree
from mathutils import Vector
sys.path.insert(0,os.path.dirname(__file__))
from motion_metrics import free_step_distances,summarize_step,limited_motion_gate


def args():
    tail = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--output', required=True)
    p.add_argument('--frames', type=int, default=100)
    return p.parse_args(tail)


def run():
    options = args()
    if not 2 <= options.frames <= 240:
        raise RuntimeError('frames must be 2..240')
    cloth = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name.startswith('MAKA_CLOTH_')]
    colliders = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name.startswith('MAKA_COLLIDER_')]
    trims = [o for o in bpy.context.scene.objects if o.type == 'MESH' and (o.name.startswith('MAKA_TRIM_') or o.get('MAKA_export_fixed', False))]
    if not cloth or not colliders:
        raise RuntimeError('Scene needs MAKA_CLOTH_* garment meshes and MAKA_COLLIDER_* body meshes.')
    for obj in cloth + colliders:
        if any(abs(v - 1) > 0.0001 for v in obj.scale):
            raise RuntimeError(f'Apply scale to {obj.name}; scene uses meters.')
    for obj in cloth:
        pins = obj.vertex_groups.get('MAKA_PIN')
        if pins is None:
            raise RuntimeError(f'{obj.name} requires reviewed MAKA_PIN weights at its support/seam locations.')
        if not any(any(g.group == pins.index and g.weight > 0 for g in v.groups) for v in obj.data.vertices):
            raise RuntimeError(f'{obj.name} has an empty MAKA_PIN group.')
        if any(m.type == 'CLOTH' for m in obj.modifiers):
            raise RuntimeError(f'{obj.name} already has cloth; use a clean authored scene.')
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1.0
    scene.gravity = (0, 0, -9.81)
    scene.frame_start = 1
    scene.frame_end = options.frames
    scene.render.fps = 30
    for obj in colliders:
        if not any(m.type == 'COLLISION' for m in obj.modifiers):
            obj.modifiers.new('MAKA_body_collision', 'COLLISION')
        obj.collision.thickness_outer = .004
    guided_skirt = scene.get('MAKA_pin_mode') == 'guided_skirt'
    for obj in cloth:
        mod = obj.modifiers.new('MAKA_offline_cloth', 'CLOTH')
        settings = mod.settings
        settings.quality = 4 if guided_skirt else 8
        settings.mass = .20
        settings.tension_stiffness = 80
        settings.compression_stiffness = 80
        settings.shear_stiffness = 50
        settings.bending_stiffness = 1.0
        settings.vertex_group_mass = 'MAKA_PIN'
        settings.pin_stiffness = 1.0
        settings.air_damping = 3
        settings.tension_damping = 15
        settings.compression_damping = 15
        settings.shear_damping = 10
        settings.bending_damping = 2
        mod.collision_settings.collision_quality = 2 if guided_skirt else 6
        mod.collision_settings.use_collision = True
        mod.collision_settings.distance_min = .003
        mod.collision_settings.use_self_collision = True
        mod.collision_settings.self_distance_min = .002
        mod.point_cache.frame_start = 1
        mod.point_cache.frame_end = options.frames
    rest = {obj.name: [v.co.copy() for v in obj.data.vertices] for obj in cloth}
    samples = {}; step_metrics=[]; last_positions=None
    free_ids={obj.name:[v.index for v in obj.data.vertices if not any(g.group==obj.vertex_groups['MAKA_PIN'].index and g.weight>=.999 for g in v.groups)] for obj in cloth}
    if any(not ids for ids in free_ids.values()):raise RuntimeError('No free vertices for convergence analysis')
    start = time.perf_counter()
    for frame in range(1, options.frames + 1):
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        graph = bpy.context.evaluated_depsgraph_get()
        for obj in cloth:
            evaluated = obj.evaluated_get(graph)
            evaluated.to_mesh()
            evaluated.to_mesh_clear()
        if frame>=max(1,options.frames-20) or frame in {1,options.frames//2}:
            positions={}
            for obj in cloth:
                ev=obj.evaluated_get(graph);mesh=ev.to_mesh();positions[obj.name]=[v.co.copy() for v in mesh.vertices];ev.to_mesh_clear()
            samples[frame]=positions
            if last_positions is not None and frame>options.frames-20:
                steps=[d for obj in cloth for d in free_step_distances(last_positions[obj.name],positions[obj.name],free_ids[obj.name])]
                step_metrics.append(summarize_step(steps,frame))
            last_positions=positions
        if frame % 10 == 0:
            print('MAKA_FRAME', frame, 'seconds', round(time.perf_counter()-start,1), flush=True)
    graph = bpy.context.evaluated_depsgraph_get()
    final = samples[options.frames]
    deltas = [(q-p).length for obj in cloth for p,q in zip(rest[obj.name],final[obj.name])]
    previous = samples[max(1,options.frames-10)]
    motion = [(q-p).length for obj in cloth for p,q in zip(previous[obj.name],final[obj.name])]
    body = next((o for o in colliders if o.name == 'MAKA_COLLIDER_body'), None)
    penetration_count = None
    if body:
        bvh = BVHTree.FromObject(body,graph)
        penetration_count = 0
        for obj in cloth:
            for vertex in final[obj.name]:
                point = obj.matrix_world @ vertex
                near,normal,idx,distance = bvh.find_nearest(point)
                if near is not None and distance < .025 and (point-near).dot(normal) < -.003:
                    penetration_count += 1
    baked = []
    for obj in cloth + trims:
        mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(graph), depsgraph=graph)
        target = bpy.data.objects.new(obj.name.replace('MAKA_CLOTH_', 'abaya_') + '_baked', mesh)
        scene.collection.objects.link(target)
        target.matrix_world = obj.matrix_world.copy()
        if obj in cloth:
            bpy.context.view_layer.objects.active = target
            target.select_set(True)
            subdiv = target.modifiers.new('MAKA_render_smoothing', 'SUBSURF')
            subdiv.levels = 1
            bpy.ops.object.modifier_apply(modifier=subdiv.name)
            # Preserve the original material boundaries for the cuff facing.
            solid = target.modifiers.new('MAKA_fabric_thickness', 'SOLIDIFY')
            solid.thickness = .0008
            solid.offset = 0
            bpy.ops.object.modifier_apply(modifier=solid.name)
            target.select_set(False)
        for polygon in target.data.polygons:
            polygon.use_smooth = True
        baked.append(target)
    final_clearance={}
    for collider in colliders:
        if collider.name not in ['MAKA_COLLIDER_body','MAKA_COLLIDER_inner_dress']:continue
        bvh=BVHTree.FromObject(collider,graph);count=0;tested=0
        for ob in baked:
            if not ob.name.startswith('abaya_'):continue
            for vertex in ob.data.vertices:
                point=ob.matrix_world@vertex.co;near,normal,_,distance=bvh.find_nearest(point);tested+=1
                if near is not None and distance<.025 and (point-near).dot(normal)<-.003:count+=1
        final_clearance[collider.name]={'testedVertices':tested,'nearestSurfacePenetrationCandidatesOver3mmWithin25mm':count,'method':'nearest-point signed-normal heuristic on postprocessed mesh; not a triangle-intersection certificate'}
    triangles = sum(sum(max(0, len(p.vertices) - 2) for p in obj.data.polygons) for obj in baked)
    if triangles > 150000:
        raise RuntimeError(f'Asset exceeds lab triangle budget: {triangles}. Retopologize/decimate and review before export.')
    bpy.ops.object.select_all(action='DESELECT')
    for obj in baked:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = baked[0]
    output = os.path.abspath(options.output)
    os.makedirs(os.path.dirname(output), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=output, export_format='GLB', use_selection=True,
                              export_animations=False, export_apply=True)
    report = {'file': os.path.basename(output), 'blender': bpy.app.version_string,
              'frames': options.frames, 'triangles': triangles, 'objects': len(baked),
              'simulationSeconds': round(time.perf_counter() - start, 2),
              'calibratedFit': False, 'runtimeClothSimulation': False,
              'simulatedMeshes': [o.name for o in cloth],
              'simulationScope': 'lower skirt only; upper body and sleeves anchored' if guided_skirt else 'full outer experiment',
              'fixedUnderlayers': [o.name for o in trims if o.name=='MAKA_COLLIDER_inner_dress'],
              'fixedVisualParts': [o.name for o in trims if o.name.startswith('MAKA_TRIM_')],
              'rmsDisplacementMeters': math.sqrt(sum(d*d for d in deltas)/len(deltas)),
              'maximumDisplacementMeters': max(deltas),
              'endpointDeltaRmsOver10FramesMeters': math.sqrt(sum(d*d for d in motion)/len(motion)),
              'endpointDeltaIsConvergenceCertificate':False,
              'convergence':{'evaluatedOn':'free vertices only, excluding weight >= 0.999','freeVertexCount':sum(map(len,free_ids.values())),'consecutiveStepSamples':step_metrics,'windowFrames':20,'limitedMotionGatePassed':limited_motion_gate(step_metrics),'isFitOrClearanceCertificate':False},
              'postprocessedClearance':final_clearance,
              'nearestBodyPenetrationsOver3mmWithin25mm': penetration_count,
              'selfIntersectionsValidated': False,
              'authoringReport': json.loads(scene.get('MAKA_authoring_report','{}')),
              'reviewRequired': ['settling/convergence', 'interpenetration', 'texture sizes',
                                 'front/side/back match', 'fabric parameter calibration']}
    with open(output + '.report.json', 'w', encoding='utf8') as stream:
        json.dump(report, stream, indent=2)
    print(json.dumps(report))


if __name__ == '__main__':
    run()
