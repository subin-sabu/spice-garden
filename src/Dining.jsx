import React, { useEffect, useRef, useState } from 'react';
import { categories, dishMedia, formatPrice, isAvailable, isSpecial } from './menu.js';
import { Icon } from './Icon.jsx';

function DishMeta({ item, date }) {
  const label = categories.find(([id]) => id === item.category)?.[1] ?? 'Dish';
  return (
    <p className="dish-category">
      {item.diet !== 'unknown' && <span className={`diet-dot ${item.diet}`} role="img"
        aria-label={item.diet === 'veg' ? 'Vegetarian' : 'Non-vegetarian'} />}
      {label}
      {isSpecial(item, date) && <span className="special-tag">Today’s special</span>}
    </p>
  );
}

function QuantityControls({ name, quantity, onChange, canIncrease = true, minusRef }) {
  return (
    <div className="quantity-controls" role="group" aria-label={`${name} quantity controls`}>
      <button ref={minusRef} type="button" onClick={(event) => onChange(-1, event)}
        aria-label={quantity === 1 ? `Remove ${name}` : `Decrease ${name} quantity`}><Icon name="minus" size={16} /></button>
      <output aria-label={`${name} quantity`}>{quantity}</output>
      <button type="button" onClick={(event) => onChange(1, event)} disabled={!canIncrease || quantity >= 99}
        aria-label={`Increase ${name} quantity`}><Icon name="plus" size={16} /></button>
    </div>
  );
}

function AddToPlate({ name, quantity, onChange, available, fullLabel = false }) {
  const addRef = useRef(null);
  const minusRef = useRef(null);
  const restoreFocus = useRef(false);

  useEffect(() => {
    if (restoreFocus.current) {
      (quantity > 0 ? minusRef : addRef).current?.focus();
      restoreFocus.current = false;
    }
  }, [quantity]);

  function change(delta, event) {
    restoreFocus.current = event.detail === 0 && (quantity === 0 || (quantity === 1 && delta < 0));
    onChange(delta);
  }

  return quantity > 0 ? <QuantityControls name={name} quantity={quantity} onChange={change}
    canIncrease={available} minusRef={minusRef} /> :
    <button ref={addRef} className="add-button" type="button" disabled={!available} onClick={(event) => change(1, event)}
      aria-label={available ? `Add ${name} to My Plate` : `${name} unavailable`}>
      {available ? <><Icon name="plus" size={16} /> {fullLabel ? 'Add to My Plate' : 'Add'}</> : 'Unavailable'}
    </button>;
}

export function DishCard({ item, index, quantity, onOpen, onChangeQuantity }) {
  const { images } = dishMedia(item);
  const [badImage, setBadImage] = useState(null);
  const photo = images[0] !== badImage ? images[0] : null;
  const available = isAvailable(item);
  return (
    <article className="dish-card">
      <div className="dish-visual">
        <img src={photo ?? '/images/dish-placeholder.svg'} alt={photo ? item.name : ''} width="720" height="480"
          loading={index < 3 ? 'eager' : 'lazy'} decoding="async" onError={photo ? () => setBadImage(photo) : undefined} />
      </div>
      <div className="dish-content">
        <div>
          <div className="dish-heading">
            {item.diet !== 'unknown' && <span className={`diet-dot ${item.diet}`} role="img"
              aria-label={item.diet === 'veg' ? 'Vegetarian' : 'Non-vegetarian'} />}
            <h3>{item.name}</h3>
          </div>
          <p className="dish-description">{item.description || 'Ask your server about this dish.'}</p>
        </div>
        <p className="dish-price">{formatPrice(item.price_paise)}{!available && quantity > 0 && <small>Unavailable</small>}</p>
      </div>
      <div className="dish-bottom">
        <button className="details-button" type="button" onClick={onOpen} aria-label={`View details for ${item.name}`}>
          View details <Icon name="right" size={15} />
        </button>
        <AddToPlate name={item.name} quantity={quantity} onChange={onChangeQuantity} available={isAvailable(item)} />
      </div>
    </article>
  );
}

