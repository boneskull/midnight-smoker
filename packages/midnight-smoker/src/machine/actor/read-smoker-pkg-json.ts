import {type FileManager} from '#util/filemanager';
import {type PackageJson} from 'type-fest';
import {fromPromise} from 'xstate';

export interface ReadSmokerPkgJsonInput {
  fileManager: FileManager;
}

export const readSmokerPkgJson = fromPromise<
  PackageJson,
  ReadSmokerPkgJsonInput
>(async ({input: {fileManager}, signal}) => {
  return fileManager.readSmokerPkgJson({signal});
});
