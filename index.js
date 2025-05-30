const noCrossInternalImports = require('./rules/no-cross-internal-imports');

module.exports = {
  rules: {
    'no-cross-internal-imports': noCrossInternalImports,
  },
  configs: {
    recommended: {
      plugins: ['go-internal'],
      rules: {
        'go-internal/no-cross-internal-imports': 'error',
      },
    },
  },
};