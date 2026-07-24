/**
 * @typedef {import('node:module').LoadHookContext} LoadHookContext
 * @typedef {import('node:module').LoadFnOutput} LoadFnOutput
 * @typedef {import('node:module').LoadHook} LoadHookType
 * @typedef {Parameters<LoadHookType>[2]} NextLoad
 */

import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

import GithubSlugger from "github-slugger";
import { defineHastPlugin, mdxToJs } from "satteri";
import { parse as parseYaml } from "yaml";

// NOTE: factory form (`() => defineHastPlugin(...)`) instantiates a fresh
// slugger per compile, so heading id counters do not leak between files.
// If a downstream plugin already set an id (or `features.headingAttributes`
// picked one up), we leave it alone.
const headingSlug = () => {
  const slugger = new GithubSlugger();
  return defineHastPlugin({
    name: "heading-slug",
    element: {
      filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
      visit(node, ctx) {
        if (node.properties?.id) return;
        ctx.setProperty(node, "id", slugger.slug(ctx.textContent(node)));
      },
    },
  });
};

/** @type {import("satteri").MdxCompileOptions} */
const MDX_OPTIONS = {
  jsxImportSource: "preact",
  outputFormat: "program",
  features: { gfm: true, frontmatter: true },
  hastPlugins: [headingSlug],
};

// NOTE: prepending `export const data = ...` from YAML frontmatter would
// duplicate a user-authored `export const data = ...` in the MDX body and
// break the ESM parse. Match against Sätteri's compiled output — not the raw
// MDX source — so that occurrences inside fenced code blocks or inline code
// spans (which never become real ESM exports) are not mistaken for a real
// module-level export.
const USER_DATA_EXPORT_RE = /^\s*export\s+const\s+data\s*=/m;

/**
 * Load `file:` URLs for `.mdx` and compile them with Sätteri. GFM,
 * frontmatter, and heading anchors are enabled by default. YAML frontmatter
 * is parsed and prepended as `export const data = ...` so Eleventy's data
 * cascade picks it up through the existing `key: "11ty.js"` path.
 *
 * @param {string} href
 * @param {LoadHookContext} context
 * @param {NextLoad} nextLoad
 * @returns {Promise<LoadFnOutput>}
 * @satisfies {LoadHookType}
 */
export async function load(href, context, nextLoad) {
  const url = new URL(href);

  if (url.protocol !== "file:" || !url.pathname.endsWith(".mdx")) {
    return nextLoad(href, context);
  }

  const filename = fileURLToPath(url);
  const source = await fs.readFile(url, "utf8");
  const out = await mdxToJs(source, { ...MDX_OPTIONS, fileURL: url });

  let prelude = "";
  // `out.frontmatter?.value` で判定すると `---\n---` のような空フェンスが
  // silently 素通りしてしまい、(1) 空 frontmatter が反映されない (2) 本文側の
  // `export const data = ...` との併用チェックも走らない、という穴になる。
  // フェンスの有無だけを見て、内側の空/非空は parseYaml の返り値で判断する。
  if (out.frontmatter) {
    if (USER_DATA_EXPORT_RE.test(out.code)) {
      throw new Error(
        `[eleventy-plugin-preact] ${filename}: cannot combine YAML frontmatter with an \`export const data\` declaration. Use one or the other.`,
      );
    }
    // `parseYaml` は行番号付きの YAMLParseError を投げるが、それ単体では
    // どのファイルの frontmatter で失敗したかが分からない。プラグイン名 +
    // ファイル名でラップして、他の throw と同じ粒度でトラブルシュートできる
    // ようにする。原因の元 error は `cause` に載せて残す。
    let parsed;
    try {
      parsed = parseYaml(out.frontmatter.value);
    } catch (e) {
      throw new Error(
        `[eleventy-plugin-preact] ${filename}: failed to parse YAML frontmatter: ${e.message}`,
        { cause: e },
      );
    }
    // Reject non-mapping YAML (strings, arrays, numbers). Eleventy's data
    // cascade expects `data` to be a plain object; anything else would
    // silently corrupt page data and mislead readers of the README.
    if (
      parsed !== null &&
      parsed !== undefined &&
      (typeof parsed !== "object" || Array.isArray(parsed))
    ) {
      const shape = Array.isArray(parsed) ? "array" : typeof parsed;
      throw new Error(
        `[eleventy-plugin-preact] ${filename}: YAML frontmatter must be an object (mapping), got ${shape}.`,
      );
    }
    // NOTE: object literal で吐くと `__proto__` キーが JS の prototype 書き換え
    // 特別扱いを受け、`data.__proto__` が own property にならず prototype に
    // silently 差し込まれる (`Object.getPrototypeOf(data)` が汚染される)。
    // `JSON.parse` は `__proto__` を通常のキーとして扱うので、そちらに寄せる。
    const json = JSON.stringify(parsed ?? {});
    prelude = `export const data = JSON.parse(${JSON.stringify(json)});\n`;
  }

  return {
    format: "module",
    shortCircuit: true,
    source: prelude + out.code,
  };
}
