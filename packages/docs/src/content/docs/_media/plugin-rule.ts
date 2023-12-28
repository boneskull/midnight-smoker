import type {PluginFactory} from 'midnight-smoker/plugin';

export const plugin: PluginFactory = (api) => {
  api.defineRule({
    /**
     * The name of the rule. This will be unique to the plugin.
     *
     * In a user's config file, it will be referenced as
     * `<plugin-name>/<rule-name>`.
     *
     * The plugin name will be the package name from the closest ancestor
     * `package.json`.
     */
    name: 'no-public-pkgs',

    /**
     * Rule description.
     *
     * This is required.
     */
    description: 'Checks that no packages are marked as public',

    /**
     * This function performs the actual check. The `context` object provides
     * some extra information about the package being checked, the rule's
     * current severity, and the `addIssue` method.
     *
     * The `opts` object is the user's configuration for this rule, with your
     * defaults applied; it will be the same output type as the `schema`
     * property below.
     */
    check(context, opts) {
      if (opts.ignore.includes(`${context.pkgJson.name}`)) {
        return;
      }

      if (context.pkgJson.private !== true) {
        context.addIssue('Package must be private');
      }
    },

    /**
     * `midnight-smoker` uses Zod to define option schemas.
     *
     * Zod can be accessed via the `z` or `zod` property of the `PluginAPI`
     * object.
     *
     * Your rule may not need any options; in that case, you can omit this
     * property.
     */
    schema: api.z.object({
      ignore: api.z
        .array(api.z.string())
        .default([])
        .describe('Packages to ignore'),
    }),
  });
};
