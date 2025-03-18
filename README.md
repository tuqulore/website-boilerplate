# Website Boilerplate

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

| タスク名  | 説明                                                                            |
| :-------- | :------------------------------------------------------------------------------ |
| build     | 静的サイト生成します。                                                          |
| clean     | ビルド成果物を取り除きます。                                                    |
| dev       | 開発サーバーを起動します。                                                      |
| format    | コード整形します。                                                              |
| lint      | 静的コード検査します。                                                          |
| versionup | @lerna-lite/versionによるバージョンアップを実施します。リリース時に使用します。 |

## 環境変数

| 変数名     | 説明                                    |
| :--------- | :-------------------------------------- |
| SERVER_URL | APIサーバーのURL。任意                  |
| SITE_URL   | 本リポジトリで構築するサイトのURL。必須 |

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
├── lib
└── src
    ├── _data
    ├── _includes
    │   └── partials
    └── public
```

### dist

ビルド成果物の出力先です。

### lib

Node.jsで実行するCommonJS/ESMスクリプトを配置します。主にEleventyで実行するコードに使用します。

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

JSXテンプレートの拡張子を `.hydrate.jsx` にすると、`dist/**/*.hydrate.jsx` にハイドレーション用のスクリプトが生成されます。

次の例では、Componentコンポーネントをハイドレーションしています。

```mdx
import Component from "./component.hydrate.jsx"; // ./component.hydrate.jsxはJSXテンプレートとして使用できます

{/* ./component.hydrate.jsxはブラウザーでの読み込み時に描画されます */}
<is-land land-on:visible type="preact" import="./component.hydrate.js" props='{ "someProp": "somePropValue" }'>

  <Component someProp="somePropValue" />{/* <Component />はビルド時に描画されます */}
</is-land>
```

> [!NOTE]
>
> [\<is-land>](https://github.com/11ty/is-land?tab=readme-ov-file#usage)の初期化条件を指定する属性は、デフォルトでは`on:*`の書式で指定する必要がありますが、JSXでの書式と競合するので`land-on:*`に変更しています。

\<is-land>Webコンポーネントは`land-on:*`属性のほか、次の属性を受け付けます。

### `type`属性

ハイドレーションに使用するランタイム。`"preact"`を指定します。

### `import`属性

ハイドレーションに使用する`dist/**/*.hydrate.js`のパス。

### `props`属性

`dist/**/*.hydrate.js`が受け付けるプロパティです。オブジェクトを文字列化した値（通常文字列化にJSON.stringifyを使用することができます）を指定します。

## Docker

以下のような手順で静的サイトを配信するDockerイメージを生成し、コンテナーを生成して動作させることができます。

```
docker build -t website-boilerplate .
docker run --rm -p 8080:8080 website-boilerplate
```

## GitHubワークフロー

### CI

PRブランチで静的コード検査とコード整形をおこないます。

### Release

リリースのためのPRを作成します。[手動で実行](https://docs.github.com/en/actions/using-workflows/manually-running-a-workflow)します。
