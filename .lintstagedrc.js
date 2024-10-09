module.exports = {
  '*.{js,ts}': ['eslint --fix', 'prettier --write'],
  '!(_*).md': ['markdownlint-cli2-fix', 'prettier --write'],
  '*.ya?ml': ['prettier --write'],
  /**
   * This _should_ match if the options change, the rules change, the
   * schema-generating script changes, or we've had dependency changes.
   *
   * @returns Command to update schema
   */
  '(./packages/plugin-default/src/**/*.ts|packages/midnight-smoker/src/schema/smoker-options.ts|./packages/midnight-smoker/scripts/generate-schema.ts|package.json|package-lock.json)':
    () => [
      'npm run update-schema',
      'git add -A packages/midnight-smoker/schema/midnight-smoker.schema.json',
    ],
  '*.{json,json5}': ['prettier --write'],
};
