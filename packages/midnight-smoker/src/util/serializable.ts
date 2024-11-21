/**
 * Typedefs for serializable values.
 *
 * @packageDocumentation
 */

import type {Jsonifiable} from 'type-fest';

/**
 * The serialized version of some {@link Serializable}.
 *
 * @template T - The type of the serialized value
 */

export type Serialized<T> = T extends Serializable<infer U> ? U : T;

/**
 * Some object with a `toJSON` method that returns a {@link Jsonifiable} value.
 *
 * `Serializable` can be thought of as a specific subset of {@link Jsonifiable}.
 */

export interface Serializable<T extends Jsonifiable = Jsonifiable> {
  toJSON(): T;
}
