import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeResolve } from './fileHelper.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_LOGO = path.resolve(__dirname, '../assets/default-logo.png');

/** Reads width/height from a PNG or JPEG header; null for anything else. */
const imageSize = (buf) => {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { type: 'png', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) return null;
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      // SOF0–SOF15, excluding DHT (C4), JPG (C8) and DAC (CC)
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { type: 'jpeg', height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      i += 2 + len;
    }
  }
  return null;
};

const loadImage = (filePath) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;
    const buffer = fs.readFileSync(filePath);
    const size = imageSize(buffer);
    return size ? { buffer, ...size } : null;
  } catch {
    return null;
  }
};

/**
 * Company logo for PDFs and Excel exports: the logo uploaded in Settings when it is a
 * PNG/JPEG (the formats PDFKit and ExcelJS can embed), otherwise the bundled Madal logo.
 * Returns { buffer, type: 'png'|'jpeg', width, height } or null.
 */
export const companyLogo = (settings) => {
  if (settings?.logo) {
    let custom = null;
    try {
      custom = loadImage(safeResolve('logos', settings.logo));
    } catch {
      custom = null;
    }
    if (custom) return custom;
  }
  return loadImage(DEFAULT_LOGO);
};

/** Scales an image to fit inside maxWidth × maxHeight, keeping its aspect ratio. */
export const fitSize = (logo, maxWidth, maxHeight) => {
  const scale = Math.min(maxWidth / logo.width, maxHeight / logo.height, 1);
  return { width: Math.round(logo.width * scale), height: Math.round(logo.height * scale) };
};

export const companyName = (settings) => settings?.company_name || 'Madal ICT Solutions';

export const companyContact = (settings) =>
  [settings?.company_address, settings?.company_phone, settings?.company_email].filter(Boolean).join(' · ');
