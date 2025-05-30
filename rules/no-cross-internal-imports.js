const path = require('path');

/**
 * Checks if a path is a subpath of another path
 * @param {string} childPath - The potential child path
 * @param {string} parentPath - The potential parent path
 * @returns {boolean} - True if childPath is within parentPath
 */
function isSubPath(childPath, parentPath) {
  // Normalize paths
  const normalizedChild = path.resolve(childPath);
  const normalizedParent = path.resolve(parentPath);
  
  // If they're the same, child is at the parent level (allowed)
  if (normalizedChild === normalizedParent) {
    return true;
  }
  
  const relative = path.relative(normalizedParent, normalizedChild);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

/**
 * Finds the module root for an internal import
 * The module root is the immediate parent of the internal/ folder
 * @param {string} importPath - The import path containing internal
 * @returns {string|null} - The module root path or null if no internal found
 */
function findInternalRoot(importPath) {
  // Normalize the path first
  const normalizedPath = path.resolve(importPath);
  const parts = normalizedPath.split(path.sep);
  let lastInternalIndex = -1;
  
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i] === 'internal') {
      lastInternalIndex = i;
      break;
    }
  }
  
  if (lastInternalIndex === -1) {
    return null;
  }
  
  // Return the immediate parent of the internal folder
  const internalRoot = parts.slice(0, lastInternalIndex).join(path.sep);
  return internalRoot || path.sep; // Handle root case
}

/**
 * Finds the internal directory path for a given file path
 * @param {string} filePath - The file path to check
 * @returns {string|null} - The internal directory path or null if not within internal
 */
function findInternalDirectory(filePath) {
  const normalizedPath = path.resolve(filePath);
  const parts = normalizedPath.split(path.sep);
  let lastInternalIndex = -1;
  
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i] === 'internal') {
      lastInternalIndex = i;
      break;
    }
  }
  
  if (lastInternalIndex === -1) {
    return null;
  }
  
  // Return the internal directory path (including internal/)
  return parts.slice(0, lastInternalIndex + 1).join(path.sep);
}

/**
 * Checks if both files are within the same internal directory
 * @param {string} importerPath - The path of the importing file
 * @param {string} importeePath - The path of the imported file
 * @returns {boolean} - True if both files are in the same internal directory
 */
function areInSameInternalDirectory(importerPath, importeePath) {
  const importerInternalDir = findInternalDirectory(importerPath);
  const importeeInternalDir = findInternalDirectory(importeePath);
  
  if (!importerInternalDir || !importeeInternalDir) {
    return false;
  }
  
  // Both files must be within the exact same internal directory path
  return importerInternalDir === importeeInternalDir;
}

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
    return {
      ImportDeclaration(node) {
        const importPath = node.source.value;
        const currentFilePath = context.getFilename();
        
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
        
        // First check: if both files are within the same internal directory, allow the import
        if (areInSameInternalDirectory(currentFilePath, resolvedImportPath)) {
          return;
        }
        
        // Find the internal root
        const internalRoot = findInternalRoot(resolvedImportPath);
        if (!internalRoot) {
          return;
        }
        
        // Check if the current file is within the same module as the internal folder
        const importerPath = path.dirname(currentFilePath);
        
        // For Go-style internal boundaries, the importer must be in the exact same module
        // not just a subdirectory of the internal root
        if (!isSubPath(importerPath, internalRoot)) {
          context.report({
            node: node.source,
            messageId: 'crossInternalImport',
          });
        } else {
          // Additional check: prevent submodules from accessing parent module internals
          const relativePath = path.relative(internalRoot, importerPath);
          
          if (relativePath) {
            const parts = relativePath.split(path.sep).filter(part => part && part !== '.' && part !== '..');
            
            // Reject if there are multiple levels indicating a submodule
            // e.g., "auth/src" means auth submodule trying to access parent internal
            // but "components" is just a subdirectory, which is allowed
            if (parts.length > 1) {
              context.report({
                node: node.source,
                messageId: 'crossInternalImport',
              });
            }
          }
        }
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
          
          // First check: if both files are within the same internal directory, allow the import
          if (areInSameInternalDirectory(currentFilePath, resolvedImportPath)) {
            return;
          }
          
          // Find the internal root
          const internalRoot = findInternalRoot(resolvedImportPath);
          if (!internalRoot) {
            return;
          }
          
          // Check if the current file is within the same module as the internal folder
          const importerPath = path.dirname(currentFilePath);
          
          // For Go-style internal boundaries, the importer must be in the exact same module
          if (!isSubPath(importerPath, internalRoot)) {
            context.report({
              node: node.arguments[0],
              messageId: 'crossInternalImport',
            });
          } else {
            // Additional check: prevent submodules from accessing parent module internals
            const relativePath = path.relative(internalRoot, importerPath);
            
            if (relativePath) {
              const parts = relativePath.split(path.sep).filter(part => part && part !== '.' && part !== '..');
              
              // Reject if there are multiple levels indicating a submodule
              if (parts.length > 1) {
                context.report({
                  node: node.arguments[0],
                  messageId: 'crossInternalImport',
                });
              }
            }
          }
        }
      },
    };
  },
};