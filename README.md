# Website Boilerplate

Eleventyプロジェクトのためのボイラープレートとツール群を提供するモノレポです。

## パッケージ

| パッケージ | 説明 |
| :--------- | :--- |
| [@tuqulore/create-eleventy](./packages/create-eleventy) | `pnpm create @tuqulore/eleventy` でプロジェクトを作成するCLI |
| [@tuqulore/eleventy-preset](./packages/eleventy-preset) | Eleventy設定のプリセット |
| [@tuqulore/eleventy-plugin-preact](./packages/eleventy-plugin-preact) | PreactでJSXテンプレートを使用するためのプラグイン |
| [@tuqulore/eleventy-plugin-preact-island](./packages/eleventy-plugin-preact-island) | Partial Hydrationを実現するためのプラグイン |
| [@tuqulore/eleventy-plugin-postcss](./packages/eleventy-plugin-postcss) | PostCSSを使用するためのプラグイン |
| [@tuqulore/eslint-config](./packages/eslint-config) | 共有のESLint設定 |

## クイックスタート

新しいEleventyプロジェクトを作成するには：

```shell
pnpm create @tuqulore/eleventy my-project
cd my-project
pnpm install
pnpm dev
```

## 開発

### 動作環境

- [Active LTS](https://github.com/nodejs/release#release-schedule)

### セットアップ

```shell
pnpm install
```

### npmスクリプト

| タスク名  | 説明                                                                            |
| :-------- | :------------------------------------------------------------------------------ |
| format    | コード整形します。                                                              |
| lint      | 静的コード検査します。                                                          |
| versionup | @lerna-lite/versionによるバージョンアップを実施します。リリース時に使用します。 |

## GitHubワークフロー

### CI

PRブランチで静的コード検査とコード整形をおこないます。

### Release

リリースのためのPRを作成します。[手動で実行](https://docs.github.com/en/actions/using-workflows/manually-running-a-workflow)します。
