import {type PackError} from './pack-error.js';
import {type PackParseError} from './pack-parse-error.js';

export type SomePackError = PackError | PackParseError;
