/**
 * A _Component_ is a thing that a plugin can provide. This may be a function or
 * a more complex object, depending on its purpose.
 *
 * The plugin can provide one or more of each {@link ComponentKind kind} of
 * Component.
 *
 * Each plugin has its own ID, and each Component has its own name. Then, each
 * Component has an ID derived from the plugin ID and Component name.
 *
 * Internal/"official" plugins are considered "blessed", and the ID of each
 * Component within a blessed plugin omits the plugin ID.
 *
 * A Component ultimately provides a way for `midnight-smoker` to control the ID
 * of each plugin without otherwise befouling a component's actual
 * implementation.
 *
 * Component IDs are _not necessarily unique_ within plugins (nor across
 * plugins), but they must be unique within a {@link ComponentKind} for a
 * plugin.
 *
 * @packageDocumentation
 * @todo Assert that we're probably enforcing uniqueness.
 */

import {ComponentKinds, type ComponentKind} from '#constants';
import {NonEmptyStringSchema} from '#util/schema-util';
import {has, isFunction, isObject} from 'lodash';
import {z} from 'zod';
import {type ComponentId} from './component-id';

export const kComponentId: unique symbol = Symbol('component-id');

/**
 * Property key within a {@link ComponentApi}
 */
export const kId = 'id';

/**
 * Property key within a {@link ComponentApi}
 */
export const kKind = 'kind';

/**
 * Property key within a {@link ComponentApi}
 */
export const kIsBlessed = 'isBlessed';

/**
 * The properteries which {@link createComponent} grafts onto a
 * {@link Componentizable} object, creating a {@link Component}.
 */
export interface ComponentApi {
  /**
   * The unique identifier for the component; {@link ComponentId.id}
   */
  readonly [kId]: string;

  /**
   * The raw {@link ComponentId} object
   */
  readonly [kComponentId]: ComponentId;

  /**
   * The result of {@link ComponentId.isBlessed}
   */
  readonly [kIsBlessed]: boolean;

  /**
   * The component kind
   */
  readonly [kKind]: ComponentKind;
}

/**
 * Schema for {@link Componentizable}.
 *
 * Zod wants to strip `symbol` props, so we use a custom validator.
 *
 * Functions are mainly allowed through verbatim because of conflicts with
 * `sinon`; it adds its own `id` prop to stubs.
 */
export const zComponentizable = z.custom<Componentizable<object>>(
  (value) =>
    isFunction(value) ||
    (isObject(value) &&
      !(
        has(value, kComponentId) ||
        has(value, kId) ||
        has(value, kIsBlessed) ||
        has(value, kKind)
      )),
);

/**
 * Checks whether or not the object can be shoehorned into a component. It
 * cannot have conflicting properties
 *
 * @todo Should we use `never` and the inverse of this conditional?
 */
export type Componentizable<T extends object> = T extends
  | {[kId]: any}
  | {[kIsBlessed]: any}
  | {[kComponentId]: any}
  | {[kKind]: any}
  ? never
  : T;

/**
 * Some object--ostensibly provided by a plugin--which now has the props from
 * {@link ComponentApi}.
 *
 * Do not confuse an arbitrary object with an `id` prop with a `Component`
 * (e.g., a {@link Owner}).
 *
 * @template T - The type of the component.
 * @todo Are we _sure_ we can't extend {@link Componentizable} instead of
 *   `object`?
 */
export type Component<T extends object> = T & ComponentApi;

/**
 * Schema for the _owner_ of a component, which is just something else with an
 * `id` property.
 *
 * This property is used by {@link ComponentId} to compute the unique ID.
 */
const zOwner = z.object({id: NonEmptyStringSchema});

export interface ComponentDef<T extends object> {
  name: string;
  value: Componentizable<T>;
  kind: ComponentKind;
  owner: Owner;
}

export const ComponentDefSchema = z.object({
  name: NonEmptyStringSchema,
  value: zComponentizable,
  kind: z.nativeEnum(ComponentKinds),
  owner: zOwner,
});

/**
 * An abstract "owner" of some object.
 *
 * In the case of a {@link Component}, the owner is a `PluginMetadata` object.
 *
 * @todo Evaluate if this is helpful elsewhere; if not, just refactor it to a
 *   branded string or something.
 *
 * @todo I don't think the type arg is needed here.
 */
export interface Owner<Id extends string = string> {
  id: Id;
}
