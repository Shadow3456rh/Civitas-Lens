const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');

function normalizeCoord(val, max) {
  if (typeof val !== 'number' || isNaN(val)) return null;
  const abs = Math.abs(val);
  if (abs <= max) return val;
  const str = Math.round(abs).toString();
  for (const intDigits of [2, 3]) {
    if (str.length > intDigits) {
      const cand = parseFloat(str.slice(0, intDigits) + '.' + str.slice(intDigits));
      if (cand <= max) return val < 0 ? -cand : cand;
    }
  }
  return null;
}

function extractGps(text) {
  // Regex 1: Lat ... Long ...
  const match1 = text.match(/Lat(?:itude)?\s*[:=]?\s*([0-9.]+)\s*°?\s*([NS])?[\s,;|/]+Long(?:itude)?\s*[:=]?\s*([0-9.]+)\s*°?\s*([EW])?/i);
  if (match1) {
    let lat = normalizeCoord(parseFloat(match1[1]), 90);
    let lng = normalizeCoord(parseFloat(match1[3]), 180);
    if (match1[2]?.toUpperCase() === 'S' && lat) lat = -Math.abs(lat);
    if (match1[4]?.toUpperCase() === 'W' && lng) lng = -Math.abs(lng);
    if (lat !== null && lng !== null) return { lat, lng };
  }

  // Regex 2: Decimal pair with coordinates and degrees
  const match2 = text.match(/([0-9]{1,2}\.?[0-9]{4,8})\s*°?\s*([NS])?[\s,;|/]+([0-9]{1,3}\.?[0-9]{4,8})\s*°?\s*([EW])?/i);
  if (match2) {
    let lat = normalizeCoord(parseFloat(match2[1]), 90);
    let lng = normalizeCoord(parseFloat(match2[3]), 180);
    if (match2[2]?.toUpperCase() === 'S' && lat) lat = -Math.abs(lat);
    if (match2[4]?.toUpperCase() === 'W' && lng) lng = -Math.abs(lng);
    if (lat !== null && lng !== null) return { lat, lng };
  }

  return null;
}

function extractAddress(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const parts = [];
  for (const line of lines) {
    if (line.match(/GPS Map Camera|Google|Saturday|Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|AM|PM|GMT|Note\s*:/i)) continue;
    if (line.match(/Lat|Long|Latitude|Longitude/i)) continue;
    if (line.length < 5 || line.length > 150) continue;
    if (line.match(/India|Maharashtra|Road|Rd|Layout|Nagar|Hingna|Digdoh|Street|Lane|Cross|Plot|Colony|[0-9]{6}/i)) {
      const clean = line.replace(/^[^a-zA-Z0-9]+/, '').replace(/[^a-zA-Z0-9)., -]+$/, '').trim();
      if (clean) parts.push(clean);
    }
  }
  return parts.length > 0 ? parts.join(', ') : null;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath || !fs.existsSync(filePath)) {
    console.log(JSON.stringify({ found: false, error: 'File not found' }));
    process.exit(0);
  }

  try {
    const buf = fs.readFileSync(filePath);
    const meta = await sharp(buf).metadata();
    if (!meta.width || !meta.height) {
      console.log(JSON.stringify({ found: false, error: 'Invalid image dimensions' }));
      process.exit(0);
    }

    const top = Math.floor(meta.height * 0.60);
    const bottomCrop = await sharp(buf)
      .extract({ left: 0, top, width: meta.width, height: meta.height - top })
      .toBuffer();

    const res = await Tesseract.recognize(bottomCrop, 'eng');
    const text = res.data?.text || '';
    const coords = extractGps(text);
    const address = extractAddress(text);

    if (coords) {
      console.log(JSON.stringify({
        found: true,
        lat: coords.lat,
        lng: coords.lng,
        address: address || null,
        rawText: text
      }));
    } else {
      console.log(JSON.stringify({ found: false, rawText: text }));
    }
  } catch (err) {
    console.log(JSON.stringify({ found: false, error: err.message }));
  }
}

main();
