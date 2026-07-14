import fs from "node:fs";
import module from "node:module";
import path from "node:path";
import url from "node:url";
import fg from "fast-glob";
import render from "preact-render-to-string";
import { jsx } from "preact/jsx-runtime";
import { _runWithEleventyData } from "./eleventy.js";

// Register Node.js loaders for JSX/MDX support
module.register(
  import.meta.resolve("./loaders/mdx.js"),
  url.pathToFileURL("./"),
);
module.register(
  import.meta.resolve("./loaders/jsx.js"),
  url.pathToFileURL("./"),
);

// NOTE: Eleventy の import cache 無効化 (`eleventy.importCacheReset`) を発火する
// EventBus は package の `exports` に無いため、`import.meta.resolve` で本体を辿って
// 相対パスで到達する内部依存。将来 EventBus.js が移動 (`src/` 配下から外れる) すると
// ここが解決失敗するので、その場合は WARN を出して invalidate を諦める。fix の目的は
// 「layout/partial 経由で import された `.client.jsx` を編集したとき、cached な
// 中間 MDX/JSX モジュールを Node の ESM cache から落として fresh に再評価させる」で、
// JavaScriptDependencies.getDependencies が `.jsx/.mdx` を辿らない (public docs にも
// 記載無し) ため、依存グラフ経路では代替できない。
const loadEleventyEventBus = async () => {
  try {
    const eleventyMainUrl = import.meta.resolve("@11ty/eleventy");
    const eleventyPkgDir = path.dirname(url.fileURLToPath(eleventyMainUrl));
    const eventBusPath = path.join(eleventyPkgDir, "EventBus.js");
    if (!fs.existsSync(eventBusPath)) return null;
    const mod = await import(url.pathToFileURL(eventBusPath).href);
    return mod.default ?? null;
  } catch {
    return null;
  }
};

// トップレベルの `import ... from "..."` から specifier を抽出。JSX/MDX 両方対応。
// 複数行 import (destructuring 改行) も /[\s\S]+?/ で吸収。`import "..."`
// (副作用のみ) はグラフに乗せる意味がないので無視。dynamic import() も対象外。
const IMPORT_RE = /^import\s+(?:[\s\S]+?\s+from\s+)?["']([^"']+)["']/gm;
const parseTemplateImports = (content) => {
  const specs = [];
  let m;
  while ((m = IMPORT_RE.exec(content)) !== null) specs.push(m[1]);
  return specs;
};

// 相対 specifier を絶対 `.jsx`/`.mdx` パスに解決。npm パッケージや解決失敗時は null。
const resolveTemplateImport = (specifier, fromFile) => {
  if (!specifier.startsWith("./") && !specifier.startsWith("../")) return null;
  const base = path.resolve(path.dirname(fromFile), specifier);
  if (/\.(jsx|mdx)$/.test(base) && fs.existsSync(base)) return base;
  for (const ext of [".mdx", ".jsx"]) {
    if (fs.existsSync(base + ext)) return base + ext;
  }
  return null;
};

// 「ファイル X → X を transitive に import している .jsx/.mdx の集合」の逆辺グラフ。
// 変更時に「その ancestor だけ」を invalidate する用途。ES import 経由のみ辿る
// (layout 参照は data cascade 経由なので Eleventy が cacheBust:true で fresh に
// 再評価するため、ここで追跡する必要は無い)。
const buildReverseDeps = (files) => {
  const forward = new Map();
  for (const f of files) {
    let content;
    try {
      content = fs.readFileSync(f, "utf8");
    } catch {
      forward.set(f, new Set());
      continue;
    }
    forward.set(
      f,
      new Set(
        parseTemplateImports(content)
          .map((s) => resolveTemplateImport(s, f))
          .filter(Boolean),
      ),
    );
  }
  const reverse = new Map(files.map((f) => [f, new Set()]));
  for (const [parent, deps] of forward) {
    const seen = new Set();
    const stack = [...deps];
    while (stack.length) {
      const child = stack.pop();
      if (seen.has(child)) continue;
      seen.add(child);
      reverse.get(child)?.add(parent);
      const next = forward.get(child);
      if (next) for (const d of next) stack.push(d);
    }
  }
  return reverse;
};

/**
 * Eleventy plugin for Preact server-side rendering with JSX/MDX support.
 *
 * SSR only: registers `.jsx` / `.mdx` template formats and renders Preact
 * components to HTML using preact-render-to-string. Client-side bundling and
 * partial hydration are handled by `@tuqulore-inc/eleventy-plugin-preact-island`.
 *
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 */
export default function (eleventyConfig) {
  try {
    eleventyConfig.versionCheck(">=3.0");
  } catch (e) {
    console.log(`[eleventy-plugin-preact] WARN: ${e.message}`);
  }

  // Add JSX and MDX as template formats
  eleventyConfig.addTemplateFormats(["jsx", "mdx"]);

  // watch/serve 時、`.jsx`/`.mdx` の変更で「変更ファイル + それを transitive に
  // import している .jsx/.mdx (ancestor)」を Node の ESM cache から invalidate する。
  // これがないと layout/partial 経由で import されている `.client.jsx` を編集しても
  // 中間モジュールが cache に残ったままで SSR HTML が古いまま出る (詳細は上の
  // EventBus ロードコメント参照)。
  //
  // NOTE: `eleventy.beforeWatch` は watch/serve の 2 回目以降のビルド前にのみ発火
  // (初回ビルドや --serve 無しの単発ビルドでは発火しない) ため、production `pnpm build`
  // には影響しない。
  let eventBusPromise = null;
  eleventyConfig.on("eleventy.beforeWatch", async (changedFiles) => {
    const templateChanges = changedFiles?.filter((f) => /\.(jsx|mdx)$/.test(f));
    if (!templateChanges?.length) return;
    eventBusPromise ??= loadEleventyEventBus();
    const eventBus = await eventBusPromise;
    if (!eventBus) {
      console.warn(
        "[eleventy-plugin-preact] WARN: could not load @11ty/eleventy EventBus; SSR module cache will not be invalidated. Layout/partial changes may not reflect in dev HMR.",
      );
      return;
    }
    const inputDir = eleventyConfig.directories.input;
    const allFiles = await fg([`${inputDir}**/*.{jsx,mdx}`], {
      ignore: ["**/node_modules/**"],
      absolute: true,
    });
    const reverse = buildReverseDeps(allFiles);
    const toInvalidate = new Set();
    for (const changed of templateChanges) {
      const abs = path.resolve(changed);
      toInvalidate.add(abs);
      const ancestors = reverse.get(abs);
      if (ancestors) for (const a of ancestors) toInvalidate.add(a);
    }
    eventBus.emit("eleventy.importCacheReset", toInvalidate);
  });

  // Add extension handler for JSX and MDX
  eleventyConfig.addExtension(["jsx", "mdx"], {
    key: "11ty.js",
    compile: () => {
      return async function (data) {
        return _runWithEleventyData(data, async () => {
          const content = await this.defaultRenderer(data);
          const html = render(
            jsx(content.type, content.props, content.key),
          ).trimStart();
          // NOTE: preact-render-to-string does not emit a DOCTYPE, so full-page
          // outputs land in quirks mode. Prepend only when the render actually
          // starts with <html> to leave partial / island renders untouched.
          // trimStart しているのは MDX/JSX の出力先頭に改行や BOM 等の空白が
          // 混ざり得るためで、その影響で startsWith 判定が外れないようにする。
          return html.startsWith("<html") ? `<!doctype html>${html}` : html;
        });
      };
    },
  });
}
