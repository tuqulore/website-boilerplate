/**
 * @typedef {import('node:module').LoadHookContext} LoadHookContext
 * @typedef {import('node:module').LoadFnOutput} LoadFnOutput
 * @typedef {import('node:module').LoadHook} LoadHookType
 */

import fs from "node:fs/promises";
import babel from "@babel/core";

/**
 * Load `file:` URLs to JSX files.
 *
 * @param {string} href
 *   URL.
 * @param {LoadHookContext} context
 *   Context.
 * @param {NextLoad} nextLoad
 *   Next or default `load` function.
 * @returns {Promise<LoadFnOutput>}
 *   Result.
 * @satisfies {LoadHookType}
 */
export async function load(href, context, nextLoad) {
  const url = new URL(href);

  if (url.protocol === "file:" && /\.jsx$/.test(url.pathname)) {
    const value = await fs.readFile(url);
    const file = babel.transform(value, {
      presets: [
        [
          "@babel/preset-react",
          {
            runtime: "automatic",
            importSource: "preact",
            throwIfNamespace: false,
          },
        ],
      ],
    });

    return {
      format: "module",
      shortCircuit: true,
      source:
        String(file.code) +
        "\n//# sourceMappingURL=data:application/json;base64," +
        Buffer.from(JSON.stringify(file.map)).toString("base64") +
        "\n",
    };
  }

  return nextLoad(href, context);
}
