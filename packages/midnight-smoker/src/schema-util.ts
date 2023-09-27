import {z} from 'zod';
import {castArray} from './util';

export const zString = z.string().min(1).trim();
export const zFalse = z.boolean().default(false);

export const zTrue = z.boolean().default(true);
export const zStringOrArray = z
  .union([zString, z.array(zString)])
  .default([])
  .transform(castArray);

/**
 * Schema representing an array of non-empty strings.
 *
 * _**Not** a non-empty array of strings_.
 */
export const zNonEmptyStringArray = z.array(zString).default([]);
