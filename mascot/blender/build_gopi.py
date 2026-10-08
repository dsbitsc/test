"""Build the Gopi plush llama in Blender: real hair-particle fur (curly boucle), Cycles materials, lights, cameras.

Usage (bpy as module, Python 3.11):
    python build_gopi.py [--quick] [--views ref1,ref2,ref3,face] [--save gopi.blend]
Input:  ../gopi.glb  (rig + geometry exported from character.js)
Output: renders/*.png and gopi.blend
"""
import bpy, sys, os, math, argparse
from mathutils import Vector

ap = argparse.ArgumentParser()
ap.add_argument('--quick', action='store_true')
ap.add_argument('--views', default='ref1')
ap.add_argument('--save', default='')
ap.add_argument('--res', type=int, default=1000)
ap.add_argument('--samples', type=int, default=64)
ap.add_argument('--density', type=float, default=1.0)
ap.add_argument('--no-render', action='store_true')
args = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'renders')
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(HERE, '..', 'gopi.glb'))
scene = bpy.context.scene

def srgb(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4) for v in c]
    return (*lin, 1.0)

# ---------------- materials ----------------
def principled(name, color, rough=0.5, metal=0.0, **kw):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = srgb(color)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    for k, v in kw.items():
        if k in b.inputs:
            b.inputs[k].default_value = v
    return m

def hair_material(name, root, mid, tip, rough=0.45):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    hair = nt.nodes.new('ShaderNodeBsdfHairPrincipled')
    hair.parametrization = 'COLOR'
    hair.inputs['Roughness'].default_value = rough
    hair.inputs['Radial Roughness'].default_value = 0.6
    hair.inputs['Coat'].default_value = 0.0
    hair.inputs['IOR'].default_value = 1.45
    info = nt.nodes.new('ShaderNodeHairInfo')
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = srgb(root)
    ramp.color_ramp.elements[1].position = 1.0
    ramp.color_ramp.elements[1].color = srgb(tip)
    e = ramp.color_ramp.elements.new(0.45)
    e.color = srgb(mid)
    # per-strand brightness variation
    rnd = nt.nodes.new('ShaderNodeMath'); rnd.operation = 'MULTIPLY_ADD'
    rnd.inputs[1].default_value = 0.5; rnd.inputs[2].default_value = 0.75
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'
    mix.inputs['Factor'].default_value = 1.0
    nt.links.new(info.outputs['Intercept'], ramp.inputs['Fac'])
    nt.links.new(info.outputs['Random'], rnd.inputs[0])
    nt.links.new(ramp.outputs['Color'], mix.inputs['A'])
    gray = nt.nodes.new('ShaderNodeCombineColor')
    for s in ('Red', 'Green', 'Blue'):
        nt.links.new(rnd.outputs['Value'], gray.inputs[s])
    nt.links.new(gray.outputs['Color'], mix.inputs['B'])
    nt.links.new(mix.outputs['Result'], hair.inputs['Color'])
    nt.links.new(hair.outputs['BSDF'], out.inputs['Surface'])
    return m

def hair_material_diffuse(name, root, tip, rough=0.65):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    b = nt.nodes.new('ShaderNodeBsdfPrincipled'); b.inputs['Roughness'].default_value = rough
    info = nt.nodes.new('ShaderNodeHairInfo')
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = srgb(root); ramp.color_ramp.elements[1].color = srgb(tip)
    nt.links.new(info.outputs['Intercept'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], b.inputs['Base Color'])
    nt.links.new(b.outputs['BSDF'], out.inputs['Surface'])
    return m

def skin_material(name, color, bump=8.0):
    m = principled(name, color, 0.95, sheen_weight=0.6) if False else principled(name, color, 0.95)
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    tex = nt.nodes.new('ShaderNodeTexNoise'); tex.inputs['Scale'].default_value = 90; tex.inputs['Detail'].default_value = 6
    bm = nt.nodes.new('ShaderNodeBump'); bm.inputs['Strength'].default_value = 0.5
    nt.links.new(tex.outputs['Fac'], bm.inputs['Height'])
    nt.links.new(bm.outputs['Normal'], b.inputs['Normal'])
    return m

