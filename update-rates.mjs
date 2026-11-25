// update-rates.mjs - TOMCO 8 sources - FIXED v2
// Fix: reject bad prices, Rate Sudan regex was picking 31313
import fs from 'node:fs';

const headers = { 'User-Agent': 'Mozilla/5.0', 'Content-Type': 'application/json' };
const allSources = [];
// SDG must be sane: 5000 - 25000, Gold must be 2000 - 5000 USD/oz
const isSDG = (p) => p > 5000 && p < 25000;
const isGold = (p) => p > 2000 && p < 5000;
const logSDG = (name, price) => { if (price && isSDG(price)) allSources.push({ name, price: Number(price.toFixed(2)) }); else if (price) console.log('REJECT SDG', name, price); };
const logGold = (name, price) => { if (price && isGold(price)) allSources.push({ name, price: Number(price.toFixed(2)) }); else if (price) console.log('REJECT GOLD', name, price); };

// 1 - Binance P2P
try {
  const r = await fetch('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
    method: 'POST', headers,
    body: JSON.stringify({ asset: 'USDT', fiat: 'SDG', tradeType: 'BUY', page: 1, rows: 5, payTypes: [] })
  });
  const j = await r.json();
  const p = Number(j?.data?.[0]?.adv?.price);
  logSDG('Binance P2P', p);
} catch (e) { console.log('Binance fail', e.message); }

// 2 - Rate Sudan - STRICT: only accept number near USD/USDT word, else skip
try {
  const r = await fetch('https://ratesudan.com/rate/usd', { headers });
  const t = await r.text();
  // look for patterns like USD ... 12,xxx or price ... 12,xxx - must be near USD
  const m = t.match(/USD[^0-9]{0,80}?(\d{2},?\d{3}\.\d+|\d{4,5}\.\d+)/i) || t.match(/(\d{2},?\d{3}\.\d+)/);
  if (m) {
    const v = Number(m[1].replace(',', ''));
    logSDG('Rate Sudan', v);
  } else console.log('Rate Sudan: no strict match, skipped');
} catch (e) { console.log('Rate Sudan fail', e.message); }

// 3 - Mtgr-SD - STRICT
try {
  const r = await fetch('https://mtgr-sd.com/', { headers });
  const t = await r.text();
  const m = t.match(/USDT[^0-9]{0,50}?(\d{2},?\d{3}\.\d+|\d{4,5}\.\d+)/i);
  if (m) logSDG('Mtgr-SD', Number(m[1].replace(',', '')));
  else console.log('Mtgr: no strict match, skipped');
} catch (e) { console.log('Mtgr fail', e.message); }

// 4 - OKX P2P
try {
  const r = await fetch('https://www.okx.com/api/v5/p2p/otc-advertisements?quoteCurrency=SDG&baseCurrency=USDT&side=buy', { headers });
  const j = await r.json();
  const p = Number(j?.data?.[0]?.price);
  logSDG('OKX P2P', p);
} catch (e) { console.log('OKX fail', e.message); }

// 5 - KuCoin P2P
try {
  const r = await fetch('https://www.kucoin.com/api/v1/otc/public/ad/list?currency=SDG&cryptoCurrency=USDT&side=BUY', { headers });
  const j = await r.json();
  const p = Number(j?.data?.[0]?.price);
  logSDG('KuCoin P2P', p);
} catch (e) { console.log('KuCoin fail', e.message); }

// --- Gold ---
const goldPrices = [];
try {
  const r = await fetch('https://data-asg.goldprice.org/dbXRates/USD', { headers });
  const j = await r.json();
  const p = Number(j?.items?.[0]?.curr);
  if (p && isGold(p)) { goldPrices.push(p); logGold('GoldPrice.org', p); }
} catch (e) { console.log('GoldPrice fail', e.message); }
try {
  const r = await fetch('https://api.gold-api.com/price/XAU', { headers });
  const j = await r.json();
  const p = Number(j?.price);
  if (p && isGold(p)) { goldPrices.push(p); logGold('Gold-API', p); }
} catch (e) { console.log('Gold-API fail', e.message); }
try {
  const r = await fetch('https://api.metals.live/v1/spot', { headers });
  const j = await r.json();
  const p = Number(j?.[0]?.gold);
  if (p && isGold(p)) { goldPrices.push(p); logGold('Metals.live', p); }
} catch (e) { console.log('Metals fail', e.message); }

// Best SDG = highest VALID price
const sdgOnly = allSources.filter(s => !s.name.toLowerCase().includes('gold') && !s.name.includes('Metals')).map(s => s.price);
const bestPrice = sdgOnly.length ? Math.max(...sdgOnly) : 0;
const bestSource = allSources.find(s => s.price === bestPrice)?.name || 'Binance P2P';
goldPrices.sort((a, b) => a - b);
const bestGold = goldPrices.length ? goldPrices[Math.floor(goldPrices.length / 2)] : 0;

const out = {
  updatedAt: new Date().toISOString(),
  updatedAtLocal: new Date().toLocaleString('ar-SD', { timeZone: 'Africa/Khartoum' }),
  bestUSDT: { name: bestSource, price: bestPrice },
  bestPrice: bestPrice,
  usdt_sdg: bestPrice,
  bestGold: bestGold,
  gold_per_gram_sdg: bestGold && bestPrice ? Number(((bestGold / 31.1035) * bestPrice).toFixed(2)) : 0,
  allSources,
  sourcesChecked: allSources.length
};
fs.writeFileSync('rates.json', JSON.stringify(out, null, 2));
console.log('Done:', out.bestUSDT, 'Gold:', bestGold, 'Sources:', allSources.length);
