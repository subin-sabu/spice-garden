function isMediaUrl(value) {
  return typeof value === 'string' && /^https:\/\//i.test(value);
}

export function dishMedia(item) {
  const gallery = Array.isArray(item.image_urls) ? item.image_urls : [];
  return {
    images: [...new Set([...gallery, item.image_url].filter(isMediaUrl))].slice(0, 4),
  };
}

export const keralaDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
export const isAvailable = (item) => Boolean(item) && item.is_available !== false;
export const isSpecial = (item, date) => item.special_on === date;
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const formatPrice = (paise) => paise == null ? 'Ask staff' : money.format(paise / 100);


export function homepageCopy(homepage, dish) {
  return {
    headline: homepage?.headline_override?.trim() || dish?.name || 'Spice Garden',
    subtitle: homepage?.subtitle_override?.trim() || dish?.tasting_note || dish?.short_description ||
      dish?.description || 'Coastal Kerala cooking at Aadisaktthi Resorts & Spa.',
  };
}

export function searchText(value) {
  return (value ?? '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/biriyani|biryani/g, 'biryani')
    .replace(/porotta|parotta|paratha/g, 'paratha')
    .replace(/pollichath+u/g, 'pollichathu')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function searchTerms(value) {
  return searchText(value).split(/\s+/).filter(Boolean);
}

export function matchesSearch(terms, ...fields) {
  if (!terms.length) return true;
  const text = searchText(fields.join(' '));
  return terms.every((term) => text.includes(term));
}
