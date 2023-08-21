#!/usr/bin/env ts-node

import path from 'node:path';
import {writeFileSync} from 'node:fs';
import {zodToJsonSchema} from 'zod-to-json-schema';
import {SmokerConfigSchema} from '../src';

const jsonSchema = zodToJsonSchema(
  SmokerConfigSchema,
  'midnight-smoker-config',
);

writeFileSync(
  path.join(__dirname, '..', 'schema', 'midnight-smoker.schema.json'),
  JSON.stringify(jsonSchema, null, 2),
  'utf8',
);
