# @tuqulore-inc/eleventy-plugin-preact-island

Eleventy plugin for Preact partial hydration with is-land.

An Island is SSR-rendered HTML with client-side JavaScript layered on top; this package handles both sides in one plugin. It is convention-first and zero-config: put your client entries under Eleventy's input directory with the `.client.{js,jsx,ts,tsx}` sub-extension, register the plugin, and it does the rest.

For any `*.client.{js,jsx,ts,tsx}` file under your Eleventy input directory, it:

1. Bundles it with esbuild (unless you opt out with `bundle: false`).
2. Excludes it from Eleventy template processing (so client entries are never rendered as pages).
3. Copies [`@11ty/is-land`](https://github.com/11ty/is-land)'s `is-land.js` to the output directory and injects the browser-side is-land + Preact setup into every HTML page.
4. Provides an `<Island>` wrapper that renders SSR content and emits the matching `<is-land>` element with the correct `import` URL for hydration.

## Convention

- **Input / output directories ride on Eleventy's own configuration.** The plugin reads `eleventyConfig.directories.input` / `.output`, so `setInputDirectory` / `setOutputDirectory` (or the CLI `--input` / `--output`) are the single source of truth. There is no separate `srcDir` / `outDir` knob.
- **Client entries are discovered by convention:** every `<input>/**/*.client.{js,jsx,ts,tsx}`. A file's sub-extension (`.client.`) is what marks it as a client entry; the compiled bundle is served at `<input-relative path>.client.js`.
- **The URL prefix follows Eleventy's own [`pathPrefix`](https://www.11ty.dev/docs/config/#deploy-to-a-subdirectory-with-a-path-prefix)**, so sub-directory deployments (e.g. GitHub Pages under `/repo/`) work without a second knob.

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

That's it. Author client components as `src/**/*.client.jsx` (or `.tsx` / `.js` / `.ts`) and render them through `<Island>` (see [Partial Hydration](#partial-hydration)).

## What it does

1. **Bundles client entries** with esbuild — every `*.client.{js,jsx,ts,tsx}` under the Eleventy input directory. If none exist, esbuild is skipped, so a site that doesn't use Islands still builds.
2. **Ignores** those files as Eleventy templates (they're client entries, not pages). This ignore rule is always added, independent of `bundle`.
3. **Copies `is-land.js`** from `@11ty/is-land` to the output directory.
4. **Injects scripts** before `</head>`:
   - Import map for is-land, Preact, `@preact/signals`, and [`devalue`](https://github.com/Rich-Harris/devalue) (from esm.sh CDN). `@preact/signals` is resolved via the import map so every island bundle shares a single signals instance and preact `options` patch — bundling it per entry would replicate the patch and trip the runtime `Cycle detected` guard.
   - Development-only WebSocket hook for rehydration after hot reload
   - is-land setup script with `Island.addInitType("preact", mount)`
5. **Wires the URL resolver** so `<Island>` on the SSR side emits the same URL the bundler produced. Client entries must use the `.client.{js,jsx,ts,tsx}` sub-extension and live under the input directory.

## Options

### `preactVersion`

- Type: `string`
- Default: auto-detected from the installed `preact` (falls back to esm.sh
  latest with a warning if `preact` cannot be resolved)

Normally you do not need to set this. The plugin reads the version of `preact`
installed in your project (from `preact/package.json`) and pins the esm.sh
import-map URLs to it, so the CDN runtime stays in sync with the SSR/bundle
side by default.

Set this only to force the CDN side to a different version than the installed
one (e.g., an emergency rollback of the runtime without touching your
`package.json`).

```javascript
eleventyConfig.addPlugin(preactIsland, {
  preactVersion: "10.26.4",
});
```

### `devalueVersion`

- Type: `string`
- Default: auto-detected from the `devalue` bundled with this plugin (falls
  back to esm.sh latest with a warning if `devalue` cannot be resolved)

Normally you do not need to set this. The plugin reads the version of `devalue`
bundled with itself (from `devalue/package.json`) and pins the esm.sh
import-map URL to it, so the SSR-side `devalue.stringify` and the client-side
`devalue.parse` stay on the same version by default.

Set this only to force the CDN side to a different version than the bundled
one.

```javascript
eleventyConfig.addPlugin(preactIsland, {
  devalueVersion: "5.8.1",
});
```

### `bundle`

- Type: `boolean`
- Default: `true`

Whether to bundle `*.client.{js,jsx,ts,tsx}` entries with esbuild. Set to `false` to bring your own bundler — everything else stays active: the Eleventy ignore rule, the SSR URL resolver wiring, the `is-land.js` copy, and the browser-side script injection. You are then responsible for producing the `.client.js` bundles at the URLs the resolver expects (`<pathPrefix><input-relative path>.client.js`).

```javascript
eleventyConfig.addPlugin(preactIsland, { bundle: false });
```

### URL prefix (follows Eleventy `pathPrefix`)

There is no `urlPrefix` option. The plugin reads Eleventy's own [`pathPrefix`](https://www.11ty.dev/docs/config/#deploy-to-a-subdirectory-with-a-path-prefix) when it executes and uses it as the URL prefix for `<is-land import="...">` and for the `is-land` entry in the injected import map. Eleventy 3 runs plugins after your config function returns, so a `pathPrefix` declared in the config return object (or via the CLI `--pathprefix`) is already visible to the plugin.

- Default deployment (site served at `/`): `pathPrefix: "/"` → `<is-land import="/foo.client.js">`
- Sub-directory deployment (e.g. GitHub Pages at `https://user.github.io/my-site/`): `pathPrefix: "/my-site/"` → `<is-land import="/my-site/foo.client.js">`

> [!NOTE]
>
> Set the input/output directories with Eleventy's `setInputDirectory` / `setOutputDirectory` in the config function (or the CLI `--input` / `--output`), not from inside another plugin — the Island plugin reads them when it runs, so changing them after it registers is an ordering hazard.

## Partial Hydration

### `clientComponent(Component, moduleUrl)`

Marks a Preact component as a client component by attaching its SSR-side module URL. Call once in each `*.client.jsx` file:

```jsx
// src/counter.client.jsx
import { clientComponent } from "@tuqulore-inc/eleventy-plugin-preact-island/island";
import { useState } from "preact/hooks";

function Counter() {
  const [n, setN] = useState(0);
  return <button onClick={() => setN(n + 1)}>{n}</button>;
}

export default clientComponent(Counter, import.meta.url);
```

### `<Island>`

Wrap a client component in `<is-land>`. Extra props are forwarded to both the SSR render and the client hydration.

```jsx
import { Island } from "@tuqulore-inc/eleventy-plugin-preact-island/island";
import Counter from "./counter.client.jsx";

<Island component={Counter} on="interaction" label="click me" />;
```

The example renders (after resolving the import URL):

```html
<is-land
  land-on:interaction
  type="preact"
  import="/counter.client.js"
  props='[{"label":1},"click me"]'
>
  <button>0</button>
</is-land>
```

The `props` attribute is serialized with [`devalue`](https://github.com/Rich-Harris/devalue), not `JSON.stringify`, so `<Island>` can pass values JSON can't represent — `Date`, `Map`, `Set`, `RegExp`, `BigInt`, `undefined`, `NaN`, `Infinity`, and cyclic references — all the way through to hydration with their native types intact. The client-side setup calls `devalue.parse` to reconstruct them.

#### Props

| Prop        | Type                              | Description                                                                                                                                         |
| ----------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `component` | `ClientComponent`                 | Component wrapped with `clientComponent()` in its `*.client.jsx` file.                                                                              |
| `on`        | `string` (default: `interaction`) | is-land initialization trigger. Rendered as the boolean attribute `land-on:<on>`.                                                                   |
| ...rest     | any                               | Serialized with [`devalue`](https://github.com/Rich-Harris/devalue) onto `<is-land props="...">` and forwarded to the component's SSR render as-is. |

Supported prop types include everything JSON can carry plus `Date`, `Map`, `Set`, `RegExp`, `BigInt`, `undefined`, `NaN`, `Infinity`, and cyclic references. Functions, symbols, DOM nodes, and unregistered class instances are not serializable — passing them throws an `Island: failed to devalue.stringify props` error at build time.

For parameterized triggers such as `on:media("(min-width: ...)")`, use the raw `<is-land>` element directly; the injected setup script still handles it.

## Interoperating with raw `<is-land>`

The raw `<is-land>` element remains fully supported — the script injection is unchanged, and existing partial hydration code that writes `<is-land>` by hand keeps working. `<Island>` is a strict addition on top.

The `props` attribute is now serialized with [`devalue`](https://github.com/Rich-Harris/devalue); write raw `<is-land props="...">` values with `devalue.stringify` if you construct them by hand.

If you want to control bundling entirely yourself (custom output layout, a different sub-extension, hashed asset URLs, or serving bundles from another origin), you can bypass this plugin's `<Island>` convention and drive [`@11ty/is-land`](https://github.com/11ty/is-land) directly — write the `<is-land>` elements and their `import` URLs yourself. The plugin's browser-side setup (import map, is-land script, dev rehydration hook) still applies to those elements.

## Requirements

- Node.js 20 or higher
- Eleventy 3.0 or higher
- Preact 10 or higher

## License

MIT
