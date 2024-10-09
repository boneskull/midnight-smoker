import {type WorkspaceInfo} from '#schema/workspace-info';
import stringify from 'json-stable-stringify';
import {type DirectoryJSON} from 'memfs';

export const monorepoStructure: DirectoryJSON = {
  '/package.json': stringify({
    name: 'monorepo',
    private: true,
    version: '1.0.0',
    workspaces: ['packages/*'],
  }),
  '/packages/package-a/index.js': 'console.log("Package A");',
  '/packages/package-a/package.json': stringify({
    main: 'index.js',
    name: 'package-a',
    version: '1.0.0',
  }),
  '/packages/package-b/index.js': 'console.log("Package B");',
  '/packages/package-b/package.json': stringify({
    main: 'index.js',
    name: 'package-b',
    version: '1.0.0',
  }),
  '/packages/package-c/index.js': 'console.log("Package C");',
  '/packages/package-c/package.json': stringify({
    main: 'index.js',
    name: 'package-c',
    version: '1.0.0',
  }),
};

export const monorepoWorkspaces: WorkspaceInfo[] = [
  {
    localPath: '/packages/package-c',
    pkgJson: {
      main: 'index.js',
      name: 'package-c',
      version: '1.0.0',
    },
    pkgJsonPath: '/packages/package-c/package.json',
    pkgName: 'package-c',
    private: false,
    rawPkgJson: stringify({
      main: 'index.js',
      name: 'package-c',
      version: '1.0.0',
    }),
  },
  {
    localPath: '/packages/package-b',
    pkgJson: {
      main: 'index.js',
      name: 'package-b',
      version: '1.0.0',
    },
    pkgJsonPath: '/packages/package-b/package.json',
    pkgName: 'package-b',
    private: false,
    rawPkgJson: stringify({
      main: 'index.js',
      name: 'package-b',
      version: '1.0.0',
    }),
  },
  {
    localPath: '/packages/package-a',
    pkgJson: {
      main: 'index.js',
      name: 'package-a',
      version: '1.0.0',
    },
    pkgJsonPath: '/packages/package-a/package.json',
    pkgName: 'package-a',
    private: false,
    rawPkgJson: stringify({
      main: 'index.js',
      name: 'package-a',
      version: '1.0.0',
    }),
  },
];
