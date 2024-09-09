/**
 * Provides an {@link BaseCommand abstract command class} implementing
 * {@link CommandModule yargs' CommandModule} for use in the CLI.
 *
 * @packageDocumentation
 */

import stringify from 'json-stable-stringify';
import {type ArgumentsCamelCase, type Argv, type CommandModule} from 'yargs';

import {type GlobalOptionTypes} from './global-opts.js';

/**
 * A base class for implementing commands in the CLI.
 *
 * @template T - Command options which extend {@link GlobalOptionTypes}.
 */
export abstract class BaseCommand<
  T extends GlobalOptionTypes = GlobalOptionTypes,
> implements CommandModule<GlobalOptionTypes, T>
{
  /**
   * @see {@link CommandModule.aliases}
   */
  public aliases?: readonly string[] | string;

  /**
   * @see {@link CommandModule.deprecated}
   */
  public deprecated?: boolean | string = false;

  /**
   * Writes a value to the console.
   *
   * Implementors should never call `console.log` directly; use this instead.
   *
   * @param value - The value to write to the console
   */
  protected static write(value: unknown) {
    console.log(`${value}`);
  }

  /**
   * Writes a value to the console as JSON.
   *
   * Implementors should never call `console.log` directly; use this instead.
   *
   * @param value - The value to write to the console as JSON
   */
  protected static writeJson(value: unknown) {
    console.log(stringify(value, {space: 2}));
  }

  /**
   * @param argv Yargs instance
   * @see {@link CommandModule.builder}
   */
  public abstract builder(argv: Argv<GlobalOptionTypes>): Argv<T>;

  /**
   * @see {@link CommandModule.command}
   */
  public abstract command: readonly string[] | string;

  /**
   * @see {@link CommandModule.describe}
   */
  public abstract describe?: false | string;

  /**
   * @param args Yargs instance
   * @see {@link CommandModule.handler}
   */
  public abstract handler(args: ArgumentsCamelCase<T>): Promise<void> | void;
}
