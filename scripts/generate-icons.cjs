const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/**
 * Generates ALL icon files required by Tauri in correct formats:
 * - 32x32.png, 128x128.png, 128x128@2x.png (valid PNG)
 * - icon.ico (valid Windows ICO with embedded PNG)
 * - icon.icns (valid macOS ICNS with ic10 data)
 * - icon.png (512x512 source)
 */

const iconsDir = path.join(__dirname, '..', 'src-tauri', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// ------- CRC32 -------
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ------- PNG generation -------
function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function makePng(width, height) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type: RGBA
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace

  // Generate pixel data: green circle (ZabbLeaf brand) on transparent background
  const rowLen = 1 + width * 4; // filter byte + RGBA per pixel
  const raw = Buffer.alloc(height * rowLen);
  const cx = width / 2, cy = height / 2, radius = width * 0.40;

  for (let y = 0; y < height; y++) {
    raw[y * rowLen] = 0; // filter type: None
    for (let x = 0; x < width; x++) {
      const offset = y * rowLen + 1 + x * 4;
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius - 1) {
        // Solid green
        raw[offset]     = 16;   // R
        raw[offset + 1] = 185;  // G
        raw[offset + 2] = 129;  // B
        raw[offset + 3] = 255;  // A
      } else if (dist <= radius + 1) {
        // Anti-aliased edge
        const alpha = Math.max(0, Math.min(255, Math.round((radius + 1 - dist) * 128)));
        raw[offset]     = 16;
        raw[offset + 1] = 185;
        raw[offset + 2] = 129;
        raw[offset + 3] = alpha;
      } else {
        // Transparent
        raw[offset]     = 0;
        raw[offset + 1] = 0;
        raw[offset + 2] = 0;
        raw[offset + 3] = 0;
      }
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 6 });

  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

// ------- ICO generation (Windows) -------
// Modern ICO format with embedded PNG data (supported since Windows Vista)
function makeIco(pngData, width, height) {
  // ICO header: 6 bytes
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);    // reserved
  header.writeUInt16LE(1, 2);    // type: ICO
  header.writeUInt16LE(1, 4);    // number of images

  // ICO directory entry: 16 bytes
  const entry = Buffer.alloc(16);
  entry[0] = width >= 256 ? 0 : width;    // width (0 = 256)
  entry[1] = height >= 256 ? 0 : height;  // height (0 = 256)
  entry[2] = 0;                            // color palette
  entry[3] = 0;                            // reserved
  entry.writeUInt16LE(1, 4);               // color planes
  entry.writeUInt16LE(32, 6);              // bits per pixel
  entry.writeUInt32LE(pngData.length, 8);  // image data size
  entry.writeUInt32LE(22, 12);             // offset to image data (6 + 16)

  return Buffer.concat([header, entry, pngData]);
}

// ------- ICNS generation (macOS) -------
// ICNS format with ic10 type (1024x1024 PNG) or ic09 (512x512 PNG)
function makeIcns(pngData) {
  const magic = Buffer.from('icns');
  const iconType = Buffer.from('ic09'); // 512x512 PNG
  
  // Each icon element: type (4 bytes) + length (4 bytes) + data
  const elementLen = 8 + pngData.length;
  const elementHeader = Buffer.alloc(8);
  iconType.copy(elementHeader, 0);
  elementHeader.writeUInt32BE(elementLen, 4);

  // Total file: magic (4 bytes) + file length (4 bytes) + elements
  const totalLen = 8 + elementLen;
  const fileHeader = Buffer.alloc(8);
  magic.copy(fileHeader, 0);
  fileHeader.writeUInt32BE(totalLen, 4);

  return Buffer.concat([fileHeader, elementHeader, pngData]);
}

// ------- Generate all icons -------
console.log('🎨 Generating ZabbLeaf icons...');

const sizes = {
  '32x32.png': 32,
  '128x128.png': 128,
  '128x128@2x.png': 256,
  'icon.png': 512
};

for (const [filename, size] of Object.entries(sizes)) {
  const png = makePng(size, size);
  fs.writeFileSync(path.join(iconsDir, filename), png);
  console.log(`  ✅ ${filename} (${size}x${size}, ${png.length} bytes)`);
}

// Generate ICO from 256x256 PNG
const png256 = makePng(256, 256);
const ico = makeIco(png256, 256, 256);
fs.writeFileSync(path.join(iconsDir, 'icon.ico'), ico);
console.log(`  ✅ icon.ico (${ico.length} bytes)`);

// Generate ICNS from 512x512 PNG
const png512 = makePng(512, 512);
const icns = makeIcns(png512);
fs.writeFileSync(path.join(iconsDir, 'icon.icns'), icns);
console.log(`  ✅ icon.icns (${icns.length} bytes)`);

console.log('\n✅ All icon assets generated successfully!');
