# ツクロアのウェブサイトのボイラープレート

## 動かし方

### npmパッケージをインストールする

```
$ yarn
```

### ローカルサーバーを立てて開発する

```
$ yarn dev
```

### デプロイ用にビルドする

```
$ yarn build
```

## GitHubワークフロー

### Format

PR時にコード整形します

### Lint

PR時にリントしreviewdogがレポートします

### Preview

PR時にCloud Runでプレビュー環境を作成します(お使いのproject_idを設定してください)
