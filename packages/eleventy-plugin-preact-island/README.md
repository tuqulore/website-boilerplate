# @tuqulore-inc/eleventy-plugin-preact-island

Eleventy plugin for Preact Partial Hydration with is-land.

An Island is SSR-rendered HTML with client-side JavaScript layered on top; this package handles both sides. It is convention-first and zero-config: put your client entries under Eleventy's input directory with the `.client.{js,jsx,ts,tsx}` sub-extension, register the plugin, and it does the rest.

## Documentation

The design rationale (why Partial Hydration, why is-land, the `.client.*` convention, `<Island>` semantics, Island granularity) lives at [Plugins / eleventy-plugin-preact-island](https://website.tuqulore.workers.dev/en/plugins/eleventy-plugin-preact-island/).

## Installation

```bash
npm install -D @11ty/eleventy preact @tuqulore-inc/eleventy-plugin-preact-island
```

## Usage

```javascript
// eleventy.config.js
import preactIsland from "@tuqulore-inc/eleventy-plugin-preact-island";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(preactIsland);
}
```

Author client components as `src/**/*.client.jsx` (or `.tsx` / `.js` / `.ts`) and render them through `<Island>`.

## What it does

For each `*.client.{js,jsx,ts,tsx}` under Eleventy's input directory, the plugin:

1. Bundles it with esbuild, together with the browser-side setup module `__island-setup.js` (unless `bundle: false`). Dependencies shared across entries, such as Preact and `@preact/signals`, are split into chunks under `__island-chunks/`, so every Island runs on a single instance resolved from your installed packages.
2. Excludes it from Eleventy's template processing.
3. Copies [`@11ty/is-land`](https://github.com/11ty/is-land)'s `is-land.js` to the output directory and, on each page that contains `<is-land>`, loads the setup module from `</head>`.
4. Wires the URL resolver so `<Island>` on the SSR side emits the same URL the bundler produced.

No CDN or import map is involved: everything the browser loads comes from the output directory.

The plugin reads Eleventy's input/output directories (`eleventyConfig.directories.input` / `.output`) and its `pathPrefix`. There is no separate `srcDir` / `outDir` / `urlPrefix` option; the Eleventy configuration is the single source of truth.

## API

### Plugin options

`preactVersion` and `devalueVersion` are deprecated and ignored; they only pinned the CDN URLs the plugin no longer uses.

#### `bundle`

- Type: `boolean`
- Default: `true`

Whether to bundle `*.client.{js,jsx,ts,tsx}` entries with esbuild. Set to `false` to bring your own bundler; the ignore rule, the SSR URL resolver, the `is-land.js` copy, and the setup module loading stay active. Your bundler then has to:

- Produce the `.client.js` bundles at the URLs the resolver expects (`<pathPrefix><input-relative path>.client.js`).
- Bundle `<output>/__island-setup.js`, which the plugin writes unbundled with bare `preact` and `devalue` imports, in place. Resolve `preact` to the same instance as your `.client.*` bundles.
- Keep the `<pathPrefix>is-land.js?nodefine` import external. The query stops is-land from registering itself before the setup configures it, and bundling is-land would drop it.

```javascript
eleventyConfig.addPlugin(preactIsland, { bundle: false });
```

### `clientComponent(Component, moduleUrl)`

Marks a Preact component as a client component by attaching its SSR-side module URL. Call once in each `*.client.jsx` file:

```jsx
import { clientComponent } from "@tuqulore-inc/eleventy-plugin-preact-island/island";
import { useState } from "preact/hooks";

function Counter() {
  const [n, setN] = useState(0);
  return <button onClick={() => setN(n + 1)}>{n}</button>;
}

export default clientComponent(Counter, import.meta.url);
```

### `clientOnlyComponent(Component, moduleUrl)`

Marks a Preact component as a client-only component: `<Island>` skips its SSR render and emits the `fallback` prop instead, and the client mounts it with `render` rather than `hydrate`. Use it in place of `clientComponent` for components whose output differs between SSR and the browser, or that need browser-only APIs to render:

```jsx
import { clientOnlyComponent } from "@tuqulore-inc/eleventy-plugin-preact-island/island";
import { useEffect, useState } from "preact/hooks";

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <time>{now.toLocaleTimeString()}</time>;
}

export default clientOnlyComponent(Clock, import.meta.url);
```

The component body runs only in the browser, but the module itself is still evaluated during SSR, so keep browser APIs out of its top level. See [Plugins / eleventy-plugin-preact-island](https://website.tuqulore.workers.dev/en/plugins/eleventy-plugin-preact-island/) for wrapping a dependency that touches browser APIs at import time.

### `<Island>`

Wraps a client component in `<is-land>`. Extra props are forwarded to both the SSR render and the client hydration (for a client-only component, to the client render only); serialization uses [`devalue`](https://github.com/Rich-Harris/devalue) so `Date`, `Map`, `Set`, and similar types round-trip.

| Prop        | Type                              | Description                                                                       |
| ----------- | --------------------------------- | --------------------------------------------------------------------------------- |
| `component` | `ClientComponent`                 | Component wrapped with `clientComponent()` or `clientOnlyComponent()`.            |
| `on`        | `string` (default: `interaction`) | is-land initialization trigger. Rendered as the boolean attribute `land-on:<on>`. |
| `fallback`  | `ComponentChildren`               | Client-only components only. Rendered by SSR in place of the component.           |
| ...rest     | any                               | Forwarded to `<is-land>`'s `props` and to the component's SSR render as-is.       |

For parameterized triggers such as `on:media("(min-width: ...)")`, use the raw `<is-land>` element directly; the injected setup script keeps working.

## Requirements

- Node.js 20 or higher
- Eleventy 3.0 or higher
- Preact 10 or higher

## License

MIT
