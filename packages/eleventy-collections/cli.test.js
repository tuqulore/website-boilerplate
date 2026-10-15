import assert from "node:assert";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it, before, after } from "node:test";

const cli = path.join(import.meta.dirname, "cli.js");

/**
 * @param {string[]} args
 * @param {string} cwd
 */
function runCli(args, cwd) {
  return spawnSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8", timeout: 30_000 });
}

describe("eleventy-collections CLI", () => {
  let workDir;

  before(async () => {
    workDir = await fs.mkdtemp(path.join(os.tmpdir(), "eleventy-collections-cli-"));
  });

  after(async () => {
    await fs.rm(workDir, { recursive: true, force: true });
  });

  it("--help は Usage を出力して exit 0", () => {
    const result = runCli(["--help"], workDir);
    assert.strictEqual(result.status, 0, result.stderr);
    assert.match(result.stdout, /Usage:/);
  });

  it("create は content 型のスキーマとサンプルを作り、zod の追加を案内する", async () => {
    const result = runCli(["create", "posts"], workDir);
    assert.strictEqual(result.status, 0, result.stderr);
    assert.match(result.stdout, /pnpm add zod/);

    const schema = await fs.readFile(path.join(workDir, "src/posts/_schema.ts"), "utf8");
    assert.match(schema, /export const schema = z\.object/);
    assert.doesNotMatch(schema, /export const type/);
    await fs.access(path.join(workDir, "src/posts/example.md"));
  });

  it("create --type data は data 型のスキーマと JSON のサンプルを作る", async () => {
    const result = runCli(["create", "authors", "--type", "data"], workDir);
    assert.strictEqual(result.status, 0, result.stderr);

    const schema = await fs.readFile(path.join(workDir, "src/authors/_schema.ts"), "utf8");
    assert.match(schema, /export const type = "data";/);
    JSON.parse(await fs.readFile(path.join(workDir, "src/authors/example.json"), "utf8"));
  });

  it("既存の collection には create できない", () => {
    const result = runCli(["create", "posts"], workDir);
    assert.notStrictEqual(result.status, 0);
    assert.match(result.stderr, /already exists/);
  });

  it("不正な名前と type はエラー終了する", () => {
    assert.match(runCli(["create", "../escape"], workDir).stderr, /Invalid collection name/);
    assert.match(runCli(["create", "x", "--type", "page"], workDir).stderr, /--type must be/);
  });

  it("sync は見つけた collection の型を書き出す", async () => {
    const result = runCli(["sync"], workDir);
    assert.strictEqual(result.status, 0, result.stderr);
    assert.match(result.stdout, /2 collection\(s\)/);

    const generated = await fs.readFile(path.join(workDir, "generated/collections.d.ts"), "utf8");
    assert.match(generated, /"authors": CollectionOf/);
    assert.match(generated, /"posts": CollectionOf/);
  });
});
