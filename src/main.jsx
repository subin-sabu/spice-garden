import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { categories, previewMenu, fetchMenu, liveMenuEnabled, keralaDate, isSpecial, isAvailable, formatPrice } from './menu.js';
import { Icon } from './Icon.jsx';
import { DishCard, DishDialog, PlateDialog } from './Dining.jsx';
import './styles.css';
import './dining.css';

const allCategories = [['all', 'All dishes', 'all'], ...categories];
const table = new URLSearchParams(window.location.search).get('table')?.trim();
const tableLabel = table && /^[a-z0-9-]{1,12}$/i.test(table) ? table.toUpperCase() : null;
const plateKey = `spice-garden:plate:v1:${tableLabel ?? 'menu'}`;

function readPlate() {
  try {
    const entries = JSON.parse(localStorage.getItem(plateKey) ?? '[]');
    return new Map(entries.filter(([id, quantity]) => typeof id === 'string' &&
      Number.isInteger(quantity) && quantity > 0 && quantity <= 99));
  } catch {
    return new Map();
  }
}

function App() {
  const [category, setCategory] = useState('all');
  const [diet, setDiet] = useState('all');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState(liveMenuEnabled ? [] : previewMenu);
  const [status, setStatus] = useState(liveMenuEnabled ? 'loading' : 'ready');
  const [attempt, setAttempt] = useState(0);
  const [plate, setPlate] = useState(readPlate);
  const [dialog, setDialog] = useState(null);
  const [announcement, setAnnouncement] = useState({ text: '', key: 0 });
  const [date, setDate] = useState(() => keralaDate.format(new Date()));

  useEffect(() => {
    const timer = window.setInterval(() => setDate(keralaDate.format(new Date())), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!liveMenuEnabled) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    let active = true;
    fetchMenu(controller.signal).then((menu) => {
      if (!active) return;
      setItems(menu);
      setStatus('ready');
    }).catch(() => {
      if (active) setStatus('error');
    }).finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt]);

  useEffect(() => {
    try {
      localStorage.setItem(plateKey, JSON.stringify([...plate]));
    } catch {
      // The plate remains usable for this visit when storage is unavailable.
    }
  }, [plate]);

  function changeQuantity(item, delta) {
    if (delta > 0 && !isAvailable(item)) return;
    setPlate((previous) => {
      const updated = new Map(previous);
      const quantity = Math.min(99, (updated.get(item.id) ?? 0) + delta);
      if (quantity > 0) updated.set(item.id, quantity);
      else updated.delete(item.id);
      return updated;
    });
    setAnnouncement(({ key }) => ({
      text: `${delta > 0 ? 'Added' : 'Removed'} one ${item.name} ${delta > 0 ? 'to' : 'from'} My Plate.`,
      key: key + 1,
    }));
  }

  const catalog = new Map(items.map((item) => [item.id, item]));
  const rows = [...plate].map(([id, quantity]) => ({ id, quantity, item: catalog.get(id) }));
  const plateCount = rows.reduce((sum, row) => sum + row.quantity, 0);
  const subtotal = rows.length && rows.every(({ item }) => isAvailable(item) && item.price_paise != null)
    ? rows.reduce((sum, { item, quantity }) => sum + item.price_paise * quantity, 0)
    : null;
  const selectedDish = dialog?.type === 'dish' ? catalog.get(dialog.id) : null;
  const closeDialog = () => setDialog(null);

  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const hasFilters = category !== 'all' || diet !== 'all' || words.length > 0;
  const sectionName = allCategories.find(([id]) => id === category)?.[1];
  const results = items.filter((item) => {
    const categoryMatches = category === 'all' || (category === 'special' ? isSpecial(item, date) : item.category === category);
    const dietMatches = diet === 'all' || item.diet === diet;
    const searchable = `${item.name} ${item.description} ${categories.find(([id]) => id === item.category)?.[1] ?? ''}`.toLowerCase();
    return categoryMatches && dietMatches && words.every((word) => searchable.includes(word));
  }).sort((first, second) => Number(isAvailable(second)) - Number(isAvailable(first)));

  function resetFilters() {
    setCategory('all');
    setQuery('');
    setDiet('all');
  }

  return (
    <>
      <header className="topbar">
        <div className="frame bar-inner">
          <a className="brand" href="#top"><img src="/spice.svg" width="42" height="42" alt="" /><span><strong>Spice Garden</strong><small>BY AADISAKTTHI</small></span></a>
          {tableLabel && <span className="table-context">Table {tableLabel}</span>}
        </div>
      </header>

      <main className="frame" id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow"><span /> KOVALAM, KERALA</p>
            <h1 id="hero-title">Spice Garden</h1>
            <p className="intro">Coastal Kerala cooking at Aadisaktthi Resorts &amp; Spa.</p>
          </div>
        </section>

        <section id="menu" aria-label="Restaurant menu">
          <div className="menu-controls">
            <div className="search-row">
              <div className="search-box">
                <Icon name="search" size={21} />
                <input aria-label="Search dishes" type="search" placeholder="Search dishes"
                  value={query} onChange={(event) => { setQuery(event.target.value); setCategory('all'); }} />
                {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><Icon name="close" size={17} /></button>}
              </div>
              <select aria-label="Dietary preference" value={diet} onChange={(event) => setDiet(event.target.value)}>
                <option value="all">All diets</option><option value="veg">Vegetarian</option><option value="non-veg">Non-vegetarian</option>
              </select>
            </div>
            <nav className="categories" aria-label="Menu categories">
              {allCategories.map(([id, label]) => <button key={id} type="button" aria-pressed={category === id}
                onClick={() => setCategory(id)}>{label}</button>)}
            </nav>
          </div>

          {status === 'loading' && <div className="notice" role="status">Loading the menu…</div>}
          {status === 'error' && <div className="notice" role="alert">
            <p>The live menu is temporarily unavailable. Please ask your server for the current menu.</p>
            <button type="button" onClick={() => { setStatus('loading'); setAttempt((value) => value + 1); }}>Try again</button>
          </div>}
          {status === 'ready' && <>
            <div className="results-title"><h2>{words.length ? 'Search results' : category === 'all' ? 'The Menu' : sectionName}</h2>
              <span role="status">{results.length} {results.length === 1 ? 'dish' : 'dishes'}</span></div>
            {results.length > 0 ? <div className="dishes">
              {results.map((item, index) => <DishCard key={item.id} item={item} index={index} quantity={plate.get(item.id) ?? 0}
                onOpen={() => setDialog({ type: 'dish', id: item.id })} onChangeQuantity={(delta) => changeQuantity(item, delta)} />)}
            </div> : <div className="notice">
              <p>{category === 'special' && !words.length && diet === 'all' ? 'Ask your server about today’s specials.' :
                hasFilters ? 'No dishes match your filters.' : 'Please ask your server for the current menu.'}</p>
              {hasFilters && <button type="button" onClick={resetFilters}>See all dishes</button>}
            </div>}
          </>}
        </section>
      </main>

      <footer><div className="frame footer-inner">
        <div><strong>Spice Garden Restaurant</strong><p>Aadisaktthi Resorts &amp; Spa · Vellar, Kovalam</p></div>
        <p>{liveMenuEnabled ? 'Please ask your server about allergens and availability.' : 'Presentation menu · Sample prices and illustrative photography'}</p>
      </div></footer>

      {plateCount > 0 && <div className="plate-bar">
        <button className="plate-trigger" type="button" onClick={() => setDialog({ type: 'plate' })}>
          <span className="plate-trigger-copy">
            <strong>{plateCount} {plateCount === 1 ? 'item' : 'items'}{subtotal != null && ` · ${formatPrice(subtotal)}`}</strong>
            <small>Show your server when ready</small>
          </span>
          <span className="plate-trigger-action">View My Plate <Icon name="right" size={18} /></span>
        </button>
      </div>}
      <div className="sr-only" role="status" aria-atomic="true"><span key={announcement.key}>{announcement.text}</span></div>
      {selectedDish && <DishDialog key={selectedDish.id} item={selectedDish} date={date}
        preview={!liveMenuEnabled} quantity={plate.get(selectedDish.id) ?? 0}
        onChangeQuantity={(delta) => changeQuantity(selectedDish, delta)} onDismiss={closeDialog} />}
      {dialog?.type === 'plate' && <PlateDialog rows={rows} count={plateCount} subtotal={subtotal} menuReady={status === 'ready'}
        tableLabel={tableLabel} onChangeQuantity={changeQuantity} onDismiss={closeDialog} />}
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
