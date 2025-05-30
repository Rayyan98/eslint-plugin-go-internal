const path = require('path');

/**
 * Resolves a relative import path to an absolute path
 * @param {string} importPath - The import path (relative)
 * @param {string} currentFilePath - The path of the file doing the import
 * @returns {string} - The resolved absolute path
 */
function resolveImportPath(importPath, currentFilePath) {
  const currentDir = path.dirname(currentFilePath);
  return path.resolve(currentDir, importPath);
}

/**
 * Simplified logic to check if an import is allowed based on Go-style internal boundaries
 * @param {string} importerPath - The path of the importing file
 * @param {string} importeePath - The path of the imported file
 * @returns {boolean} - True if the import is allowed, false otherwise
 */
function isImportAllowed(importerPath, importeePath) {
  // 1. Take the importee's full path
  const normalizedImporteePath = path.resolve(importeePath);
  
  // 2. Find the last 'internal' in the path
  const parts = normalizedImporteePath.split(path.sep);
  let lastInternalIndex = -1;
  
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i] === 'internal') {
      lastInternalIndex = i;
      break;
    }
  }
  
  // 3. If no 'internal' found, skip (allow the import)
  if (lastInternalIndex === -1) {
    return true;
  }
  
  // 4. If 'internal' found, take the path UP TO (not including) the 'internal' directory
  // This is the module root according to Go's semantics
  const moduleRootPath = parts.slice(0, lastInternalIndex).join(path.sep);
  
  // 5. Check if the importer's full path starts with that module root path
  const normalizedImporterPath = path.resolve(importerPath);
  
  // 6. If the importer is within the tree rooted at the module root, allow
  if (normalizedImporterPath.startsWith(moduleRootPath + path.sep) ||
      normalizedImporterPath === moduleRootPath) {
    return true;
  }
  
  // 7. Otherwise, block the import
  return false;
}

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
      
      // Resolve the import path to an absolute path
      const resolvedImportPath = resolveImportPath(importPath, currentFilePath);
      
      // Check if the import path contains 'internal'
      if (!resolvedImportPath.includes(path.sep + 'internal' + path.sep) &&
          !resolvedImportPath.endsWith(path.sep + 'internal')) {
        return;
      }
      
      // Use simplified logic to check if import is allowed
      if (!isImportAllowed(currentFilePath, resolvedImportPath)) {
        context.report({
          node,
          messageId: 'crossInternalImport',
        });
      }
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