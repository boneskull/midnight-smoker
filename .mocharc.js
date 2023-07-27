'use strict';

module.exports = {
  require: 'ts-node/register',
  timeout: '2s',
  color: true,
  slow: '1s',
  'forbid-only': Boolean(process.env.CI),
};
