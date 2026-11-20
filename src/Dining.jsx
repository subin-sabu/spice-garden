import React, { useEffect, useRef, useState } from 'react';
import { dishMedia, formatPrice, isAvailable, isSpecial } from './menu.js';
import { Icon } from './Icon.jsx';

function DishMeta({ item, date }) {
  const label = item.category_name ?? 'Dish';
  return (
    <p className="dish-category">
      {item.diet !== 'unknown' && <span className={`diet-dot ${item.diet}`} role="img"
        aria-label={item.diet === 'veg' ? 'Vegetarian' : 'Non-vegetarian'} />}
      {label}
      {isSpecial(item, date) && <span className="special-tag">Today’s special</span>}
    </p>
  );
}

export function DishPhoto({ src, alt = '', loading = 'lazy' }) {
  const [loaded, setLoaded] = useState(null);
  const [failed, setFailed] = useState(null);
  if (!src || failed === src) return null;
  return <img className={loaded === src ? 'dish-photo-ready' : 'dish-photo-loading'} src={src}
    alt={loaded === src ? alt : ''} width="720" height="420" loading={loading} decoding="async"
    onLoad={() => setLoaded(src)} onError={() => setFailed(src)} />;
}

export function DishCard({ item, index, onOpen, plateAction }) {
  const { images } = dishMedia(item);
  const cover = item.thumbnail_url ?? images[0];
  const available = isAvailable(item);
  return (
    <article className="dish-card" onClick={(event) => {
      if (event.target.closest('button, a, input, select, textarea, label, [role="button"]')) return;
      if (window.getSelection()?.toString()) return;
      onOpen();
    }}>
      <div className="dish-visual">
        <DishPhoto src={cover} alt={item.name} loading={index < 3 ? 'eager' : 'lazy'} />
      </div>
      <div className="dish-content">
        <div>
          <div className="dish-heading">
            {item.diet !== 'unknown' && <span className={`diet-dot ${item.diet}`} role="img"
              aria-label={item.diet === 'veg' ? 'Vegetarian' : 'Non-vegetarian'} />}
            <h3>{item.name}</h3>
          </div>
          <p className="dish-description">{item.short_description || item.description || 'Ask your server about this dish.'}</p>
        </div>
        <p className="dish-price">{formatPrice(item.price_paise)}</p>
      </div>
      <div className="dish-bottom">
        {!available && <span className="dish-unavailable">Unavailable</span>}
        <button className="details-button" type="button" onClick={onOpen} aria-label={`View dish: ${item.name}`}>
          View dish <Icon name="right" size={15} />
        </button>
        {plateAction}
      </div>
    </article>
  );
}

export function Modal({ titleId, className, onDismiss, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const modal = ref.current;
    const opener = document.activeElement;
    modal.showModal();
    return () => {
      modal.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog ref={ref} className={`dining-modal ${className}`} aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onDismiss(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onDismiss(); }}>
      <div className="modal-surface">
        <button className="modal-close" type="button" onClick={onDismiss} aria-label="Close dialog"><Icon name="close" size={20} /></button>
        {children}
      </div>
    </dialog>
  );
}

function Gallery({ images, name, altText }) {
  const [index, setIndex] = useState(0);
  const touchStart = useRef(null);

  function step(direction) {
    setIndex((previous) => (previous + direction + images.length) % images.length);
  }

  return (
    <div className="gallery">
        <div className="gallery-stage" onTouchStart={(event) => {
          const touch = event.touches[0];
          touchStart.current = { x: touch.clientX, y: touch.clientY };
        }} onTouchEnd={(event) => {
          if (!touchStart.current || images.length < 2) return;
          const touch = event.changedTouches[0];
          const dx = touch.clientX - touchStart.current.x;
          const dy = touch.clientY - touchStart.current.y;
          touchStart.current = null;
          if (Math.abs(dx) > 38 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
        }} onTouchCancel={() => { touchStart.current = null; }}>
          <DishPhoto key={images[index]} src={images[index]} loading="eager"
            alt={altText?.[images[index]] || `${name} · photo ${index + 1}`} />
          {images.length > 1 && <>
            <button className="gallery-arrow prev" type="button" onClick={() => step(-1)} aria-label="Previous photo"><Icon name="left" /></button>
            <button className="gallery-arrow next" type="button" onClick={() => step(1)} aria-label="Next photo"><Icon name="right" /></button>
            <span className="gallery-counter" aria-live="polite">Photo {index + 1} / {images.length}</span>
          </>}
        </div>
      <div className="gallery-caption">
        {images.length > 1 && <div className="gallery-dots">
          {images.map((src, photo) => <button key={src} type="button" onClick={() => setIndex(photo)}
            aria-label={`Show photo ${photo + 1}`} aria-pressed={photo === index} />)}
        </div>}
      </div>
    </div>
  );
}

export function DishDialog({ item, date, pairing, onOpenPairing, onDismiss, plateAction }) {
  const { images } = dishMedia(item);
  return (
    <Modal titleId="dish-title" className="dish-modal" onDismiss={onDismiss}>
      <div className="dish-intro">
        <DishMeta item={item} date={date} />
        <h2 id="dish-title">{item.name}</h2>
        <p className="dish-detail-price">{formatPrice(item.price_paise)}{!isAvailable(item) && <span>Currently unavailable</span>}</p>
      </div>
      <Gallery images={images} name={item.name} altText={item.gallery_alts} />
      <div className="dish-story">
        <p>{item.description || 'Your server can tell you more about this dish.'}</p>
        {pairing && <aside className="dish-pairing">
          <h3>Try it with</h3>
          <button type="button" className="details-button" onClick={onOpenPairing}>
            {pairing.name} <Icon name="right" size={15} />
          </button>
          {item.pairing.note && <p>{item.pairing.note}</p>}
        </aside>}
        <div className="detail-plate">{plateAction}</div>
        <small>Please ask your server about allergens, spice level, and portion size.</small>
      </div>
    </Modal>
  );
}
