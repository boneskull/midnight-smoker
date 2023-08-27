#!/usr/bin/env ts-node

import path from 'node:path';
import {writeFileSync} from 'node:fs';
import {zodToJsonSchema} from 'zod-to-json-schema';
import {
  zTrue,
  zFalse,
  zStringOrArray,
  zNonEmptyStringArray,
} from '../src/schema-util';
import {zRawSmokerOptions} from '../src/options';
import {zCheckSeverity} from '../src/rules/severity';

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

writeFileSync(
  path.join(__dirname, '..', 'schema', 'midnight-smoker.schema.json'),
  JSON.stringify(jsonSchema, null, 2),
  'utf8',
);
