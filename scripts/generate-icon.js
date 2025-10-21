const fs = require('fs');
const { execSync } = require('child_process');

// Check if sharp is available, if not install it temporarily
try {
  require.resolve('sharp');
} catch (e) {
  console.log('Installing sharp...');
  execSync('npm install --no-save sharp', { stdio: 'inherit' });
}

const sharp = require('sharp');
const path = require('path');

const svgPath = path.join(__dirname, '../assets/icon-new.svg');
const iconPath = path.join(__dirname, '../assets/icon.png');
const adaptiveIconPath = path.join(__dirname, '../assets/adaptive-icon.png');

async function generateIcons() {
  try {
    console.log('Reading SVG...');
    const svgBuffer = fs.readFileSync(svgPath);
    
    console.log('Generating 1024x1024 PNG...');
    await sharp(svgBuffer)
      .resize(1024, 1024)
      .png()
      .toFile(iconPath);
    
    console.log('Copying to adaptive-icon.png...');
    fs.copyFileSync(iconPath, adaptiveIconPath);
    
    console.log('✅ Icons generated successfully!');
    console.log(`  - ${iconPath}`);
    console.log(`  - ${adaptiveIconPath}`);
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();

