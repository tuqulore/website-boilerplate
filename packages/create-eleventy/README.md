# @tuqulore-inc/create-eleventy

Eleventy + Preact + TailwindCSS のプロジェクトを作成するCLIツール

## 使い方

```bash
# インタラクティブモード
pnpm create @tuqulore-inc/eleventy my-project

# テンプレート指定
pnpm create @tuqulore-inc/eleventy my-project --template default
```

## オプション

| オプション              | 説明                       |
| ----------------------- | -------------------------- |
| `-t, --template <name>` | 使用するテンプレートを指定 |
| `-h, --help`            | ヘルプを表示               |

## 利用可能なテンプレート

- `default` - Preact + TailwindCSS の標準構成

## プロジェクト作成後

```bash
cd my-project
pnpm install
pnpm dev
```

## ライセンス

MIT
