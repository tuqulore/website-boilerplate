import { describe, it } from "node:test";
import assert from "node:assert";
import { h } from "preact";
import { render } from "preact-render-to-string";
import preactIsland from "./index.mjs";
import { Island, clientComponent } from "./island.mjs";

/**
 * Minimal UserConfig stub carrying only what the plugin actually reads.
 * `versionCheck` is called defensively; `addPassthroughCopy` / `addTransform`
 * are called unconditionally in the plugin body. `pathPrefix` is the input
 * under test.
 */
function makeEleventyConfigStub({ pathPrefix } = {}) {
  return {
    pathPrefix,
    versionCheck() {},
    addPassthroughCopy() {},
    addTransform() {},
    ignores: { add() {} },
    on() {},
  };
}

describe("Island plugin URL prefix ↔ Eleventy pathPrefix", () => {
  it("pathPrefix 未設定 (デフォルト /) では import が / から始まる", () => {
    const config = makeEleventyConfigStub({ pathPrefix: "/" });
    preactIsland(config, { srcDir: "src" });

    const Foo = clientComponent(
      () => h("span", null, "x"),
      "file:///proj/src/foo.client.jsx",
    );
    const html = render(h(Island, { component: Foo }));
    assert.match(html, /import="\/foo\.client\.js"/);
  });

  it("pathPrefix が undefined (Eleventy 起動前) でもフォールバックで / を使う", () => {
    const config = makeEleventyConfigStub({ pathPrefix: undefined });
    preactIsland(config, { srcDir: "src" });

    const Foo = clientComponent(() => null, "file:///proj/src/foo.client.jsx");
    const html = render(h(Island, { component: Foo }));
    assert.match(html, /import="\/foo\.client\.js"/);
  });

  it("pathPrefix=/blog/ ではサブディレクトリデプロイの URL を反映する", () => {
    const config = makeEleventyConfigStub({ pathPrefix: "/blog/" });
    preactIsland(config, { srcDir: "src" });

    const Foo = clientComponent(() => null, "file:///proj/src/foo.client.jsx");
    const html = render(h(Island, { component: Foo }));
    assert.match(html, /import="\/blog\/foo\.client\.js"/);
  });

  it("pathPrefix=/blog (末尾スラッシュ無し) も正規化されて /blog/foo.client.js になる", () => {
    const config = makeEleventyConfigStub({ pathPrefix: "/blog" });
    preactIsland(config, { srcDir: "src" });

    const Foo = clientComponent(() => null, "file:///proj/src/foo.client.jsx");
    const html = render(h(Island, { component: Foo }));
    assert.match(html, /import="\/blog\/foo\.client\.js"/);
  });

  it("カスタム srcDir と pathPrefix を併用できる", () => {
    const config = makeEleventyConfigStub({ pathPrefix: "/assets/" });
    preactIsland(config, { srcDir: "content" });

    const Foo = clientComponent(
      () => null,
      "file:///proj/content/foo.client.jsx",
    );
    const html = render(h(Island, { component: Foo }));
    assert.match(html, /import="\/assets\/foo\.client\.js"/);
  });
});
