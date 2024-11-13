import {type PackageJson} from '#schema/package-json';
import {type FileManager} from '#util/filemanager';
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
