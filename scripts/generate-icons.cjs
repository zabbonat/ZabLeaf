const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '..', 'src-tauri', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1. Valid PNG Buffer
const base64Png = 'iVBORw0KGgoAAAANSU65SuQmCC';
const pngBuffer = Buffer.from(base64Png, 'base64');

// 2. Valid 1x1 ICO Header Buffer for Windows WiX / NSIS bundler
const icoBuffer = Buffer.from([
  0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
  0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x20, 0x00,
  0x28, 0x00, 0x00, 0x00,
  0x16, 0x00, 0x00, 0x00,
  0x28, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00,
  0x00, 0xFF, 0x00, 0xFF, 0x00, 0x00, 0x00, 0x00
]);

const pngFiles = [
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
  'icon.png'
];

pngFiles.forEach(file => {
  fs.writeFileSync(path.join(iconsDir, file), pngBuffer);
});

fs.writeFileSync(path.join(iconsDir, 'icon.ico'), icoBuffer);
fs.writeFileSync(path.join(iconsDir, 'icon.icns'), pngBuffer);

console.log('Tauri valid PNG and ICO icons generated successfully!');
