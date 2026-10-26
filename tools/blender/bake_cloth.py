"""Offline Blender 4.5 pipeline. Requires an authored .blend scene, not photos.

blender -b authored.blend --python tools/blender/bake_cloth.py -- \
  --output dist/abaya-pilot.glb --frames 80

NOT executed in this environment: Blender is not installed. Syntax checked only.
Do not present the resulting static bake as measurement-calibrated fitting.
"""
import argparse
import json
import os
import sys
import time
import bpy


def args():
    tail = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument('--output', required=True)
    p.add_argument('--frames', type=int, default=80)
    return p.parse_args(tail)


def run():
    options = args()
    if not 2 <= options.frames <= 240:
        raise RuntimeError('frames must be 2..240')
    cloth = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name.startswith('MAKA_CLOTH_')]
    colliders = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name.startswith('MAKA_COLLIDER_')]
    trims = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.name.startswith('MAKA_TRIM_')]
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
    for obj in cloth:
        mod = obj.modifiers.new('MAKA_offline_cloth', 'CLOTH')
        settings = mod.settings
        settings.quality = 10
        settings.mass = .25
        settings.tension_stiffness = 15
        settings.compression_stiffness = 15
        settings.shear_stiffness = 5
        settings.bending_stiffness = .5
        settings.vertex_group_mass = 'MAKA_PIN'
        settings.pin_stiffness = 1.0
        mod.collision_settings.use_collision = True
        mod.collision_settings.distance_min = .004
        mod.collision_settings.use_self_collision = True
        mod.collision_settings.self_distance_min = .005
        mod.point_cache.frame_start = 1
        mod.point_cache.frame_end = options.frames
    start = time.perf_counter()
    for frame in range(1, options.frames + 1):
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        graph = bpy.context.evaluated_depsgraph_get()
        for obj in cloth:
            evaluated = obj.evaluated_get(graph)
            evaluated.to_mesh()
            evaluated.to_mesh_clear()
    graph = bpy.context.evaluated_depsgraph_get()
    baked = []
    for obj in cloth + trims:
        mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(graph), depsgraph=graph)
        target = bpy.data.objects.new(obj.name.replace('MAKA_CLOTH_', 'abaya_') + '_baked', mesh)
        scene.collection.objects.link(target)
        target.matrix_world = obj.matrix_world.copy()
        for polygon in mesh.polygons:
            polygon.use_smooth = True
        baked.append(target)
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
              'reviewRequired': ['settling/convergence', 'interpenetration', 'texture sizes',
                                 'front/side/back match', 'fabric parameter calibration']}
    with open(output + '.report.json', 'w', encoding='utf8') as stream:
        json.dump(report, stream, indent=2)
    print(json.dumps(report))


if __name__ == '__main__':
    run()
