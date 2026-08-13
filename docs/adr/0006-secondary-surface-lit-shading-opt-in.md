# Secondary surface gets real per-face lighting, opt-in via ViewerTriangle

Status: accepted — validated visually after implementation (see spec 0003).

The Secondary wall isn't guaranteed planar (ADR 0005), but currently renders in one flat, unlit
color, so a bent panel and a flat one look identical. We're adding real per-face lighting rather
than faking a shape cue with a data-driven color — it shows the actual geometry instead of an
imperfect proxy for it.

Lighting is opt-in via a new `lit` prop on `ViewerTriangle.vue` (materials become
`MeshLambertMaterial` — cheap, purely diffuse), used only by `SecondaryCap`/`SecondaryWall`; knot
surfaces stay unlit. The existing front/back color split (which conveys surface *orientation*, a
separate signal from shading) is preserved under lighting, not replaced. Light source: a point
light attached to the camera, so it always covers whatever's in view while orbiting, plus a low
ambient fill — both always-on, since unlit materials elsewhere simply ignore them. The point light
uses `decay: 0`: three.js's default physically-correct falloff (`decay: 2`) fades to ~0 at this
scene's scale (raw SVG pixel coordinates, often hundreds of units across), which made the lit
surface look flat and direction-independent again.
