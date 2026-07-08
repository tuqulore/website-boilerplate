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

const templates = fs
  .readdirSync(templatesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

describe("create-eleventy templates", { concurrency: true }, () => {
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

      it("pnpm i && pnpm build が成功する", { timeout: 300_000 }, () => {
        const install = spawnSync(
          "pnpm",
          ["install", "--ignore-workspace", "--prefer-offline"],
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
        assert.strictEqual(build.status, 0, describeChild("pnpm build", build));

        assert.ok(
          fs.existsSync(path.join(projectDir, "dist", "index.html")),
          "build 後に dist/index.html が生成されていない",
        );
      });
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
