import assert from "node:assert";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it, before, after } from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.join(here, "index.js");
const templatesDir = path.join(here, "templates");
const workspaceRoot = path.resolve(here, "..", "..");

const templates = fs
  .readdirSync(templatesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

// テンプレートが直接/間接に依存する workspace 内パッケージ。
// eleventy-preset が workspace:* で引くパッケージをまとめて差し込む。
const workspacePackageNames = [
  "@tuqulore-inc/eleventy-preset",
  "@tuqulore-inc/eleventy-collections",
  "@tuqulore-inc/eleventy-plugin-preact",
  "@tuqulore-inc/eleventy-data",
  "@tuqulore-inc/eleventy-islands",
  "@tuqulore-inc/eleventy-plugin-postcss",
];

// spawnSync は同期呼び出しなので node:test の timeout では中断できない。
// 個別に timeout / maxBuffer を渡してハングと ENOBUFS を防ぐ。
const MAX_BUFFER = 20 * 1024 * 1024;
const TIMEOUT_FAST = 30_000;
const TIMEOUT_PACK = 120_000;
const TIMEOUT_INSTALL = 240_000;
const TIMEOUT_BUILD = 60_000;

describe("create-eleventy templates", { concurrency: true }, () => {
  let packDir;
  const overrides = {};

  before(async () => {
    packDir = await fsp.mkdtemp(path.join(os.tmpdir(), "create-eleventy-pack-"));
    for (const name of workspacePackageNames) {
      const result = spawnSync("pnpm", ["--filter", name, "pack", "--pack-destination", packDir], {
        cwd: workspaceRoot,
        encoding: "utf8",
        timeout: TIMEOUT_PACK,
        maxBuffer: MAX_BUFFER,
      });
      assert.strictEqual(result.status, 0, describeChild(`pnpm pack ${name}`, result));
      const shortName = name.replace("@tuqulore-inc/", "tuqulore-inc-");
      const tarball = fs
        .readdirSync(packDir)
        .find((f) => f.startsWith(`${shortName}-`) && f.endsWith(".tgz"));
      assert.ok(tarball, `tarball not found for ${name} in ${packDir}`);
      overrides[name] = `file:${path.join(packDir, tarball)}`;
    }
  });

  after(async () => {
    if (packDir) await fsp.rm(packDir, { recursive: true, force: true });
  });

  it("templates ディレクトリが1つ以上ある", () => {
    assert.ok(templates.length > 0, `templates が空: ${templatesDir}`);
  });

  for (const template of templates) {
    // 外側 describe の concurrency: true は子孫にも継承されるため、
    // ここで false を明示して scaffold → install+build を逐次に固定する。
    // テンプレート間の並列性（外側 describe の直下）は維持したい。
    describe(template, { concurrency: false }, () => {
      let workDir;
      let projectDir;

      before(async () => {
        workDir = await fsp.mkdtemp(path.join(os.tmpdir(), `create-eleventy-${template}-`));
        projectDir = path.join(workDir, "my-app");
      });

      after(async () => {
        if (workDir) await fsp.rm(workDir, { recursive: true, force: true });
      });

      it("CLI で scaffold できる", () => {
        const result = spawnSync(process.execPath, [cli, "my-app", "--template", template], {
          cwd: workDir,
          stdio: ["ignore", "pipe", "pipe"],
          encoding: "utf8",
          timeout: TIMEOUT_FAST,
          maxBuffer: MAX_BUFFER,
        });
        assert.strictEqual(result.status, 0, describeChild("scaffold", result));

        const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, "package.json"), "utf8"));
        assert.strictEqual(pkg.name, "my-app");
        assert.ok(
          fs.existsSync(path.join(projectDir, ".env")),
          "_env が .env にリネームされていない",
        );
        assert.ok(
          fs.existsSync(path.join(projectDir, ".gitignore")),
          "_gitignore が .gitignore にリネームされていない",
        );
      });

      it(
        "現ソースの workspace パッケージで pnpm i && pnpm build が成功する",
        { timeout: TIMEOUT_INSTALL + TIMEOUT_BUILD + 30_000 },
        () => {
          // pnpm 11 以降 package.json の "pnpm" フィールドは読まれないため、
          // workDir を workspace 化して pnpm-workspace.yaml に overrides を書く。
          // allowBuilds はリポジトリルートの workspace 設定を踏襲し、
          // esbuild / sharp の build script 未実行によるハードエラーを抑制する。
          const overridesYaml = Object.entries(overrides)
            .map(([name, target]) => `  "${name}": "${target}"`)
            .join("\n");
          const workspaceYaml =
            `packages:\n  - my-app\n` +
            `overrides:\n${overridesYaml}\n` +
            `allowBuilds:\n  esbuild: false\n  sharp: false\n`;
          fs.writeFileSync(path.join(workDir, "pnpm-workspace.yaml"), workspaceYaml);

          const install = spawnSync("pnpm", ["install", "--prefer-offline"], {
            cwd: projectDir,
            encoding: "utf8",
            timeout: TIMEOUT_INSTALL,
            maxBuffer: MAX_BUFFER,
          });
          assert.strictEqual(install.status, 0, describeChild("pnpm install", install));

          const build = spawnSync("pnpm", ["run", "build"], {
            cwd: projectDir,
            encoding: "utf8",
            timeout: TIMEOUT_BUILD,
            maxBuffer: MAX_BUFFER,
          });
          assert.strictEqual(build.status, 0, describeChild("pnpm build", build));

          assert.ok(
            fs.existsSync(path.join(projectDir, "dist", "index.html")),
            "build 後に dist/index.html が生成されていない",
          );
          // _schema.ts を持たないプロジェクトには collection の型ファイルを作らない
          assert.ok(
            !fs.existsSync(path.join(projectDir, "collections.d.ts")),
            "スキーマが無いのに collections.d.ts が作られた",
          );

          // テンプレートの lint は型検査 (--type-check) を含む。公開型定義と
          // テンプレート側の宣言マージ・props 型の整合をここで検証する。
          // 誤った使い方が型エラーになることは @ts-expect-error で表明する。
          // エラーにならなければ未使用の directive (TS2578) として lint が失敗する。
          if (template === "default") {
            fs.writeFileSync(
              path.join(projectDir, "src", "type-probe.ts"),
              `import { eleventy } from "@tuqulore-inc/eleventy-preset/eleventy";
import { Island } from "@tuqulore-inc/eleventy-preset/island";
import Desktop from "./_includes/partials/header/desktop.client.jsx";
import Clock from "./clock.client.jsx";

export const probes = [
  Island({ component: Desktop, nav: eleventy.nav, class: "x", on: "load" }),
  Island({ component: Clock, locale: "en", fallback: "--:--" }),
  // @ts-expect-error -- typo on a Global Data field
  eleventy.site.nmae,
  // @ts-expect-error -- typo on an Island prop
  Island({ component: Desktop, navv: eleventy.nav }),
  // @ts-expect-error -- type mismatch on an Island prop
  Island({ component: Desktop, nav: "x" }),
  // @ts-expect-error -- missing required Island prop
  Island({ component: Desktop }),
  // @ts-expect-error -- typo on a client-only Island prop
  Island({ component: Clock, localee: "en" }),
  // @ts-expect-error -- fallback is reserved only for client-only components
  Island({ component: Desktop, nav: eleventy.nav, fallback: "x" }),
];
`,
            );
          }
          const lint = spawnSync("pnpm", ["run", "lint"], {
            cwd: projectDir,
            encoding: "utf8",
            timeout: TIMEOUT_BUILD,
            maxBuffer: MAX_BUFFER,
          });
          assert.strictEqual(lint.status, 0, describeChild("pnpm lint", lint));

          // default テンプレートは 4 つの *.client.jsx を持ち、Island プラグイン
          // によって esbuild で bundle され、index.mdx から <Island component={Clicker}>
          // として参照される。responsibility split と命名変更で URL 経路が壊れて
          // も回帰検知できるよう、生成物の実在と HTML 内の import URL を検証する。
          if (template === "default") {
            // CLI が `__prefix` を `_prefix` にリネームするため、build 出力上は
            // `_includes/**` に落ちる (index.js L84-89 を参照)。
            const expectedBundles = [
              "clicker.client.js",
              "clock.client.js",
              "_includes/partials/header/desktop.client.js",
              "_includes/partials/header/mobile.client.js",
              "__island-setup.js",
            ];
            for (const rel of expectedBundles) {
              assert.ok(
                fs.existsSync(path.join(projectDir, "dist", rel)),
                `build 後に dist/${rel} が生成されていない (esbuild bundle が動いていない可能性)`,
              );
            }

            // ignore ルールの回帰検知: *.client.jsx が Eleventy テンプレートとして
            // 処理されると dist/clicker.client/ のようなページが生成されてしまう。
            assert.ok(
              !fs.existsSync(path.join(projectDir, "dist", "clicker.client")),
              "dist/clicker.client/ が生成されている (.client.* の Eleventy ignore が効いていない可能性)",
            );

            const indexHtml = fs.readFileSync(path.join(projectDir, "dist", "index.html"), "utf8");
            assert.match(
              indexHtml,
              /<is-land[^>]*\bimport="\/clicker\.client\.js"/,
              'dist/index.html に <is-land import="/clicker.client.js"> が含まれていない (Island の URL 解決経路が壊れている可能性)',
            );
            assert.match(
              indexHtml,
              /<is-land[^>]*\bimport="\/clock\.client\.js"[^>]*\bclient-only[^>]*>\s*<span[^>]*>--:--:--<\/span>\s*<\/is-land>/,
              "dist/index.html の client-only 島が fallback だけを出力していない",
            );
            assert.match(indexHtml, /<script type="module" src="\/__island-setup\.js"><\/script>/);
            assert.doesNotMatch(indexHtml, /type="importmap"|esm\.sh/);
          }
        },
      );
    });
  }
});

function describeChild(label, result) {
  return [
    `[${label}] status=${result.status}`,
    result.error ? `error=${result.error.message}` : "",
    result.stdout ? `stdout=\n${result.stdout}` : "",
    result.stderr ? `stderr=\n${result.stderr}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
