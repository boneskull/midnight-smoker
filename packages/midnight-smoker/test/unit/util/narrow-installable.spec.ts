import {type NormalizedPackageJson} from '#schema/package-json';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {narrowInstallables} from '#util/narrow-installables';
import unexpected from 'unexpected';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('util', function () {
    describe('narrow-installables', function () {
      describe('narrowInstallables', function () {
        const pkgJson: NormalizedPackageJson = {
          dependencies: {},
          devDependencies: {
            'example-package': '1.0.0',
          },
          name: '',
          optionalDependencies: {},
          peerDependencies: {},
          version: '',
        };
        const workspaceInfo: WorkspaceInfo[] = [
          {
            localPath: '',
            pkgJson,
            pkgJsonPath: '',
            pkgName: '',
          },
        ];

        it('should return valid package with spec as-is', function () {
          const requestedInstallables = ['example-package@^1.0.0'];
          const result = narrowInstallables(
            requestedInstallables,
            workspaceInfo,
          );
          expect(result, 'to equal', ['example-package@^1.0.0']);
        });

        it('should narrow package without spec to include version found in package.json', function () {
          const requestedInstallables = ['example-package'];
          const result = narrowInstallables(
            requestedInstallables,
            workspaceInfo,
          );
          expect(result, 'to equal', ['example-package@1.0.0']);
        });

        it('should default to @latest for package without spec and not found in package.json', function () {
          const requestedInstallables = ['unknown-package'];
          const result = narrowInstallables(
            requestedInstallables,
            workspaceInfo,
          );
          expect(result, 'to equal', ['unknown-package@latest']);
        });

        it('should return non-package-spec installabels as-is', function () {
          const requestedInstallables = [
            '../local/path',
            'git+https://github.com/user/repo.git',
          ];
          const result = narrowInstallables(
            requestedInstallables,
            workspaceInfo,
          );
          expect(result, 'to equal', [
            '../local/path',
            'git+https://github.com/user/repo.git',
          ]);
        });
      });
    });
  });
});
