# @tuqulore-inc/eleventy-plugin-preact-island

Eleventy plugin for Preact Partial Hydration with is-land.

An Island is SSR-rendered HTML with client-side JavaScript layered on top; this package handles both sides. It is convention-first and zero-config: put your client entries under Eleventy's input directory with the `.client.{js,jsx,ts,tsx}` sub-extension, register the plugin, and it does the rest.

## Documentation

The design rationale (why Partial Hydration, why is-land, the `.client.*` convention, `<Island>` semantics, Island granularity) lives at [Plugins / eleventy-plugin-preact-island](https://website.tuqulore.pages.dev/en/plugins/eleventy-plugin-preact-island/).

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

1. Bundles it with esbuild (unless `bundle: false`).
2. Excludes it from Eleventy's template processing.
3. Copies [`@11ty/is-land`](https://github.com/11ty/is-land)'s `is-land.js` to the output directory and injects the browser-side setup (import map for is-land and Preact, is-land init hook) before `</head>`.
4. Wires the URL resolver so `<Island>` on the SSR side emits the same URL the bundler produced.

The plugin reads Eleventy's input/output directories (`eleventyConfig.directories.input` / `.output`) and its `pathPrefix`. There is no separate `srcDir` / `outDir` / `urlPrefix` option; the Eleventy configuration is the single source of truth.

## API

### Plugin options

#### `preactVersion`

- Type: `string`
- Default: `""` (latest)

Preact version to fetch from the esm.sh CDN.

```javascript
eleventyConfig.addPlugin(preactIsland, {
  preactVersion: "10.26.4",
});
```

#### `bundle`

- Type: `boolean`
- Default: `true`

Whether to bundle `*.client.{js,jsx,ts,tsx}` entries with esbuild. Set to `false` to bring your own bundler; the ignore rule, the SSR URL resolver, the `is-land.js` copy, and the browser-side setup stay active. You then produce the `.client.js` bundles at the URLs the resolver expects (`<pathPrefix><input-relative path>.client.js`).

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

### `<Island>`

Wraps a client component in `<is-land>`. Extra props are forwarded to both the SSR render and the client hydration; serialization uses [`devalue`](https://github.com/Rich-Harris/devalue) so `Date`, `Map`, `Set`, and similar types round-trip.

| Prop        | Type                              | Description                                                                       |
| ----------- | --------------------------------- | --------------------------------------------------------------------------------- |
| `component` | `ClientComponent`                 | Component wrapped with `clientComponent()`.                                       |
| `on`        | `string` (default: `interaction`) | is-land initialization trigger. Rendered as the boolean attribute `land-on:<on>`. |
| ...rest     | any                               | Forwarded to `<is-land>`'s `props` and to the component's SSR render as-is.       |

For parameterized triggers such as `on:media("(min-width: ...)")`, use the raw `<is-land>` element directly; the injected setup script keeps working.

## Requirements

- Node.js 20 or higher
- Eleventy 3.0 or higher
- Preact 10 or higher

## License

MIT
