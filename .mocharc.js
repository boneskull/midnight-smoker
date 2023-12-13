'use strict';

module.exports = {
  require: ['source-map-support/register', 'ts-node/register'],
  timeout: '2s',
  color: true,
  slow: '1s',
  'forbid-only': Boolean(process.env.CI),
};
