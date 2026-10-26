import type { ComponentType } from "preact";

/**
 * Mount a client component into its `<is-land>` element. Loaded by the
 * browser-side setup module through `preactAdapter.mountModule`.
 */
export function mount(
  target: Element,
  Component: ComponentType<any>,
  props: Record<string, unknown>,
  options: { clientOnly: boolean },
): void;
