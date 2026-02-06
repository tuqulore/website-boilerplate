import path from "node:path";

/**
 * Babel plugin that adds __hydrateModule metadata to default exports
 * in *.hydrate.jsx files.
 *
 * Transforms:
 *   export default function Desktop(props) { ... }
 *
 * Into:
 *   function Desktop(props) { ... }
 *   Desktop.__hydrateModule = "/_includes/partials/header/desktop.hydrate.js";
 *   export default Desktop;
 *
 * @param {{ types: import("@babel/types") }} param0
 * @returns {import("@babel/core").PluginObj}
 */
export default function hydrateModulePlugin({ types: t }) {
  return {
    name: "babel-plugin-hydrate-module",
    visitor: {
      ExportDefaultDeclaration(nodePath, state) {
        const filename = state.filename;

        // Only process .hydrate.jsx files
        if (!filename || !filename.includes(".hydrate.")) {
          return;
        }

        // Calculate the module path for browser import
        // e.g., /path/to/project/src/_includes/foo.hydrate.jsx
        //    -> /_includes/foo.hydrate.js
        const cwd = state.cwd || process.cwd();
        const relativePath = path.relative(cwd, filename);

        // Remove 'src/' prefix and change .jsx to .js
        const modulePath =
          "/" + relativePath.replace(/^src[\\/]/, "").replace(/\.jsx$/, ".js");

        const declaration = nodePath.node.declaration;

        // Handle different declaration types
        if (t.isFunctionDeclaration(declaration) && declaration.id) {
          // export default function Foo() {}
          const funcName = declaration.id.name;

          // Remove the export and insert separate statements
          nodePath.replaceWithMultiple([
            // function Foo() {}
            declaration,
            // Foo.__hydrateModule = "...";
            t.expressionStatement(
              t.assignmentExpression(
                "=",
                t.memberExpression(
                  t.identifier(funcName),
                  t.identifier("__hydrateModule"),
                ),
                t.stringLiteral(modulePath),
              ),
            ),
            // export default Foo;
            t.exportDefaultDeclaration(t.identifier(funcName)),
          ]);
        } else if (t.isClassDeclaration(declaration) && declaration.id) {
          // export default class Foo {}
          const className = declaration.id.name;

          nodePath.replaceWithMultiple([
            declaration,
            t.expressionStatement(
              t.assignmentExpression(
                "=",
                t.memberExpression(
                  t.identifier(className),
                  t.identifier("__hydrateModule"),
                ),
                t.stringLiteral(modulePath),
              ),
            ),
            t.exportDefaultDeclaration(t.identifier(className)),
          ]);
        } else {
          // export default <expression> (arrow function, anonymous function, etc.)
          // Wrap in a variable
          const tempId = nodePath.scope.generateUidIdentifier("_default");

          nodePath.replaceWithMultiple([
            // const _default = <expression>;
            t.variableDeclaration("const", [
              t.variableDeclarator(tempId, declaration),
            ]),
            // _default.__hydrateModule = "...";
            t.expressionStatement(
              t.assignmentExpression(
                "=",
                t.memberExpression(tempId, t.identifier("__hydrateModule")),
                t.stringLiteral(modulePath),
              ),
            ),
            // export default _default;
            t.exportDefaultDeclaration(tempId),
          ]);
        }
      },
    },
  };
}
