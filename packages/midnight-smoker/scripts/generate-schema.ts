#!/usr/bin/env ts-node

/**
 * Script to generate/update the JSON schema for `SmokerOptions`
 * @module
 */

import {writeFileSync} from 'node:fs';
import path from 'node:path';
import {zodToJsonSchema} from 'zod-to-json-schema';
import {zRawSmokerOptions} from '../src/options';
import {zCheckSeverity} from '../src/rules/severity';
import {
  zFalse,
  zNonEmptyStringArray,
  zStringOrArray,
  zTrue,
} from '../src/schema-util';

const DEST = path.join(
  __dirname,
  '..',
  'schema',
  'midnight-smoker.schema.json',
);

const jsonSchema = zodToJsonSchema(zRawSmokerOptions, {
  definitions: {
    defaultTrue: zTrue,
    defaultFalse: zFalse,
    stringOrStringArray: zStringOrArray,
    arrayOfNonEmptyStrings: zNonEmptyStringArray,
    severity: zCheckSeverity,
  },
  definitionPath: '$defs',
});

writeFileSync(DEST, JSON.stringify(jsonSchema, null, 2), 'utf8');

console.error(`Generated options schema at ${DEST}`);
