// update-rates.mjs - TOMCO 8 sources
// 5 SDG sources + 3 Gold sources
import fs from 'node:fs';

const headers = { 'User-Agent': 'Mozilla/5.0', 'Content-Type': 'application/json' };
const allSources = [];
const log = (name, price) => { if (price && price > 0) allSources.push({ name, price: Number(price.toFixed(2)) }); };

// 1 - Binance P2P
try {
  const r = await fetch('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
    method: 'POST', headers,
    body: JSON.stringify({ asset: 'USDT', fiat: 'SDG', tradeType: 'BUY', page: 1, rows: 5, payTypes: [] })
  });
  const j = await r.json();
  const p = Number(j?.data?.[0]?.adv?.price);
  log('Binance P2P', p);
} catch (e) { console.log('Binance fail', e.message); }

// 2 - Rate Sudan
try {
  const r = await fetch('https://ratesudan.com/rate/usd', { headers });
  const t = await r.text();
  const m = t.match(/(\d{4,5}\.\d+|\d{4,5})/);
  if (m) log('Rate Sudan', Number(m[1]));
} catch (e) { console.log('Rate Sudan fail', e.message); }

// 3 - Mtgr-SD
try {
  const r = await fetch('https://mtgr-sd.com/', { headers });
  const t = await r.text();
  const m = t.match(/USDT[^0-9]{0,30}(\d{4,5}\.\d+|\d{4,5})/i) || t.match(/(\d{4,5}\.\d+)/);
  if (m) log('Mtgr-SD', Number(m[1]));
} catch (e) { console.log('Mtgr fail', e.message); }

// 4 - OKX P2P
try {
  const r = await fetch('https://www.okx.com/api/v5/p2p/otc-advertisements?quoteCurrency=SDG&baseCurrency=USDT&side=buy', { headers });
  const j = await r.json();
  const p = Number(j?.data?.[0]?.price);
  log('OKX P2P', p);
} catch (e) { console.log('OKX fail', e.message); }

// 5 - KuCoin P2P
try {
  const r = await fetch('https://www.kucoin.com/api/v1/otc/public/ad/list?currency=SDG&cryptoCurrency=USDT&side=BUY', { headers });
  const j = await r.json();
  const p = Number(j?.data?.[0]?.price);
  log('KuCoin P2P', p);
} catch (e) { console.log('KuCoin fail', e.message); }

// --- Gold ---
const goldPrices = [];
try {
  const r = await fetch('https://data-asg.goldprice.org/dbXRates/USD', { headers });
  const j = await r.json();
  const p = Number(j?.items?.[0]?.curr);
  if (p) { goldPrices.push(p); log('GoldPrice.org', p); }
} catch (e) { console.log('GoldPrice fail', e.message); }
try {
  const r = await fetch('https://api.gold-api.com/price/XAU', { headers });
  const j = await r.json();
  const p = Number(j?.price);
  if (p) { goldPrices.push(p); log('Gold-API', p); }
} catch (e) { console.log('Gold-API fail', e.message); }
try {
  const r = await fetch('https://api.metals.live/v1/spot', { headers });
  const j = await r.json();
  const p = Number(j?.[0]?.gold);
  if (p) { goldPrices.push(p); log('Metals.live', p); }
} catch (e) { console.log('Metals fail', e.message); }

// Best SDG = highest price
const sdgPrices = allSources.filter(s => !s.name.toLowerCase().includes('gold') && !s.name.includes('Metals')).map(s => s.price);
const bestPrice = sdgPrices.length ? Math.max(...sdgPrices) : 0;
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