M = {
    'skin': skin_material('FurBase', '#05061a'),
    'hair': hair_material('FurNavy', '#010105', '#02030f', '#080b2a', rough=0.62),
    'fuzz': hair_material('Fuzz', '#0a0c2e', '#1b2059', '#3a418a', rough=0.7),
    'hair_gold': hair_material_diffuse('FurGold', '#b07818', '#f0c050', rough=0.7),
    'gold': principled('GlyphGold', '#e6bf5a', 0.32, 0.75),
    'cream': principled('EyeCream', '#fff1d4', 0.4, 0.0, **{'Coat Weight': 0.25, 'Coat Roughness': 0.15}),
    'lid': principled('Lid', '#dcbc88', 0.45),
    'black': principled('Black', '#040408', 0.55, 0.0, **{'Specular IOR Level': 0.25}),
    'nose': principled('NoseCream', '#f1dab4', 0.42, 0.0, **{'Subsurface Weight': 0.15}),
    'foot': principled('FootTan', '#cfa850', 0.55),
    'glow': None,
}
hl = bpy.data.materials.new('Highlight'); hl.use_nodes = True
nt = hl.node_tree; nt.nodes.clear()
em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 8.0
o = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(em.outputs[0], o.inputs[0])
M['glow'] = hl

def assign(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)

FUR_PARTS = {
    # name: (hair length, parents per m2, children, curl amplitude, hair material)
    'Body_Fur_Mesh': (0.042, 9000, 12, 0.016, 'hair'),
    'Head_Fur_Mesh': (0.038, 11000, 12, 0.015, 'hair'),
    'Muzzle_Mesh': (0.016, 9000, 8, 0.005, 'hair'),
    'Tail_Fur_Mesh': (0.055, 9000, 14, 0.016, 'hair'),
    'EarL_Fur_Mesh': (0.028, 9000, 10, 0.008, 'hair'),
    'EarR_Fur_Mesh': (0.028, 9000, 10, 0.008, 'hair'),
    'Mane1_Mesh': (0.04, 9000, 12, 0.012, 'hair'),
    'Mane2_Mesh': (0.04, 9000, 12, 0.012, 'hair'),
    'Mane3_Mesh': (0.04, 9000, 12, 0.012, 'hair'),
    'LegFL_Fur_Mesh': (0.034, 9000, 12, 0.01, 'hair'),
    'LegFR_Fur_Mesh': (0.034, 9000, 12, 0.01, 'hair'),
    'LegBL_Fur_Mesh': (0.034, 9000, 12, 0.01, 'hair'),
    'LegBR_Fur_Mesh': (0.034, 9000, 12, 0.01, 'hair'),
    'EarL_Inner_Mesh': (0.014, 14000, 8, 0.004, 'hair_gold'),
    'EarR_Inner_Mesh': (0.014, 14000, 8, 0.004, 'hair_gold'),
}

def mesh_area(obj):
    import bmesh
    bm = bmesh.new(); bm.from_mesh(obj.data)
    a = sum(f.calc_area() for f in bm.faces); bm.free()
    return a

