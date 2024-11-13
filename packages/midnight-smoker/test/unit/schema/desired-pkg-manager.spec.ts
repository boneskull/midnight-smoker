import {SYSTEM} from '#constants';
import {
  DesiredPkgManagerSchema,
  NameAndVersionSchema,
  PartialPkgManagerSpecFromDesiredSchema,
} from '#schema/desired-pkg-manager';
import unexpected from 'unexpected';

const expect = unexpected.clone();
describe('midnight-smoker', function () {
  describe('schema', function () {
    describe('desired-pkg-manager', function () {
      describe('DesiredPkgManagerSchema', function () {
        it('should validate SYSTEM constant', function () {
          const result = DesiredPkgManagerSchema.safeParse(SYSTEM);
          expect(result.success, 'to be true');
        });

        it('should validate a valid package manager name', function () {
          const result = DesiredPkgManagerSchema.safeParse('npm');
          expect(result.success, 'to be true');
        });

        it('should reject an invalid format', function () {
          const result = DesiredPkgManagerSchema.safeParse('npm@');
          expect(result.success, 'to be false');
        });
      });

      describe('NameAndVersionSchema', function () {
        it('should parse SYSTEM as name and requestedAs', function () {
          expect(NameAndVersionSchema.safeParse(SYSTEM), 'to satisfy', {
            data: {
              name: SYSTEM,
              requestedAs: SYSTEM,
            },
            success: true,
          });
        });

        it('should parse a name and version', function () {
          expect(NameAndVersionSchema.safeParse('npm@latest'), 'to satisfy', {
            data: {
              name: 'npm',
              requestedAs: 'npm@latest',
              version: 'latest',
            },
            success: true,
          });
        });

        it('should parse a name without version', function () {
          expect(NameAndVersionSchema.safeParse('yarn'), 'to satisfy', {
            data: {
              name: 'yarn',
              requestedAs: 'yarn',
            },
            success: true,
          });
        });
      });

      describe('PartialPkgManagerSpecFromDesiredSchema', function () {
        it('should handle SYSTEM correctly', function () {
          expect(
            PartialPkgManagerSpecFromDesiredSchema.safeParse(SYSTEM),
            'to satisfy',
            {
              data: {
                version: SYSTEM,
              },
              success: true,
            },
          );
        });

        it('should parse a full spec with version', function () {
          expect(
            PartialPkgManagerSpecFromDesiredSchema.safeParse('npm@latest'),
            'to satisfy',
            {
              data: {
                name: 'npm',
                requestedAs: 'npm@latest',
                version: 'latest',
              },
              success: true,
            },
          );
        });

        it('should default version for a name only spec', function () {
          expect(
            PartialPkgManagerSpecFromDesiredSchema.safeParse('yarn'),
            'to satisfy',
            {
              data: {
                name: 'yarn',
                requestedAs: 'yarn',
              },
              success: true,
            },
          );
        });
      });
    });
  });
});
