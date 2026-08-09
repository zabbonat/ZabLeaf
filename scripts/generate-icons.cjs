const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '..', 'src-tauri', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Valid green 32x32 PNG file base64
const base64Png = 'iVBORw0KGgoAAAANSU65SuQmCC';
const pngBuffer = Buffer.from(base64Png, 'base64');

const files = [
  '32x32.png',
  '128x128.png',
  '128x128@2x.png',
  'Square30x30Logo.png',
  'Square44x44Logo.png',
  'Square71x71Logo.png',
  'Square89x89Logo.png',
  'Square107x107Logo.png',
  'Square142x142Logo.png',
  'Square150x150Logo.png',
  'Square284x284Logo.png',
  'Square310x310Logo.png',
  'StoreLogo.png',
  'icon.png',
  'icon.ico',
  'icon.icns'
];

files.forEach(file => {
  fs.writeFileSync(path.join(iconsDir, file), pngBuffer);
});

console.log('Tauri icons generated successfully!');
