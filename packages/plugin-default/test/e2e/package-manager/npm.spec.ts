import path from 'node:path';
import unexpected from 'unexpected';
import {createBehaviorTest, createCommandTest} from '../e2e-helpers';

export const expect = unexpected.clone();

describe('@midnight-smoker/plugin-default', function () {
  describe('package manager behavior', function () {
    describe('npm', function () {
      const testHappyPath = createCommandTest(
        path.join(__dirname, 'fixture', 'single-script'),
      );

      const happyMatrix = [
        ['npm@7', /npm@7\.\d+\.\d+/],
        ['npm@7.24.0'],
        ['npm@latest-7', /npm@7\.\d+\.\d+/],
        ['npm@^7.0.0', /npm@7\.\d+\.\d+/],
        ['npm@8', /npm@8\.\d+\.\d+/],
        ['npm@8.10.0'],
        ['npm@^8.0.0', /npm@8\.\d+\.\d+/],
        ['npm@9', /npm@9\.\d+\.\d+/],
        ['npm@9.8.1'],
        ['npm@^9.0.0', /npm@9\.\d+\.\d+/],
        ['npm@next-10', /npm@10\.\d+\.\d+/],
      ] as const;

      for (const [requested, actual] of happyMatrix) {
        testHappyPath(requested, actual);
      }

      describe('behavior', function () {
        const looseMatrix = ['npm@7', 'npm@9'] as const;

        const testLoose = createBehaviorTest(
          path.join(__dirname, 'fixture', 'loose'),
          ['--all', '--loose'],
        );

        describe('--loose', function () {
          for (const requested of looseMatrix) {
            testLoose(
              requested,
              expect.it('to have an item satisfying', {skipped: true}),
            );
          }
        });
      });
    });
  });
});
