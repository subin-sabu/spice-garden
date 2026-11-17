import React, { useEffect, useMemo, useRef, useState } from 'react';
import { checked, createRecoveryClient, loadMenu, photos, photoUrl, supabase } from './backend.js';
import './admin.css';
import { PasswordField } from './PasswordField.jsx';
import { dishMedia, homepageCopy, matchesSearch, searchTerms } from './menu.js';
import { centeredCrop, CropControls, imageAccept, imageDecodeError, optimizePhoto } from './photo-crop.jsx';

const blankDish = { name: '', category: '', description: '', short_description: '', diet: 'veg',
  price_paise: null, paired_item_id: null, published: false, is_available: true, sort_order: 0 };
function photoId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
}

const normalize = (name) => name.trim().replace(/\s+/g, ' ').toLowerCase();

function findTitleMatches(name, entries, editingId) {
  const title = normalize(name);
  const terms = searchTerms(title);
  const candidates = entries.filter((entry) => entry.id !== editingId);
  const duplicate = candidates.find((entry) => normalize(entry.name) === title);
  const matches = title.length >= 2 && terms.length && !duplicate
    ? candidates.filter((entry) => matchesSearch(terms, entry.name)).slice(0, 6) : [];
  return { duplicate, matches };
}

function TitleMatches({ duplicate, matches }) {
  return <div id="admin-title-matches" className="admin-name-matches" aria-live="polite">
    {duplicate && <p>“{duplicate.name}” already exists.</p>}
    {matches.length > 0 && <>
      <p>Similar titles</p>
      <ul>{matches.map((entry) => <li key={entry.id}>{entry.name}</li>)}</ul>
    </>}
  </div>;
}

