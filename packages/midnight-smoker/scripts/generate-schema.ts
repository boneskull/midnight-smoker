#!/usr/bin/env ts-node

/**
 * Script to generate/update the JSON schema for `SmokerOptions`
 *
 * **This overwrites `../schema/midnight-smoker.schema.json`**
 *
 * Uses {@link https://npm.im/zod-to-json-schema zod-to-json-schema} and
 * {@link https://npm.im/prettier prettier}.
 *
 * @packageDocumentation
 */

import {OptionParser} from '#options/parser';
import {BLESSED_PLUGINS} from '#plugin/blessed';
import {PluginRegistry} from '#plugin/plugin-registry';
import {RuleSeveritySchema} from '#schema/rule-severity';
import {
  DefaultFalseSchema,
  DefaultTrueSchema,
  NonEmptyStringToArraySchema,
} from '#util/schema-util';
import {writeFile} from 'node:fs/promises';
import {normalize} from 'node:path';
import prettier from 'prettier';
import {zodToJsonSchema} from 'zod-to-json-schema';

const DEST = normalize(`${__dirname}/../schema/midnight-smoker.schema.json`);

async function main() {
  const registry = PluginRegistry.create();
  await registry.registerPlugins(BLESSED_PLUGINS);
  const SmokerOptsSchema = OptionParser.buildSmokerOptionsSchema(registry);

  const jsonSchema = zodToJsonSchema(SmokerOptsSchema, {
    definitions: {
      defaultTrue: DefaultTrueSchema,
      defaultFalse: DefaultFalseSchema,
      arrayOfNonEmptyStrings: NonEmptyStringToArraySchema,
      severity: RuleSeveritySchema,
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
