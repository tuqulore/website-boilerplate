import { h, hydrate, render } from "preact";

/**
 * Mount a client component into its `<is-land>` element. Loaded by the
 * browser-side setup module through `preactAdapter.mountModule`.
 *
 * @param {Element} target
 * @param {import("preact").ComponentType<any>} Component
 * @param {Record<string, unknown>} props
 * @param {{ clientOnly: boolean }} options
 */
export function mount(target, Component, props, { clientOnly }) {
  if (clientOnly) {
    // NOTE: SSR output here is only the fallback, so mount from scratch. Unmount
    // a tree from an earlier mount (dev rehydrate) to run its effect cleanups,
    // and clear the fallback: render() leaves unknown children in place.
    render(null, target);
    target.replaceChildren();
    render(h(Component, props), target);
  } else {
    hydrate(h(Component, props), target);
  }
}
