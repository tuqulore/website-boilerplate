#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import readline from "node:readline";

const { values, positionals } = parseArgs({
  options: {
    template: { type: "string", short: "t" },
    help: { type: "boolean", short: "h" },
  },
  allowPositionals: true,
});

if (values.help) {
  console.log(`
Usage: create-eleventy [project-name] [options]

Options:
  -t, --template <name>  Specify a template (default, etc.)
  -h, --help             Show this help message

Example:
  pnpm create @tuqulore/eleventy my-project
  pnpm create @tuqulore/eleventy my-project --template default
`);
  process.exit(0);
}

const templatesDir = new URL("./templates/", import.meta.url);
let templates;

try {
  templates = fs.readdirSync(templatesDir);
} catch (error) {
  console.error(`Failed to read templates directory: ${templatesDir}`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function selectTemplate() {
  console.log("\nAvailable templates:");
  templates.forEach((t, i) => {
    console.log(`  ${i + 1}. ${t}`);
  });

  const answer = await prompt("\nSelect a template (number or name): ");
  const num = parseInt(answer, 10);

  if (!isNaN(num) && num >= 1 && num <= templates.length) {
    return templates[num - 1];
  }

  if (templates.includes(answer)) {
    return answer;
  }

  console.error(`Invalid template: ${answer}`);
  process.exit(1);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    let destName = entry.name;

    // Rename _prefix to .prefix
    if (destName.startsWith("_")) {
      destName = "." + destName.slice(1);
    }

    const destPath = path.join(dest, destName);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function main() {
  let projectName = positionals[0];

  if (!projectName) {
    projectName = await prompt("Project name: ");
    if (!projectName) {
      console.error("Project name is required");
      process.exit(1);
    }
  }

  let templateName = values.template;

  if (!templateName) {
    if (templates.length === 1) {
      templateName = templates[0];
    } else {
      templateName = await selectTemplate();
    }
  }

  if (!templates.includes(templateName)) {
    console.error(`Template "${templateName}" not found.`);
    console.error(`Available templates: ${templates.join(", ")}`);
    process.exit(1);
  }

  const targetDir = path.resolve(process.cwd(), projectName);

  if (fs.existsSync(targetDir)) {
    console.error(`Directory "${projectName}" already exists.`);
    process.exit(1);
  }

  console.log(`\nCreating project in ${targetDir}...`);

  const templateDir = new URL(`./templates/${templateName}/`, import.meta.url);
  copyDir(templateDir.pathname, targetDir);

  // Update package.json name
  const pkgPath = path.join(targetDir, "package.json");
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    pkg.name = path.basename(targetDir);
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  }

  console.log("\nDone! Now run:\n");
  console.log(`  cd ${targetDir}`);
  console.log("  pnpm install");
  console.log("  pnpm dev");
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
