const categoryAliases = [
  {slug: 'laptop', aliases: ['laptop', 'may tinh xach tay', 'macbook']},
  {slug: 'man-hinh', aliases: ['man hinh', 'monitor']},
  {slug: 'ban-phim', aliases: ['ban phim', 'keyboard']},
  {slug: 'chuot', aliases: ['chuot', 'mouse']},
  {
    slug: 'ssd-luu-tru',
    aliases: ['ssd', 'o cung', 'luu tru', 'storage']
  }
];

const supportedBrands = [
  'Western Digital',
  'SteelSeries',
  'SK hynix',
  'Gigabyte',
  'Keychron',
  'Logitech',
  'Samsung',
  'Kingston',
  'Seagate',
  'Corsair',
  'Crucial',
  'Pulsar',
  'Apple',
  'Lenovo',
  'Razer',
  'Acer',
  'ASUS',
  'Dell',
  'MSI',
  'BenQ',
  'Akko',
  'Lexar',
  'AOC',
  'HP',
  'LG'
];

const purposeTerms = [
  ['gaming', 'gaming'],
  ['choi game', 'gaming'],
  ['do hoa', 'đồ họa'],
  ['designer', 'đồ họa'],
  ['van phong', 'văn phòng'],
  ['hoc tap', 'học tập'],
  ['mong nhe', 'mỏng nhẹ'],
  ['khong day', 'wireless'],
  ['wireless', 'wireless'],
  ['ban phim co', 'mechanical'],
  ['mechanical', 'mechanical'],
  ['qhd', 'qhd'],
  ['4k', '4k'],
  ['ultrabook', 'ultrabook'],
  ['macbook', 'macbook'],
  ['rgb', 'rgb']
];

const unsupportedTerms = [
  'dien thoai',
  'smartphone',
  'iphone',
  'android phone',
  'may giat',
  'tu lanh',
  'tivi',
  'television'
];

export function normalizeText(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9.,<>=-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsPhrase(text, phrase) {
  return (` ${text} `).includes(` ${phrase} `);
}

function amount(value, unit = '') {
  const parsed = Number(String(value).replace(',', '.'));

  if (!Number.isFinite(parsed)) return undefined;
  if (/^(tr|trieu)$/.test(unit)) return Math.round(parsed * 1_000_000);
  if (/^(k|nghin|ngan)$/.test(unit)) return Math.round(parsed * 1_000);
  if (/^(m|million)$/.test(unit)) return Math.round(parsed * 1_000_000);
  if (parsed >= 100_000) return Math.round(parsed);
  return undefined;
}

function priceRange(text) {
  const number = '(\\d+(?:[.,]\\d+)?)';
  const unit = '(trieu|tr|million|m|nghin|ngan|k)?';
  const range = new RegExp(
    `(?:tu|khoang)\\s*${number}\\s*${unit}\\s*(?:den|toi|-)\\s*${number}\\s*${unit}`
  ).exec(text);

  if (range) {
    const sharedUnit = range[4] || range[2];
    const minPrice = amount(range[1], range[2] || sharedUnit);
    const maxPrice = amount(range[3], range[4] || sharedUnit);

    if (minPrice !== undefined && maxPrice !== undefined) {
      return {
        minPrice: Math.min(minPrice, maxPrice),
        maxPrice: Math.max(minPrice, maxPrice)
      };
    }
  }

  const maximum = new RegExp(
    `(?:duoi|khong qua|toi da|ngan sach|budget|<=?)\\s*${number}\\s*${unit}`
  ).exec(text);

  if (maximum) {
    return {maxPrice: amount(maximum[1], maximum[2])};
  }

  const around = new RegExp(
    `(?:tam|khoang|gia)\\s*${number}\\s*${unit}`
  ).exec(text);

  if (around) {
    return {maxPrice: amount(around[1], around[2])};
  }

  return {};
}

export function extractIntent(message) {
  const normalized = normalizeText(message);
  const unsupported = unsupportedTerms.some(term =>
    containsPhrase(normalized, term)
  );
  const category = categoryAliases.find(entry =>
    entry.aliases.some(alias => containsPhrase(normalized, alias))
  )?.slug;
  const brand = supportedBrands.find(value =>
    containsPhrase(normalized, normalizeText(value))
  );
  const terms = [...new Set(
    purposeTerms
      .filter(([phrase]) => containsPhrase(normalized, phrase))
      .map(([, term]) => term)
  )];
  const prices = priceRange(normalized);

  return {
    category,
    brand,
    minPrice: prices.minPrice,
    maxPrice: prices.maxPrice,
    search: terms.length ? terms.join(' ') : undefined,
    needs: terms,
    unsupported
  };
}
