# ウェブデザイン用テンプレート

## 想定している環境

* Node.js 8.9.4以上
* EditorConfig、stylelint、ESLintに対応したエディター

## 導入したツールの役割

| ツール名 | 役割 | 対応エディター |
| :- | :- | :- |
| EditorConfig | インデントの統一など | [たくさん](http://editorconfig.org/#download) |
| stylelint | scss([rscss](http://rscss.io))の書式チェック | [Atom, Sublime Text, VSCode, WebStorm など](https://github.com/stylelint/stylelint/blob/master/docs/user-guide/complementary-tools.md#editor-plugins) |
| ESLint | jsの書式チェック | [たくさん](https://eslint.org/docs/user-guide/integrations#editors) |
| pug-lint | pugの書式チェック | [Atom, Sublime Text, VSCode など](https://github.com/pugjs/pug-lint#editor-integration)

## 使い方

BrowserSyncを使いたい場合は以下の手順で実行してください

0. `npm i -g gulp-cli` (Gulpを使っていない場合)
1. `npm install`
2. `gulp build`
3. `gulp`

## Gulpタスク一覧

| タスク名 | 説明 | 依存するタスク |
| :- | :- | :-
| gulp templates | pugをhtmlに変換する | - |
| gulp sass | scssをcssに変換する | - |
| gulp image | 画像の最適化をする | - |
| gulp build | ビルド用タスク | templates, sass, image |
| gulp | BrowserSyncを開始する | templates, sass |
