const path = require('path');

module.exports = {
  resolve: {
    extensions: ['.ts', '.js'],
    extensionAlias: {
      '.js': ['.js', '.ts'],
    },
    alias: {
      '@app/common': path.resolve(__dirname, '../../libs/common/src'),
    },
  },
};