function Modal({ titleId, className, onDismiss, children }) {
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

function Gallery({ images, video, name, preview }) {
  const [index, setIndex] = useState(0);
  const [showVideo, setShowVideo] = useState(images.length === 0 && Boolean(video));
  const [badImages, setBadImages] = useState([]);
  const [videoError, setVideoError] = useState(false);
  const touchStart = useRef(null);

  function step(direction) {
    setIndex((previous) => (previous + direction + images.length) % images.length);
  }

  return (
    <div className="gallery">
      {video && images.length > 0 && <div className="gallery-switch" aria-label="Dish media">
        <button type="button" aria-pressed={!showVideo} onClick={() => setShowVideo(false)}><Icon name="camera" size={16} /> Photos</button>
        <button type="button" aria-pressed={showVideo} onClick={() => setShowVideo(true)}><Icon name="video" size={15} /> Video</button>
      </div>}
      {showVideo ? (
        <div className="gallery-stage">
          {videoError ? <p className="media-unavailable">This video is unavailable right now.</p> :
            <video src={video} poster={images[0]} controls playsInline preload="none" aria-label={`${name} video`}
              onError={() => setVideoError(true)} />}
        </div>
      ) : (
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
          {badImages.includes(images[index]) ? <p className="media-unavailable">This photo is unavailable right now.</p> :
            <img key={images[index]} src={images[index]} alt={`${name} · photo ${index + 1}`}
              onError={() => setBadImages((previous) => [...previous, images[index]])} />}
          {images.length > 1 && <>
            <button className="gallery-arrow prev" type="button" onClick={() => step(-1)} aria-label="Previous photo"><Icon name="left" /></button>
            <button className="gallery-arrow next" type="button" onClick={() => step(1)} aria-label="Next photo"><Icon name="right" /></button>
            <span className="gallery-counter" aria-live="polite">Photo {index + 1} / {images.length}</span>
          </>}
        </div>
      )}
      <div className="gallery-caption">
        {preview && images.length > 0 && <small>Illustrative photography</small>}
        {!showVideo && images.length > 1 && <div className="gallery-dots">
          {images.map((src, photo) => <button key={src} type="button" onClick={() => setIndex(photo)}
            aria-label={`Show photo ${photo + 1}`} aria-pressed={photo === index} />)}
        </div>}
      </div>
    </div>
  );
}

export function DishDialog({ item, date, preview, quantity, onChangeQuantity, onDismiss }) {
  const { images, video } = dishMedia(item);
  return (
    <Modal titleId="dish-title" className="dish-modal" onDismiss={onDismiss}>
      <div className="dish-intro">
        <DishMeta item={item} date={date} />
        <h2 id="dish-title">{item.name}</h2>
      </div>
      {(images.length > 0 || video) && <Gallery images={images} video={video} name={item.name} preview={preview} />}
      <div className="dish-story">
        <p>{item.description || 'Your server can tell you more about this dish.'}</p>
        <small>Please ask your server about allergens and availability.</small>
      </div>
      <div className="modal-bottom">
        <div className="modal-price"><span>{formatPrice(item.price_paise)}</span>{!isAvailable(item) && quantity > 0 && <small>Unavailable</small>}</div>
        <AddToPlate name={item.name} quantity={quantity} onChange={onChangeQuantity} available={isAvailable(item)} fullLabel />
      </div>
    </Modal>
  );
}

export function PlateDialog({ rows, count, subtotal, menuReady, tableLabel, onChangeQuantity, onDismiss }) {
  return (
    <Modal titleId="plate-title" className="plate-modal" onDismiss={onDismiss}>
      <div className="dish-intro">
        <p className="eyebrow"><span /> {tableLabel ? `TABLE ${tableLabel}` : 'AT YOUR TABLE'}</p>
        <h2 id="plate-title">My Plate</h2>
        <p className="plate-intro">Show this list to your server when they come to your table.</p>
      </div>
      {rows.length > 0 ? <ul className="plate-list">
        {rows.map(({ id, quantity, item }) => {
          const name = item?.name ?? (menuReady ? 'Dish no longer on the menu' : 'Saved dish');
          const dish = item ?? { id, name };
          return <li key={id}>
            <div><strong>{name}</strong><small>{item ? (isAvailable(item) ? formatPrice(item.price_paise == null ? null : item.price_paise * quantity) : 'Currently unavailable') :
              menuReady ? 'Please check with your server' : 'Menu details unavailable'}</small></div>
            <QuantityControls name={name} quantity={quantity} canIncrease={isAvailable(item)}
              onChange={(delta) => onChangeQuantity(dish, delta)} />
          </li>;
        })}
      </ul> : <div className="plate-empty"><Icon name="plate" size={36} /><h3>Your plate is empty</h3><p>Add a dish from the menu to keep it here.</p></div>}
      <div className="modal-bottom">
        <div className="modal-price">
          <span>{subtotal == null ? `${count} ${count === 1 ? 'item' : 'items'}` : formatPrice(subtotal)}</span>
          {subtotal != null && <small>Menu subtotal</small>}
        </div>
        <button className="plate-primary" type="button" onClick={onDismiss}>Back to menu <Icon name="right" size={16} /></button>
      </div>
    </Modal>
  );
}
