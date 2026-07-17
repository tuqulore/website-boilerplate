import fs from "node:fs";
import module from "node:module";
import path from "node:path";
import url from "node:url";
import fg from "fast-glob";
import render from "preact-render-to-string";
import { jsx } from "preact/jsx-runtime";
import { _runWithEleventyData } from "./eleventy.js";

// Register Node.js loaders for JSX/TSX/MDX support
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

// トップレベルの `import ... from "..."` から specifier を抽出。JSX/TSX/MDX 対応。
// side-effect only の `import "..."` と、`from` 句を伴う通常の import を alternation
// で並べる。前者を先に試すのは、後者の `[\s\S]+?` が非貪欲でも複数行にまたがって
// 次の import 文まで巻き込みうる (`import "a"\nimport X from "b"` を 1 個の import と
// 誤検出) ため。両者を独立に書き分けることで境界を明確にする。dynamic import() や
// `import.meta.*` は対象外 (top-level static import だけを追跡)。
//
// NOTE: `/g` 付き regex を関数外に置くと `lastIndex` が呼び出し間で残り、直前呼び出し
// が途中で bail out した際に次回の抽出が壊れる。RegExp 生成コストは無視できるので、
// 関数内で毎回生成する。
export const _parseTemplateImports = (content) => {
  const re =
    /^import\s+(?:["']([^"']+)["']|[\s\S]+?\s+from\s+["']([^"']+)["'])/gm;
  const specs = [];
  let m;
  while ((m = re.exec(content)) !== null) specs.push(m[1] ?? m[2]);
  return specs;
};

// 相対 specifier を絶対 `.jsx`/`.tsx`/`.ts`/`.mdx` パスに解決。
// npm パッケージや解決失敗時は null。`.d.ts` は型宣言のみで runtime import に
// ならないので fallback には含めない (`import x from "./types"` を `.d.ts` に
// 解決すると Node が runtime エラーを吐く)。明示的な `./x.d.ts` も除外する。
//
// NOTE: `.js` / `.mjs` は Eleventy 本体の `JavaScriptDependencies` +
// `dependency-tree-esm` が扱う。ここで重複追跡する必要は無い。
export const _resolveTemplateImport = (specifier, fromFile) => {
  if (!specifier.startsWith("./") && !specifier.startsWith("../")) return null;
  const base = path.resolve(path.dirname(fromFile), specifier);
  if (/\.d\.ts$/.test(base)) return null;
  if (/\.(jsx|tsx|ts|mdx)$/.test(base) && fs.existsSync(base)) return base;
  for (const ext of [".mdx", ".jsx", ".tsx", ".ts"]) {
    if (fs.existsSync(base + ext)) return base + ext;
  }
  return null;
};

// 「ファイル X → X を transitive に import している .jsx/.tsx/.ts/.mdx の集合」の
// 逆辺グラフ。変更時に「その ancestor だけ」を invalidate する用途。ES import 経由
// のみ辿る (layout 参照は data cascade 経由なので Eleventy が cacheBust:true で
// fresh に再評価するため、ここで追跡する必要は無い)。
export const _buildReverseDeps = (files) => {
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
        _parseTemplateImports(content)
          .map((s) => _resolveTemplateImport(s, f))
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

// 変更ファイル群 + それらの ancestor を invalidate 対象の Set にまとめる純関数。
// beforeWatch handler から実 EventBus とは切り離して呼べるようにテストしやすくした。
export const _computeInvalidationSet = (changedTemplates, reverseDeps) => {
  const s = new Set();
  for (const changed of changedTemplates) {
    const abs = path.resolve(changed);
    s.add(abs);
    const ancestors = reverseDeps.get(abs);
    if (ancestors) for (const a of ancestors) s.add(a);
  }
  return s;
};

/**
 * Eleventy plugin for Preact server-side rendering with JSX/TSX/MDX support.
 *
 * SSR only: registers `.jsx` / `.tsx` / `.mdx` template formats and renders
 * Preact components to HTML using preact-render-to-string. Client-side
 * bundling and partial hydration are handled by
 * `@tuqulore-inc/eleventy-plugin-preact-island`.
 *
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 */
export default function (eleventyConfig) {
  try {
    eleventyConfig.versionCheck(">=3.0");
  } catch (e) {
    console.log(`[eleventy-plugin-preact] WARN: ${e.message}`);
  }

  eleventyConfig.addTemplateFormats(["jsx", "tsx", "mdx"]);

  // watch/serve 時、`.jsx`/`.tsx`/`.ts`/`.mdx` の変更で「変更ファイル + それを
  // transitive に import している .jsx/.tsx/.ts/.mdx (ancestor)」を Node の ESM
  // cache から invalidate する。これがないと layout/partial 経由で import されている
  // `.client.jsx` を編集しても中間モジュールが cache に残ったままで SSR HTML が
  // 古いまま出る (詳細は上の EventBus ロードコメント参照)。`.d.ts` は型宣言のみで
  // runtime に影響しないので除外する。`.js` / `.mjs` は Eleventy 本体の
  // `JavaScriptDependencies` が自前で追跡するのでここでは扱わない。
  //
  // NOTE: `eleventy.beforeWatch` は watch/serve の 2 回目以降のビルド前にのみ発火
  // (初回ビルドや --serve 無しの単発ビルドでは発火しない) ため、production `pnpm build`
  // には影響しない。
  let eventBusPromise = null;
  eleventyConfig.on("eleventy.beforeWatch", async (changedFiles) => {
    const templateChanges = changedFiles?.filter(
      (f) => /\.(jsx|tsx|ts|mdx)$/.test(f) && !/\.d\.ts$/.test(f),
    );
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
    const allFiles = await fg([`${inputDir}**/*.{jsx,tsx,ts,mdx}`], {
      ignore: ["**/node_modules/**", "**/*.d.ts"],
      absolute: true,
    });
    const reverse = _buildReverseDeps(allFiles);
    const toInvalidate = _computeInvalidationSet(templateChanges, reverse);
    eventBus.emit("eleventy.importCacheReset", toInvalidate);
  });

  eleventyConfig.addExtension(["jsx", "tsx", "mdx"], {
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
