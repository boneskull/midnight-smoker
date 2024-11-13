/**
 * Provides some stage-3 decorators for class methods
 *
 * @packageDocumentation
 */
import memoize_ from 'nano-memoize';
import {once as once_} from 'remeda';

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
 * Per-instance memoization decorator
 *
 * @param resolver Function to return the cache key
 * @returns The decorator
 * @see {@link memoize_ memoize}
 */

export function memoize<
  TThis extends object,
  TArgs extends any[] = unknown[],
  TReturn = unknown,
>(resolver?: (this: TThis, ...args: TArgs) => any) {
  return function (
    target: (this: TThis, ...args: TArgs) => TReturn,
    context: ClassMethodDecoratorContext<
      TThis,
      (this: TThis, ...args: TArgs) => TReturn
    >,
  ) {
    context.addInitializer(function (this: TThis) {
      const func = context.access.get(this);
      // @ts-expect-error FIXME
      this[context.name] = memoize_(func, resolver);
    });
  };
}
