import {type FileManager} from '#util/filemanager';
import {type PackageJson} from 'type-fest';
import {fromPromise} from 'xstate';

export interface ReadSmokerPkgJsonLogicInput {
  fileManager: FileManager;
}

export const readSmokerPkgJsonLogic = fromPromise<
  PackageJson,
  ReadSmokerPkgJsonLogicInput
>(async ({input: {fileManager}, signal}) => {
  return fileManager.readSmokerPkgJson({signal});
});
