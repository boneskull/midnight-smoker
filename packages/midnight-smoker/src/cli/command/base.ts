import type {ArgumentsCamelCase, Argv, CommandModule} from 'yargs';
import type {GlobalOptionTypes} from './common';

export abstract class BaseCommand<
  T extends GlobalOptionTypes = GlobalOptionTypes,
> implements CommandModule<GlobalOptionTypes, T>
{
  aliases?: string | readonly string[];
  builder?(argv: Argv<GlobalOptionTypes>): Argv<T>;

  command?: string | readonly string[];
  deprecated?: boolean | string = false;
  describe?: string | false;
  abstract handler(args: ArgumentsCamelCase<T>): void | Promise<void>;
}
