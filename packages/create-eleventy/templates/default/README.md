# My Eleventy Site

## 動作環境

- [Active LTS](https://github.com/nodejs/release#release-schedule)
- Docker

## クイックスタート

> [!NOTE]
>
> 事前に [pnpmをインストール](https://pnpm.io/ja/installation)してください。

```shell
pnpm install # npmパッケージのインストール
pnpm dev # 開発サーバーの起動
```

## npmスクリプト

| タスク名 | 説明                         |
| :------- | :--------------------------- |
| build    | 静的サイト生成します。       |
| clean    | ビルド成果物を取り除きます。 |
| dev      | 開発サーバーを起動します。   |
| format   | コード整形します。           |
| lint     | 静的コード検査します。       |

## 環境変数

| 変数名   | 説明                                    |
| :------- | :-------------------------------------- |
| SITE_URL | 本リポジトリで構築するサイトのURL。必須 |

### カスケーディング (`pnpm dev`)

1. .env
2. .env.development
3. .env.local
4. .env.development.local

の順番で参照します。後に参照される値が優先されます。リポジトリに含めない環境変数は.env.localあるいは.env.development.localに記述してください。

### カスケーディング (`pnpm build`)

1. .env
2. .env.production
3. .env.local
4. .env.production.local

の順番で参照します。後に参照される値が優先されます。リポジトリに含めない環境変数は.env.productionあるいは.env.production.localに記述してください。

## 採用しているライブラリ

### [Eleventy](https://www.11ty.dev/)

静的サイト生成するためのライブラリです。

### [Preact](https://preactjs.com/)

JSXテンプレートから動的な振る舞いとHTMLを生成するためのライブラリです。

### [Tailwind CSS](https://tailwindcss.com/)

見た目を実装するためのユーティリティファーストなCSSフレームワークです。

### [Jumpu UI](https://github.com/tuqulore/jumpu-ui)

一貫性のある見た目を実装するためのユーティリティフレンドリーなデザインシステムです。

### [Iconify SVG Framework](https://docs.iconify.design/icon-components/svg-framework/)

SVGアイコンを参照するためのライブラリです。

## ディレクトリ構成

```
.
├── dist
└── src
    ├── _data
    ├── _includes
    │   └── partials
    └── public
```

### dist

ビルド成果物の出力先です。

### src

Eleventyテンプレートの参照先です。

### src/\_data

[グローバルデータ](https://www.11ty.dev/docs/data-global/)を配置します。

### src/\_includes

[レイアウトチェイニング](https://www.11ty.dev/docs/layout-chaining/)のための[レイアウトテンプレート](https://www.11ty.dev/docs/layouts/)を配置します。

具体的には[フロントマター](https://www.11ty.dev/docs/data-frontmatter/)あるいはエクスポートしたdataオブジェクトにてlayoutプロパティで指定するものを指します。

### src/\_includes/partials

テンプレート内で呼び出すためのJSXコンポーネント/MDXテンプレートを配置します。

### src/public

静的アセットを配置します。distディレクトリ直下に出力されます。

## Partial Hydration

JSXテンプレートの拡張子を `.client.jsx` にすると、その file は esbuild でバンドルされて `dist/**/*.client.js` に出力され、`<Island>` コンポーネントを通じて \<is-land> のクライアント側スクリプトとして読み込まれます。

`clientComponent()` でマークしたコンポーネントを `<Island>` に渡すと、SSR 側の描画と、クライアント側のハイドレーションの両方に同じ props が流れます。

```jsx
// src/counter.client.jsx
import { clientComponent } from "@tuqulore-inc/eleventy-preset/island";
import { useState } from "preact/hooks";

function Counter(props) {
  const [n, setN] = useState(props.initial ?? 0);
  return <button onClick={() => setN(n + 1)}>{n}</button>;
}

export default clientComponent(Counter, import.meta.url);
```

```mdx
// src/index.mdx
import { Island } from "@tuqulore-inc/eleventy-preset/island";
import Counter from "./counter.client.jsx";

<Island component={Counter} on="interaction" initial={5} />
```

上の例では、`<Island>` が次のような \<is-land> 要素を SSR 出力します。

```html
<is-land
  land-on:interaction
  type="preact"
  import="/counter.client.js"
  props='{"initial":5}'
>
  <button>5</button>
</is-land>
```

`on` prop は \<is-land> の初期化トリガー (`interaction` / `visible` / `idle`) に対応します。

> [!NOTE]
>
> [\<is-land>](https://github.com/11ty/is-land?tab=readme-ov-file#usage)の初期化条件を指定する属性は、デフォルトでは `on:*` の書式で指定する必要がありますが、JSX の書式と競合するので `land-on:*` に変更しています。パラメータ付きトリガー (例: `on:media("(min-width: ...)")`) を使う場合は `<Island>` ではなく素の \<is-land> を直接書いてください。

## Docker

以下のような手順で静的サイトを配信するDockerイメージを生成し、コンテナーを生成して動作させることができます。

```
docker build -t my-eleventy-site .
docker run --rm -p 8080:8080 my-eleventy-site
```
