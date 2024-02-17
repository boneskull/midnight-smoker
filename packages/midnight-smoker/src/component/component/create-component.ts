import {InvalidArgError} from '#error/invalid-arg-error';
import Debug from 'debug';
import {
  ComponentDefSchema,
  kComponentId,
  kId,
  kIsBlessed,
  kKind,
  type Component,
  type ComponentDef,
} from './component';
import {ComponentId} from './component-id';
export const debug = Debug('midnight-smoker:component:create-component');

/**
 * Wraps an object in a {@link Component}, which provides {@link ComponentApi}
 *
 * @template T - Type to wrap; `object` is intentional, as this may be a
 *   function as well
 * @param componentDef - Component definition object
 * @returns The same object, but as a {@link Component}
 * @throws {@link InvalidArgError} - If `componentDef` is invalid
 */

export function createComponent<T extends object>({
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
  const result = ComponentDefSchema.safeParse({name, value, kind, owner});
  if (!result.success) {
    throw new InvalidArgError(result.error);
  }

  const id = ComponentId.create(owner.id, name);

  debug('Created %s component with ID %s in plugin %s', kind, id.id, owner.id);
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
