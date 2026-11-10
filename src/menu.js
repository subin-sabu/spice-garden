export const categories = [
  ['special', "Today’s Special", 'spark'],
  ['soup', 'Soup', 'soup'],
  ['salad', 'Salad', 'leaf'],
  ['starter', 'Starter', 'flame'],
  ['main', 'Main Course', 'plate'],
  ['dessert', 'Dessert', 'dessert'],
  ['drink', 'Beverages', 'drink'],
  ['side', 'Sides', 'plate'],
];

// Sample prices and photography for the client presentation.
const dishes = [
  ['fish-pollichathu', 'Fish Pollichathu', 'main', 'non-veg', 545, 'Whole fish rubbed with Kerala masala and cooked in a banana-leaf parcel. The leaf holds in the steam as the fish cooks, keeping it tender and carrying the aroma of the spices to the table.'],
  ['prawns-kizhi', 'Prawns Kizhi', 'main', 'non-veg', 595, 'Prawns tossed in coastal spices and served in a roasted banana-leaf parcel.'],
  ['chicken-biriyani', 'Kerala Chicken Dum Biriyani', 'main', 'non-veg', 345, 'Fragrant dum-cooked rice layered with spiced chicken and fried onions.'],
  ['paneer-tikka', 'Paneer Tikka', 'starter', 'veg', 295, 'Charred, spice-marinated paneer with peppers and onions.'],
  ['kerala-payasam', 'Kerala Payasam', 'dessert', 'veg', 155, 'A slow-cooked Kerala dessert with jaggery and coconut milk.'],
  ['green-salad', 'Garden Fresh Green Salad', 'salad', 'veg', 195, 'Crisp greens, cucumber and tomatoes with a light dressing.'],
  ['chicken-kizhi', 'Chicken Kizhi', 'main', 'non-veg', 365, 'A regional chicken preparation from the signature menu.'],
  ['seafood-soup', 'Seafood Soup', 'soup', 'non-veg', 235, 'A coastal seafood soup.'],
  ['broccoli-soup', 'Cream of Broccoli Soup', 'soup', 'veg', 185, 'A creamy broccoli soup.'],
  ['lemon-coriander-soup', 'Lemon Coriander Soup', 'soup', 'veg', 165, 'A light soup with lemon and coriander.'],
  ['veg-manchow', 'Vegetable Manchow Soup', 'soup', 'veg', 175, 'A vegetable Manchow soup.'],
  ['pasta-salad', 'Vegetable Pasta Salad', 'salad', 'veg', 225, 'Pasta tossed with vegetables.'],
  ['fruit-chaat', 'Fruit Chaat Salad', 'salad', 'veg', 195, 'A fruit chaat from the salad selection.'],
  ['chicken-65', 'Chicken 65', 'starter', 'non-veg', 315, 'A South Indian chicken starter.'],
  ['kerala-fish-fry', 'Kerala Fish Fry', 'starter', 'non-veg', 375, 'Fish fried Kerala style.'],
  ['crispy-vegetables', 'Crispy Fried Vegetables', 'starter', 'veg', 245, 'Crisp fried vegetables.'],
  ['prawns-tawa', 'Prawns Tawa Fry', 'starter', 'non-veg', 495, 'Prawns cooked on a hot tawa.'],
  ['kerala-fish-curry', 'Kerala Fish Curry', 'main', 'non-veg', 395, 'A coastal Kerala fish curry.'],
  ['kovalam-prawns', 'Kovalam Prawns Curry', 'main', 'non-veg', 525, 'A regional prawn curry.'],
  ['paneer-butter-masala', 'Paneer Butter Masala', 'main', 'veg', 325, 'Paneer in a rich butter masala.'],
  ['veg-kurma', 'Vegetable Kurma', 'main', 'veg', 245, 'Vegetables in a gently spiced gravy.'],
  ['veg-biriyani', 'Vegetable Dum Biriyani', 'main', 'veg', 265, 'Vegetables and rice cooked dum style.'],
  ['gulab-jamun', 'Gulab Jamun', 'dessert', 'veg', 145, 'A classic syrup-soaked dessert.'],
  ['rice-kheer', 'Rice Kheer', 'dessert', 'veg', 155, 'A traditional sweet rice pudding.'],
  ['ice-cream', 'Ice Cream', 'dessert', 'veg', 125, 'Ask your server about available flavours.'],
  ['lime-mint', 'Lime Mint', 'drink', 'veg', 115, 'Lime with mint.'],
  ['lime-soda', 'Lime Soda', 'drink', 'veg', 105, 'A sparkling lime refresher.'],
  ['masala-tea', 'Masala Tea', 'drink', 'veg', 75, 'Tea brewed with warming spices.'],
  ['lassi', 'Kerala Lassi', 'drink', 'veg', 125, 'A chilled yoghurt drink.'],
  ['kerala-paratha', 'Kerala Paratha', 'side', 'veg', 45, 'A layered Kerala flatbread.'],
  ['butter-naan', 'Butter Naan', 'side', 'veg', 65, 'Naan finished with butter.'],
  ['ghee-rice', 'Ghee Rice', 'side', 'veg', 175, 'Rice prepared with ghee.'],
];