export default function Admin() {
  const [stage, setStage] = useState(supabase ? 'checking' : 'offline');
  const [account, setAccount] = useState('');
  const [expiresAt, setExpiresAt] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const actionPending = useRef(false);
  const recovery = useRef(null);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [verified, setVerified] = useState(false);

  function leaveRecovery() {
    if (recovery.current) void recovery.current.auth.signOut({ scope: 'local' }).catch(() => {});
    recovery.current = null;
    setVerified(false);
    setMessage('');
    setStage('login');
  }

  function requestCode(event) {
    event.preventDefault();
    const email = new FormData(event.currentTarget).get('email').trim();
    void run(async () => {
      recovery.current ??= createRecoveryClient();
      await checked(recovery.current.auth.resetPasswordForEmail(email));
      setRecoveryEmail(email);
      setStage('reset');
      setMessage('If this account exists, a recovery code has been sent.');
    });
  }

  function resetPassword(event) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const password = fields.get('password');
    if (password !== fields.get('confirmation')) {
      setMessage('The passwords do not match.');
      return;
    }
    void run(async () => {
      const auth = recovery.current.auth;
      if (!verified) {
        await checked(auth.verifyOtp({ email: recoveryEmail, token: fields.get('code').trim(), type: 'recovery' }));
        setVerified(true);
      }
      await checked(auth.updateUser({ password }));
      leaveRecovery();
      setMessage('Password updated. Sign in with your new password.');
    });
  }

  async function run(action) {
    if (actionPending.current) return false;
    actionPending.current = true;
    setBusy(true);
    setMessage('');
    try { await action(); return true; }
    catch (error) { setMessage(error.message); return false; }
    finally { actionPending.current = false; setBusy(false); }
  }

  async function signOut() {
    await checked(supabase.auth.signOut({ scope: 'local' }));
    setStage('login');
    setExpiresAt(null);
    setAccount('');
  }

  async function check() {
    const { session } = await checked(supabase.auth.getSession());
    if (!session) { setStage('login'); return; }
    const deadline = Date.parse(await checked(supabase.rpc('menu_admin_expires_at')));
    if (!(deadline > Date.now())) {
      await signOut();
      setMessage('This account has no active admin session. Use the authorised staff email and password.');
      return;
    }
    setAccount(session.user.email ?? '');
    setExpiresAt(deadline);
    setStage('ready');
  }

  useEffect(() => {
    if (supabase) void run(async () => {
      try { await check(); }
      catch (error) { setStage('login'); throw error; }
    });
  }, []);

  useEffect(() => {
    if (!expiresAt) return;
    const expire = () => {
      if (Date.now() < expiresAt) return;
      setStage('login');
      setExpiresAt(null);
      setMessage('Your two-hour session expired. Sign in again.');
      void supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    };
    const timer = window.setTimeout(expire, Math.max(0, expiresAt - Date.now()));
    window.addEventListener('focus', expire);
    return () => { window.clearTimeout(timer); window.removeEventListener('focus', expire); };
  }, [expiresAt]);

  function signIn(event) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    void run(async () => {
      await checked(supabase.auth.signInWithPassword({
        email: fields.get('email').trim(),
        password: fields.get('password'),
      }));
      await check();
    });
  }

  return <main className="admin frame">
    {stage === 'ready' ? <>
      <header className="admin-header">
        <div><a className="admin-brand" href="/"><img src="/icons/logo.png" alt="" width="24" height="24" />Spice Garden · View guest menu</a><h1>Menu management</h1></div>
        <div className="admin-account">
          <span>{account}</span>
          <button onClick={() => run(signOut)} disabled={busy}>Sign out</button>
        </div>
      </header>
      {message && <p className="admin-message" role="status">{message}</p>}
      <Workspace run={run} busy={busy} setMessage={setMessage} />
    </> : <section className="admin-access">
      <div className="admin-access-photo">
        <a className="admin-brand" href="/"><img src="/icons/logo.png" alt="" width="44" height="44" />Spice Garden</a>
        <p>By Aadisaktthi · Kovalam</p>
      </div>
      <div className="admin-access-content">
        <a className="admin-back" href="/">← Guest menu</a>
        <h1>Menu administration</h1>
        <p>Manage dishes, photos and specials.</p>
        {message && <p className="admin-message" role="status">{message}</p>}
        {stage === 'offline' && <p>Connect Supabase to enable staff sign-in. Setup is in README.md.</p>}
        {stage === 'checking' && <p role="status">Checking your session…</p>}
        {stage === 'login' && <form className="admin-login" onSubmit={signIn}>
          <label>Email <input name="email" type="email" autoComplete="username" required /></label>
          <PasswordField label="Password" name="password" autoComplete="current-password" />
          <button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          <button type="button" disabled={busy} onClick={() => { setMessage(''); setStage('forgot'); }}>Forgot password?</button>
        </form>}
        {stage === 'forgot' && <form className="admin-login" onSubmit={requestCode}>
          <label>Staff email <input name="email" type="email" autoComplete="email" defaultValue={recoveryEmail} required /></label>
          <button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send recovery code'}</button>
          <button type="button" disabled={busy} onClick={leaveRecovery}>Back to sign in</button>
        </form>}
        {stage === 'reset' && <form className="admin-login" onSubmit={resetPassword}>
          <p>{recoveryEmail}</p>
          {!verified && <label>Recovery code <input name="code" inputMode="numeric" autoComplete="one-time-code"
            pattern="[0-9]+" required /></label>}
          <PasswordField label="New password" name="password" autoComplete="new-password" minLength={8} />
          <PasswordField label="Confirm new password" name="confirmation" autoComplete="new-password" minLength={8} />
          <button type="submit" disabled={busy}>{busy ? 'Updating…' : 'Set new password'}</button>
          <button type="button" disabled={busy} onClick={() => { leaveRecovery(); setStage('forgot'); }}>Request another code</button>
          <button type="button" disabled={busy} onClick={leaveRecovery}>Back to sign in</button>
        </form>}
      </div>
    </section>}
  </main>;
}

