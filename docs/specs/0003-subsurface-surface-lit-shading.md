# Spec: Subsurface surface lit shading

Status: implemented.
Decision record: [docs/adr/0006-subsurface-surface-lit-shading-opt-in.md](../adr/0006-subsurface-surface-lit-shading-opt-in.md).
Glossary: see `CONTEXT.md`'s "Subsurface surface" entry.

## Summary

Give the Subsurface surface (cap + wall) real per-face lighting so a wall panel's actual shape —
flat or bent across its dividing diagonal (see ADR 0005) — becomes visible, instead of the current
single flat, unlit color. Scoped entirely to the Subsurface surface via a new opt-in `lit` prop on
`ViewerTriangle.vue`; knot surfaces (`KnotViewerKnot.vue`) are untouched and stay unlit.

## `src/components/ViewerTriangle.vue`

Add a `lit?: boolean` prop. When true:

- Both materials become `MeshLambertMaterial` instead of `MeshBasicMaterial` (front still
  `color.darken(10)`, back still the plain `color` — the existing orientation split is unchanged,
  see ADR 0006).
- The geometry needs real normals to shade with — call `geometry.computeVertexNormals()` after
  building it. Since each `ViewerTriangle` owns its own unshared 3-vertex geometry, this gives each
  triangle a single flat face normal (all three vertices normal-average to the same value, as only
  one face touches each of them) — exactly the flat, per-face shading needed to show a facet break
  where an adjacent panel bends.
- `opacity`/`transparent` behavior is unchanged — both material types accept the same
  `opacity`/`transparent` fields.

```vue
<script setup lang="ts">
import { computed } from "vue";
import {
	Mesh,
	MeshBasicMaterial,
	MeshLambertMaterial,
	BufferGeometry,
	BufferAttribute,
	FrontSide,
	BackSide,
	Group,
} from "three";
import tinycolor from "tinycolor2";
const props = defineProps<{
	points: [number, number, number][];
	color?: string;
	opacity?: number;
	lit?: boolean;
}>();

const geometry = computed(() => {
	const res = new BufferGeometry();
	const vertices = new Float32Array(props.points.flat());
	res.setAttribute("position", new BufferAttribute(vertices, 3));
	if (props.lit) res.computeVertexNormals();

	return res;
});

const polygon = computed(() => {
	const opacity = props.opacity ?? 1;
	const transparent = opacity < 1;
	const MaterialClass = props.lit ? MeshLambertMaterial : MeshBasicMaterial;
	const frontMat = new MaterialClass({
		color: tinycolor(props.color).darken(10).toHexString(),
		side: FrontSide,
		opacity,
		transparent,
	});
	const backMat = new MaterialClass({
		color: props.color,
		side: BackSide,
		opacity,
		transparent,
	});
	const frontMesh = new Mesh(geometry.value, frontMat);
	const backMesh = new Mesh(geometry.value, backMat);

	const group = new Group();
	group.add(frontMesh);
	group.add(backMesh);
	return group;
});
</script>
```

## `src/components/SubSurfaceCap.vue` and `src/components/SubSurfaceWall.vue`

Both pass `lit` on their own `ViewerTriangle`:

```vue
<ViewerTriangle
	v-for="triangle in triangles"
	:points="triangle"
	:key="triangle.flat().join('_')"
	:color="color"
	:opacity="opacity"
	lit
/>
```

No prop changes needed on `SubSurfaceCap`/`SubSurfaceWall`/`SubSurfaceSurface` themselves — `lit`
isn't user-configurable, it's a fixed characteristic of how the Subsurface surface renders.

## `src/components/KnotViewer.vue`

Add two lights, both unconditional (harmless to leave always-on: `MeshBasicMaterial`, used by every
other triangle in the scene, ignores lights entirely):

1. A low-intensity ambient fill, so faces angled away from the headlamp aren't pure black.
2. A point light nested *inside* `TresPerspectiveCamera` so it inherits the camera's transform (a
   "headlamp") — it always lights whatever's currently in view, regardless of how `OrbitControls`
   orbits the camera around the Subsurface wall.

```vue
<TresPerspectiveCamera
	:position="cameraPosition"
	:fov="50"
	:near="0.1"
	:far="1000"
>
	<TresPointLight :intensity="2" :decay="0" />
</TresPerspectiveCamera>
<TresAmbientLight :intensity="0.4" />
```

`decay="0"` is required, not optional: three.js's default physically-correct falloff (`decay: 2`)
fades to ~0 at this scene's scale (raw SVG pixel coordinates, often hundreds of units across),
which made the lit surface look flat and direction-independent again during manual validation —
see ADR 0006.

## Docs already updated

- `docs/adr/0006-subsurface-surface-lit-shading-opt-in.md`: this decision and the rejected
  alternatives (data-driven fake color, dropping the front/back orientation split, applying `lit`
  globally to `ViewerTriangle`).

## Validation plan

No test suite exists in this repo (per `AGENTS.md`); validate manually via `yarn dev`:

1. Draw two or more overlapping knots with at least one real crossing so the Subsurface wall has
   more than one panel, switch to the Subsurface tab, and confirm the wall now shows visible
   shading (not flat, uniform color).
2. Orbit the camera fully around the wall via `OrbitControls` and confirm it never goes dark or
   unlit from any angle (the headlamp should follow the view).
3. Find or construct a case where a wall panel's four corners aren't coplanar (loop points at
   different real heights on either side of one panel, per ADR 0005) and confirm a visible facet
   break appears at that panel's diagonal — this is the concrete signal this change exists to
   surface.
4. Confirm knot surfaces (`KnotViewerKnot`, rendered via plain `ViewerTriangle` without `lit`) look
   exactly as before — unlit, unaffected by the new lights.
5. Toggle the Subsurface opacity control and confirm transparency still works correctly on the now
   `MeshLambertMaterial`-based triangles.
6. `yarn build` (runs `vue-tsc -b`) to confirm no type errors from the new prop/material branching.

All of the above passed manually; confirmed working.
