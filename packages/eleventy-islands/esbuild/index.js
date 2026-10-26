import path from "node:path";

import * as esbuild from "esbuild";
import fg from "fast-glob";

const SETUP_VIRTUAL_ID = "virtual:island-setup";
const SETUP_NAMESPACE = "eleventy-islands-setup";

// The client boundary's layout depends on these, so `esbuildOptions` may not
// override them.
const RESERVED_OPTIONS = ["bundle", "chunkNames", "entryPoints", "format", "outdir", "splitting"];

/**
 * Bundle the client entries and the setup module with esbuild. Pass the result
 * as the `bundler` option of `@tuqulore-inc/eleventy-islands`.
 *
 * @param {import("./index.js").EsbuildBundlerOptions} [options]
 * @returns {import("../index.js").Bundler}
 */
export function esbuildBundler({ esbuildOptions = {} } = {}) {
  const reserved = RESERVED_OPTIONS.filter((key) => key in esbuildOptions);
  if (reserved.length > 0) {
    throw new TypeError(
      `[eleventy-islands] \`esbuildOptions\` may not override ${reserved.map((key) => `\`${key}\``).join(", ")}.`,
    );
  }
  const { plugins: extraPlugins = [], ...overrides } = esbuildOptions;

  // watch/serve モードでは Eleventy の再ビルド毎に `eleventy.before` が発火する。
  // esbuild.context()+ctx.watch() を毎回作ると watcher/ファイルハンドルが
  // 増殖してリークするため、context は初回のみ作って再利用する。
  // build モードは 1 回きりなのでその都度 esbuild.build() で完結する。
  let watchCtx = null;

  return async ({ runMode, inputDir, outputDir, clientGlob, clientEntryOut, setup, adapter }) => {
    // watch context 生成後は entries を固定 (esbuild 側の watcher が再ビルドを担う)。
    // NOTE: そのため watch 開始後に追加された .client ファイルは Eleventy 再起動まで
    // 拾われない。旧来の glob 文字列方式でも esbuild は context 生成時に一度だけ glob を
    // 解決するためパリティであり許容。
    if (watchCtx) return;

    // Serves the setup module as an esbuild entry. Bare imports of the setup
    // and mount modules resolve from the input directory first, the same place
    // `*.client.*` entries resolve them from, so both land on one file and
    // splitting emits a single shared framework instance. `devalue` resolves
    // from the islands package, since it must match the version that
    // serialized the props and may not be visible from the host project under
    // strict installs (pnpm).
    /** @type {import("esbuild").Plugin} */
    const islandSetupPlugin = {
      name: "eleventy-islands-setup",
      setup(build) {
        const resolveDir = path.resolve(inputDir);
        build.onResolve({ filter: new RegExp(`^${SETUP_VIRTUAL_ID}$`) }, () => ({
          path: SETUP_VIRTUAL_ID,
          namespace: SETUP_NAMESPACE,
        }));
        build.onLoad({ filter: /.*/, namespace: SETUP_NAMESPACE }, () => ({
          contents: setup.source(),
          loader: "js",
          resolveDir,
        }));
        build.onResolve({ filter: /.*/, namespace: SETUP_NAMESPACE }, (args) => {
          if (args.path === setup.isLandUrl) {
            return { path: args.path, external: true };
          }
          if (args.path === "devalue") {
            return build.resolve(args.path, { kind: args.kind, resolveDir: setup.packageDir });
          }
          return undefined;
        });
        build.onResolve({ filter: /^[^./]/ }, async (args) => {
          if (args.importer !== setup.mountModule) return undefined;
          const fromInput = await build.resolve(args.path, { kind: args.kind, resolveDir });
          return fromInput.errors.length > 0 ? undefined : fromInput;
        });
      },
    };

    // NOTE: エントリは明示ファイルリストで渡す (esbuild のワイルドカードはブレース展開
    // {jsx,tsx} 未対応)。0 件でも setup はバンドルする。素の <is-land> は .client.* なしでも
    // 書けるので、transform が注入する setup を常に出力しておく必要がある。
    // NOTE: fast-glob は node_modules をデフォルト除外しないため明示する。
    // input が "." (プロジェクトルート) の構成で依存パッケージ内の *.client.* を
    // 誤ってバンドルしない・毎ビルド node_modules を走査しないための guard。
    const clientEntries = await fg(clientGlob, {
      ignore: ["**/node_modules/**"],
    });

    /** @type {import("esbuild").BuildOptions} */
    const options = {
      jsx: "automatic",
      jsxImportSource: adapter.jsxImportSource,
      minify: runMode === "build",
      ...overrides,
      bundle: true,
      entryPoints: [
        ...clientEntries.map((entry) => ({ in: entry, out: clientEntryOut(entry) })),
        { in: SETUP_VIRTUAL_ID, out: setup.name },
      ],
      // NOTE: `@preact/signals` は preact の `options` オブジェクトを patch する。
      // 依存がエントリごとに複製されると patch と signal graph が複製されて
      // Cycle detected を誤発火するため、splitting で共有チャンクに集約し
      // preact / signals を単一インスタンスに保つ。
      splitting: true,
      chunkNames: "__island-chunks/[name]-[hash]",
      format: "esm",
      outdir: outputDir,
      plugins: [islandSetupPlugin, ...extraPlugins],
    };
    if (runMode === "build") {
      await esbuild.build(options);
      return;
    }
    watchCtx = await esbuild.context(options);
    await watchCtx.watch();
  };
}
