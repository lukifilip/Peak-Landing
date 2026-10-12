// Writes assets/portfolio/get-qr.svg: the QR code the portfolio's closing card
// shows on computers. It points to /get, which sends an Android phone to
// Google Play and every other device to the App Store (vercel.json), so one
// code serves both. The SVG is committed; run this again only if the URL
// changes.
// Run: node scripts/make-qr.mjs

import { writeFileSync } from 'node:fs';
import QRCode from 'qrcode';

const URL_TO_ENCODE = 'https://www.peakofficial.app/get';

// Black on white with the standard four-module quiet zone, so every camera
// reads it, in light and dark mode alike. Error correction M is the usual
// balance between size and tolerance for a code shown on a screen.
const svg = await QRCode.toString(URL_TO_ENCODE, {
  type: 'svg',
  errorCorrectionLevel: 'M',
  margin: 4,
  color: { dark: '#000000', light: '#FFFFFF' },
});

const out = new URL('../assets/portfolio/get-qr.svg', import.meta.url);
writeFileSync(out, svg);
console.log(`assets/portfolio/get-qr.svg → ${URL_TO_ENCODE}`);
