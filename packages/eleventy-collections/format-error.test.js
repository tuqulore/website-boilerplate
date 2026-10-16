import assert from "node:assert";
import { describe, it } from "node:test";

import { formatValidationError } from "./format-error.js";

describe("formatValidationError", () => {
  it("collection 名・ファイルパス・フィールドのパスを並べる", () => {
    const message = formatValidationError("posts", [
      {
        inputPath: "./src/posts/hello.md",
        issues: [
          { path: ["date"], message: "Invalid date" },
          { path: ["authors", 0, { key: "name" }], message: "Required" },
        ],
      },
      { inputPath: "./src/posts/root.md", issues: [{ message: "Expected object" }] },
    ]);
    assert.strictEqual(
      message,
      [
        'Collection "posts": validation failed',
        "src/posts/hello.md",
        "  - date: Invalid date",
        "  - authors.0.name: Required",
        "src/posts/root.md",
        "  - (root): Expected object",
      ].join("\n"),
    );
  });
});
