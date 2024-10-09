import {type PackError} from './pack-error';
import {type PackParseError} from './pack-parse-error';

export type SomePackError = PackError | PackParseError;
