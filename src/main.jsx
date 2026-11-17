import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { InstallPrompt } from './InstallPrompt.jsx';
import { keralaDate, isSpecial, isAvailable, formatPrice, dishMedia, homepageCopy, matchesSearch, searchTerms, homepageCollections } from './menu.js';
import { Icon } from './Icon.jsx';
import { DishCard, DishDialog } from './Dining.jsx';
import './styles.css';
import { liveMenuEnabled, loadGuestMenu, photoUrl } from './backend.js';
import { Plate, PlateButton, usePlate } from './Plate.jsx';
import './dining.css';
import './discovery.css';

const table = new URLSearchParams(window.location.search).get('table')?.trim();
const tableLabel = table && /^[a-z0-9-]{1,12}$/i.test(table) ? table.toUpperCase() : null;
function App() {
  const [category, setCategory] = useState('all');
  const [diet, setDiet] = useState('all');
  const [query, setQuery] = useState('');
  const [settledQuery, setSettledQuery] = useState('');
  const [menu, setMenu] = useState(null);
  const plate = usePlate(tableLabel);
  const [status, setStatus] = useState(liveMenuEnabled ? 'loading' : 'unconfigured');
  const [attempt, setAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [date, setDate] = useState(() => keralaDate.format(new Date()));

  useEffect(() => {
    const timer = window.setInterval(() => setDate(keralaDate.format(new Date())), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!liveMenuEnabled) return;
    let active = true;
    loadGuestMenu().then((result) => {
      if (!active) return;
      setMenu(result);
      setStatus('ready');
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [attempt]);

  useEffect(() => {
    if (!query) return;
    const timer = window.setTimeout(() => setSettledQuery(query), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const items = menu ? menu.items.map((item) => {
    const images = menu.images.filter((image) => image.item_id === item.id);
    return {
      ...item,
      category_name: menu.categories.find((entry) => entry.id === item.category)?.name,
      thumbnail_url: images[0] && photoUrl(images[0].thumbnail_path),
      image_urls: [...images.map((image) => photoUrl(image.image_path)), ...(item.image_urls ?? [])],
      gallery_alts: Object.fromEntries(images.map((image) => [photoUrl(image.image_path), image.alt_text])),
      pairing: item.paired_item_id ? { id: item.paired_item_id } : null,
    };
  }) : [];
  const collections = homepageCollections(menu?.collections ?? [], menu?.memberships ?? [], items, date);
  const featured = items.find((item) => item.id === menu?.homepage?.featured_item_id && isAvailable(item));
  const featuredPhoto = featured && dishMedia(featured).images[0];
  const copy = homepageCopy(menu?.homepage, featured);
  const bannerPath = menu?.homepage?.default_banner_path;
  const heroPhoto = featuredPhoto || (bannerPath ? photoUrl(bannerPath) : null);
  const allCategories = [['all', 'All dishes'], ...(menu?.categories ?? []).map(({ id, name }) => [id, name])];
  const selectedDish = items.find((item) => item.id === selectedId);
  const pairing = items.find((item) => item.id === selectedDish?.pairing?.id);
  const openDish = (item) => setSelectedId(item.id);

  const words = searchTerms(query && settledQuery);
  const hasFilters = category !== 'all' || diet !== 'all' || words.length > 0;
  const sectionName = allCategories.find(([id]) => id === category)?.[1];
  const results = items.filter((item) => {
    const categoryMatches = words.length > 0 || category === 'all' || item.category === category;
    const dietMatches = diet === 'all' || item.diet === diet;
    return categoryMatches && dietMatches &&
      matchesSearch(words, item.name, item.short_description, item.description, item.category_name);
  }).sort((first, second) => Number(isAvailable(second)) - Number(isAvailable(first)));

  function clearSearch() {
    setQuery('');
    setSettledQuery('');
  }

  function leaveSearch(event) {
    if (!event.relatedTarget?.closest?.('.search-box, [data-search-results]')) clearSearch();
  }

  function resetFilters() {
    setCategory('all');
    clearSearch();
    setDiet('all');
  }

  return (
    <>
      <header className="topbar">
        <div className="frame bar-inner">
          <a className="brand" href="#top"><img src="/icons/logo.png" alt="" width="42" height="42" /><span><strong>Spice Garden</strong><small>BY AADISAKTTHI</small></span></a>
          {tableLabel && <span className="table-context">Table {tableLabel}</span>}
        </div>
      </header>

      <main className="frame" id="top">
        <InstallPrompt />
        <section className="discovery-hero" aria-labelledby="hero-title">
          {heroPhoto && <img className="discovery-hero-photo" src={heroPhoto} alt="" fetchPriority="high" />}
          <div className="hero-copy">
            <p className="eyebrow"><span /> SPICE GARDEN · KOVALAM</p>
            <h1 id="hero-title">{copy.headline}</h1>
            <p className="intro">{copy.subtitle}</p>
            {featured && <p className="hero-price">{formatPrice(featured.price_paise)}</p>}
            <div className="discovery-hero-actions">
              {featured && <button className="discovery-action" type="button" onClick={() => openDish(featured)}>
                Explore dish <Icon name="right" size={16} />
              </button>}
              <a className="menu-jump" href="#menu">Browse full menu <Icon name="down" size={15} /></a>
            </div>
          </div>
        </section>

        {collections.map(({ collection, dishes }, index) => <section key={collection.id} className="discovery-picks" aria-labelledby={`collection-title-${index}`}>
          <p className="eyebrow"><span /> FROM THE KITCHEN</p>
          <h2 id={`collection-title-${index}`}>{collection.name}</h2>
          <div className="picks-grid">
            {dishes.map((item) => {
              const photo = item.thumbnail_url ?? dishMedia(item).images[0];
              return <article key={item.id} className="pick-card">
                <button className="pick-open" type="button" onClick={() => openDish(item)} aria-label={`Explore ${item.name}`}>
                  {photo && <img src={photo} alt="" width="720" height="480" loading="lazy" />}
                  <span className="pick-content"><span><strong>{item.name}</strong>
                    <span className="pick-note">{item.tasting_note || item.short_description || item.description}</span></span><Icon name="right" size={19} /></span>
                </button>

              </article>;
            })}
          </div>
        </section>)}

        <section id="menu" aria-label="Restaurant menu">
          <div className="menu-controls">
            <div className="search-row">
              <div className="search-box" onBlur={leaveSearch}>
                <Icon name="search" size={21} />
                <input aria-label="Search dishes" type="search" placeholder="Search the full menu"
                  value={query} onChange={(event) => {
                    if (event.target.value) setQuery(event.target.value);
                    else clearSearch();
                  }} />
                {query && <button type="button" onClick={clearSearch} aria-label="Clear search"><Icon name="close" size={17} /></button>}
              </div>
              <select aria-label="Dietary preference" value={diet} onClick={clearSearch} onChange={(event) => { clearSearch(); setDiet(event.target.value); }}>
                <option value="all">All diets</option><option value="veg">Vegetarian</option><option value="non-veg">Non-vegetarian</option>
              </select>
            </div>
            <nav className="categories" aria-label="Menu categories">
              {allCategories.map(([id, label]) => <button key={id} type="button" aria-pressed={category === id}
                onClick={() => { clearSearch(); setCategory(id); }}>{label}</button>)}
            </nav>
          </div>

          {status === 'unconfigured' && <div className="notice" role="status">The online menu is being set up. Please ask your server for the current menu.</div>}
          {status === 'loading' && <div className="notice" role="status">Loading the menu…</div>}
          {status === 'error' && <div className="notice" role="alert">
            <p>The live menu is temporarily unavailable. Please ask your server for the current menu.</p>
            <button type="button" onClick={() => { setStatus('loading'); setAttempt((value) => value + 1); }}>Try again</button>
          </div>}
          {status === 'ready' && <>
            <div className="results-title"><h2>{words.length ? 'Search results' : category === 'all' ? 'The Menu' : sectionName}</h2>
              <span role="status">{results.length} {results.length === 1 ? 'dish' : 'dishes'}</span></div>
            {results.length > 0 ? <div className="dishes" data-search-results onBlur={leaveSearch}
              onPointerDown={(event) => {
                if (query && document.activeElement?.closest('.search-box') && event.target.closest?.('button')) event.preventDefault();
              }}>
              {results.map((item, index) => <DishCard key={item.id} item={item} index={index}
                onOpen={() => openDish(item)} plateAction={<PlateButton item={item} plate={plate} />} />)}
            </div> : <div className="notice">
              <p>{hasFilters ? 'No dishes match your filters.' : 'Please ask your server for the current menu.'}</p>
              {hasFilters && <button type="button" onClick={resetFilters}>See all dishes</button>}
            </div>}
          </>}
        </section>
      </main>

      <footer><div className="frame footer-inner">
        <div><strong>Spice Garden Restaurant</strong><p>Aadisaktthi Resorts &amp; Spa · Vellar, Kovalam</p></div>
        <p>Please ask your server about allergens and availability.</p>
      </div></footer>

      <Plate plate={plate} items={items} tableLabel={tableLabel} />
      {selectedDish && <DishDialog key={selectedDish.id} item={selectedDish} date={date}
        plateAction={<PlateButton item={selectedDish} plate={plate} />} pairing={pairing} onOpenPairing={() => openDish(pairing)}
        onDismiss={() => setSelectedId(null)} />}
    </>
  );
}

const root = createRoot(document.getElementById('root'));
if (window.location.pathname.replace(/\/$/, '') === '/admin') {
  import('./Admin.jsx').then(({ default: Admin }) => root.render(<Admin />));
} else {
  root.render(<App />);
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch((error) => {
    console.warn('Spice Garden offline setup failed.', error);
  });
}
