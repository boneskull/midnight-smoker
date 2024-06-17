import {memoize as _memoize, once as _once} from 'lodash';

/**
 * Per-instance "once" decorator
 *
 * @param target Method
 * @param context Decorator context
 * @see {@link _once _.once}
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
    this[context.name] = _once(func);
  });
}

/**
 * Per-instance memoization decorator
 *
 * @param resolver Function to return the cache key
 * @returns The decorator
 * @see {@link _memoize _.memoize}
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
      this[context.name] = _memoize(func, resolver);
    });
  };
}
