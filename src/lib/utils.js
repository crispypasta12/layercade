/**
 * Utility: merge class names.
 * Mirrors the `cn` helper from shadcn/ui.
 * Install `clsx` + `tailwind-merge` for full conflict-resolution;
 * this lightweight version is sufficient for this project.
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
