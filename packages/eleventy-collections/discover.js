import path from "node:path";

import fg from "fast-glob";

export const SCHEMA_FILE = "_schema.ts";

/**
 * @typedef {Object} CollectionSource
 * @property {string} name - Collection name, taken from the directory name
 * @property {string} dir - Collection directory, POSIX-style and relative to cwd
 * @property {string} schemaPath - Absolute path of the colocated schema
 */

/**
 * Find collections by the `<inputDir>/<name>/_schema.ts` convention. Both the
 * plugin and the `sync` CLI go through here, so validation and generated types
 * always cover the same set of collections.
 *
 * @param {string} inputDir
 * @returns {CollectionSource[]}
 */
export function discoverCollections(inputDir) {
  const pattern = path.posix.join(fg.convertPathToPattern(inputDir), "*", SCHEMA_FILE);
  return fg
    .sync(pattern, { ignore: ["**/node_modules/**"] })
    .toSorted()
    .map((schemaFile) => {
      const schemaPath = path.resolve(schemaFile);
      // Eleventy matches collection globs against cwd-relative input paths.
      const dir = path.relative(process.cwd(), path.dirname(schemaPath)).split(path.sep).join("/");
      return { name: path.basename(dir), dir, schemaPath };
    });
}
