/**
 * Automated ES6 Module Conversion Script
 * Converts remaining CommonJS files to ES6 modules
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filesToConvert = [
  // Plant module
  'src/routes/plants.js',
  'src/controllers/plantController.js',
  'src/services/plantService.js',
  'src/validators/plantValidators.js',
  // Device module
  'src/routes/devices.js',
  'src/controllers/deviceController.js',
  'src/services/deviceService.js',
  'src/validators/deviceValidators.js',
];

function convertFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  let content = fs.readFileSync(fullPath, 'utf8');

  // Convert require() to import
  content = content.replace(/const\s+(\w+)\s*=\s*require\(['"]([\w\/@-]+)['"]\);?/g, 'import $1 from \'$2.js\';');
  content = content.replace(/const\s+{([^}]+)}\s*=\s*require\(['"]([\w\.\/\@-]+)['"]\);?/g, 'import {$1} from \'$2.js\';');

  // Fix imports without .js extension for relative paths
  content = content.replace(/from\s+['"](\.\.[^'"]+)(?<!\.js)['"]/g, 'from \'$1.js\'');
  content = content.replace(/from\s+['"](\.\/[^'"]+)(?<!\.js)['"]/g, 'from \'$1.js\'');

  // Convert module.exports to export
  content = content.replace(/module\.exports\s*=\s*{([^}]+)};?/g, 'export {$1};');
  content = content.replace(/module\.exports\s*=\s*(\w+);?/g, 'export default $1;');

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`✓ Converted: ${filePath}`);
}

console.log('Converting files to ES6 modules...\n');
filesToConvert.forEach(convertFile);
console.log('\n✅ Conversion complete!');
