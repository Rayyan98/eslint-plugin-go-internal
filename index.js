const noCrossInternalImports = require('./rules/no-cross-internal-imports');

module.exports = {
  rules: {
    'no-cross-internal-imports': noCrossInternalImports,
  },
  configs: {
    recommended: {
      plugins: ['internal'],
      rules: {
        'internal/no-cross-internal-imports': 'error',
      },
    },
  },
};