const previewPhotos = {
  'fish-pollichathu': ['fish-pollichathu-detail', 'hero'],
  'prawns-kizhi': ['prawns-kizhi'],
  'chicken-biriyani': ['chicken-biriyani'],
  'paneer-tikka': ['paneer-tikka'],
  'kerala-payasam': ['kerala-payasam'],
  'green-salad': ['green-salad'],
};

const unavailableDemoDishes = new Set(['paneer-tikka', 'kerala-fish-fry', 'rice-kheer']);

export const previewMenu = dishes.map(([id, name, category, diet, rupees, description]) => ({
  id, name, category, diet, description, price_paise: rupees * 100,
  demo_special: id === 'prawns-kizhi' || id === 'kerala-payasam',
  image_urls: (previewPhotos[id] ?? []).map((file) => `/images/${file}.webp`),
  video_url: null,
  is_available: !unavailableDemoDishes.has(id),
}));

function isMediaUrl(value) {
  return typeof value === 'string' && (/^https:\/\//i.test(value) || /^\/images\/[\w./-]+$/.test(value));
}

export function dishMedia(item) {
  const gallery = Array.isArray(item.image_urls) ? item.image_urls : [];
  return {
    images: [...new Set([...gallery, item.image_url].filter(isMediaUrl))],
    video: isMediaUrl(item.video_url) ? item.video_url : null,
  };
}

export const keralaDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
export const isAvailable = (item) => Boolean(item) && item.is_available !== false;
export const isSpecial = (item, date) => item.demo_special === true || item.special_on === date;
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const formatPrice = (paise) => paise == null ? 'Ask staff' : money.format(paise / 100);

const { VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: key } = import.meta.env;
export const liveMenuEnabled = Boolean(url && key);

export async function fetchMenu(signal) {
  const endpoint = new URL('/rest/v1/menu_items', url);
  const fields = 'id,name,category,diet,description,featured,price_paise,special_on,image_url';
  const options = { signal, headers: { apikey: key }, cache: 'no-store' };

  async function request(select) {
    endpoint.search = new URLSearchParams({ select, order: 'sort_order.asc,name.asc,id.asc' });
    return fetch(endpoint, options);
  }

  const mediaFields = fields + ',image_urls,video_url';
  for (const select of [mediaFields + ',is_available', mediaFields, fields]) {
    const response = await request(select);
    if (response.ok) return response.json();
    if (response.status !== 400) break;
    const { code } = await response.json();
    if (code !== '42703' && code !== 'PGRST204') break;
  }

  throw new Error('Menu request failed');
}