def add_fur(obj, length, per_m2, children, curl, matkey, seed):
    obj.data.materials.clear()
    obj.data.materials.append(M['skin'] if matkey == 'hair' else M['hair_gold'])
    obj.data.materials.append(M[matkey])
    for p in obj.data.polygons:
        p.use_smooth = True
    mod = obj.modifiers.new('Fur', 'PARTICLE_SYSTEM')
    ps = mod.particle_system
    ps.seed = seed
    st = ps.settings
    st.type = 'HAIR'
    area = mesh_area(obj)
    parents = max(150, int(area * per_m2 * args.density))
    st.count = parents
    st.hair_length = length
    st.hair_step = 4
    st.render_step = 4
    st.display_step = 2
    st.emit_from = 'FACE'
    st.use_emit_random = True
    st.factor_random = 0.0
    st.child_type = 'INTERPOLATED'
    st.child_percent = 10
    st.rendered_child_count = max(2, int(children * (0.35 if args.quick else 1.0)))
    st.child_radius = 0.02 + length * 0.4
    st.child_roundness = 0.4
    st.child_length = 0.9
    st.child_length_threshold = 0.2
    st.clump_factor = 0.45
    st.clump_shape = 0.15
    st.roughness_endpoint = 0.02
    st.roughness_end_shape = 1.0
    st.kink = 'CURL'
    st.kink_amplitude = curl
    st.kink_frequency = 3.2
    st.kink_shape = 0.0
    st.kink_flat = 0.0
    st.root_radius = 1.0
    st.tip_radius = 0.7
    st.radius_scale = 0.0035 if length > 0.02 else 0.003
    st.material = 2
    st.use_hair_bspline = True
    if 'hairmask' in obj.vertex_groups:
        ps.vertex_group_density = 'hairmask'
        ps.vertex_group_length = 'hairmask'
    ps.settings.display_percentage = 100 if not args.quick else 40

def add_fuzz(obj, length, per_m2, seed):
    obj.data.materials.append(M['fuzz'])
    mod = obj.modifiers.new('Fuzz', 'PARTICLE_SYSTEM')
    ps = mod.particle_system; ps.seed = 100 + seed
    st = ps.settings
    st.type = 'HAIR'
    st.count = max(200, int(mesh_area(obj) * per_m2 * args.density))
    st.hair_length = length
    st.hair_step = 3; st.render_step = 3; st.display_step = 1
    st.emit_from = 'FACE'; st.use_emit_random = True
    st.child_type = 'INTERPOLATED'; st.rendered_child_count = 3 if args.quick else 6; st.child_percent = 5
    st.child_radius = 0.03; st.clump_factor = 0.1
    st.kink = 'CURL'; st.kink_amplitude = length * 0.5; st.kink_frequency = 2.0
    st.root_radius = 1.0; st.tip_radius = 0.3; st.radius_scale = 0.0012
    st.material = 3
    st.use_hair_bspline = True
    if 'hairmask' in obj.vertex_groups:
        ps.vertex_group_density = 'hairmask'
        ps.vertex_group_length = 'hairmask'
    ps.settings.display_percentage = 30

import mathutils
from mathutils.bvhtree import BVHTree
bpy.context.view_layer.update()

# place glyphs and eyes flush on the skin: align to the true surface normal, then push out any buried vertex (no stretching)
import bmesh
dg = bpy.context.evaluated_depsgraph_get()
def tree_for(name):
    ob = bpy.data.objects[name]
    return ob, BVHTree.FromObject(ob, dg)
TREES = {'body': tree_for('Body_Fur_Mesh'), 'head': tree_for('Head_Fur_Mesh'), 'muzzle': tree_for('Muzzle_Mesh')}

def surface_hit(which, wpoint, wdir_in):
    ob, tree = TREES[which]
    inv = ob.matrix_world.inverted()
    origin = inv @ (wpoint + wdir_in * 0.35)
    d_ob = (inv.to_3x3() @ (-wdir_in)).normalized()
    loc, nor, idx, dist = tree.ray_cast(origin, d_ob, 1.0)
    if loc is None:
        loc, nor, idx, dist = tree.find_nearest(inv @ wpoint)
    wloc = ob.matrix_world @ loc
    wnor = (ob.matrix_world.to_3x3() @ nor).normalized()
    return wloc, wnor