function Workspace({ run, busy, setMessage }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('Availability');
  const [selected, setSelected] = useState('');
  const panelTitle = useRef(null);
  const revealPanel = useRef(false);
  const drafts = useRef(new Set());

  function markDraft(key, dirty = true) {
    if (dirty) drafts.current.add(key);
    else drafts.current.delete(key);
  }

  function navigate(nextTab, nextSelection) {
    if (nextTab === tab && nextSelection === selected) return;
    if (drafts.current.size && !window.confirm('Discard unsaved changes and continue? Choose Cancel to return and save.')) return;
    drafts.current.clear();
    revealPanel.current = true;
    if (window.location.hash === '#dish-photos') {
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
    }
    setSelected(nextSelection);
    setTab(nextTab);
  }

  useEffect(() => {
    if (!revealPanel.current || !panelTitle.current) return;
    revealPanel.current = false;
    panelTitle.current.focus({ preventScroll: true });
    panelTitle.current.scrollIntoView({ block: 'start' });
  }, [tab, selected]);
  const refresh = async () => setData(await loadMenu());
  useEffect(() => { void refresh().catch((error) => setMessage(error.message)); }, []);

  const save = (table, values, id) => run(async () => {
    const query = supabase.from(table);
    const saved = await checked((id ? query.update(values).eq('id', id) : query.insert(values)).select('id').single());
    await refresh();
    if (!id) {
      revealPanel.current = true;
      setSelected(saved.id);
    }
    setMessage('Saved.');
  });
  const remove = (table, id, prompt = 'Delete this entry?') => {
    if (!window.confirm(prompt)) return;
    void run(async () => {
      await checked(supabase.from(table).delete().eq('id', id).select('id').single());
      drafts.current.clear();
      revealPanel.current = true;
      setSelected('');
      await refresh();
      setMessage('Deleted.');
    });
  };

  if (!data) return <button disabled={busy} onClick={() => run(refresh)}>Load menu</button>;
  const table = { Categories: 'menu_categories', Collections: 'special_collections' }[tab];
  const rows = tab === 'Categories' ? data.categories : data.collections;
  const dish = data.items.find((item) => item.id === selected);
  const collection = data.collections.find((item) => item.id === selected);
  const categoryDishes = tab === 'Categories' ? data.items.filter((item) => item.category === selected) : [];
  const collectionCount = tab === 'Collections' ? data.memberships.filter((row) => row.collection_id === selected).length : 0;
  return <>
    <div className="admin-stats">
      <div><strong>{data.items.length}</strong><span>Dishes</span></div>
      <div><strong>{data.items.filter((item) => item.published).length}</strong><span>Published</span></div>
      <div><strong>{data.categories.length}</strong><span>Categories</span></div>
      <div><strong>{data.collections.length}</strong><span>Collections</span></div>
    </div>
    <div className="admin-workspace">
    <nav className="admin-tabs" aria-label="Admin sections">
      {['Availability','Homepage','Collections','Categories','Dishes','Photo cleanup'].map((name) => <button key={name} disabled={busy}
        aria-pressed={name === tab} onClick={() => { if (name !== tab) navigate(name, ''); }}>{name}</button>)}
    </nav>
    <section className="admin-panel" key={JSON.stringify([tab, selected])} aria-label={tab} aria-busy={busy}>
    <h2 className="admin-panel-title" ref={panelTitle} tabIndex={-1}>{tab}</h2>
    {tab === 'Dishes' && <>
      <label>Choose dish <select disabled={busy} value={selected} onChange={(event) => navigate(tab, event.target.value)}>
        <option value="">New dish</option>{data.items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>
      {dish && <div className="admin-actions"><a className="admin-jump" href="#dish-photos">Manage photos</a><button disabled={busy} onClick={() => save('menu_items', { is_available: !dish.is_available }, dish.id)}>
        {dish.is_available ? 'Mark unavailable' : 'Mark available'}
      </button></div>}
      <DishEditor dish={dish} data={data} busy={busy} save={save}
        remove={dish ? () => remove('menu_items', dish.id,
          `Permanently delete “${dish.name}”? You can make it unavailable or unpublish it to hide it instead. Select OK to delete.`) : null} onDraft={(dirty) => markDraft('dish', dirty)} />
      {!dish && <p className="admin-hint">Save the dish to add up to four photos.</p>}
      {dish && <PhotoEditor key={dish.id} dish={dish} images={data.images.filter((image) => image.item_id === dish.id)}
        busy={busy} run={run} refresh={refresh} onDraft={(dirty) => markDraft('photo', dirty)} />}
    </>}
    {tab === 'Availability' && <Availability data={data} busy={busy} save={save} />}
    {table && <>
      <label>Choose entry <select disabled={busy} value={selected} onChange={(event) => navigate(tab, event.target.value)}>
        <option value="">New {tab === 'Categories' ? 'category' : 'collection'}</option>
        {rows.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
      </select></label>
      <TaxonomyEditor key={tab + selected} row={rows.find((row) => row.id === selected)} entries={rows} busy={busy}
        save={(values) => save(table, values, selected)} onDraft={(dirty) => markDraft('taxonomy', dirty)} remove={selected ? () => remove(table, selected) : null}
        blockedReason={categoryDishes.length ? `Move all ${categoryDishes.length} dishes before deleting this category.` :
          collectionCount ? `Remove all ${collectionCount} dishes before deleting this collection.` : ''} />
      {tab === 'Categories' && selected && <CategoryDishes dishes={categoryDishes} categories={data.categories}
        categoryId={selected} busy={busy} save={save} />}
      {tab === 'Collections' && collection && <MembershipEditor collection={collection} data={data} busy={busy} run={run} refresh={refresh} />}
    </>}
    {tab === 'Homepage' && <>
      <Homepage data={data} busy={busy} save={save} />
      <BannerPhoto homepage={data.homepage} busy={busy} run={run} refresh={refresh} setMessage={setMessage} />
    </>}
    {tab === 'Photo cleanup' && <PhotoCleanup busy={busy} run={run} setMessage={setMessage} />}
    </section>
    </div>
  </>;
}

function CategoryDishes({ dishes, categories, categoryId, busy, save }) {
  return <section className="admin-form">
    <h2>Dishes in this category ({dishes.length})</h2>
    {dishes.length === 0 ? <p>This category is empty.</p> : <ul className="admin-availability admin-category-dishes">
      {dishes.map((dish) => <li key={dish.id}>
        <strong>{dish.name}</strong>
        <select aria-label={`Move ${dish.name} to another category`} value="" disabled={busy || categories.length < 2}
          onChange={(event) => save('menu_items', { category: event.target.value }, dish.id)}>
          <option value="" disabled>Move to…</option>
          {categories.filter((entry) => entry.id !== categoryId).map((entry) =>
            <option value={entry.id} key={entry.id}>{entry.name}</option>)}
        </select>
      </li>)}
    </ul>}
  </section>;
}

function Availability({ data, busy, save }) {
  const [view, setView] = useState('category');
  const labels = new Map(data.categories.map((entry) => [entry.id, entry.name]));
  const dishes = [...data.items].sort((first, second) => first.name.localeCompare(second.name));
  if (!dishes.length) return <p>Add a dish to manage its availability.</p>;
  const groups = new Map();
  for (const dish of dishes) {
    const key = view === 'category' ? dish.category : '';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(dish);
  }
  if (view === 'unavailable') {
    dishes.sort((first, second) => Number(first.is_available) - Number(second.is_available));
    groups.set('', dishes);
  }
  const groupKeys = view === 'category'
    ? [...new Set([...labels.keys(), ...groups.keys()])].filter((key) => groups.has(key)) : [''];
  return <>
    <label>View <select value={view} onChange={(event) => setView(event.target.value)}>
      <option value="category">By category</option><option value="alphabetical">Alphabetical</option>
      <option value="unavailable">Unavailable first</option>
    </select></label>
    {groupKeys.map((key) => <div key={key}>
      {key && <h3>{labels.get(key) ?? 'Uncategorised'}</h3>}
      <ul className="admin-availability">
        {groups.get(key).map((dish) => <li key={dish.id}>
          <div><strong>{dish.name}</strong>
            <small>{labels.get(dish.category)}{!dish.published && ' · Draft'}</small></div>
          <button type="button" aria-pressed={dish.is_available} aria-label={`Available: ${dish.name}`} disabled={busy}
            onClick={() => save('menu_items', { is_available: !dish.is_available }, dish.id)}>
            {dish.is_available ? 'Available' : 'Unavailable'}
          </button>
        </li>)}
      </ul>
    </div>)}
  </>;
}

function TaxonomyEditor({ row, entries, busy, save, remove, blockedReason, onDraft }) {
  const [name, setName] = useState(row?.name ?? '');
  const { duplicate, matches } = findTitleMatches(name, entries, row?.id);
  return <form className="admin-form" onChange={() => onDraft(true)} onSubmit={(event) => {
    event.preventDefault();
    if (duplicate || !normalize(name)) return;
    const fields = new FormData(event.currentTarget);
    void save({ name: fields.get('name').trim(), sort_order: Number(fields.get('order')), is_visible: fields.has('visible') }).then((saved) => { if (saved) onDraft(false); });
  }}>
    <label>Name <input name="name" required maxLength={80} value={name}
      onChange={(event) => setName(event.target.value)} aria-invalid={Boolean(duplicate)} aria-describedby="admin-title-matches" /></label>
    <TitleMatches duplicate={duplicate} matches={matches} />
    <label>Sort order <input name="order" type="number" defaultValue={row?.sort_order ?? 0} /></label>
    <label><input name="visible" type="checkbox" defaultChecked={row?.is_visible ?? true} /> Visible on guest menu</label>
    {blockedReason && <p>{blockedReason}</p>}
    <div className="admin-actions"><button disabled={busy || Boolean(duplicate)}>Save</button>
      {remove && <button type="button" disabled={busy || Boolean(blockedReason)} onClick={remove}>Delete</button>}</div>
  </form>;
}

function DishEditor({ dish, data, save, busy, onDraft, remove }) {
  const values = dish ?? blankDish;
  const cover = data.images.find((image) => image.item_id === dish?.id);
  const previewPhoto = cover ? photoUrl(cover.thumbnail_path) : dishMedia(values).images[0];
  const [name, setName] = useState(values.name);
  const [shortDescription, setShortDescription] = useState(values.short_description ?? '');
  const [description, setDescription] = useState(values.description);
  const [available, setAvailable] = useState(values.is_available);
  useEffect(() => setAvailable(values.is_available), [values.is_available]);
  const otherDishes = useMemo(() => data.items.filter((item) => item.id !== dish?.id), [data.items, dish?.id]);
  const { duplicate, matches } = findTitleMatches(name, otherDishes);
  return <form className="admin-form" onChange={() => onDraft(true)} onSubmit={(event) => {
    event.preventDefault();
    if (duplicate) return;
    const fields = new FormData(event.currentTarget);
    const text = (key) => fields.get(key).trim();
    const [whole, fraction = ''] = text('price').split('.');
    void save('menu_items', {
      name: name.trim().replace(/\s+/g, ' '), category: text('category'), diet: text('diet'),
      description: text('description'), short_description: text('short_description'),
      price_paise: whole ? Number(whole) * 100 + Number(fraction.padEnd(2, '0')) : null,
      ...(fields.has('clear_legacy') ? { image_urls: [], image_url: null } : {}),
      paired_item_id: text('paired_item_id') || null,
      published: fields.has('published'), is_available: fields.has('available'), sort_order: Number(text('order')),
    }, dish?.id).then((saved) => { if (saved) onDraft(false); });
  }}>
    <label>Dish name <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120}
      aria-invalid={Boolean(duplicate)} aria-describedby="admin-title-matches" /></label>
    <TitleMatches duplicate={duplicate} matches={matches} />
    <label>Regular category <select name="category" required defaultValue={values.category}>
      <option value="">Select category</option>{data.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
    </select></label>
    <label>Diet <select name="diet" required defaultValue={values.diet === 'unknown' ? '' : values.diet}>
      <option value="">Select diet</option><option value="veg">Veg</option><option value="non-veg">Non-veg</option>
    </select></label>
    <label>Base price in rupees <input name="price" inputMode="decimal" pattern="[0-9]{1,7}([.][0-9]{1,2})?"
      defaultValue={values.price_paise == null ? '' : (values.price_paise / 100).toFixed(2)} /></label>
    <label>Short description <textarea name="short_description" maxLength={250} value={shortDescription} onChange={(event) => setShortDescription(event.target.value)} /></label>
    <label>Full description <textarea name="description" maxLength={3000} rows={5} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
    <label>Try it with <select name="paired_item_id" defaultValue={values.paired_item_id ?? ''}>
      <option value="">No pairing</option>{otherDishes.map((item) => <option key={item.id} value={item.id}>
        {item.name} · {data.categories.find((category) => category.id === item.category)?.name}
      </option>)}
    </select></label>
    {(values.image_urls?.length > 0 || values.image_url) && <label><input name="clear_legacy" type="checkbox" /> Remove imported gallery photos</label>}
    <label>Sort order <input name="order" type="number" defaultValue={values.sort_order} /></label>
    <label><input name="published" type="checkbox" defaultChecked={values.published} /> Published</label>
    <label><input name="available" type="checkbox" checked={available} onChange={(event) => setAvailable(event.target.checked)} /> Available</label>
    <details className="admin-preview"><summary>Preview dish</summary>
      {previewPhoto && <img className="admin-crop" src={previewPhoto} alt={name} />}
      <article><h3>{name || 'Dish name'}</h3><p>{shortDescription || description}</p></article>
      {description && <p>{description}</p>}
    </details>
    <div className="admin-actions">
      <button disabled={busy || Boolean(duplicate)}>Save dish</button>
      {remove && <button type="button" className="admin-delete-dish" disabled={busy} onClick={remove}>Delete dish</button>}
    </div>
  </form>;
}

function MembershipEditor({ collection, data, busy, run, refresh }) {
  const [dishId, setDishId] = useState('');
  const memberships = data.memberships.filter((row) => row.collection_id === collection.id);
  const remaining = data.items.filter((item) => !memberships.some((row) => row.item_id === item.id));
  const mutate = (request) => run(async () => { await checked(request); await refresh(); });
  return <section className="admin-form">
    <h2>Dishes in this collection</h2>
    <form className="admin-actions" onSubmit={(event) => {
      event.preventDefault();
      if (!dishId) return;
      void mutate(supabase.from('collection_items').insert({ collection_id: collection.id, item_id: dishId,
        sort_order: Math.max(0, ...memberships.map((row) => row.sort_order)) + 10 })).then(() => setDishId(''));
    }}>
      <select aria-label="Dish to add to collection" value={dishId} onChange={(event) => setDishId(event.target.value)}>
        <option value="">Select an existing dish</option>{remaining.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
      <button disabled={busy || !dishId}>Add to collection</button>
    </form>
    {memberships.map((row) => <form key={row.item_id} className="admin-actions" onSubmit={(event) => {
      event.preventDefault();
      const sort_order = Number(new FormData(event.currentTarget).get('order'));
      void mutate(supabase.from('collection_items').update({ sort_order }).eq('collection_id', collection.id).eq('item_id', row.item_id));
    }}>
      <strong>{data.items.find((item) => item.id === row.item_id)?.name}</strong>
      <input name="order" aria-label="Dish position" type="number" defaultValue={row.sort_order} />
      <button disabled={busy}>Save order</button>
      <button type="button" disabled={busy} onClick={() => mutate(supabase.from('collection_items').delete()
        .eq('collection_id', collection.id).eq('item_id', row.item_id))}>Remove</button>
    </form>)}
  </section>;
}

function Homepage({ data, busy, save }) {
  const active = data.items.filter((item) => item.published && item.is_available &&
    data.categories.some((category) => category.id === item.category && category.is_visible));
  const homepage = data.homepage ?? {};
  const [dishId, setDishId] = useState(homepage.featured_item_id ?? '');
  useEffect(() => setDishId(homepage.featured_item_id ?? ''), [homepage.featured_item_id]);
  const [headline, setHeadline] = useState(homepage.headline_override ?? '');
  const [subtitle, setSubtitle] = useState(homepage.subtitle_override ?? '');
  const feature = active.find((item) => item.id === dishId);
  const copy = homepageCopy({ headline_override: headline, subtitle_override: subtitle }, feature);
  const cover = data.images.find((image) => image.item_id === feature?.id);
  const defaultPhoto = homepage.default_banner_path ? photoUrl(homepage.default_banner_path) : null;
  const image = (cover ? photoUrl(cover.image_path) : feature?.image_urls?.[0] || feature?.image_url) || defaultPhoto;
  return <form className="admin-form" onSubmit={(event) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    void save('homepage_settings', {
      featured_item_id: fields.get('dish') || null, headline_override: fields.get('headline').trim(),
      subtitle_override: fields.get('subtitle').trim(),
    }, 1);
  }}>
    <label>Featured dish <select name="dish" value={dishId} onChange={(event) => setDishId(event.target.value)}>
      <option value="">Default restaurant banner</option>{active.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select></label>
    <label>Headline override <input name="headline" maxLength={100} value={headline} onChange={(event) => setHeadline(event.target.value)} /></label>
    <label>Subtitle override <textarea name="subtitle" maxLength={250} value={subtitle} onChange={(event) => setSubtitle(event.target.value)} /></label>
    <div className="admin-preview">
      {image && <img className="admin-crop" src={image} alt="" />}
      <h2>{copy.headline}</h2>
      <p>{copy.subtitle}</p>
    </div>
    <button disabled={busy}>Save homepage</button>
  </form>;
}

function BannerPhoto({ homepage, busy, run, refresh }) {
  const path = homepage?.default_banner_path;
  const ready = homepage && Object.hasOwn(homepage, 'default_banner_path');
  const [cropReady, setCropReady] = useState(false);
  const [showNow, setShowNow] = useState(true);
  const [status, setStatus] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [file, setFile] = useState(null);
  const [crop, setCrop] = useState(centeredCrop);
  const [inputKey, setInputKey] = useState(0);
  const [cropKey, setCropKey] = useState(0);

  async function updateBanner(nextPath, activate = false) {
    await checked(supabase.from('homepage_settings').update({ default_banner_path: nextPath,
      ...(activate ? { featured_item_id: null } : {}) })
      .eq('id', 1).select('id').single());
    await refresh();
  }

  return <form className="admin-form" onSubmit={(event) => {
    event.preventDefault();
    void run(async () => {
      setUploadError('');
      try {
        setStatus('Preparing image…');
        const image = await optimizePhoto(file, crop, true);
        const nextPath = `banner/${photoId()}-banner.webp`;
        setStatus('Uploading image…');
        await checked(photos().upload(nextPath, image, { contentType: image.type }));
        setStatus('Saving banner…');
        await updateBanner(nextPath, showNow);
        setFile(null);
        setInputKey((key) => key + 1);
        setStatus(showNow ? 'Default banner saved and displayed on the homepage.' : 'Default banner saved.');
      } catch (error) {
        setStatus('');
        setUploadError(error.message);
      }
    });
  }}>
    <h2>Default restaurant banner</h2>
    <p>Shown when there is no available featured dish photo.</p>
    {!ready && <p role="alert">Run the default banner migration in Supabase to enable uploads.</p>}
    {path ? <img className="admin-banner-preview" src={photoUrl(path)} alt="Current default restaurant banner" /> : <p>No default banner uploaded.</p>}
    <label>Choose banner image <input key={inputKey} type="file" accept={imageAccept} disabled={busy}
      onChange={(event) => { setStatus(''); setUploadError(''); setCropReady(false); setCrop(centeredCrop); setFile(event.target.files[0] ?? null); setCropKey((key) => key + 1); }} /></label>
    {file && <CropControls key={cropKey} file={file} ratio={16 / 9} crop={crop} setCrop={setCrop} busy={busy}
      onReady={() => setCropReady(true)} onError={() => setUploadError(imageDecodeError)} />}
    <label><input type="checkbox" checked={showNow} disabled={busy} onChange={(event) => setShowNow(event.target.checked)} /> Show this banner on the homepage now</label>
    {uploadError && <p className="admin-message" role="alert">{uploadError}</p>}
    {status && <p className="banner-status" role="status">{busy && <span className="admin-spinner" aria-hidden="true" />}{status}</p>}
    <div className="admin-actions">
      <button type="submit" disabled={busy || !ready || !file || !cropReady}>Upload banner</button>
      {path && <button type="button" disabled={busy} onClick={() => run(async () => {
        await updateBanner(null);
        setStatus('Default banner removed.');
      })}>Remove default banner</button>}
    </div>
  </form>;
}

function PhotoEditor({ dish, images, busy, run, refresh, onDraft }) {
  const [decodeFailed, setDecodeFailed] = useState(false);
  const [file, setFile] = useState(null);
  const [crop, setCrop] = useState(centeredCrop);
  const [cropKey, setCropKey] = useState(0);
  const [replaceId, setReplaceId] = useState('');
  const legacyCount = new Set([...(dish.image_urls ?? []), dish.image_url].filter(Boolean)).size;
  const photoCount = legacyCount + images.length;
  const limitReached = photoCount >= 4;
  async function upload(altText) {
    if (limitReached && !replaceId) throw new Error('Each dish can have up to four photos.');
    const [thumb, main] = await optimizePhoto(file, crop);
    const stem = `${dish.id}/${photoId()}`;
    const paths = [`${stem}-thumb.webp`, `${stem}-main.webp`];
    const previous = images.find((image) => image.id === replaceId);
    const values = { thumbnail_path: paths[0], image_path: paths[1], alt_text: altText };
    try {
      await checked(photos().upload(paths[0], thumb, { contentType: thumb.type }));
      await checked(photos().upload(paths[1], main, { contentType: main.type }));
    } catch (error) {
      await photos().remove(paths);
      throw error;
    }
    const query = supabase.from('item_images');
    // A failed or interrupted database request may have committed. Preserve uploaded objects for safe recovery.
    await checked((previous ? query.update(values).eq('id', previous.id) : query.insert({
      ...values, item_id: dish.id, sort_order: Math.max(0, ...images.map((image) => image.sort_order)) + 10,
    })).select('id').single());
    setFile(null);
    setReplaceId('');
    await refresh();
  }

  return <section className="admin-form" id="dish-photos">
    <h2>Dish photos <span className="admin-count">{photoCount} / 4</span></h2>
    <p>The first photo is the cover. Imported photos count toward the limit.</p>
    {limitReached && <p>Replace an uploaded photo or remove an existing one to make room.</p>}
    {images.map((image) => <form key={image.id} className="admin-actions" onSubmit={(event) => {
      event.preventDefault();
      const order = Number(new FormData(event.currentTarget).get('order'));
      void run(async () => {
        await checked(supabase.from('item_images').update({ sort_order: order }).eq('id', image.id).select('id').single());
        await refresh();
      });
    }}>
      <img className="admin-thumb" src={photoUrl(image.thumbnail_path)} alt={image.alt_text || dish.name} />
      {image.id === images[0].id && <strong>Cover</strong>}
      <input name="order" type="number" aria-label="Photo sort order" defaultValue={image.sort_order} />
      <button disabled={busy}>Save order</button>
      {image.id !== images[0].id && <button type="button" disabled={busy} onClick={() => run(async () => {
        await checked(supabase.rpc('set_menu_cover', { photo_id: image.id }));
        await refresh();
      })}>Make cover</button>}
      <button type="button" disabled={busy} onClick={() => {
        if (!window.confirm('Remove this photo from the dish?')) return;
        void run(async () => {
          await checked(supabase.from('item_images').delete().eq('id',image.id).select('id').single());
          await refresh();
        });
      }}>Remove</button>
    </form>)}
    <form className="admin-form" onChange={() => onDraft(true)} onSubmit={(event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const alt = new FormData(form).get('alt').trim();
      void run(async () => { await upload(alt); form.reset(); onDraft(false); });
    }}>
      <label>Upload mode <select value={replaceId} onChange={(event) => setReplaceId(event.target.value)}>
        <option value="" disabled={limitReached}>Add gallery photo</option>{images.map((image,index) => <option key={image.id} value={image.id}>Replace photo {index + 1}</option>)}
      </select></label>
      <label>Choose image <input type="file" accept={imageAccept} required
        disabled={busy} onChange={(event) => {
          setDecodeFailed(false); setCrop(centeredCrop); setCropKey((key) => key + 1); setFile(event.target.files[0] ?? null);
        }} /></label>
      {file && <CropControls key={cropKey} file={file} ratio={640 / 420} crop={crop} setCrop={setCrop} busy={busy} onError={() => setDecodeFailed(true)} />}
      {decodeFailed && <p role="alert">{imageDecodeError}</p>}
      <label>Image description <input name="alt" maxLength={180} placeholder={dish.name} /></label>
      <button disabled={busy || !file || decodeFailed || (limitReached && !replaceId)}>Upload photo</button>
    </form>
  </section>;
}

function PhotoCleanup({ busy, run, setMessage }) {
  const [count, setCount] = useState(null);
  const scan = () => run(async () => {
    const paths = await checked(supabase.rpc('abandoned_menu_photos'));
    setCount(paths.length);
  });
  const clean = () => {
    if (!window.confirm('Permanently delete the eligible unreferenced photo files?')) return;
    void run(async () => {
      const paths = await checked(supabase.rpc('abandoned_menu_photos'));
      if (!paths.length) { setCount(0); return; }
      const removed = await checked(photos().remove(paths));
      setMessage(`Removed ${removed.length} file(s).`);
      setCount((await checked(supabase.rpc('abandoned_menu_photos'))).length);
    });
  };
  return <section className="admin-form">
    <h2>Photo cleanup</h2>
    <p>Scan for uploaded files that are over 24 hours old and have no dish links. Each scan checks up to 100 eligible files.</p>
    {count !== null && <p role="status">{count} eligible file(s) in this batch.</p>}
    <div className="admin-actions">
      <button disabled={busy} onClick={scan}>Scan storage</button>
      <button disabled={busy || !count} onClick={clean}>Delete eligible files</button>
    </div>
  </section>;
}
