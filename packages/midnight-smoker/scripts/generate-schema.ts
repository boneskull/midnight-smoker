#!/usr/bin/env ts-node
/* eslint-disable n/shebang */

/**
 * Script to generate/update the JSON schema for `SmokerOptions`
 *
 * Uses {@link https://npm.im/zod-to-json-schema zod-to-json-schema} and
 * {@link https://npm.im/prettier prettier}.
 *
 * @packageDocumentation
 */

import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import prettier from 'prettier';
import {zodToJsonSchema} from 'zod-to-json-schema';
import {zRuleSeverity} from '../src/component/rule/severity';
import {OptionParser} from '../src/options';
import {BLESSED_PLUGINS} from '../src/plugin/blessed';
import {PluginRegistry} from '../src/plugin/registry';
import {
  zDefaultFalse,
  zDefaultTrue,
  zNonEmptyStringOrArrayThereof,
} from '../src/schema-util';

const DEST = path.join(
  __dirname,
  '..',
  'schema',
  'midnight-smoker.schema.json',
);

async function main() {
  const registry = PluginRegistry.create();
  await registry.loadPlugins(BLESSED_PLUGINS);
  const zSmokerOptions = OptionParser.buildSmokerOptions(registry);

  const jsonSchema = zodToJsonSchema(zSmokerOptions, {
    definitions: {
      defaultTrue: zDefaultTrue,
      defaultFalse: zDefaultFalse,
      arrayOfNonEmptyStrings: zNonEmptyStringOrArrayThereof,
      severity: zRuleSeverity,
    },
    definitionPath: '$defs',
  });

  const prettierCfg = await prettier.resolveConfig(DEST);
  if (!prettierCfg) {
    throw new Error(`Could not resolve prettier config for ${DEST}`);
  }
  const json = JSON.stringify(jsonSchema, null, 2);
  const prettyJson = await prettier.format(json, {
    ...prettierCfg,
    filepath: DEST,
  });
  await writeFile(DEST, prettyJson, 'utf8');

  console.debug(`Generated options schema at ${DEST}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
