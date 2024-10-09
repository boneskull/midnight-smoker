const path = require('node:path');

module.exports = require('../../../.config/typedoc.workspace')(
  path.resolve(__dirname, '..'),
);
