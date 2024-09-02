import type {SmokerError} from '#error/smoker-error';
import type {Class} from 'type-fest';

export type SomeSmokerError = SmokerError<any, any>;

/**
 * A class or abstract class implementing `SmokerError`.
 */

export type SomeSmokerErrorClass = Class<SomeSmokerError>;
