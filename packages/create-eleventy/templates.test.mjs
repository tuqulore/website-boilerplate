import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.join(here, "index.mjs");
const templatesDir = path.join(here, "templates");
const workspaceRoot = path.resolve(here, "..", "..");

const templates = fs
  .readdirSync(templatesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

// テンプレートが直接/間接に依存する workspace 内パッケージ。
// eleventy-preset が workspace:* で 3 プラグインを引くため一括で差し込む。
const workspacePackageNames = [
  "@tuqulore-inc/eleventy-preset",
  "@tuqulore-inc/eleventy-plugin-preact",
  "@tuqulore-inc/eleventy-plugin-preact-island",
  "@tuqulore-inc/eleventy-plugin-postcss",
];

describe("create-eleventy templates", { concurrency: true }, () => {
  let packDir;
  const overrides = {};

  before(async () => {
    packDir = await fsp.mkdtemp(
      path.join(os.tmpdir(), "create-eleventy-pack-"),
    );
    for (const name of workspacePackageNames) {
      const result = spawnSync(
        "pnpm",
        ["--filter", name, "pack", "--pack-destination", packDir],
        { cwd: workspaceRoot, encoding: "utf8" },
      );
      assert.strictEqual(
        result.status,
        0,
        describeChild(`pnpm pack ${name}`, result),
      );
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
    describe(template, () => {
      let workDir;
      let projectDir;

      before(async () => {
        workDir = await fsp.mkdtemp(
          path.join(os.tmpdir(), `create-eleventy-${template}-`),
        );
        projectDir = path.join(workDir, "my-app");
      });

      after(async () => {
        await fsp.rm(workDir, { recursive: true, force: true });
      });

      it("CLI で scaffold できる", () => {
        const result = spawnSync(
          process.execPath,
          [cli, "my-app", "--template", template],
          {
            cwd: workDir,
            stdio: ["ignore", "pipe", "pipe"],
            encoding: "utf8",
          },
        );
        assert.strictEqual(
          result.status,
          0,
          describeChild("scaffold", result),
        );

        const pkg = JSON.parse(
          fs.readFileSync(path.join(projectDir, "package.json"), "utf8"),
        );
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
        { timeout: 300_000 },
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
          fs.writeFileSync(
            path.join(workDir, "pnpm-workspace.yaml"),
            workspaceYaml,
          );

          const install = spawnSync(
            "pnpm",
            ["install", "--prefer-offline"],
            { cwd: projectDir, encoding: "utf8" },
          );
          assert.strictEqual(
            install.status,
            0,
            describeChild("pnpm install", install),
          );

          const build = spawnSync("pnpm", ["run", "build"], {
            cwd: projectDir,
            encoding: "utf8",
          });
          assert.strictEqual(
            build.status,
            0,
            describeChild("pnpm build", build),
          );

          assert.ok(
            fs.existsSync(path.join(projectDir, "dist", "index.html")),
            "build 後に dist/index.html が生成されていない",
          );
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
