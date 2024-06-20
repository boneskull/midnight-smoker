/**
 * Creates an enum-like, frozen "constant" object.
 *
 * @param obj Some enum/record-like object
 * @returns Readonly object
 */
export function constant<const T>(obj: T): Readonly<T> {
  return Object.freeze(obj);
}

/**
 * {@inheritDoc constant}
 */
export const createConstant = constant;
