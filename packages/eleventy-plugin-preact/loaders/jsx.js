/**
 * @typedef {import('node:module').LoadHookContext} LoadHookContext
 * @typedef {import('node:module').LoadFnOutput} LoadFnOutput
 * @typedef {import('node:module').LoadHook} LoadHookType
 * @typedef {Parameters<LoadHookType>[2]} NextLoad
 */

import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { transformSync } from "oxc-transform";

const TRANSFORM_RE = /\.(jsx|tsx|ts)$/;
// 型宣言だけの `.d.ts` は runtime import 対象ではない (Node で読んでも実行される
// コードが無い) ので、`.ts` のマッチから外して nextLoad に委譲する。`index.js` 側の
// watch invalidation でも同じ理由で `.d.ts` を除外している。
const DTS_RE = /\.d\.ts$/;

/** @type {import("oxc-transform").TransformOptions} */
const OPTIONS = {
  jsx: { runtime: "automatic", importSource: "preact" },
  sourcemap: true,
};

/**
 * Load `file:` URLs for `.jsx`, `.tsx`, `.ts` and transpile them with
 * `oxc-transform`. TypeScript type annotations are stripped and JSX is lowered
 * to Preact's automatic runtime. Type checking is left to the user (`tsc
 * --noEmit`); parser-recovery diagnostics with severity below `"Error"` do not
 * abort the transform.
 *
 * @param {string} href
 * @param {LoadHookContext} context
 * @param {NextLoad} nextLoad
 * @returns {Promise<LoadFnOutput>}
 * @satisfies {LoadHookType}
 */
export async function load(href, context, nextLoad) {
  const url = new URL(href);

  if (url.protocol !== "file:" || !TRANSFORM_RE.test(url.pathname) || DTS_RE.test(url.pathname)) {
    return nextLoad(href, context);
  }

  const filename = fileURLToPath(url);
  const source = await fs.readFile(url, "utf8");
  const { code, map, errors } = transformSync(filename, source, OPTIONS);

  const fatal = errors.filter((e) => e.severity === "Error");
  if (fatal.length > 0) {
    const details = fatal
      .map((e) => e.codeframe ?? `${e.message}${e.helpMessage ? `\n  help: ${e.helpMessage}` : ""}`)
      .join("\n\n");
    throw new Error(`[eleventy-plugin-preact] Failed to transform ${filename}:\n${details}`);
  }

  return {
    format: "module",
    shortCircuit: true,
    source:
      code +
      "\n//# sourceMappingURL=data:application/json;base64," +
      Buffer.from(JSON.stringify(map)).toString("base64") +
      "\n",
  };
}
