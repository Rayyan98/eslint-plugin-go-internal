const { RuleTester } = require('eslint');
const rule = require('../rules/no-cross-internal-imports');
const path = require('path');

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2015,
    sourceType: 'module',
  },
});

// Helper to create test cases with proper file paths
function createTestCase(code, filename, errors = null) {
  const testCase = {
    code,
    filename: path.resolve(__dirname, filename),
  };
  
  if (errors) {
    testCase.errors = errors;
  }
  
  return testCase;
}

ruleTester.run('no-cross-internal-imports', rule, {
  valid: [
    // Valid: importing internal from within the same module
    createTestCase(
      "import { helper } from './internal/utils';",
      'mymodule/src/component.js'
    ),
    
    // Valid: importing internal from within the same module (deeper nesting)
    createTestCase(
      "import { config } from '../internal/config';",
      'mymodule/src/components/button.js'
    ),
    
    // Valid: importing internal from within the same module root
    createTestCase(
      "import { service } from './internal/service';",
      'mymodule/handlers/auth/controller.js'
    ),
    
    // Valid: non-internal imports are allowed
    createTestCase(
      "import { external } from './utils';",
      'mymodule/src/component.js'
    ),
    
    // Valid: non-relative imports are allowed
    createTestCase(
      "import { lodash } from 'lodash';",
      'mymodule/src/component.js'
    ),
    
    // Valid: require syntax within same module
    createTestCase(
      "const helper = require('./internal/utils');",
      'mymodule/src/component.js'
    ),
    
    // Valid: importing from internal within nested structure
    createTestCase(
      "import { db } from './internal/connection';",
      'mymodule/database/models.js'
    ),
    
    // Valid: importing between files within the same internal directory
    createTestCase(
      "import { CubeDetails } from './enums/cube-details';",
      'apps/reporting-bridge/src/modules/cubejs/internal/dtos/get-sales-by-day.dto.js'
    ),
    
    // Valid: importing from subdirectory within same internal directory
    createTestCase(
      "import { helper } from '../utils/helper';",
      'mymodule/internal/services/auth.js'
    ),
    
    // Valid: importing from sibling directory within same internal directory
    createTestCase(
      "import { config } from '../config/settings';",
      'mymodule/internal/handlers/user.js'
    ),
    
    // Valid: importing from deeper nested file within same internal directory
    createTestCase(
      "import { validator } from './validation/rules/user-rules';",
      'mymodule/internal/services/user-service.js'
    ),
    
    // Valid: submodule accessing parent module's internal (Go semantics)
    createTestCase(
      "import { shared } from '../../internal/shared';",
      'project/modules/auth/src/login.js'
    ),
    
    // Valid: nested submodule accessing parent module's internal (Go semantics)
    createTestCase(
      "import { shared } from '../../../internal/shared';",
      'mymodule/submodule/internal/handlers/auth.js'
    ),
  ],

  invalid: [
    // Invalid: importing internal from parent directory
    createTestCase(
      "import { service } from './auth/internal/service';",
      'mymodule/handlers/auth.js',
      [{ messageId: 'crossInternalImport' }]
    ),
    
    // Invalid: importing internal from sibling directory
    createTestCase(
      "import { db } from '../database/internal/connection';",
      'mymodule/services/user.js',
      [{ messageId: 'crossInternalImport' }]
    ),
    
    // Invalid: importing internal from outside module root
    createTestCase(
      "import { helper } from '../othermodule/internal/utils';",
      'mymodule/src/component.js',
      [{ messageId: 'crossInternalImport' }]
    ),
    
    // Invalid: importing internal from different module
    createTestCase(
      "import { config } from '../../auth/internal/config';",
      'web/components/button.js',
      [{ messageId: 'crossInternalImport' }]
    ),
    
    // Invalid: importing internal from sibling module
    createTestCase(
      "import { service } from '../payment/internal/service';",
      'shop/handlers/order.js',
      [{ messageId: 'crossInternalImport' }]
    ),
    
    // Invalid: require syntax from outside module
    createTestCase(
      "const helper = require('../othermodule/internal/utils');",
      'mymodule/src/component.js',
      [{ messageId: 'crossInternalImport' }]
    ),
    
    // Invalid: deeply nested cross-module internal import
    createTestCase(
      "import { validator } from '../../../core/validation/internal/rules';",
      'apps/web/src/components/form.js',
      [{ messageId: 'crossInternalImport' }]
    ),
    
    // Complex case: multiple internal folders in path
    createTestCase(
      "import { util } from '../other/internal/helpers/internal/util';",
      'mymodule/src/component.js',
      [{ messageId: 'crossInternalImport' }]
    ),
    
    // Invalid: importing from different internal directory (different modules)
    createTestCase(
      "import { service } from '../auth/internal/service';",
      'apps/reporting-bridge/src/modules/payment/internal/handlers/payment.js',
      [{ messageId: 'crossInternalImport' }]
    ),
    
    // Invalid: importing internal from outside when same-level internal exists
    createTestCase(
      "import { config } from '../other-module/internal/config';",
      'apps/web/internal/services/user.js',
      [{ messageId: 'crossInternalImport' }]
    ),
  ],
});

console.log('All tests passed!');