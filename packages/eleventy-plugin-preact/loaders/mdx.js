/**
 * @typedef {import('node:module').LoadHookContext} LoadHookContext
 * @typedef {import('node:module').LoadFnOutput} LoadFnOutput
 * @typedef {import('node:module').LoadHook} LoadHookType
 */

import fs from "node:fs/promises";
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
// break the ESM parse. Reject the combination early with a clearer message.
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

  if (url.protocol !== "file:" || !/\.mdx$/.test(url.pathname)) {
    return nextLoad(href, context);
  }

  const source = await fs.readFile(url, "utf8");
  const out = await mdxToJs(source, { ...MDX_OPTIONS, fileURL: url });

  let prelude = "";
  if (out.frontmatter?.value) {
    if (USER_DATA_EXPORT_RE.test(source)) {
      throw new Error(
        `[eleventy-plugin-preact] ${url.pathname}: cannot combine YAML frontmatter with an \`export const data\` declaration. Use one or the other.`,
      );
    }
    const parsed = parseYaml(out.frontmatter.value) ?? {};
    prelude = `export const data = ${JSON.stringify(parsed)};\n`;
  }

  return {
    format: "module",
    shortCircuit: true,
    source: prelude + out.code,
  };
}
