'use strict';

module.exports = {
  timeout: '2s',
  slow: '1s',
  'forbid-only': Boolean(process.env.CI)
};
