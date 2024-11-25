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
    pkgJsonSource: stringify({
      main: 'index.js',
      name: 'package-c',
      version: '1.0.0',
    }),
    pkgName: 'package-c',
    private: false,
  },
  {
    localPath: '/packages/package-b',
    pkgJson: {
      main: 'index.js',
      name: 'package-b',
      version: '1.0.0',
    },
    pkgJsonPath: '/packages/package-b/package.json',
    pkgJsonSource: stringify({
      main: 'index.js',
      name: 'package-b',
      version: '1.0.0',
    }),
    pkgName: 'package-b',
    private: false,
  },
  {
    localPath: '/packages/package-a',
    pkgJson: {
      main: 'index.js',
      name: 'package-a',
      version: '1.0.0',
    },
    pkgJsonPath: '/packages/package-a/package.json',
    pkgJsonSource: stringify({
      main: 'index.js',
      name: 'package-a',
      version: '1.0.0',
    }),
    pkgName: 'package-a',
    private: false,
  },
];
