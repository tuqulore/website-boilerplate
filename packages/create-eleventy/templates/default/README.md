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

JSXテンプレートの拡張子を `.hydrate.jsx` にすると、`dist/**/*.hydrate.js` にハイドレーション用のスクリプトが生成されます。

`Island`コンポーネントを使用すると、簡潔にPartial Hydrationを記述できます。

```mdx
import Island from "@tuqulore-inc/eleventy-preset/Island";
import Component from "./component.hydrate.jsx";

<Island on="visible">
  <Component someProp="somePropValue" />
</Island>
```

`<Component />` はビルド時にSSR、ブラウザーで読み込み時にハイドレーションされます。

### `Island` のプロパティ

| Prop     | 型       | デフォルト      | 説明                                                       |
| :------- | :------- | :-------------- | :--------------------------------------------------------- |
| on       | `string` | `"interaction"` | ハイドレーションのトリガー（`interaction`, `visible`など） |
| import   | `string` | (自動検出)      | ハイドレーション用スクリプトのパス                         |
| children | `node`   | -               | ハイドレーションするコンポーネント                         |
| ...rest  | `any`    | -               | 子コンポーネントのpropsにマージ（優先）                    |

## Docker

以下のような手順で静的サイトを配信するDockerイメージを生成し、コンテナーを生成して動作させることができます。

```
docker build -t my-eleventy-site .
docker run --rm -p 8080:8080 my-eleventy-site
```
