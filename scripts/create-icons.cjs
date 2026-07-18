// Simple PNG icon generator using Canvas API via node-canvas
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const ICONS_DIR = path.join(__dirname, '../public/icons');

// Create a simple colored square icon with "RM" text
function createIcon(size, outputPath) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background - teal gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#2A9D8F');
  gradient.addColorStop(1, '#1D7A6E');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Rounded corners effect
  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  const radius = size * 0.2;
  ctx.roundRect(0, 0, size, size, radius);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  // Heart symbol
  ctx.fillStyle = 'white';
  const heartSize = size * 0.5;
  const x = (size - heartSize) / 2;
  const y = size * 0.25;
  
  // Draw heart path
  ctx.beginPath();
  const topCurveHeight = heartSize * 0.3;
  ctx.moveTo(x + heartSize / 2, y + topCurveHeight);
  ctx.bezierCurveTo(
    x + heartSize / 2, y,
    x, y,
    x, y + topCurveHeight
  );
  ctx.bezierCurveTo(
    x, y + (heartSize + topCurveHeight) / 2,
    x + heartSize / 2, y + heartSize,
    x + heartSize / 2, y + heartSize
  );
  ctx.bezierCurveTo(
    x + heartSize / 2, y + heartSize,
    x + heartSize, y + (heartSize + topCurveHeight) / 2,
    x + heartSize, y + topCurveHeight
  );
  ctx.bezierCurveTo(
    x + heartSize, y,
    x + heartSize / 2, y,
    x + heartSize / 2, y + topCurveHeight
  );
  ctx.closePath();
  ctx.fill();

  // Save
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Created: ${path.basename(outputPath)}`);
}

function createMaskableIcon(size, outputPath) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Full bleed background - teal gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#2A9D8F');
  gradient.addColorStop(1, '#1D7A6E');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Heart symbol (centered, smaller padding for maskable)
  ctx.fillStyle = 'white';
  const padding = size * 0.15; // Safe zone padding for maskable
  const heartSize = size - (padding * 2);
  const x = padding;
  const y = padding + (size * 0.05);
  
  ctx.beginPath();
  const topCurveHeight = heartSize * 0.3;
  ctx.moveTo(x + heartSize / 2, y + topCurveHeight);
  ctx.bezierCurveTo(x + heartSize / 2, y, x, y, x, y + topCurveHeight);
  ctx.bezierCurveTo(x, y + (heartSize + topCurveHeight) / 2, x + heartSize / 2, y + heartSize, x + heartSize / 2, y + heartSize);
  ctx.bezierCurveTo(x + heartSize / 2, y + heartSize, x + heartSize, y + (heartSize + topCurveHeight) / 2, x + heartSize, y + topCurveHeight);
  ctx.bezierCurveTo(x + heartSize, y, x + heartSize / 2, y, x + heartSize / 2, y + topCurveHeight);
  ctx.closePath();
  ctx.fill();

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Created: ${path.basename(outputPath)} (maskable)`);
}

function createShortcutIcon(name, size, color, outputPath) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.2);
  ctx.fill();

  // Letter/icon
  ctx.fillStyle = 'white';
  ctx.font = `bold ${size * 0.5}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  let text = '';
  if (name.includes('ai')) text = 'AI';
  else if (name.includes('doctor')) text = 'Dr';
  else if (name.includes('emergency')) text = '!';
  else if (name.includes('girls')) text = '♀';
  
  ctx.fillText(text, size / 2, size / 2);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Created: ${path.basename(outputPath)} (shortcut)`);
}

async function main() {
  console.log('RM Ubuzima - Generating PWA Icons\n');

  // Check if canvas is available
  try {
    require.resolve('canvas');
  } catch (e) {
    console.log('Please install canvas: npm install canvas --save-dev');
    process.exit(1);
  }

  // Create icons directory if needed
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
  }

  // Generate main icons
  console.log('Generating main app icons...');
  for (const size of SIZES) {
    createIcon(size, path.join(ICONS_DIR, `icon-${size}x${size}.png`));
  }

  // Generate maskable icon
  console.log('\nGenerating maskable icon...');
  createMaskableIcon(512, path.join(ICONS_DIR, 'maskable-icon-512x512.png'));

  // Generate shortcut icons
  console.log('\nGenerating shortcut icons...');
  createShortcutIcon('ai', 96, '#10B981', path.join(ICONS_DIR, 'shortcut-ai.png'));
  createShortcutIcon('doctor', 96, '#3B82F6', path.join(ICONS_DIR, 'shortcut-doctor.png'));
  createShortcutIcon('emergency', 96, '#EF4444', path.join(ICONS_DIR, 'shortcut-emergency.png'));
  createShortcutIcon('girls', 96, '#EC4899', path.join(ICONS_DIR, 'shortcut-girls.png'));

  console.log('\n✓ All icons generated successfully!');
}

main().catch(console.error);
