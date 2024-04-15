import type {ArgumentsCamelCase, Argv, CommandModule} from 'yargs';
import type {GlobalOptionTypes} from './global-opts';

export abstract class BaseCommand<
  T extends GlobalOptionTypes = GlobalOptionTypes,
> implements CommandModule<GlobalOptionTypes, T>
{
  public aliases?: string | readonly string[];

  public command?: string | readonly string[];

  public deprecated?: boolean | string = false;

  public describe?: string | false;

  public builder?(argv: Argv<GlobalOptionTypes>): Argv<T>;

  public abstract handler(args: ArgumentsCamelCase<T>): void | Promise<void>;

  protected static write(value: unknown) {
    console.log(`${value}`);
  }

  protected static writeJson(value: unknown) {
    console.log(JSON.stringify(value, null, 2));
  }
}
