import {SKIPPED} from 'midnight-smoker';
import path from 'node:path';
import unexpected from 'unexpected';

import {createBehaviorTest, createPkgManagerTest} from '../e2e-helpers';

const expect = unexpected.clone();

describe('@midnight-smoker/plugin-default', function () {
  describe('package manager behavior', function () {
    describe('yarn', function () {
      const testHappyPath = createPkgManagerTest(
        path.join(__dirname, 'fixture', 'single-script'),
      );

      const happyMatrix = [
        ['yarn@1', /yarn@1\.\d+\.\d+/],
        ['yarn@1.22.19'],
        ['yarn@latest', /yarn@1\.\d+\.\d+/],
        ['yarn@legacy', /yarn@1\.21\.1/],
        ['yarn@^1.0.0', /yarn@1\.\d+\.\d+/],
        ['yarn@2', /yarn@2\.\d+\.\d+/],
        ['yarn@berry', /yarn@2\.\d+\.\d+/],
        ['yarn@3', /yarn@3\.\d+\.\d+/],
      ] as const;

      for (const [requested, actual] of happyMatrix) {
        testHappyPath(requested, actual);
      }

      describe('behavior', function () {
        const looseMatrix = ['yarn@1', 'yarn@2', 'yarn@3'] as const;

        const testLoose = createBehaviorTest(
          path.join(__dirname, 'fixture', 'loose'),
          ['--all', '--loose'],
        );

        describe('--loose', function () {
          for (const requested of looseMatrix) {
            testLoose(
              requested,
              expect.it('to have an item satisfying', {type: SKIPPED}),
            );
          }
        });
      });
    });
  });
});
