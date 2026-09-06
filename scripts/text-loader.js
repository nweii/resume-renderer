// A Turbopack (webpack-style) loader that turns a file into a module whose
// default export is the file's text. next.config.ts applies it to `*.md`, so
// a markdown content file imports the same way a JSON one does. Bun does the
// same through the `[loader]` table in bunfig.toml.

module.exports = function textLoader(source) {
  return `export default ${JSON.stringify(String(source))};`;
};
