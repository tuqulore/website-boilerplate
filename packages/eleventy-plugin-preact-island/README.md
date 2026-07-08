# @tuqulore-inc/eleventy-plugin-preact-island

Eleventy plugin for Preact partial hydration with is-land.

This plugin:

1. Injects the browser-side setup for [`@11ty/is-land`](https://github.com/11ty/is-land) + Preact into every HTML page.
2. Ships an `<Island>` wrapper component that eliminates the `<is-land>` boilerplate (`type="preact"`, hardcoded `import` URL, `JSON.stringify(props)`, duplicate SSR children).

## Installation

```bash
npm install -D @11ty/eleventy preact @tuqulore-inc/eleventy-plugin-preact-island
```

## Usage

```javascript
// eleventy.config.mjs
import preactIsland from "@tuqulore-inc/eleventy-plugin-preact-island";

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(preactIsland);
}
```

## What it does

1. **Copies `is-land.js`** from `@11ty/is-land` to the output directory
2. **Injects scripts** before `</head>`:
   - Import map for is-land and Preact (from esm.sh CDN)
   - Development-only WebSocket hook for rehydration after hot reload
   - is-land setup script with `Island.addInitType("preact", mount)`
3. **Registers a hydrate module URL resolver** used by the `<Island>` component (see below).

## Options

### `preactVersion`

- Type: `string`
- Default: `""` (latest)

Specify the Preact version to use from esm.sh CDN.

```javascript
eleventyConfig.addPlugin(preactIsland, {
  preactVersion: "10.26.4",
});
```

### `resolveHydrateUrl`

- Type: `(moduleUrl: string) => string`
- Default: `createHydrateModuleResolver()` (`srcDir: "src"`, `urlPrefix: "/"`)

Convert an SSR-side hydrate module URL (e.g. `import.meta.url` inside `foo.hydrate.jsx`) into the browser URL where the compiled bundle is served. When using this plugin outside `@tuqulore-inc/eleventy-preset`, pass a resolver that matches your build convention.

```javascript
import preactIsland from "@tuqulore-inc/eleventy-plugin-preact-island";
import { createHydrateModuleResolver } from "@tuqulore-inc/eleventy-plugin-preact-island/resolver";

eleventyConfig.addPlugin(preactIsland, {
  resolveHydrateUrl: createHydrateModuleResolver({
    srcDir: "content",
    urlPrefix: "/assets",
  }),
});
```

Or supply an arbitrary function:

```javascript
eleventyConfig.addPlugin(preactIsland, {
  resolveHydrateUrl: (moduleUrl) =>
    moduleUrl.replace(/^.*\/pages\//, "/build/").replace(/\.jsx$/, ".js"),
});
```

## Partial Hydration

### `hydratable(Component, moduleUrl)`

Marks a component as hydratable by attaching its SSR-side module URL. Call once in each `*.hydrate.jsx` file:

```jsx
// src/counter.hydrate.jsx
import { hydratable } from "@tuqulore-inc/eleventy-plugin-preact-island/island";
import { useState } from "preact/hooks";

function Counter() {
  const [n, setN] = useState(0);
  return <button onClick={() => setN(n + 1)}>{n}</button>;
}

export default hydratable(Counter, import.meta.url);
```

### `<Island>`

Wrap a hydratable component in `<is-land>`. Extra props are forwarded to both the SSR render and the client hydration.

```jsx
import { Island } from "@tuqulore-inc/eleventy-plugin-preact-island/island";
import Counter from "./counter.hydrate.jsx";

<Island component={Counter} on="interaction" label="click me" />;
```

The example renders (after resolving the import URL):

```html
<is-land
  land-on:interaction
  type="preact"
  import="/counter.hydrate.js"
  props='{"label":"click me"}'
>
  <button>0</button>
</is-land>
```

#### Props

| Prop        | Type                              | Description                                                                             |
| ----------- | --------------------------------- | --------------------------------------------------------------------------------------- |
| `component` | `HydratableComponent`             | Component wrapped with `hydratable()` in its `*.hydrate.jsx` file.                      |
| `on`        | `string` (default: `interaction`) | is-land initialization trigger. Rendered as the boolean attribute `land-on:<on>`.       |
| ...rest     | any                               | Serialized as `props` on `<is-land>` and forwarded to the component's SSR render as-is. |

For parameterized triggers such as `on:media("(min-width: ...)")`, use the raw `<is-land>` element directly; the injected setup script still handles it.

### Backward compatibility

The raw `<is-land>` element remains fully supported — this plugin's script injection is unchanged. `<Island>` is a strict addition; existing partial hydration code continues to work.

## Requirements

- Node.js 20 or higher
- Eleventy 3.0 or higher
- Preact 10 or higher

## License

MIT
