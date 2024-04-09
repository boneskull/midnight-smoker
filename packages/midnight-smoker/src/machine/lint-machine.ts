import {
  RuleContext,
  type BaseNormalizedRuleOptions,
  type SomeRule,
} from '#rule';
import {type RunRulesManifest} from '#schema';
import {type FileManager} from '#util/filemanager';
import {type PackageJson} from 'type-fest';
import {assign, fromPromise, setup, type AnyActorRef} from 'xstate';

export interface LMInput {
  ruleConfig: BaseNormalizedRuleOptions;
  rule: SomeRule;

  lintManifests: RunRulesManifest;
  parentRef: AnyActorRef;

  fileManager: FileManager;
}

export interface LMContext extends LMInput {
  lintManifestWithPkgs: LintManifestWithPkg[];
  ruleContexts: Readonly<RuleContext>[];
}

export type ReadPkgJsonsInput = Pick<
  LMContext,
  'fileManager' | 'lintManifests'
>;

export interface LintManifestWithPkg {
  installPath: string;
  pkgName: string;
  pkgJson: PackageJson;
  pkgJsonPath: string;
}

export const LintMachine = setup({
  types: {
    input: {} as LMInput,
    context: {} as LMContext,
  },
  actors: {
    readPkgJsons: fromPromise<LintManifestWithPkg[], ReadPkgJsonsInput>(
      async ({input: {fileManager, lintManifests}}) => {
        return Promise.all(
          lintManifests.map(async ({installPath, pkgName}) => {
            const {packageJson: pkgJson, path: pkgJsonPath} =
              await fileManager.findPkgUp(installPath, {strict: true});
            return {installPath, pkgName, pkgJson, pkgJsonPath};
          }),
        );
      },
    ),
  },
}).createMachine({
  context: ({input}) => ({
    ...input,
    ruleContexts: [],
    lintManifestWithPkgs: [],
  }),
  initial: 'setup',
  states: {
    setup: {
      initial: 'readPackages',
      states: {
        readPackages: {
          invoke: {
            src: 'readPkgJsons',
            input: ({
              context: {fileManager, lintManifests},
            }): ReadPkgJsonsInput => ({
              fileManager,
              lintManifests,
            }),
            onDone: {
              actions: assign({
                lintManifestWithPkgs: ({
                  event: {output},
                }): LintManifestWithPkg[] => output,
              }),
              target: 'createRuleContexts',
            },
          },
        },
        createRuleContexts: {
          type: 'final',
          entry: [
            assign({
              ruleContexts: ({
                context: {
                  rule,
                  ruleConfig: {severity},
                  lintManifestWithPkgs,
                },
              }): Readonly<RuleContext>[] =>
                lintManifestWithPkgs.map(
                  ({installPath, pkgJson, pkgJsonPath}) =>
                    RuleContext.create(rule, {
                      severity,
                      installPath,
                      pkgJson,
                      pkgJsonPath,
                    }),
                ),
            }),
          ],
        },
      },
      onDone: {
        target: 'lint',
      },
    },
    lint: {},
  },
});
