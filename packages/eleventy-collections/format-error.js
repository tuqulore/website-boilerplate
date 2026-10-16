/**
 * @typedef {Object} ValidationIssue
 * @property {string} message
 * @property {ReadonlyArray<PropertyKey | { key: PropertyKey }>} [path]
 */

/**
 * @typedef {Object} ValidationFailure
 * @property {string} inputPath - File the invalid entry came from
 * @property {ReadonlyArray<ValidationIssue>} issues
 */

/**
 * @param {ValidationIssue["path"]} issuePath
 * @returns {string}
 */
const formatPath = (issuePath) =>
  issuePath?.length
    ? issuePath
        .map((segment) => String(typeof segment === "object" ? segment.key : segment))
        .join(".")
    : "(root)";

/**
 * Render every failing file of one collection. The schema reports what is wrong
 * (field path and message) but not where it came from, so the file path is
 * added here.
 *
 * @param {string} name - Collection name
 * @param {ValidationFailure[]} failures
 * @returns {string}
 */
export function formatValidationError(name, failures) {
  const lines = [`Collection "${name}": validation failed`];
  for (const { inputPath, issues } of failures) {
    lines.push(inputPath.replace(/^\.\//, ""));
    for (const issue of issues) {
      lines.push(`  - ${formatPath(issue.path)}: ${issue.message}`);
    }
  }
  return lines.join("\n");
}
