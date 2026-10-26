# @tuqulore-inc/eleventy-plugin-preact-island

> **Deprecated.** Use [@tuqulore-inc/eleventy-islands](../eleventy-islands) instead. This package only composes it and will be removed in the next major version.

| This package                                         | Replacement                                                                                         |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `addPlugin(preactIsland)`                            | `addPlugin(islands, { adapter: preactAdapter, bundler: esbuildBundler() })`                         |
| `addPlugin(preactIsland, { bundle: false })`         | `addPlugin(islands, { adapter: preactAdapter })`                                                    |
| `@tuqulore-inc/eleventy-plugin-preact-island/island` | `@tuqulore-inc/eleventy-islands/preact` (`Island`, `clientComponent`, `clientOnlyComponent`, types) |

`islands` is the default export of `@tuqulore-inc/eleventy-islands`, `preactAdapter` comes from `@tuqulore-inc/eleventy-islands/preact`, and `esbuildBundler` from `@tuqulore-inc/eleventy-islands/esbuild`. With [@tuqulore-inc/eleventy-preset](../eleventy-preset), nothing changes: keep importing from `@tuqulore-inc/eleventy-preset/island`.

See [Plugins / eleventy-islands](https://website.tuqulore.workers.dev/en/plugins/eleventy-islands/) for details.

## License

MIT
