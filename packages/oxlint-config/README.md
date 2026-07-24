# @tuqulore-inc/oxlint-config

tuqulore の各パッケージが共通で使う Oxlint 設定。**private パッケージ**であり npm には publish されない。

## 使い方

依存パッケージの `package.json` に追加:

```json
{
  "devDependencies": {
    "@tuqulore-inc/oxlint-config": "workspace:*",
    "oxlint": "^1.75.0"
  }
}
```

パッケージ直下に `.oxlintrc.json` を配置し、共有 config を `extends` で参照する:

```json
{
  "$schema": "../../node_modules/oxlint/configuration_schema.json",
  "extends": ["../oxlint-config/.oxlintrc.json"]
}
```

`package.json` の `scripts` に `oxlint` を追加:

```json
{
  "scripts": {
    "lint": "oxlint --fix"
  }
}
```

## 有効なプラグイン

- `typescript`, `unicorn`, `oxc`（既定・明示）
- `react`（Preact 用に `react/react-in-jsx-scope` 等は off）
- `jsx-a11y`
- `import`

## MDX について

Oxlint は MDX パーサを持たないため、`.mdx` は `ignorePatterns` により Lint 対象外。JSX 構文チェックはビルド時の MDX→JSX 変換段階に委ねる。
