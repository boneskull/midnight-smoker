import {glob} from 'glob';
import {PackedPackage} from 'midnight-smoker';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import unexpected from 'unexpected';
import {Consumers, initConsumer, type Consumer} from '../src';
import {Fixture, compile, makePackedPackage} from './harness';

const expect = unexpected.clone();

const COMPAT_FIXTURES = [
  {
    name: 'cjs',
    desc: 'a CJS package',
    failureModes: {
      'node16-esm': false,
      'node16-cjs': false,
      'legacy-cjs': false,
      'legacy-esm': false,
    },
  },
  {
    name: 'esm',
    desc: 'an ESM package',
    failureModes: {
      'node16-esm': false,
      'node16-cjs': true,
      'legacy-cjs': false,
      'legacy-esm': false,
    },
  },
  {
    name: 'esm-no-types-export',
    desc: 'an ESM package with no "types" export',
    failureModes: {
      'node16-cjs': true,
      'node16-esm': /TS2694/,
      'legacy-cjs': false,
      'legacy-esm': false,
    },
  },
] as const satisfies ReadonlyArray<Fixture>;

/**
 * Test suite which asserts a consumer is compatible (or not) with a provider
 * fixture
 * @param consumer Consumer to use for testing
 * @param fixture The fixture is the provider
 * @param shouldFail If `true`, compilation should fail with `TS2307`, otherwise
 * it should not fail. If a `RegExp`, match a different error code
 */
function compatTest(
  consumer: Consumer,
  fixture: Fixture,
  shouldFail: boolean | RegExp = false,
) {
  describe(`when package under test is ${fixture.desc}`, function () {
    let packedPkg: PackedPackage;
    let tmpDir: string;

    before(async function () {
      tmpDir = await mkdtemp(
        path.join(tmpdir(), 'smokerplugin-ts-compat-test-'),
      );
      packedPkg = await makePackedPackage(fixture, tmpDir);

      await initConsumer(consumer, packedPkg, tmpDir);
    });

    after(async function () {
      if (tmpDir) {
        await rm(tmpDir, {force: true, recursive: true});
      }
    });

    if (shouldFail) {
      it('should be incompatible', async function () {
        this.timeout(5000);
        await expect(compile(tmpDir), 'to be rejected with error satisfying', {
          stdout: shouldFail === true ? /TS2307/ : shouldFail,
        });
      });
    } else {
      it('should be compatible', async function () {
        this.timeout(5000);
        await expect(compile(tmpDir), 'to be fulfilled with value satisfying', {
          exitCode: 0,
        });
      });
    }
  });
}

describe('plugin-typescript', function () {
  describe('consumer', function () {
    /**
     * This runs {@link compatTest} against the consumer/provider matrix
     */
    for (const [id, consumer] of Object.entries(Consumers)) {
      describe(`when the consumer is ${consumer.desc}`, function () {
        for (const fixture of COMPAT_FIXTURES) {
          compatTest(
            consumer,
            fixture,
            fixture.failureModes[id as keyof typeof Consumers],
          );
        }
      });
    }

    describe('scaffolding behavior', function () {
      let fixtureTmpDir: string | undefined;
      let packedPkg: PackedPackage;
      let postInitFiles: Set<string>;
      let preInitFiles: Set<string>;

      const consumer = Consumers['node16-cjs']; // doesn't matter which

      before(async function () {
        fixtureTmpDir = await mkdtemp(
          path.join(tmpdir(), 'smokerplugin-ts-compat-test-'),
        );
        packedPkg = await makePackedPackage(COMPAT_FIXTURES[0], fixtureTmpDir);

        preInitFiles = new Set(
          await glob(`${fixtureTmpDir}/**/*`, {
            cwd: fixtureTmpDir,
            absolute: false,
          }),
        );

        await initConsumer(consumer, packedPkg, fixtureTmpDir);

        postInitFiles = new Set(
          await glob(`${fixtureTmpDir}/**/*`, {
            cwd: fixtureTmpDir,
            absolute: false,
          }),
        );
      });

      after(async function () {
        if (fixtureTmpDir) {
          await rm(fixtureTmpDir, {force: true, recursive: true});
        }
      });

      it('should place expected files into work directory', async function () {
        const diff = new Set(
          [...postInitFiles].filter((x) => !preInitFiles.has(x)),
        );
        expect(diff, 'to have size', 3).and(
          'to contain',
          'tsconfig.json',
          'package.json',
          'index.js',
        );
      });

      describe('package.json', function () {
        it('should be unchanged', async function () {
          const [actual, expected] = (
            await Promise.all([
              readFile(path.join(fixtureTmpDir!, 'package.json'), 'utf-8'),
              readFile(
                path.join(consumer.baseDir, consumer.pkgJsonTpl),
                'utf-8',
              ),
            ])
          ).map((value) => JSON.parse(value));
          expect(actual, 'to equal', expected);
        });
      });

      describe('tsconfig.json', function () {
        it('should be unchanged', async function () {
          const [actual, expected] = (
            await Promise.all([
              readFile(path.join(fixtureTmpDir!, 'tsconfig.json'), 'utf-8'),
              readFile(
                path.join(consumer.baseDir, consumer.tsconfigTpl),
                'utf-8',
              ),
            ])
          ).map((value) => JSON.parse(value));
          expect(actual, 'to equal', expected);
        });
      });
    });
  });
});
