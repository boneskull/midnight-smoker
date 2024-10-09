import {ErrnoExceptionSchema} from '#schema/errno-exception';

/**
 * Type guard for {@link NodeJS.ErrnoException}
 *
 * @param value - Any value
 * @returns `true` if `value` is an {@link NodeJS.ErrnoException}
 */

export function isErrnoException(
  value: unknown,
): value is NodeJS.ErrnoException {
  return ErrnoExceptionSchema.safeParse(value).success;
}
