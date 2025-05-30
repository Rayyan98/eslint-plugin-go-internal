# eslint-plugin-internal

An ESLint plugin that enforces Go-style internal/ import boundaries to maintain clean module architecture.

## Overview

This plugin implements the Go programming language's "internal" package convention for JavaScript/TypeScript projects. It prevents modules from importing from other modules' `internal/` directories, ensuring that internal implementation details remain private to their containing module.

## Installation

```bash
npm install --save-dev eslint-plugin-internal
```

## Usage

Add `internal` to the plugins section of your `.eslintrc` configuration file:

```json
{
  "plugins": ["internal"]
}
```

Then configure the rule under the rules section:

```json
{
  "rules": {
    "internal/no-cross-internal-imports": "error"
  }
}
```

Or use the recommended configuration:

```json
{
  "extends": ["plugin:internal/recommended"]
}
```

## How It Works

The rule follows this algorithm:

1. **Only checks relative imports** starting with `.` (not npm packages)
2. **Finds the last 'internal' folder** in the import path
3. **Determines the module root** (parent directory of the internal/ folder)
4. **Checks if the importing file** is within the same module root
5. **Reports an error** if the importer is outside the module root

### Example Project Structure

```
project/
├── auth/
│   ├── handlers/
│   │   └── login.js          ✅ Can import from auth/internal/
│   ├── internal/
│   │   ├── crypto.js
│   │   └── session.js
│   └── middleware.js         ✅ Can import from auth/internal/
├── payment/
│   ├── handlers/
│   │   └── checkout.js       ❌ Cannot import from auth/internal/
│   ├── internal/
│   │   └── stripe.js
│   └── processor.js          ❌ Cannot import from auth/internal/
└── shared/
    ├── utils.js              ❌ Cannot import from auth/internal/
    └── constants.js          ❌ Cannot import from payment/internal/
```

## Valid Examples

```javascript
// ✅ auth/handlers/login.js
import { encrypt } from '../internal/crypto';
import { createSession } from '../internal/session';

// ✅ auth/middleware.js  
import { validateToken } from './internal/crypto';

// ✅ payment/processor.js
import { formatAmount } from './internal/stripe';

// ✅ Non-internal imports are always allowed
import { helper } from '../shared/utils';
import { lodash } from 'lodash';
```

## Invalid Examples

```javascript
// ❌ payment/handlers/checkout.js
import { encrypt } from '../../auth/internal/crypto';
//                     ^^^^^^^^^^^^^^^^^^^^^^^^^^
// Error: Do not import internal modules from outside their module root.

// ❌ shared/utils.js
import { stripe } from '../payment/internal/stripe';
//                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Error: Do not import internal modules from outside their module root.

// ❌ auth/handlers/login.js
const validator = require('../../payment/internal/validator');
//                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Error: Do not import internal modules from outside their module root.
```

## Complex Scenarios

### Nested Internal Directories

```
project/
├── core/
│   ├── database/
│   │   ├── internal/
│   │   │   └── connection.js
│   │   └── models.js         ✅ Can import from database/internal/
│   └── auth/
│       └── service.js        ❌ Cannot import from database/internal/
```

### Multiple Internal Folders

If a path contains multiple `internal` folders, the rule uses the **last** occurrence:

```javascript
// mymodule/src/component.js
import { util } from '../other/helpers/internal/shared/internal/util';
//                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// The internal root is: ../other/helpers/internal/shared/
// Rule checks if mymodule/ is within that root (it's not, so this fails)
```

## Supported File Types

The rule works with:
- JavaScript files (`.js`, `.jsx`)
- TypeScript files (`.ts`, `.tsx`)
- Both ES6 imports and CommonJS require statements

## Rule Configuration

This rule has no configuration options. It's designed to work out of the box with the Go-style internal convention.

## Benefits

1. **Enforces encapsulation** - Internal modules stay internal
2. **Prevents tight coupling** - Modules can't depend on other modules' internals
3. **Improves maintainability** - Clear boundaries between public and private APIs
4. **Enables safe refactoring** - Internal changes won't break external modules
5. **Promotes good architecture** - Encourages well-defined module interfaces

## Contributing

Issues and pull requests are welcome! Please make sure to run the tests:

```bash
npm test
```

## License

MIT