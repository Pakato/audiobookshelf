/**
 * Patches node_modules dependencies for Node 25+ compatibility.
 * Node 25 removed SlowBuffer from the 'buffer' module.
 * This script patches buffer-equal-constant-time to guard SlowBuffer access.
 */
const fs = require('fs')
const path = require('path')

const filePath = path.join(__dirname, '..', 'node_modules', 'buffer-equal-constant-time', 'index.js')

if (!fs.existsSync(filePath)) {
  // Dependency not installed, nothing to patch
  process.exit(0)
}

const content = fs.readFileSync(filePath, 'utf8')

// Only patch if SlowBuffer is used unsafely (not already patched)
if (content.includes('SlowBuffer.prototype.equal') && !content.includes('SlowBuffer ?')) {
  const patched = content
    .replace(
      /^(bufferEq\.install = function\s*\(\)\s*\{)\s*\n\s*Buffer\.prototype\.equal = SlowBuffer\.prototype\.equal = function equal\(that\) \{/m,
      '$1\n  Buffer.prototype.equal = function equal(that) {'
    )
    .replace(
      /^(var origBufEqual = Buffer\.prototype\.equal;)\s*\n\s*var origSlowBufEqual = SlowBuffer\.prototype\.equal;/m,
      '$1\nvar origSlowBufEqual = SlowBuffer ? SlowBuffer.prototype.equal : null;'
    )
    .replace(
      /^(bufferEq\.restore = function\s*\(\)\s*\{)\s*\n\s*Buffer\.prototype\.equal = origBufEqual;\s*\n\s*SlowBuffer\.prototype\.equal = origSlowBufEqual;/m,
      '$1\n  Buffer.prototype.equal = origBufEqual;\n  if (SlowBuffer && origSlowBufEqual) SlowBuffer.prototype.equal = origSlowBufEqual;'
    )

  fs.writeFileSync(filePath, patched)
  console.log('Patched buffer-equal-constant-time for Node 25+ compatibility')
} else {
  console.log('buffer-equal-constant-time already compatible, skipping patch')
}
