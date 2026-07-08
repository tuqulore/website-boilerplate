import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { h } from "preact";
import { render } from "preact-render-to-string";
import { Island, hydratable, _setHydrateModuleResolver } from "./island.mjs";

describe("hydratable", () => {
  it("Component に __hydrateModuleUrl を付与して同じ関数を返す", () => {
    const Comp = () => null;
    const returned = hydratable(Comp, "file:///proj/src/foo.hydrate.jsx");
    assert.strictEqual(returned, Comp);
    assert.strictEqual(
      Comp.__hydrateModuleUrl,
      "file:///proj/src/foo.hydrate.jsx",
    );
  });

  it("Component が関数でない場合は TypeError", () => {
    assert.throws(() => hydratable(null, "file:///x"), TypeError);
    assert.throws(() => hydratable("Comp", "file:///x"), TypeError);
  });

  it("moduleUrl が文字列でない場合は TypeError", () => {
    assert.throws(() => hydratable(() => null, undefined), TypeError);
    assert.throws(() => hydratable(() => null, 123), TypeError);
  });
});

describe("Island", () => {
  beforeEach(() => {
    // 各テストで resolver をリセットし、テスト間の状態漏れを防ぐ
    _setHydrateModuleResolver(null);
  });

  it("hydratable 済み component を <is-land> でラップし、resolver 経由の import URL と JSON props を出力する", () => {
    const receivedUrls = [];
    _setHydrateModuleResolver((moduleUrl) => {
      receivedUrls.push(moduleUrl);
      return "/foo.hydrate.js";
    });
    const Foo = hydratable(function Foo(props) {
      return h("span", null, props.name);
    }, "file:///proj/src/foo.hydrate.jsx");

    const html = render(
      h(Island, { component: Foo, on: "visible", name: "alice" }),
    );

    assert.deepStrictEqual(receivedUrls, ["file:///proj/src/foo.hydrate.jsx"]);
    assert.match(html, /^<is-land/);
    assert.match(html, /land-on:visible/);
    assert.match(html, /type="preact"/);
    assert.match(html, /import="\/foo\.hydrate\.js"/);
    // JSON.stringify({ name: "alice" }) が HTML エスケープされて属性値に入る
    assert.match(html, /props="\{&quot;name&quot;:&quot;alice&quot;\}"/);
    // SSR 内容として component が同じ props でレンダリングされている
    assert.match(html, /<span>alice<\/span>/);
    assert.match(html, /<\/is-land>$/);
  });

  it("on prop のデフォルトは interaction", () => {
    _setHydrateModuleResolver(() => "/x.hydrate.js");
    const X = hydratable(() => null, "file:///proj/src/x.hydrate.jsx");
    const html = render(h(Island, { component: X }));
    assert.match(html, /land-on:interaction/);
  });

  it("component が渡されていない (または関数でない) 場合は TypeError", () => {
    _setHydrateModuleResolver(() => "/x.hydrate.js");
    assert.throws(
      () => render(h(Island, { component: "not-a-fn" })),
      TypeError,
    );
  });

  it("on に不正な値 (空白 / 空文字 / 非文字列) を渡すと TypeError", () => {
    _setHydrateModuleResolver(() => "/x.hydrate.js");
    const X = hydratable(() => null, "file:///proj/src/x.hydrate.jsx");
    for (const on of ["foo bar", "", 'bad"quote', 123, null]) {
      assert.throws(
        () => render(h(Island, { component: X, on })),
        (err) =>
          err instanceof TypeError && /`on` must match/.test(err.message),
        `on=${JSON.stringify(on)} が TypeError にならなかった`,
      );
    }
  });

  it("component が hydratable でラップされていない場合は明示エラー", () => {
    _setHydrateModuleResolver(() => "/x.hydrate.js");
    const Bare = () => null;
    assert.throws(
      () => render(h(Island, { component: Bare })),
      /not marked as hydratable/,
    );
  });

  it("resolver が未設定の場合は明示エラー", () => {
    const X = hydratable(() => null, "file:///proj/src/x.hydrate.jsx");
    assert.throws(
      () => render(h(Island, { component: X })),
      /no hydrate module URL resolver is configured/,
    );
  });

  it("children を渡しても component の SSR 出力が優先される (呼び出し側は component だけ渡せば済む)", () => {
    _setHydrateModuleResolver(() => "/x.hydrate.js");
    const X = hydratable(function X(props) {
      return h("i", null, `x-${props.tag}`);
    }, "file:///proj/src/x.hydrate.jsx");
    const html = render(
      h(Island, { component: X, tag: "auto" }, h("b", null, "ignored")),
    );
    assert.match(html, /<i>x-auto<\/i>/);
    assert.doesNotMatch(html, /<b>ignored<\/b>/);
  });

  it("children は props シリアライズにもコンポーネント SSR にも漏れない", () => {
    _setHydrateModuleResolver(() => "/x.hydrate.js");
    const receivedProps = [];
    const X = hydratable(function X(props) {
      receivedProps.push(props);
      return h("i", null, `x-${props.tag}`);
    }, "file:///proj/src/x.hydrate.jsx");

    const html = render(
      h(Island, { component: X, tag: "auto" }, h("b", null, "ignored")),
    );

    // <is-land props="..."> 属性に children/VNode が混入していないことを確認
    // (props 属性値は tag のみで完結)
    assert.match(html, /props="\{&quot;tag&quot;:&quot;auto&quot;\}"/);
    // component 側にも children は渡らない
    assert.deepStrictEqual(receivedProps, [{ tag: "auto" }]);
  });

  it("JSON.stringify に失敗する props (循環参照など) は Island 文脈のエラーで包む", () => {
    _setHydrateModuleResolver(() => "/x.hydrate.js");
    const X = hydratable(function X() {
      return null;
    }, "file:///proj/src/x.hydrate.jsx");

    const circular = {};
    circular.self = circular;

    assert.throws(
      () => render(h(Island, { component: X, data: circular })),
      (err) => {
        assert.match(err.message, /Island: failed to JSON\.stringify props/);
        assert.match(err.message, /\/x\.hydrate\.js/);
        assert.ok(
          err.cause instanceof TypeError,
          "元の TypeError が cause に保持されている",
        );
        return true;
      },
    );
  });
});