def place(o, which, lift, half_depth, local_n=(0, -1, 0), subdiv=0):
    mw = o.matrix_world.copy()
    c = mw.translation.copy()
    n = (mw.to_3x3() @ mathutils.Vector(local_n)).normalized()
    wloc, wnor = surface_hit(which, c, n)
    if wnor.dot(n) < 0: wnor = -wnor
    rot = n.rotation_difference(wnor).to_matrix().to_4x4()
    M = mathutils.Matrix.Translation(c) @ rot @ mathutils.Matrix.Translation(-c) @ mw
    M.translation = wloc + wnor * (lift + half_depth)
    o.matrix_world = M
    bpy.context.view_layer.update()
    return wnor

def push_out(o, which, lift, local_n=(0, -1, 0), cuts=2):
    if cuts:
        bm = bmesh.new(); bm.from_mesh(o.data)
        bmesh.ops.subdivide_edges(bm, edges=list(bm.edges), cuts=cuts, use_grid_fill=True)
        bm.to_mesh(o.data); bm.free()
    mw = o.matrix_world
    n = (mw.to_3x3() @ mathutils.Vector(local_n)).normalized()
    inv_mw = mw.inverted()
    for v in o.data.vertices:
        w = mw @ v.co
        wloc, wnor = surface_hit(which, w, n)
        h = (w - wloc).dot(wnor)
        if h < lift:
            v.co = inv_mw @ (w + wnor * (lift - h))
    for p in o.data.polygons: p.use_smooth = True
    o.data.update()

for o in [x for x in bpy.data.objects if x.type == 'MESH' and x.name.startswith('Glyph_')]:
    which = 'head' if 'Forehead' in o.name else 'body'
    place(o, which, 0.004, 0.011)
    push_out(o, which, 0.006)
for side in ('L', 'R'):
    eye = bpy.data.objects['Eye' + side]
    place(eye, 'head', 0.002, 0.012)
bpy.context.view_layer.update()

detail = []
for o in bpy.data.objects:
    if o.type == 'MESH' and (o.name.startswith('Glyph_') or o.name.endswith('_Rim') or o.name in ('Mouth', 'Nose') or o.name.endswith('_White')):
        detail += [o.matrix_world @ v.co for v in o.data.vertices]
kd = mathutils.kdtree.KDTree(len(detail))
for i, p in enumerate(detail): kd.insert(p, i)
kd.balance()

def hair_mask(obj, inner=0.012, outer=0.05):
    vg = obj.vertex_groups.new(name='hairmask')
    mw = obj.matrix_world
    for v in obj.data.vertices:
        co, idx, d = kd.find(mw @ v.co)
        t = max(0.0, min(1.0, (d - inner) / (outer - inner)))
        w = t * t * (3 - 2 * t)
        vg.add([v.index], w, 'REPLACE')
    return vg

for nm in ('Body_Fur_Mesh', 'Head_Fur_Mesh', 'Muzzle_Mesh'):
    hair_mask(bpy.data.objects[nm])

seed = 1
for name, (length, per_m2, children, curl, matkey) in FUR_PARTS.items():
    o = bpy.data.objects.get(name)
    if not o:
        print('missing', name); continue
    if not os.environ.get('NOHAIR'):
        add_fur(o, length, per_m2, children, curl, matkey, seed)
        if matkey == 'hair' and not os.environ.get('NOFUZZ'): add_fuzz(o, length * 0.45, 22000, seed)
    else: o.data.materials.clear(); o.data.materials.append(M['skin'])
    seed += 1

# non-fur parts
for o in bpy.data.objects:
    if o.type != 'MESH' or o.name in FUR_PARTS:
        continue
    for p in o.data.polygons: p.use_smooth = True
    n = o.name
    if n.startswith('Glyph_'): assign(o, M['gold'])
    elif n.endswith('_White'): assign(o, M['cream'])
    elif n.endswith('_Rim') or n.endswith('_Line') or ('Pupil' in n and 'Mesh' in n): assign(o, M['black'])
    elif 'Highlight' in n: assign(o, M['glow'])
    elif n.startswith('Lid') and n.endswith('_Mesh'): assign(o, M['lid'])
    elif n in ('Nose', 'Mouth'): assign(o, M['nose'])
    elif n.endswith('_Foot'): assign(o, M['foot'])
    else: print('unassigned', n)
