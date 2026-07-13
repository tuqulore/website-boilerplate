# @tuqulore-inc/create-eleventy

CLI for creating an Eleventy + Preact + Tailwind CSS project.

## Usage

```bash
# Interactive mode
pnpm create @tuqulore-inc/eleventy my-project

# With a template
pnpm create @tuqulore-inc/eleventy my-project --template default
```

## Options

| Option                  | Description     |
| ----------------------- | --------------- |
| `-t, --template <name>` | Pick a template |
| `-h, --help`            | Show help       |

## Available templates

- `default` — Preact + Tailwind CSS

## After creation

```bash
cd my-project
pnpm install
pnpm dev
```

## License

MIT
