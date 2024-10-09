import {ERROR, OK} from '#constants';
import {
  type ActorOutput,
  type ActorOutputError,
  type ActorOutputOk,
} from '#machine/util';
import {equal} from '#util/assert';

/**
 * Asserts that the actor output is not ok and throws an error if it is.
 *
 * @template Ok - The type of the successful actor output.
 * @template Err - The type of the error in the actor output.
 * @param output - The actor output to be checked.
 * @throws AssertionError - If the actor output is ok.
 */
export function assertActorOutputNotOk<
  Ok extends object = object,
  Err extends Error = Error,
>(output: ActorOutput<Ok, Err>): asserts output is ActorOutputError<Err> {
  equal(
    output.type,
    ERROR,
    'Expected prop `type` to be "ERROR" in actor output',
  );
}

/**
 * Asserts that the actor output is of type `MachineOutputOk`. If the output is
 * not of type `MachineOutputOk`, an `AssertionError` is thrown.
 *
 * @template Ok - The type of the successful actor output.
 * @template Err - The type of the error in the actor output.
 * @param output - The actor output to be asserted.
 * @throws AssertionError if the output is not of type `MachineOutputOk`.
 */
export function assertActorOutputOk<
  Ok extends object = object,
  Err extends Error = Error,
>(output: ActorOutput<Ok, Err>): asserts output is ActorOutputOk<Ok> {
  equal(output.type, OK, 'Expected prop `type` to be "OK" in actor output');
}
