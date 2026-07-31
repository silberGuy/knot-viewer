# Presentational `KnotShape` component, wrapped by `DrawingKnot` for interactivity

To add a read-only **Subsurface** board alongside the editable **Drawing** board, we needed a
way to render a knot's lines and points without the dragging/click-to-close/click-to-remove
behavior that `DrawingKnot` and `DrawingPoint` currently bake in unconditionally (e.g.
`DrawingPoint` calls `useDraggable` in `setup()` with no way to opt out).

We considered gating that behavior with a `static`/`readonly` prop on `DrawingKnot` and
`DrawingPoint` directly, so both boards could reuse the same components as-is. We rejected
this: it would leave every future static board's rendering coupled to `DrawingKnot`'s editing
logic, and each new interactive affordance added there would need to remember to check the
prop.

Instead, `DrawingKnot`'s rendering (line/point layout, driven by `getKnotLines`) is extracted
into a new presentational component, `KnotShape`, with no interaction logic of its own — it
exposes scoped slots (`#line`, `#point`) whose default content is plain, inert markup.
`DrawingKnot` wraps `KnotShape` and fills those slots with the interactive pieces (draggable
points, close/remove/insert handlers). A static board (e.g. `SubsurfaceBoard`) uses `KnotShape`
directly with no slots filled, guaranteeing it can never accidentally inherit editing behavior
— there's no prop to forget to set.
