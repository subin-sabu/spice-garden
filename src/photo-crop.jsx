import React, { useEffect, useRef, useState } from 'react';

export const centeredCrop = { zoom: 1, x: 0.5, y: 0.5 };
export const imageAccept = 'image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif';
export const imageDecodeError = 'This image could not be opened. Choose a valid JPEG, PNG, WebP, or AVIF supported by your browser.';
const clamp = (value) => Math.max(0, Math.min(1, value));

export function cropRect(width, height, ratio, { zoom, x, y }) {
  const cropWidth = Math.min(width, height * ratio) / zoom;
  const cropHeight = cropWidth / ratio;
  return [(width - cropWidth) * x, (height - cropHeight) * y, cropWidth, cropHeight];
}

export function CropControls({ file, ratio, crop, setCrop, busy, onReady, onError }) {
  const [source, setSource] = useState(null);
  const [dimensions, setDimensions] = useState(null);
  const drag = useRef(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSource(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const [width, height] = dimensions ?? [1, 1];
  const [left, top, cropWidth, cropHeight] = cropRect(width, height, ratio, crop);

  function start(event) {
    if (busy || !dimensions || event.button !== 0 || drag.current) return;
    const { width: frameWidth, height: frameHeight } = event.currentTarget.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, clientX: event.clientX, clientY: event.clientY,
      x: crop.x, y: crop.y, scaleX: cropWidth / frameWidth, scaleY: cropHeight / frameHeight };
  }

  function move(event) {
    const start = drag.current;
    if (!start || start.id !== event.pointerId || busy) return;
    setCrop({ ...crop,
      x: width > cropWidth ? clamp(start.x - (event.clientX - start.clientX) * start.scaleX / (width - cropWidth)) : 0.5,
      y: height > cropHeight ? clamp(start.y - (event.clientY - start.clientY) * start.scaleY / (height - cropHeight)) : 0.5,
    });
  }

  function stop(event) {
    if (drag.current?.id === event.pointerId) drag.current = null;
  }

  return <div className="crop-controls">
    <div className="crop-frame" style={{ aspectRatio: ratio }} onPointerDown={start} onPointerMove={move}
      onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}>
      {source && <img src={source} alt="Crop preview" draggable={false}
        onLoad={(event) => {
          setDimensions([event.currentTarget.naturalWidth, event.currentTarget.naturalHeight]);
          onReady?.();
        }} onError={onError}
        style={dimensions ? { width: `${100 * width / cropWidth}%`, height: `${100 * height / cropHeight}%`,
          left: `${-100 * left / cropWidth}%`, top: `${-100 * top / cropHeight}%` } : { visibility: 'hidden' }} />}
    </div>
    <p className="admin-hint">Drag the photo to reposition it, or use the position sliders.</p>
    <label>Zoom <input type="range" min="1" max="4" step="0.01" value={crop.zoom} disabled={busy}
      onChange={(event) => setCrop({ ...crop, zoom: Number(event.target.value) })} /></label>
    <div className="crop-position">
      <label>Horizontal position <input type="range" min="0" max="1" step="0.01" value={crop.x} disabled={busy || cropWidth >= width}
        onChange={(event) => setCrop({ ...crop, x: Number(event.target.value) })} /></label>
      <label>Vertical position <input type="range" min="0" max="1" step="0.01" value={crop.y} disabled={busy || cropHeight >= height}
        onChange={(event) => setCrop({ ...crop, y: Number(event.target.value) })} /></label>
    </div>
    <button type="button" disabled={busy} onClick={() => setCrop(centeredCrop)}>Reset crop</button>
  </div>;
}

async function webp(bitmap, width, height, crop, targetBytes, aspect) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  let smallest;
  for (const scale of [1, 0.85, 0.72]) {
    const units = aspect && Math.max(1, Math.floor(width * scale / aspect[0]));
    canvas.width = aspect ? units * aspect[0] : Math.max(1, Math.round(width * scale));
    canvas.height = aspect ? units * aspect[1] : Math.max(1, Math.round(height * scale));
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, ...crop, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.9, 0.84, 0.78, 0.72]) {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
      if (blob?.type !== 'image/webp') throw new Error('This browser cannot export WebP images.');
      if (blob.size <= targetBytes) return blob;
      if (!smallest || blob.size < smallest.size) smallest = blob;
    }
  }
  if (smallest?.size <= 1024 * 1024) return smallest;
  throw new Error('This image could not be compressed enough. Choose a smaller photo or crop a smaller area.');
}

export async function optimizePhoto(file, crop, banner = false) {
  if (!file?.size || file.size > 15 * 1024 * 1024) throw new Error('Choose an image of up to 15 MB.');
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type) &&
      !/\.(jpe?g|png|webp|avif)$/i.test(file.name ?? '')) {
    throw new Error('Choose a JPEG, PNG, WebP, or AVIF image.');
  }
  const url = URL.createObjectURL(file);
  const bitmap = new Image();
  bitmap.src = url;
  try {
    await bitmap.decode().catch(() => { throw new Error(imageDecodeError); });
    const { naturalWidth: width, naturalHeight: height } = bitmap;
    if (banner) {
      const region = cropRect(width, height, 16 / 9, crop);
      const outWidth = Math.min(1600, region[2]);
      return await webp(bitmap, outWidth, outWidth * 9 / 16, region, 350 * 1024, [16, 9]);
    }
    const scale = Math.min(1, 1400 / Math.max(width, height));
    const region = cropRect(width, height, 640 / 420, crop);
    const thumbWidth = Math.min(640, region[2]);
    const mainPhoto = file.type === 'image/webp' && scale === 1 && file.size <= 250 * 1024
      ? file : webp(bitmap, width * scale, height * scale, [0, 0, width, height], 250 * 1024);
    return await Promise.all([
      webp(bitmap, thumbWidth, thumbWidth * 420 / 640, region, 90 * 1024, [32, 21]),
      mainPhoto,
    ]);
  } finally {
    URL.revokeObjectURL(url);
  }
}
