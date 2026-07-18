#!/usr/bin/env node
/**
 * RM Ubuzima Icon Generator
 * Converts SVG icons to PNG format for PWA compatibility
 * 
 * Usage: node scripts/generate-icons.mjs
 * Requires: npm install sharp
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import sharp
let sharp;
try {
  const sharpModule = await import('sharp');
  sharp = sharpModule.default;
} catch (e) {
  console.log('Please install sharp first: npm install sharp --save-dev');
  console.error(e.message);
  process.exit(1);
}

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const INPUT_DIR = path.join(__dirname, '../public/icons');
const OUTPUT_DIR = INPUT_DIR;

async function generateIcon(svgPath, size, outputName) {
  try {
    const outputPath = path.join(OUTPUT_DIR, outputName);
    
    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`✓ Generated ${outputName}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to generate ${outputName}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('RM Ubuzima - PWA Icon Generator\n');
  
  // Check for main icon
  const mainIconPath = path.join(INPUT_DIR, 'icon.svg');
  if (!fs.existsSync(mainIconPath)) {
    console.error('Error: icon.svg not found in public/icons/');
    process.exit(1);
  }
  
  console.log('Generating main app icons...');
  for (const size of SIZES) {
    await generateIcon(mainIconPath, size, `icon-${size}x${size}.png`);
  }
  
  // Generate maskable icon
  const maskableIconPath = path.join(INPUT_DIR, 'maskable-icon.svg');
  if (fs.existsSync(maskableIconPath)) {
    console.log('\nGenerating maskable icon...');
    await generateIcon(maskableIconPath, 512, 'maskable-icon-512x512.png');
  }
  
  // Generate shortcut icons
  const shortcuts = [
    { name: 'shortcut-ai', size: 96 },
    { name: 'shortcut-doctor', size: 96 },
    { name: 'shortcut-emergency', size: 96 },
    { name: 'shortcut-girls', size: 96 }
  ];
  
  console.log('\nGenerating shortcut icons...');
  for (const shortcut of shortcuts) {
    const shortcutPath = path.join(INPUT_DIR, `${shortcut.name}.svg`);
    if (fs.existsSync(shortcutPath)) {
      await generateIcon(shortcutPath, shortcut.size, `${shortcut.name}.png`);
    }
  }
  
  console.log('\n✓ All icons generated successfully!');
  console.log('You can now build and deploy your PWA.');
}

main().catch(console.error);
