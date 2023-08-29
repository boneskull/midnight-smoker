module.exports = {
  '*.{js,ts}': ['eslint --fix', 'prettier --write'],
  '*.md': ['markdownlint-cli2-fix', 'prettier --write'],
  '*.ya?ml': ['prettier --write'],
  /**
   * This _should_ match if the options change, the rules change, the schema-generating script changes,
   * or we've had dependency changes.
   * @returns Command to update schema
   */
  '(./src/rules/**/*.ts|src/options.ts|./scripts/generate-schema.ts|./package.json|./package-lock.json)':
    () => ['npm run update-schema'],
  '!(package-lock)*.json': ['prettier --write'],
};
