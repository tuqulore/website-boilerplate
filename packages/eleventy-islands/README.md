# @tuqulore-inc/eleventy-islands

Eleventy plugin for Partial Hydration with is-land.

An Island is SSR-rendered HTML with client-side JavaScript layered on top; this package handles both sides. It is convention-first and zero-config: put your client entries under Eleventy's input directory with the `.client.{js,jsx,ts,tsx}` sub-extension, register the plugin, and it does the rest.

The plugin itself depends on neither a UI framework nor a bundler. They plug in through two options, and this package ships one of each as a subpath:

- `@tuqulore-inc/eleventy-islands/preact` — the Preact adapter and `<Island>`
- `@tuqulore-inc/eleventy-islands/esbuild` — the esbuild bundler

## Documentation

The design rationale (why Partial Hydration, why is-land, the `.client.*` convention, `<Island>` semantics, Island granularity) lives at [Plugins / eleventy-islands](https://website.tuqulore.workers.dev/en/plugins/eleventy-islands/).

## Installation

```bash
npm install -D @11ty/eleventy preact esbuild @tuqulore-inc/eleventy-islands
```

`preact` and `esbuild` are optional peer dependencies: install them when you use the matching subpath.

## Usage

```javascript
// eleventy.config.js
import islands from "@tuqulore-inc/eleventy-islands";
import { esbuildBundler } from "@tuqulore-inc/eleventy-islands/esbuild";
import { preactAdapter } from "@tuqulore-inc/eleventy-islands/preact";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(islands, { adapter: preactAdapter, bundler: esbuildBundler() });
}
```

Author client components as `src/**/*.client.jsx` (or `.tsx` / `.js` / `.ts`) and render them through `<Island>`.

## What it does

For each `*.client.{js,jsx,ts,tsx}` under Eleventy's input directory, the plugin:

1. Hands it to `bundler`, together with the browser-side setup module `__island-setup.js`, which starts is-land and mounts each island through the adapter. Without a bundler, the setup module is written unbundled for your own bundler.
2. Excludes it from Eleventy's template processing.
3. Copies [`@11ty/is-land`](https://github.com/11ty/is-land)'s `is-land.js` to the output directory and, on each page that contains `<is-land>`, loads the setup module from `</head>`.
4. Wires the URL resolver so `<Island>` on the SSR side emits the same URL the bundler produced.

No CDN or import map is involved: everything the browser loads comes from the output directory.

The plugin reads Eleventy's input/output directories (`eleventyConfig.directories.input` / `.output`) and its `pathPrefix`. There is no separate `srcDir` / `outDir` / `urlPrefix` option; the Eleventy configuration is the single source of truth.

## API

### Plugin options

#### `adapter` (required)

- Type: `IslandAdapter`

Connects the client boundary to a UI framework. Use `preactAdapter` from `@tuqulore-inc/eleventy-islands/preact`. An adapter is `{ type, mountModule, jsxImportSource? }`:

- `type` — the `type` attribute of `<is-land>` and the is-land init type.
- `mountModule` — file URL of a browser module exporting `mount(target, Component, props, { clientOnly })`.
- `jsxImportSource` — JSX import source for the bundler.

#### `bundler`

- Type: `(context: BundlerContext) => Promise<void> | void`
- Default: none

Bundles the client entries and the setup module; called on every `eleventy.before`. Use `esbuildBundler()` from `@tuqulore-inc/eleventy-islands/esbuild`, or pass your own function; `BundlerContext` in `index.d.ts` describes what it receives.

Without a bundler, the ignore rule, the SSR URL resolver, the `is-land.js` copy, and the setup module loading stay active, and the plugin writes `<output>/__island-setup.js` unbundled. Your bundler then has to:

- Produce the `.client.js` bundles at the URLs the resolver expects (`<pathPrefix><input-relative path>.client.js`).
- Bundle `<output>/__island-setup.js` in place. It imports `devalue` and the adapter's mount module by absolute path; resolve the framework imported there to the same instance as your `.client.*` bundles.
- Keep the `<pathPrefix>is-land.js?nodefine` import external. The query stops is-land from registering itself before the setup configures it, and bundling is-land would drop it.

### `esbuildBundler(options)` (`/esbuild`)

Bundles with esbuild. Dependencies shared across entries, such as Preact and `@preact/signals`, are split into chunks under `__island-chunks/`, so every Island runs on a single instance resolved from your installed packages. Output is minified in `build` run mode.

#### `esbuildOptions`

- Type: esbuild `BuildOptions`
- Default: `{}`

Extra esbuild options. `plugins` run after the built-in setup plugin; the other keys override the defaults (`jsx: "automatic"`, `jsxImportSource` from the adapter, `minify` in `build` run mode). `bundle`, `chunkNames`, `entryPoints`, `format`, `outdir`, and `splitting` define the output layout and are rejected.

```javascript
esbuildBundler({ esbuildOptions: { target: "es2022", plugins: [myPlugin] } });
```

### `clientComponent(Component, moduleUrl)`

Marks a component as a client component by attaching its SSR-side module URL. Call once in each `*.client.jsx` file:

```jsx
import { clientComponent } from "@tuqulore-inc/eleventy-islands/preact";
import { useState } from "preact/hooks";

function Counter() {
  const [n, setN] = useState(0);
  return <button onClick={() => setN(n + 1)}>{n}</button>;
}

export default clientComponent(Counter, import.meta.url);
```

It is framework-agnostic and also exported from `@tuqulore-inc/eleventy-islands/island`; `/preact` re-exports it with Preact typings.

### `clientOnlyComponent(Component, moduleUrl)`

Marks a component as a client-only component: `<Island>` skips its SSR render and emits the `fallback` prop instead, and the client mounts it from scratch rather than hydrating. Use it in place of `clientComponent` for components whose output differs between SSR and the browser, or that need browser-only APIs to render:

```jsx
import { clientOnlyComponent } from "@tuqulore-inc/eleventy-islands/preact";
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

The component body runs only in the browser, but the module itself is still evaluated during SSR, so keep browser APIs out of its top level. See [Plugins / eleventy-islands](https://website.tuqulore.workers.dev/en/plugins/eleventy-islands/) for wrapping a dependency that touches browser APIs at import time.

### `<Island>` (`/preact`)

Wraps a client component in `<is-land>`. Extra props are forwarded to both the SSR render and the client hydration (for a client-only component, to the client render only); serialization uses [`devalue`](https://github.com/Rich-Harris/devalue) so `Date`, `Map`, `Set`, and similar types round-trip.

| Prop        | Type                              | Description                                                                                                                      |
| ----------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `component` | `ClientComponent`                 | Component wrapped with `clientComponent()` or `clientOnlyComponent()`.                                                           |
| `on`        | `string` (default: `interaction`) | is-land initialization trigger. Rendered as the boolean attribute `land-on:<on>`. Defaults to `load` for client-only components. |
| `fallback`  | `ComponentChildren`               | Client-only components only. Rendered by SSR in place of the component.                                                          |
| ...rest     | any                               | Forwarded to `<is-land>`'s `props` and to the component's SSR render as-is.                                                      |

For parameterized triggers such as `on:media("(min-width: ...)")`, use the raw `<is-land>` element directly; the injected setup script keeps working.

### `islandAttributes(component, props, { type, on })` (`/island`)

For adapter authors. Validates the component and trigger, resolves the client module URL, serializes the props, and returns the `<is-land>` attributes together with the props and fallback the adapter renders. `<Island>` in `/preact` is built on it.

## Requirements

- Node.js 20 or higher
- Eleventy 3.0 or higher
- Preact 10 or higher (for `/preact`)
- esbuild 0.28 or higher (for `/esbuild`)

## License

MIT
