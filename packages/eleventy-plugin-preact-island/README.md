# @tuqulore-inc/eleventy-plugin-preact-island

Eleventy plugin for Preact partial hydration with is-land.

An Island is the SSR-rendered HTML with client-side JavaScript layered on top; this package handles both sides in one plugin. It:

1. Bundles `*.client.jsx` entry points with esbuild for the browser.
2. Excludes those files from Eleventy template processing.
3. Injects the browser-side [`@11ty/is-land`](https://github.com/11ty/is-land) + Preact setup into every HTML page.
4. Provides an `<Island>` wrapper that renders SSR content and emits the matching `<is-land>` element with the correct `import` URL for hydration.

The bundle output layout (`srcDir` / `outDir`) and the hydration import URL are wired from the same options, so they cannot drift. The URL prefix follows Eleventy's own `pathPrefix`, so sub-directory deployments (e.g. GitHub Pages under `/repo/`) work without a second knob.

## Installation

```bash
npm install -D @11ty/eleventy preact @tuqulore-inc/eleventy-plugin-preact-island
```

## Usage

```javascript
// eleventy.config.mjs
import preactIsland from "@tuqulore-inc/eleventy-plugin-preact-island";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(preactIsland, {
    entries: "./src/**/*.client.jsx",
  });
}
```

## What it does

1. **Bundles `*.client.jsx` files** with esbuild (opt-in via `entries`)
2. **Ignores** matching files as Eleventy templates (they're client entries, not pages)
3. **Copies `is-land.js`** from `@11ty/is-land` to the output directory
4. **Injects scripts** before `</head>`:
   - Import map for is-land and Preact (from esm.sh CDN)
   - Development-only WebSocket hook for rehydration after hot reload
   - is-land setup script with `Island.addInitType("preact", mount)`
5. **Wires the URL resolver** so `<Island>` on the SSR side emits the same URL that the bundler produced

## Options

### `entries`

- Type: `string`
- Default: `undefined`

Glob pattern for client entry points. Files matching this pattern are bundled with esbuild and excluded from Eleventy's template pipeline. When omitted, no bundling happens and no ignore rule is added.

```javascript
eleventyConfig.addPlugin(preactIsland, {
  entries: "./src/**/*.client.jsx",
});
```

### `srcDir`

- Type: `string`
- Default: `"src"`

Source directory that contains the client entry points. Used both as esbuild's `outbase` (to preserve the source directory structure under `outDir`) and as the marker segment when converting SSR-side client module URLs (e.g. `import.meta.url` inside `foo.client.jsx`) into browser URLs. Should match your Eleventy input directory.

### `outDir`

- Type: `string`
- Default: `"dist"`

esbuild `outdir` for client entry bundles. Usually matches your Eleventy output directory so bundled `.client.js` files land next to their siblings.

### URL prefix (follows Eleventy `pathPrefix`)

There is no separate `urlPrefix` option. The plugin reads Eleventy's own [`pathPrefix`](https://www.11ty.dev/docs/config/#deploy-to-a-subdirectory-with-a-path-prefix) at plugin-registration time and uses that as the URL prefix for `<is-land import="...">`.

- Default deployment (site served at `/`): `pathPrefix: "/"` → `<is-land import="/foo.client.js">`
- Sub-directory deployment (e.g. GitHub Pages at `https://user.github.io/my-site/`): `pathPrefix: "/my-site/"` → `<is-land import="/my-site/foo.client.js">`

Deployments that serve bundles from a completely different origin or path (e.g. a CDN mounted at `/cdn/` while the site itself is at `/`) fall outside this convention. Use the [`setClientModuleResolver` escape hatch](#escape-hatch-setclientmoduleresolver-for-non-conforming-builds) below.

Combined example:

```javascript
eleventyConfig.addPlugin(preactIsland, {
  entries: "./content/**/*.client.jsx",
  srcDir: "content",
  outDir: "_site",
});
```

With this config, `content/foo.client.jsx` is bundled to `_site/foo.client.js`. If Eleventy's `pathPrefix` is `/`, the rendered element is `<is-land ... import="/foo.client.js">`.

### `preactVersion`

- Type: `string`
- Default: `""` (latest)

Specify the Preact version to use from esm.sh CDN.

```javascript
eleventyConfig.addPlugin(preactIsland, {
  preactVersion: "10.26.4",
});
```

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
  props='{"label":"click me"}'
>
  <button>0</button>
</is-land>
```

#### Props

| Prop        | Type                              | Description                                                                             |
| ----------- | --------------------------------- | --------------------------------------------------------------------------------------- |
| `component` | `ClientComponent`                 | Component wrapped with `clientComponent()` in its `*.client.jsx` file.                  |
| `on`        | `string` (default: `interaction`) | is-land initialization trigger. Rendered as the boolean attribute `land-on:<on>`.       |
| ...rest     | any                               | Serialized as `props` on `<is-land>` and forwarded to the component's SSR render as-is. |

For parameterized triggers such as `on:media("(min-width: ...)")`, use the raw `<is-land>` element directly; the injected setup script still handles it.

### Backward compatibility with raw `<is-land>`

The raw `<is-land>` element remains fully supported — the script injection is unchanged. `<Island>` is a strict addition; existing partial hydration code that uses `<is-land>` directly continues to work.

## Escape hatch: `setClientModuleResolver` for non-conforming builds

The plugin's convention is:

- Client entries live under `<srcDir>/**/*.client.{js,jsx,ts,tsx}`
- Bundles are served at `<eleventyPathPrefix>**/*.client.js`

If your build doesn't fit this convention — for example, you bundle client code with Vite and it lands at a hashed URL like `/assets/foo-abc123.js`, you use a different sub-extension like `.island.jsx`, or your bundles are served from a different origin than the site itself — use `<Island>` outside this plugin by installing a custom resolver from the `./island` subpath:

```javascript
// eleventy.config.mjs (no Island plugin needed for the resolver, but you still need it for is-land script injection)
import { setClientModuleResolver } from "@tuqulore-inc/eleventy-plugin-preact-island/island";

setClientModuleResolver((moduleUrl) => myBuild.urlFor(moduleUrl));
```

- The plugin's `srcDir` option (plus Eleventy's `pathPrefix`) exists so you don't have to write a resolver at all when your build layout is a simple prefix rewrite.
- `setClientModuleResolver` is the low-level extension point that keeps the `<Island>` / `clientComponent` primitives usable across arbitrary conventions.

## Requirements

- Node.js 20 or higher
- Eleventy 3.0 or higher
- Preact 10 or higher

## License

MIT
