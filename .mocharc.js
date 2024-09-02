'use strict';

/**
 * @type {import('mocha').MochaOptions}
 */
module.exports = {
  require: ['tsx'],
  timeout: '2s',
  color: true,
  slow: '1s',
  'forbid-only': Boolean(process.env.CI),
};
