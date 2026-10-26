// Test helpers shared by the plugin and bundler tests. Not published.

/**
 * Minimal UserConfig stub carrying only what the plugin actually reads.
 * `versionCheck` is called defensively; `addPassthroughCopy` / `addTransform`
 * are called unconditionally in the plugin body. `directories` mirrors
 * Eleventy's userspace live getter (input/output). `pathPrefix` and `input`
 * are the inputs under test. `on` records event handlers so tests can inspect
 * registration and invoke `eleventy.before` without spinning up Eleventy.
 * `ignores.add` records patterns so tests can assert the always-on ignore rule.
 */
export function makeEleventyConfigStub({
  pathPrefix,
  input = "/proj/src/",
  output = "/proj/dist/",
} = {}) {
  const eventHandlers = new Map();
  const ignoreAdds = [];
  const transforms = new Map();
  const passthroughCopies = [];
  return {
    pathPrefix,
    directories: { input, output },
    versionCheck() {},
    addPassthroughCopy(arg) {
      passthroughCopies.push(arg);
    },
    _passthroughCopies: passthroughCopies,
    addTransform(name, fn) {
      transforms.set(name, fn);
    },
    _transform(name, content, outputPath) {
      return transforms.get(name)(content, outputPath);
    },
    ignores: {
      add(pattern) {
        ignoreAdds.push(pattern);
      },
    },
    _ignoreAdds: ignoreAdds,
    on(event, handler) {
      if (!eventHandlers.has(event)) eventHandlers.set(event, []);
      eventHandlers.get(event).push(handler);
    },
    _hasHandler(event) {
      return (eventHandlers.get(event) ?? []).length > 0;
    },
    async _emit(event, arg) {
      for (const handler of eventHandlers.get(event) ?? []) {
        // Run handlers one by one in registration order to keep tests deterministic.
        // oxlint-disable-next-line no-await-in-loop
        await handler(arg);
      }
    },
  };
}
