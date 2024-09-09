/**
 * Creates a frozen "constant" object.
 *
 * @param obj Some object
 * @returns Readonly object
 */
export function constant<const T extends object>(obj: T): Readonly<T> {
  return Object.freeze(obj);
}
