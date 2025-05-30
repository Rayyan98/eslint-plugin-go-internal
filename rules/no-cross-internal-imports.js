const path = require('path');

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce Go-style internal/ import boundaries',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [],
    messages: {
      crossInternalImport: 'Do not import internal modules from outside their module root.',
    },
  },

  create(context) {
    function checkImport(importPath, currentFilePath, node) {
      // Only check relative imports starting with '.'
      if (!importPath.startsWith('.')) {
        return;
      }
      
      // 1. Take the importee's full path
      const importeePath = path.resolve(path.dirname(currentFilePath), importPath);
      
      // 2. Find the last 'internal' in the path
      const parts = importeePath.split(path.sep);
      let lastInternalIndex = -1;
      
      for (let i = parts.length - 1; i >= 0; i--) {
        if (parts[i] === 'internal') {
          lastInternalIndex = i;
          break;
        }
      }
      
      // 3. If there is none, then skip (allow the import)
      if (lastInternalIndex === -1) {
        return;
      }
      
      // 4. Otherwise, take the full path up until the last 'internal' (excluding 'internal' itself)
      const moduleRootPath = parts.slice(0, lastInternalIndex).join(path.sep);
      
      // 5. Check if the importer's full path starts with that path or not
      const importerPath = path.resolve(currentFilePath);
      
      // 6. If yes, allow; if no, block
      if (importerPath.startsWith(moduleRootPath + path.sep)) {
        return; // Allow
      }
      
      // Block the import
      context.report({
        node,
        messageId: 'crossInternalImport',
      });
    }

    return {
      ImportDeclaration(node) {
        const importPath = node.source.value;
        const currentFilePath = context.getFilename();
        checkImport(importPath, currentFilePath, node.source);
      },

      CallExpression(node) {
        // Handle require() calls
        if (
          node.callee.name === 'require' &&
          node.arguments.length === 1 &&
          node.arguments[0].type === 'Literal'
        ) {
          const importPath = node.arguments[0].value;
          const currentFilePath = context.getFilename();
          checkImport(importPath, currentFilePath, node.arguments[0]);
        }
      },
    };
  },
};