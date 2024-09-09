/**
 * Provides the {@link ViewCommand `view` command} used to view...stuff.
 *
 * @packageDocumentation
 */
import {Smoker} from '#smoker';
import {bold} from 'chalk';
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import {inspect} from 'node:util';
import {type Writable} from 'type-fest';
import {
  type ArgumentsCamelCase,
  type Argv,
  type InferredOptionTypes,
  type PositionalOptions,
} from 'yargs';

import {BaseCommand} from './base-cmd.js';
import {type GlobalOptionTypes} from './global-opts.js';
import {type CommandOptionRecord, JsonOptions} from './opts.js';

type ViewOptionTypes = GlobalOptionTypes &
  InferredOptionTypes<Writable<typeof ViewOptions>> &
  InferredOptionTypes<Writable<typeof ViewPositionals>>;

export class ViewCommand extends BaseCommand {
  public override aliases = ['show'];

  public override command = 'view <item>';

  public override describe = 'View information about stuff';

  public static async viewConfig(opts: ArgumentsCamelCase<ViewOptionTypes>) {
    const smoker = await Smoker.create(opts);
    if (opts.json) {
      BaseCommand.writeJson(smoker.smokerOptions);
      return;
    }

    BaseCommand.write(inspect(smoker.smokerOptions, {colors: true, depth: 5}));
  }

  public static async viewDefaultPkgManager(
    opts: ArgumentsCamelCase<ViewOptionTypes>,
  ) {
    const pkgManager = await Smoker.getDefaultPkgManager(opts);

    if (opts.json) {
      BaseCommand.writeJson(pkgManager);
      return;
    }
    BaseCommand.write(pkgManager);
  }

  public override builder(
    argv: Argv<GlobalOptionTypes>,
  ): Argv<ViewOptionTypes> {
    return argv
      .positional('item', ViewPositionals.item)
      .demandOption('item')
      .options(ViewOptions).epilog(`Items:

- ${bold(
      Items.defaultPkgManager,
    )}: The package manager \`smoker\` will use by default
- ${bold(Items.config)}: The effective configuration

`);
  }

  public override async handler(opts: ArgumentsCamelCase<ViewOptionTypes>) {
    switch (opts.item) {
      case Items.defaultPkgManager: {
        await ViewCommand.viewDefaultPkgManager(opts);
        return;
      }
      case Items.config: {
        await ViewCommand.viewConfig(opts);
        return;
      }
      default:
        throw new TypeError(`Unknown view item "${opts.item}"`);
    }
  }
}

/**
 * The "items" which can be viewed
 */
const Items = {
  config: 'config',
  defaultPkgManager: 'default-pkg-manager',
} as const;

/**
 * The positional options for the "view" command
 */
const ViewPositionals = {
  item: {
    choices: [Items.defaultPkgManager, Items.config],
    describe: 'Item to view',
    type: 'string',
  },
} as const satisfies Record<string, PositionalOptions>;

/**
 * The option-options for the "view" command
 */
const ViewOptions = {
  ...JsonOptions,
} as const satisfies CommandOptionRecord;
