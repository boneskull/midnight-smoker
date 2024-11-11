import {PackParseError} from '#error/pack-parse-error';
import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {type WorkspaceInfo} from '#schema/workspace-info';
import unexpected from 'unexpected';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('error', function () {
    describe('pack-parse-error', function () {
      describe('PackParseError', function () {
        let error: PackParseError;
        const message = 'Test message';
        const pkgManager: StaticPkgManagerSpec = {
          bin: 'npm',
          label: 'npm',
          version: '7.0.0',
        } as any;
        const workspace: WorkspaceInfo = {
          location: '/path/to/workspace',
          name: 'workspace',
        } as any;
        const syntaxError = new SyntaxError('Syntax error');
        const output = 'Error output';

        describe('constructor', function () {
          it('should set the message, context, and cause properties correctly', function () {
            error = new PackParseError(
              message,
              pkgManager,
              workspace,
              syntaxError,
              output,
            );
            expect(error, 'to satisfy', {
              cause: syntaxError,
              context: {
                output,
                pkgManager: pkgManager.label,
                workspace,
              },
              message,
            });
          });

          describe('when pkgManager is a string', function () {
            it('should set the pkgManager context property to the string value', function () {
              error = new PackParseError(
                message,
                'yarn',
                workspace,
                syntaxError,
                output,
              );
              expect(error.context.pkgManager, 'to equal', 'yarn');
            });
          });
        });
      });
    });
  });
});
