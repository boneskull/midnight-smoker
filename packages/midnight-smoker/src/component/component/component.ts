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

import {z} from 'zod';

import {has, isFunction, isObject} from 'lodash';
import {InvalidArgError} from '../../error/common-error';
import {zNonEmptyString} from '../../util/schema-util';
import {ComponentId} from './component-id';
import {ComponentKinds, type ComponentKind} from './component-kind';

export {ComponentId, ComponentKinds, type ComponentKind};
export const kComponentId: unique symbol = Symbol('component-id');

/**
 * Property key within a {@link ComponentApi}
 */
const kId = 'id';

/**
 * Property key within a {@link ComponentApi}
 */
const kKind = 'kind';

/**
 * Property key within a {@link ComponentApi}
 */
const kIsBlessed = 'isBlessed';

/**
 * The properteries which {@link component} grafts onto a {@link Componentizable}
 * object, creating a {@link Component}.
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
const zOwner = z.object({id: zNonEmptyString});

export interface ComponentDef<T extends object> {
  name: string;
  value: Componentizable<T>;
  kind: ComponentKind;
  owner: Owner;
}

export const zComponentDef = z.object({
  name: zNonEmptyString,
  value: zComponentizable,
  kind: z.nativeEnum(ComponentKinds),
  owner: zOwner,
});

/**
 * Wraps an object in a {@link Component}, which provides {@link ComponentApi}
 *
 * @template T - Type to wrap; `object` is intentional, as this may be a
 *   function as well
 * @param componentDef - Component definition object
 * @returns The same object, but as a {@link Component}
 * @throws {@link InvalidArgError} - If `componentDef` is invalid
 */
export function component<T extends object>({
  name,
  value,
  kind,
  owner,
}: ComponentDef<T>): Component<T> {
  // toss the result; we don't want whatever zod did to it
  // const componentizableResult = zComponentizable.safeParse(value);
  // if (!componentizableResult.success) {
  //   throw new InvalidArgError(componentizableResult.error);
  // }

  const result = zComponentDef.safeParse({name, value, kind, owner});
  if (!result.success) {
    throw new InvalidArgError(result.error);
  }

  const id = ComponentId.create(owner.id, name);

  return new Proxy(value, {
    get(target, p, receiver) {
      // the switch seems to convince TS better than an object literal
      switch (p) {
        case kId:
          return id.id;
        case kComponentId:
          return id;
        case kIsBlessed:
          return id.isBlessed;
        case kKind:
          return kind;
        default:
          return Reflect.get(target, p, receiver);
      }
    },
  }) as Component<T>;
}

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
