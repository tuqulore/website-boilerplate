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

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
}

describe("create-eleventy CLI", () => {
  let workDir;

  before(async () => {
    workDir = await fsp.mkdtemp(path.join(os.tmpdir(), "create-eleventy-cli-"));
  });

  after(async () => {
    await fsp.rm(workDir, { recursive: true, force: true });
  });

  it("--help はUsageを出力してexit 0", () => {
    const result = runCli(["--help"], workDir);
    assert.strictEqual(result.status, 0, result.stderr);
    assert.match(result.stdout, /Usage:/);
  });

  it("存在しないテンプレートを指定するとエラー終了する", () => {
    const result = runCli(["my-app", "--template", "nonexistent"], workDir);
    assert.notStrictEqual(result.status, 0);
    assert.match(result.stderr, /not found/);
  });

  it("既存ディレクトリと同名のプロジェクト名はエラー終了する", () => {
    const existing = path.join(workDir, "existing");
    fs.mkdirSync(existing);
    const result = runCli(["existing"], workDir);
    assert.notStrictEqual(result.status, 0);
    assert.match(result.stderr, /already exists/);
  });

  it("プロジェクト名を空入力するとエラー終了する", () => {
    const result = spawnSync(process.execPath, [cli], {
      cwd: workDir,
      input: "\n",
      encoding: "utf8",
    });
    assert.notStrictEqual(result.status, 0);
    assert.match(result.stderr, /Project name is required/);
  });
});
