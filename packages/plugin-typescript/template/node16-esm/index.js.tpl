import {foo} from '%MODULE%';

// @ts-expect-error
const baz = foo / 2;

/** @type {import('%MODULE%').FooString} */
const quux = 'cows';
