/**
 * Lifted from {@link https://github.com/mcollina/hwp}, but:
 *
 * - I added types
 * - I added `find()` and `flatMap()`
 *
 * @module
 */

'use strict';

import {ok as assert} from '#util/assert';

type Func<T, TReturn> = (
  item: T,
  options: {signal: AbortSignal},
) => Promise<TReturn>;

async function* mapIterator<T, TReturn>(
  iterator: AsyncIterable<T>,
  func: Func<T, TReturn>,
  n = 16,
): AsyncIterable<TReturn> {
  // This works by creating two separate "processes" one that
  // reads from the source iterator and enqueues tasks into the
  // promises queue and another "process" that waits for tasks
  // in the queue to finish and yield them back to the caller.

  const promises: Promise<TReturn>[] = [];
  const ac = new AbortController();

  let next: (() => void) | undefined;
  let done = false;
  let error: Error | undefined;

  // pump reads from the source and invokes the transform
  // func so that the promises queue always has n number
  // of items.
  async function pump() {
    try {
      for await (const item of iterator) {
        if (done) {
          return;
        }

        let p: Promise<TReturn>;
        try {
          p = func(item, {signal: ac.signal});
        } catch (err) {
          p = Promise.reject(err);
        }

        promises.push(p);
        p.catch(() => {
          done = true;
        });

        if (next) {
          next();
          next = undefined;
        }

        if (!done && promises.length >= n) {
          await new Promise<void>((resolve) => {
            next = resolve;
          });
          assert(done || promises.length < n);
        }
      }
    } catch (err) {
      error = err as Error;
    } finally {
      done = true;
      if (next) {
        next();
        next = undefined;
      }
    }
  }

  void pump();

  try {
    // sequentially read and resolve each item in
    // the promise list
    while (true) {
      while (promises.length > 0) {
        yield await promises[0]!;
        void promises.shift();
        if (next) {
          next();
          next = undefined;
        }
      }

      if (error) {
        throw error;
      }

      if (done) {
        return;
      }

      await new Promise<void>((resolve) => {
        next = resolve;
      });
      assert(done || promises.length > 0);
    }
  } finally {
    ac.abort();

    done = true;
    if (next) {
      next();
      next = undefined;
    }
  }
}

async function map<T, TReturn>(
  iterator: AsyncIterable<T>,
  func: Func<T, TReturn>,
  n = 16,
): Promise<TReturn[]> {
  const iter = mapIterator(iterator, func, n);
  const results: Awaited<TReturn>[] = [];
  for await (const item of iter) {
    results.push(item);
  }
  return results;
}

async function flatMap<T, TReturn>(
  iterator: AsyncIterable<T>,
  func: Func<T, TReturn[]>,
  n = 16,
): Promise<TReturn[]> {
  const iter = mapIterator(iterator, func, n);
  const results: TReturn[][] = [];
  for await (const item of iter) {
    results.push(item);
  }
  return results.flat();
}

async function forEach<T, TReturn>(
  iterator: AsyncIterable<T>,
  func: Func<T, TReturn>,
  n = 16,
): Promise<void> {
  const iter = mapIterator(iterator, func, n);
  for await (const _ of iter) {
    // Do nothing.
  }
}

async function find<T, TReturn>(
  iterator: AsyncIterable<T>,
  func: Func<T, TReturn>,
  n = 16,
): Promise<TReturn | undefined> {
  const iter = mapIterator(iterator, func, n);
  for await (const value of iter) {
    if (value) {
      return value;
    }
  }
}

export {find, flatMap, forEach, map};
