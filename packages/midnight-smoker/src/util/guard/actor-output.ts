import {ERROR, OK} from '#constants';
import {
  type ActorOutput,
  type ActorOutputError,
  type ActorOutputOk,
} from '#machine/util';

/**
 * Checks if the provided `output` is of type `MachineOutputOk`.
 *
 * @template Ok - The type of the successful actor output.
 * @template Err - The type of the error in the actor output.
 * @param output - The output to check.
 * @returns `true` if the `output` is of type `MachineOutputOk`, `false`
 *   otherwise.
 */

export function isActorOutputOk<
  Ok extends object = object,
  Err extends Error = Error,
>(output: ActorOutput<Ok, Err>): output is ActorOutputOk<Ok> {
  return output.type === OK;
}

/**
 * Checks if the given actor output is an error.
 *
 * @template Ok - The type of the successful actor output.
 * @template Err - The type of the error in the actor output.
 * @param output - The actor output to check.
 * @returns `true` if the output is an error, `false` otherwise.
 */
export function isActorOutputNotOk<
  Ok extends object = object,
  Err extends Error = Error,
>(output: ActorOutput<Ok, Err>): output is ActorOutputError<Err> {
  return output.type === ERROR;
}
