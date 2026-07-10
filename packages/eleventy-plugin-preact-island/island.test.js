import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { h } from "preact";
import { render } from "preact-render-to-string";
import { Island, clientComponent, _setClientModuleResolver } from "./island.js";

describe("_setClientModuleResolver", () => {
  it("関数を渡せる", () => {
    assert.doesNotThrow(() => _setClientModuleResolver(() => "/x.js"));
    // 状態を残さない: 後続テストの beforeEach で null リセットされるが念のため
    _setClientModuleResolver(null);
  });

  it("null で明示的にクリアできる", () => {
    _setClientModuleResolver(() => "/x.js");
    assert.doesNotThrow(() => _setClientModuleResolver(null));
  });

  it("関数でも null でもない値は TypeError で拒否する", () => {
    for (const bad of [undefined, 0, "string", {}, [], true]) {
      assert.throws(
        () => _setClientModuleResolver(bad),
        (err) =>
          err instanceof TypeError &&
          /`resolver` must be a function or null/.test(err.message),
        `_setClientModuleResolver(${JSON.stringify(bad)}) が TypeError にならなかった`,
      );
    }
  });
});

describe("clientComponent", () => {
  it("Component に __clientModuleUrl を付与して同じ関数を返す", () => {
    const Comp = () => null;
    const returned = clientComponent(Comp, "file:///proj/src/foo.client.jsx");
    assert.strictEqual(returned, Comp);
    assert.strictEqual(
      Comp.__clientModuleUrl,
      "file:///proj/src/foo.client.jsx",
    );
  });

  it("Component が関数でない場合は TypeError", () => {
    assert.throws(() => clientComponent(null, "file:///x"), TypeError);
    assert.throws(() => clientComponent("Comp", "file:///x"), TypeError);
  });

  it("moduleUrl が文字列でない場合は TypeError", () => {
    assert.throws(() => clientComponent(() => null, undefined), TypeError);
    assert.throws(() => clientComponent(() => null, 123), TypeError);
  });
});

describe("Island", () => {
  beforeEach(() => {
    // 各テストで resolver をリセットし、テスト間の状態漏れを防ぐ
    _setClientModuleResolver(null);
  });

  it("clientComponent 済み component を <is-land> でラップし、resolver 経由の import URL と JSON props を出力する", () => {
    const receivedUrls = [];
    _setClientModuleResolver((moduleUrl) => {
      receivedUrls.push(moduleUrl);
      return "/foo.client.js";
    });
    const Foo = clientComponent(function Foo(props) {
      return h("span", null, props.name);
    }, "file:///proj/src/foo.client.jsx");

    const html = render(
      h(Island, { component: Foo, on: "visible", name: "alice" }),
    );

    assert.deepStrictEqual(receivedUrls, ["file:///proj/src/foo.client.jsx"]);
    assert.match(html, /^<is-land/);
    assert.match(html, /land-on:visible/);
    assert.match(html, /type="preact"/);
    assert.match(html, /import="\/foo\.client\.js"/);
    // JSON.stringify({ name: "alice" }) が HTML エスケープされて属性値に入る
    assert.match(html, /props="\{&quot;name&quot;:&quot;alice&quot;\}"/);
    // SSR 内容として component が同じ props でレンダリングされている
    assert.match(html, /<span>alice<\/span>/);
    assert.match(html, /<\/is-land>$/);
  });

  it("on prop のデフォルトは interaction", () => {
    _setClientModuleResolver(() => "/x.client.js");
    const X = clientComponent(() => null, "file:///proj/src/x.client.jsx");
    const html = render(h(Island, { component: X }));
    assert.match(html, /land-on:interaction/);
  });

  it("component が渡されていない (または関数でない) 場合は TypeError", () => {
    _setClientModuleResolver(() => "/x.client.js");
    assert.throws(
      () => render(h(Island, { component: "not-a-fn" })),
      TypeError,
    );
  });

  it("on に不正な値 (空白 / 空文字 / 非文字列) を渡すと TypeError", () => {
    _setClientModuleResolver(() => "/x.client.js");
    const X = clientComponent(() => null, "file:///proj/src/x.client.jsx");
    for (const on of ["foo bar", "", 'bad"quote', 123, null]) {
      assert.throws(
        () => render(h(Island, { component: X, on })),
        (err) =>
          err instanceof TypeError && /`on` must match/.test(err.message),
        `on=${JSON.stringify(on)} が TypeError にならなかった`,
      );
    }
  });

  it("component が clientComponent でラップされていない場合は明示エラー", () => {
    _setClientModuleResolver(() => "/x.client.js");
    const Bare = () => null;
    assert.throws(
      () => render(h(Island, { component: Bare })),
      /not marked as a client component/,
    );
  });

  it("resolver が未設定の場合は明示エラー", () => {
    const X = clientComponent(() => null, "file:///proj/src/x.client.jsx");
    assert.throws(
      () => render(h(Island, { component: X })),
      /no client module URL resolver is configured/,
    );
  });

  it("children を渡しても component の SSR 出力が優先される (呼び出し側は component だけ渡せば済む)", () => {
    _setClientModuleResolver(() => "/x.client.js");
    const X = clientComponent(function X(props) {
      return h("i", null, `x-${props.tag}`);
    }, "file:///proj/src/x.client.jsx");
    const html = render(
      h(Island, { component: X, tag: "auto" }, h("b", null, "ignored")),
    );
    assert.match(html, /<i>x-auto<\/i>/);
    assert.doesNotMatch(html, /<b>ignored<\/b>/);
  });

  it("children は props シリアライズにもコンポーネント SSR にも漏れない", () => {
    _setClientModuleResolver(() => "/x.client.js");
    const receivedProps = [];
    const X = clientComponent(function X(props) {
      receivedProps.push(props);
      return h("i", null, `x-${props.tag}`);
    }, "file:///proj/src/x.client.jsx");

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
    _setClientModuleResolver(() => "/x.client.js");
    const X = clientComponent(function X() {
      return null;
    }, "file:///proj/src/x.client.jsx");

    const circular = {};
    circular.self = circular;

    assert.throws(
      () => render(h(Island, { component: X, data: circular })),
      (err) => {
        assert.match(err.message, /Island: failed to JSON\.stringify props/);
        assert.match(err.message, /\/x\.client\.js/);
        assert.ok(
          err.cause instanceof TypeError,
          "元の TypeError が cause に保持されている",
        );
        return true;
      },
    );
  });
});
