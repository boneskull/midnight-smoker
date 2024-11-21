/**
 * Provides some stage-3 decorators for class methods
 *
 * @packageDocumentation
 */
import {memoize as memoize_} from '#util/memoize';
import {once as once_} from 'remeda';
import {type Jsonifiable} from 'type-fest';

/**
 * Per-instance "once" decorator
 *
 * @param target Method
 * @param context Decorator context
 * @see {@link once_ once}
 */
export function once<TThis, TArgs extends any[], TReturn>(
  target: (this: TThis, ...args: TArgs) => TReturn,
  context: ClassMethodDecoratorContext<
    TThis,
    (this: TThis, ...args: TArgs) => TReturn
  >,
) {
  context.addInitializer(function (this: TThis) {
    const func = context.access.get(this);
    // @ts-expect-error FIXME
    this[context.name] = once_(func);
  });
}

/**
 * **Per-instance** memoization decorator
 *
 * @param normalizer Function to return the cache key. Must be
 *   {@link Jsonifiable}.
 * @returns The decorator
 * @see {@link memoize_ memoize}
 */

export const memoize =
  <TThis extends object, TArgs extends any[] = unknown[], TReturn = unknown>(
    normalizer?: (...args: TArgs) => Jsonifiable,
  ) =>
  (
    target: (this: TThis, ...args: TArgs) => TReturn,
    context: ClassMethodDecoratorContext<
      TThis,
      (this: TThis, ...args: TArgs) => TReturn
    >,
  ): void => {
    context.addInitializer(function (this: TThis) {
      const func = context.access.get(this);
      if (normalizer) {
        // @ts-expect-error FIXME
        this[context.name] = memoize_(func, {
          normalizer: (args) => {
            const value = normalizer(...args);
            return JSON.stringify(value);
          },
        });
      } else {
        // @ts-expect-error FIXME
        this[context.name] = memoize_(func);
      }
    });
  };
