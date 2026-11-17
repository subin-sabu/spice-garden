import { formatPrice } from './menu.js';

const pageWidth = 595;
const pageHeight = 842;
const margin = 36;
const ink = '#20382b';

function pdfFromPages(images) {
  const encoder = new TextEncoder();
  const chunks = [];
  const offsets = [0];
  let length = 0;
  function append(value) {
    const bytes = typeof value === 'string' ? encoder.encode(value) : value;
    chunks.push(bytes);
    length += bytes.length;
  }
  function object(id, ...parts) {
    offsets[id] = length;
    append(`${id} 0 obj\n`);
    parts.forEach(append);
    append('\nendobj\n');
  }

  append('%PDF-1.4\n');
  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(2, `<< /Type /Pages /Count ${images.length} /Kids [${images.map((_, i) => `${3 + i * 3} 0 R`).join(' ')}] >>`);
  for (const [index, bytes] of images.entries()) {
    const id = 3 + index * 3;
    const content = `q ${pageWidth} 0 0 ${pageHeight} 0 0 cm /PagePhoto Do Q\n`;
    object(id, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /PagePhoto ${id + 1} 0 R >> >> /Contents ${id + 2} 0 R >>`);
    object(id + 1, `<< /Type /XObject /Subtype /Image /Width ${pageWidth * 2} /Height ${pageHeight * 2} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`, bytes, '\nendstream');
    object(id + 2, `<< /Length ${content.length} >>\nstream\n${content}endstream`);
  }
  const xref = length;
  append(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
  offsets.slice(1).forEach((offset) => append(`${String(offset).padStart(10, '0')} 00000 n \n`));
  append(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(chunks, { type: 'application/pdf' });
}

export function createStatusReport(data, now = new Date()) {
  const canvas = document.createElement('canvas');
  canvas.width = pageWidth * 2;
  canvas.height = pageHeight * 2;
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);
  const pages = [];
  const timestamp = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'long', timeStyle: 'long', hourCycle: 'h23', timeZone: 'Asia/Kolkata',
  }).format(now);
  let y;

  function text(value, x, top, font = '12px sans-serif', color = ink) {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.fillText(value, x, top);
  }
  function wrap(value, width, font) {
    ctx.font = font;
    const lines = [];
    let line = '';
    for (const word of value.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width <= width) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = '';
      for (const char of word) {
        if (line && ctx.measureText(line + char).width > width) {
          lines.push(line);
          line = '';
        }
        line += char;
      }
    }
    return [...lines, line];
  }
  function finishPage() {
    text(`Page ${pages.length + 1}`, margin, pageHeight - 24, '10px sans-serif');
    const base64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
    pages.push(Uint8Array.from(atob(base64), (char) => char.charCodeAt(0)));
  }
  function startPage() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pageWidth, pageHeight);
    text('Spice Garden Restaurant', margin, 54, 'bold 25px serif');
    text(`Menu status report · ${timestamp}`, margin, 76, '11px sans-serif');
    y = 106;
  }
  function need(height) {
    if (y + height <= pageHeight - 44) return false;
    finishPage();
    startPage();
    return true;
  }
  function heading(value, font = 'bold 15px sans-serif') {
    for (const line of wrap(value, pageWidth - margin * 2, font)) {
      need(20);
      text(line, margin, y, font);
      y += 20;
    }
  }
  function table(title, items) {
    need(85);
    heading(title);
    const priceX = 316;
    const unpublishedX = 400;
    const unavailableX = 482;
    function header() {
      ctx.fillStyle = '#e7efe8';
      ctx.fillRect(margin, y - 13, pageWidth - margin * 2, 20);
      for (const [label, x] of [['Dish', margin + 5], ['Price', priceX], ['Unpublished', unpublishedX], ['Unavailable', unavailableX]]) {
        text(label, x, y, 'bold 10px sans-serif');
      }
      y += 23;
    }
    function tick(x) {
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x, y - 3);
      ctx.lineTo(x + 3, y);
      ctx.lineTo(x + 9, y - 7);
      ctx.stroke();
    }
    if (!items.length) {
      text('No dishes', margin, y);
      y += 24;
      return;
    }
    header();
    for (const item of items) {
      const lines = wrap(item.name, priceX - margin - 14, '12px sans-serif');
      const height = Math.max(23, lines.length * 14 + 8);
      if (need(height)) {
        heading(`${title} (continued)`);
        header();
      }
      lines.forEach((line, index) => text(line, margin + 5, y + index * 14));
      text(formatPrice(item.price_paise), priceX, y);
      if (!item.published) tick(unpublishedX + 23);
      if (!item.is_available) tick(unavailableX + 23);
      ctx.fillStyle = '#e2e9e3';
      ctx.fillRect(margin, y + height - 15, pageWidth - margin * 2, 1);
      y += height;
    }
    y += 13;
  }

  startPage();
  const published = data.items.filter((item) => item.published).length;
  const unavailable = data.items.filter((item) => !item.is_available).length;
  heading(`Dishes ${data.items.length}   ·   Published ${published}   ·   Categories ${data.categories.length}   ·   Collections ${data.collections.length}`, 'bold 13px sans-serif');
  text(`Unpublished ${data.items.length - published}   ·   Unavailable ${unavailable}`, margin, y);
  y += 29;
  heading('Collections', 'bold 19px serif');
  if (!data.collections.length) { text('No collections', margin, y); y += 24; }
  const itemsById = new Map(data.items.map((item) => [item.id, item]));
  for (const collection of data.collections) {
    table(collection.name + (collection.is_visible ? '' : ' (hidden)'),
      data.memberships.filter((row) => row.collection_id === collection.id)
        .map((row) => itemsById.get(row.item_id)).filter(Boolean));
  }
  need(112);
  heading('Categories', 'bold 19px serif');
  for (const category of data.categories) {
    table(category.name + (category.is_visible ? '' : ' (hidden)'), data.items.filter((item) => item.category === category.id));
  }
  finishPage();
  return pdfFromPages(pages);
}

export function downloadStatusReport(data) {
  const now = new Date();
  const url = URL.createObjectURL(createStatusReport(data, now));
  const link = document.createElement('a');
  link.href = url;
  link.download = `spice-garden-status-${now.toISOString().replace(/[:.]/g, '-')}.pdf`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
