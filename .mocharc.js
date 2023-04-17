'use strict';

module.exports = {
  timeout: '2s',
  color: true,
  slow: '1s',
  require: 'ts-node/register',
  'forbid-only': Boolean(process.env.CI)
};
