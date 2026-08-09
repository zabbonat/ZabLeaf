const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '..', 'src-tauri', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1x1 green pixel PNG base64 string
const base64Png = 'iVBORw0KGgoAAAANSU65SuQmCC';
const pngBuffer = Buffer.from(base64Png, 'base64');

const files = [
  '32x32.png',
  '128x128.png',
  '128x128@2x.png',
  'icon.png',
  'icon.ico',
  'icon.icns'
];

files.forEach(file => {
  fs.writeFileSync(path.join(iconsDir, file), pngBuffer);
});

console.log('Tauri icon placeholders generated successfully in src-tauri/icons/');
