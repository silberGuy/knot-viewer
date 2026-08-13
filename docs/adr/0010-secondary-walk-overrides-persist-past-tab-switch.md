# Secondary walk overrides persist across tabs and Save, pruned instead of reset

Selected start point and crossing-walk-direction overrides used to reset every time the
Secondary tab was (re-)entered, on the reasoning that the knots can't change while it's showing
so nothing could go stale. Users found that reset itself surprising: switching to Drawing to
check something and back silently discarded their walk choices, and Save never captured them
at all.

Both now persist across tab switches and round-trip through Save/Load, kept in their own store
(`secondaryWalkStore`) rather than folded into `DrawingData` - they're save-file content, but not
part of what defines the drawing itself. Since point ids are positional (`${knotId}-${index}`),
a drawing edit can still invalidate a reference; on re-entering the Secondary tab we prune only
the overrides an edit actually broke (a crossing that no longer exists, a start point whose id is
gone) rather than wiping everything, since the walk's default anchor is arbitrary and not worth
forcing users back to.
