const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createPngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crc]);
}

function generatePng(width, height, isMaskable = false) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdr = createPngChunk('IHDR', ihdrData);

  // Raw image data: filter byte (0) + width * 4 bytes per row
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  // Brand colors:
  // Primary background: #16140F (Dark ink) or #E75623 (Accent orange)
  // Let's create an elegant, crisp icon:
  // Background: Deep dark #16140F (or #E75623 if maskable)
  // Center logo: Glowing Accent #E75623 square with inner geometric cutout or letter 'P' / diamond
  const bgR = 0x16, bgG = 0x14, bgB = 0x0F, bgA = 0xFF;
  const fgR = 0xE7, fgG = 0x56, fgB = 0x23, fgA = 0xFF;
  const whiteR = 0xF8, whiteG = 0xF7, whiteB = 0xF4, whiteA = 0xFF;

  const center = width / 2;
  const boxRadius = width * 0.35;
  const innerRadius = width * 0.16;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Distance from center
      const dx = Math.abs(x - center);
      const dy = Math.abs(y - center);

      // Rounded rectangle for the app badge
      const isInner = (dx < innerRadius && dy < innerRadius);
      const isBox = (dx < boxRadius && dy < boxRadius);

      if (isInner) {
        // Inner white square
        rawData[pxOffset] = whiteR;
        rawData[pxOffset + 1] = whiteG;
        rawData[pxOffset + 2] = whiteB;
        rawData[pxOffset + 3] = whiteA;
      } else if (isBox) {
        // Accent orange surround
        rawData[pxOffset] = fgR;
        rawData[pxOffset + 1] = fgG;
        rawData[pxOffset + 2] = fgB;
        rawData[pxOffset + 3] = fgA;
      } else {
        // Dark background
        rawData[pxOffset] = bgR;
        rawData[pxOffset + 1] = bgG;
        rawData[pxOffset + 2] = bgB;
        rawData[pxOffset + 3] = bgA;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idat = createPngChunk('IDAT', compressed);
  const iend = createPngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

fs.writeFileSync(path.join(iconsDir, 'icon-192x192.png'), generatePng(192, 192));
fs.writeFileSync(path.join(iconsDir, 'icon-512x512.png'), generatePng(512, 512));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-192x192.png'), generatePng(192, 192, true));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-512x512.png'), generatePng(512, 512, true));
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), generatePng(180, 180));

console.log('PWA icons successfully generated in public/icons/');
