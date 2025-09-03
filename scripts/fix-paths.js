#!/usr/bin/env node

import { readdir, readFile, writeFile } from 'fs/promises';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distDir = join(__dirname, '..', 'dist');

const aliasMap = {
  '@config': 'config',
  '@controllers': 'controllers',
  '@services': 'services',
  '@models': 'models',
  '@middlewares': 'middlewares',
  '@routes': 'routes',
  '@utils': 'utils',
  '@types': 'types',
  '@validators': 'validators',
  '@/': ''
};

async function getAllFiles(dir, files = []) {
  const items = await readdir(dir, { withFileTypes: true });
  
  for (const item of items) {
    const path = join(dir, item.name);
    if (item.isDirectory()) {
      await getAllFiles(path, files);
    } else if (item.name.endsWith('.js')) {
      files.push(path);
    }
  }
  
  return files;
}

function resolveAlias(importPath, currentFile) {
  for (const [alias, replacement] of Object.entries(aliasMap)) {
    if (importPath.startsWith(alias)) {
      const restPath = importPath.slice(alias.length);
      const targetPath = replacement + restPath;
      
      // Calculate relative path from current file to target
      const currentDir = dirname(currentFile);
      const absoluteTarget = join(distDir, targetPath);
      let relativePath = relative(currentDir, absoluteTarget);
      
      // Ensure it starts with ./ or ../
      if (!relativePath.startsWith('.')) {
        relativePath = './' + relativePath;
      }
      
      // Add .js extension if not present
      if (!relativePath.endsWith('.js')) {
        relativePath += '.js';
      }
      
      return relativePath;
    }
  }
  return importPath;
}

async function fixFile(filePath) {
  let content = await readFile(filePath, 'utf-8');
  let modified = false;
  
  // Fix import statements with "from"
  content = content.replace(
    /from\s+["'](@[^"']+)["']/g,
    (match, importPath) => {
      const resolvedPath = resolveAlias(importPath, filePath);
      if (resolvedPath !== importPath) {
        modified = true;
        return `from "${resolvedPath}"`;
      }
      return match;
    }
  );
  
  // Fix side-effect imports (import 'module')
  content = content.replace(
    /^import\s+["'](@[^"']+)["'];?$/gm,
    (match, importPath) => {
      const resolvedPath = resolveAlias(importPath, filePath);
      if (resolvedPath !== importPath) {
        modified = true;
        return `import "${resolvedPath}";`;
      }
      return match;
    }
  );
  
  // Fix dynamic imports
  content = content.replace(
    /import\(["'](@[^"']+)["']\)/g,
    (match, importPath) => {
      const resolvedPath = resolveAlias(importPath, filePath);
      if (resolvedPath !== importPath) {
        modified = true;
        return `import("${resolvedPath}")`;
      }
      return match;
    }
  );
  
  if (modified) {
    await writeFile(filePath, content);
    console.log(`Fixed: ${relative(distDir, filePath)}`);
  }
}

async function main() {
  console.log('Fixing TypeScript path aliases in dist directory...');
  
  try {
    // Check if dist directory exists
    try {
      await readdir(distDir);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('Warning: dist directory does not exist. Skipping path fixing.');
        console.log('This usually means TypeScript compilation failed or produced no output.');
        return;
      }
      throw error;
    }
    
    const files = await getAllFiles(distDir);
    console.log(`Found ${files.length} JavaScript files`);
    
    if (files.length === 0) {
      console.log('Warning: No JavaScript files found in dist directory.');
      console.log('This usually means TypeScript compilation failed or produced no output.');
      return;
    }
    
    for (const file of files) {
      await fixFile(file);
    }
    
    console.log('Path aliases fixed successfully!');
  } catch (error) {
    console.error('Error fixing paths:', error);
    process.exit(1);
  }
}

main();