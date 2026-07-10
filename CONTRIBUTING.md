# コントリビューションガイド

このリポジトリは Eleventy 向けボイラープレートと関連パッケージを収めた pnpm ワークスペースのモノレポです。開発に参加する際の共通ルールと、パッケージの手動テスト手順をまとめます。

## 前提

- Node.js: [Active LTS](https://github.com/nodejs/release#release-schedule)（`package.json > engines.node` で固定）
- pnpm: `package.json > packageManager` に固定されたバージョン（Corepack 経由での使用を推奨）

## セットアップ

```shell
pnpm install
```

## リポジトリ構成

| ディレクトリ                             | 役割                                                               |
| :--------------------------------------- | :----------------------------------------------------------------- |
| `packages/create-eleventy`               | `pnpm create @tuqulore-inc/eleventy` の CLI およびテンプレート     |
| `packages/eleventy-preset`               | Eleventy 設定のプリセット（他プラグインを `workspace:*` で束ねる） |
| `packages/eleventy-plugin-preact`        | Preact による JSX テンプレート対応                                 |
| `packages/eleventy-plugin-preact-island` | Partial Hydration                                                  |
| `packages/eleventy-plugin-postcss`       | PostCSS 対応                                                       |
| `packages/eslint-config`                 | 共有 ESLint 設定                                                   |

## 開発ワークフロー

### コード整形と静的検査

```shell
pnpm format   # prettier --write .
pnpm lint     # 各パッケージの eslint --fix .
```

CI（`.github/workflows/ci.yaml`）は `pnpm lint` → `pnpm -r test` → 整形チェックを実行します。ローカルでも同じコマンドが通ることを PR 前に確認してください。

### 自動テスト

各パッケージの `test` スクリプトはリポジトリルートから `pnpm -r test` で一括実行できます。テストは Node.js 標準の `node --test` を採用し、追加ランナーは持ち込みません。

## パッケージの手動テストガイド

### 手動テストの目的

自動テスト (`packages/create-eleventy/templates.test.js`) は「scaffold できる／install & build が正常に完了する」といったリグレッション検知が目的です。手動テストはそれとは別で、**テンプレートとエコシステムの利用体験**を触って確かめることが目的です。具体的には次のような観点を、実際にコードを触りブラウザで見て判断します。

- 生成物が「そのまま開発を始められる最小構成」になっているか
- CLI の対話・ヘルプ・エラーメッセージが分かりやすいか
- `pnpm dev` の開発体験（HMR、エラー表示、ポート案内など）が快適か
- Preact Islands の Partial Hydration や PostCSS がブラウザで意図通り機能するか
- 本番ビルドの見た目が崩れていないか

自動テストと同じ「build が通るか」を再確認することは目的ではありません。

### 現ブランチのソースを差し込むセットアップ

`packages/create-eleventy/templates/*` は生成後の `package.json` から `@tuqulore-inc/eleventy-preset: ^4.1.0` のように **公開済みバージョンへの依存として** プリセットを参照します。素の `pnpm install` では npm レジストリの公開版が解決されるため、現ブランチのワークスペースパッケージに加えた変更を触って確かめるには `pnpm pack` した tarball を `pnpm.overrides` で差し込む必要があります。仕組みの詳細は `packages/create-eleventy/templates.test.js` を参照してください。

以下のスクリプトをリポジトリルートで `bash` として実行すると、`$WORK/my-app` に「現ブランチのソースを差し込んだ scaffold 済みプロジェクト」ができ、`pnpm install` まで済んだ状態になります。後片付けは手動で行います（動作確認中に消えると困るため）。

```shell
#!/usr/bin/env bash
set -euo pipefail

# リポジトリルートで実行する前提。scaffold と pack はここを起点にする。
REPO=$(pwd)

# 作業ディレクトリはリポジトリ外の tmpdir に切り出し、リポジトリを汚さない。
#   WORK: scaffold 済みプロジェクトを置くワークスペースルート
#   PACK: pnpm pack で作った tarball の置き場
WORK=$(mktemp -d)
PACK=$(mktemp -d)

# 対象の workspace パッケージを tarball 化する。
# workspace:* は pnpm pack の時点で実バージョンへ解決される。
# eleventy-preset は 3 プラグインを workspace:* で参照しているため、それらもまとめて pack する。
# eleventy-preset の依存を追加/変更した場合はこの配列も更新する必要がある。
PKGS=(
  @tuqulore-inc/eleventy-preset
  @tuqulore-inc/eleventy-plugin-preact
  @tuqulore-inc/eleventy-plugin-preact-island
  @tuqulore-inc/eleventy-plugin-postcss
)
for NAME in "${PKGS[@]}"; do
  pnpm --filter "$NAME" pack --pack-destination "$PACK"
done

# CLI で WORK 配下へ scaffold する。CLI は cwd に作るのでサブシェルで cd してから叩く。
# 対話 UI や --help の体験も確認したい場合はここで別途手で叩き直すこと。
(cd "$WORK" && node "$REPO/packages/create-eleventy/index.js" my-app --template default)

# WORK を単独ワークスペース化して pnpm-workspace.yaml に overrides を書き出す。
# - overrides は transitive にも効くので、テンプレートが直接依存していないプラグイン群も一括で差し替わる。
# - file: は具体名を渡す必要があり glob (*.tgz) は解決されないため、pack で生成された tarball 名をシェル側で解決する。
# - glob は SHORT の直後を [0-9] に固定する。preact / preact-island のように片方が
#   他方の prefix になる名前で `${SHORT}-*` を使うと両 tarball にマッチしてしまうため。
# - allowBuilds はリポジトリルート pnpm-workspace.yaml の設定を踏襲する。
{
  echo "packages:"
  echo "  - my-app"
  echo "overrides:"
  for NAME in "${PKGS[@]}"; do
    SHORT=${NAME/@tuqulore-inc\//tuqulore-inc-}
    TARBALL=$(ls "$PACK/${SHORT}-"[0-9]*.tgz)
    echo "  \"$NAME\": \"file:$TARBALL\""
  done
  echo "allowBuilds:"
  echo "  esbuild: false"
  echo "  sharp: false"
} > "$WORK/pnpm-workspace.yaml"

cd "$WORK/my-app"
pnpm install --prefer-offline

echo
echo "準備完了: $WORK/my-app に移動して pnpm dev / pnpm build を回してください。"
echo "後片付け: rm -r \"$WORK\" \"$PACK\""
```

### 触って確認するポイント

`$WORK/my-app` および CLI そのものに対して、以下を実際に操作して確認します。

**CLI の使用体験**（`packages/create-eleventy/index.js`）

- `--help` の出力が意図通りに読めるか
- プロジェクト名／テンプレート名を省略した場合の対話プロンプトが分かりやすいか
- テンプレート名の誤指定、既存ディレクトリとの衝突など、エラー時のメッセージが親切か
- Scaffold 完了後に表示される次アクション案内（`cd my-app && pnpm install && pnpm dev`）が実際に動くか

**Scaffold 直後の生成物**

- `package.json` の `name` がプロジェクト名で書き換わっている
- `_env` `_gitignore` が `.env` `.gitignore` として展開されている（`_` 始まりの残存なし）
- README・エディタ設定・サンプルソースなど同梱物が「そのまま開発を始められる」内容になっているか

**開発体験（`pnpm dev`）**

- サーバが起動して既定ポートを案内する
- ブラウザで初期表示が崩れない
- JSX テンプレート／CSS を編集したときに HMR で反映される
- Preact Islands が hydrate し、ブラウザでインタラクションが動く
- 開発中のエラー（構文エラーなど）が分かりやすく提示される

**プロダクションビルド（`pnpm build`）**

- ビルドが完走し、必要な成果物が `dist/` に揃う
- 静的サーバで開いても崩れがない（例: `pnpm dlx serve dist`）
- 各 island の JS が必要な箇所だけ hydrate される

## Pull Request

- タイトルは Conventional Commits に沿った日本語で。破壊的変更は `!` を付ける（例: `feat(eleventy-preset)!: ...`）。
- 変更対象パッケージの `test` が既にある場合は追加・更新してから PR を作成してください。CI で `pnpm -r test` が走ります。
- テンプレートや `workspace:*` 依存に触れた PR は、上記の手動テスト手順を実施したことを Test plan に明記してください。

## リリース

リリース手順は [RELEASING.md](./RELEASING.md) を参照してください。