bpy.data.objects['Mouth'].data.materials[0].use_backface_culling = False

# ---------------- world, floor, lights ----------------
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 16 if args.quick else args.samples
scene.cycles.use_denoising = True
scene.cycles.denoiser = 'OPENIMAGEDENOISE'
scene.cycles.max_bounces = 6
scene.cycles.diffuse_bounces = 3
scene.cycles.glossy_bounces = 3
scene.cycles.transmission_bounces = 2
try:
    scene.view_settings.view_transform = 'Khronos PBR Neutral'
except Exception:
    scene.view_settings.view_transform = 'Standard'
scene.view_settings.exposure = 0.0
scene.render.resolution_x = scene.render.resolution_y = (700 if args.quick else args.res)
scene.render.film_transparent = False

w = bpy.data.worlds.new('World'); scene.world = w; w.use_nodes = True
bg = w.node_tree.nodes['Background']
bg.inputs['Color'].default_value = srgb('#e4e0d8'); bg.inputs['Strength'].default_value = 0.4

bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
floor = bpy.context.object; floor.name = 'Floor'
floor.data.materials.append(principled('Floor', '#cfc8bb', 0.85))

def area_light(name, loc, energy, size, color='#fff2da'):
    d = bpy.data.lights.new(name, 'AREA'); d.energy = energy; d.size = size
    d.color = srgb(color)[:3]
    o = bpy.data.objects.new(name, d); scene.collection.objects.link(o)
    o.location = loc
    c = o.constraints.new('TRACK_TO'); c.target = target; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'
    return o

target = bpy.data.objects.new('Target', None); scene.collection.objects.link(target)
target.location = (0.1, 0.0, 1.0)
area_light('Key', (3.5, 3.5, 4.5), 420, 3.0)
area_light('Fill', (3.5, -4.0, 2.0), 120, 4.0, '#f2f0ec')
area_light('Rim', (-4.0, 2.5, 3.5), 380, 2.5, '#ffe0a8')
area_light('Top', (0.2, 0.0, 6.0), 160, 4.0)

cam_d = bpy.data.cameras.new('Cam'); cam_d.lens = 55
cam = bpy.data.objects.new('Cam', cam_d); scene.collection.objects.link(cam)
c = cam.constraints.new('TRACK_TO'); c.target = target; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'
scene.camera = cam

# three.js (x, y, z) -> blender (x, -z, y)
VIEWS = {
    'ref1': ((3.6, 4.2, 1.55), (0.1, 0, 1.0), 75),
    'ref2': ((5.8, -0.6, 1.45), (0.1, 0, 1.0), 75),
    'ref3': ((4.7, 2.0, 1.4), (0.1, 0, 1.0), 75),
    'side': ((0.1, -5.2, 1.05), (0.1, 0, 1.0), 55),
    'face': ((2.7, -0.02, 1.33), (0.65, 0, 1.3), 55),
    'three': ((3.0, -3.6, 1.75), (0.1, 0, 1.0), 55),
    'glyph': ((0.5, 2.3, 0.9), (0.1, 0.4, 0.7), 55),
    'front': ((6.2, 0.0, 1.2), (0.1, 0, 1.0), 75),
    'back': ((-6.2, 0.0, 1.3), (0.1, 0, 1.0), 75),
    'top': ((0.2, 0.01, 6.5), (0.1, 0, 1.0), 60),
    'faceclose': ((2.5, 1.4, 1.5), (0.7, 0.1, 1.38), 70),
}

if args.save:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, args.save), compress=True)

if not args.no_render:
    import time
    for v in args.views.split(','):
        pos, tgt, lens = VIEWS[v]
        cam.location = pos; target.location = tgt; cam_d.lens = lens
        scene.render.filepath = os.path.join(OUT, f'{v}.png')
        t = time.time()
        bpy.ops.render.render(write_still=True)
        print('rendered', v, round(time.time() - t, 1), 's')
