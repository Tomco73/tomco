// update-rates.mjs - TOMCO - FIXED v3
// Fixes found by testing:
// 1) Rate Sudan: /rate/usd was a BANK page (BHD 31240 -> false 31313). Homepage has USD 12,310. Use homepage + USD** pattern.
// 2) GoldPrice.org: field is xauPrice, NOT curr. Old code read curr -> undefined -> failed.
// 3) Metals.live: API is dead. Replaced with CoinGecko PAXG (gold-backed token ~ gold price).
// 4) OKX/KuCoin P2P: need POST, not GET. Fixed to POST.
import fs from 'node:fs';

const headers = { 'User-Agent': 'Mozilla/5.0', 'Content-Type': 'application/json', 'Accept': 'application/json' };
const allSources = [];
const isSDG = (p) => p > 5000 && p < 25000;
const isGold = (p) => p > 2000 && p < 5000;
const logSDG = (name, price) => { if (price && isSDG(price)) allSources.push({ name, price: Number(Number(price).toFixed(2)) }); else if (price) console.log('REJECT SDG', name, price); };
const logGold = (name, price) => { if (price && isGold(price)) allSources.push({ name, price: Number(Number(price).toFixed(2)) }); else if (price) console.log('REJECT GOLD', name, price); };
const num = (s) => { if (!s) return NaN; return Number(String(s).replace(/,/g, '')); };

// 1 - Binance P2P (working)
try {
  const r = await fetch('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
    method: 'POST', headers,
    body: JSON.stringify({ asset: 'USDT', fiat: 'SDG', tradeType: 'BUY', page: 1, rows: 5, payTypes: [] })
  });
  const j = await r.json();
  logSDG('Binance P2P', num(j?.data?.[0]?.adv?.price));
} catch (e) { console.log('Binance fail', e.message); }

// 2 - Rate Sudan FIXED: homepage, pattern USD**12,310 or USD 12,310
try {
  const r = await fetch('https://ratesudan.com/', { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const t = await r.text();
  // homepage shows: USD**12,310  SAR**3,085 ...
  let m = t.match(/USD\*\*\s*([\d,]{4,})/) || t.match(/USD[^0-9]{0,20}([\d,]{4,5})/i);
  if (m) logSDG('Rate Sudan', num(m[1]));
  else console.log('Rate Sudan: no match, skipped. len=', t.length);
} catch (e) { console.log('Rate Sudan fail', e.message); }

// 3 - Mtgr-SD STRICT
try {
  const r = await fetch('https://mtgr-sd.com/', { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const t = await r.text();
  const m = t.match(/USDT[^0-9]{0,60}?(\d{2},?\d{3}\.\d+|\d{4,5}\.\d+)/i) || t.match(/(?:\u062f\u0648\u0644\u0627\u0631|USD)[^0-9]{0,60}?(\d{2},?\d{3}\.\d+)/i);
  if (m) logSDG('Mtgr-SD', num(m[1]));
  else console.log('Mtgr: no strict match, skipped. len=', t.length);
} catch (e) { console.log('Mtgr fail', e.message); }

// 4 - OKX P2P FIXED: POST to priapi endpoint
try {
  const r = await fetch('https://www.okx.com/priapi/v5/c2c/otc-advertisements/list', {
    method: 'POST', headers,
    body: JSON.stringify({ quoteCurrency: 'SDG', baseCurrency: 'USDT', side: 'buy', page: 1, pageSize: 5 })
  });
  const j = await r.json();
  const p = num(j?.data?.[0]?.price || j?.data?.data?.[0]?.price);
  if (p) logSDG('OKX P2P', p);
  else console.log('OKX: no price in response, keys=', Object.keys(j || {}));
} catch (e) { console.log('OKX fail', e.message); }

// 5 - KuCoin P2P FIXED: POST not GET
try {
  const r = await fetch('https://www.kucoin.com/api/v1/otc/public/ad/list', {
    method: 'POST', headers,
    body: JSON.stringify({ currency: 'SDG', cryptoCurrency: 'USDT', side: 'BUY', page: 1, pageSize: 5 })
  });
  const j = await r.json();
  const p = num(j?.data?.[0]?.price || j?.data?.list?.[0]?.price);
  if (p) logSDG('KuCoin P2P', p);
  else console.log('KuCoin: no price, code=', j?.code);
} catch (e) { console.log('KuCoin fail', e.message); }

// --- Gold ---
// 6 - GoldPrice.org FIXED: xauPrice not curr
try {
  const r = await fetch('https://data-asg.goldprice.org/dbXRates/USD', { headers });
  const j = await r.json();
  const p = num(j?.items?.[0]?.xauPrice);
  if (p) { logGold('GoldPrice.org', p); }
  else console.log('GoldPrice: no xauPrice, keys=', Object.keys(j?.items?.[0] || {}));
} catch (e) { console.log('GoldPrice fail', e.message); }
// 7 - Gold-API (working)
try {
  const r = await fetch('https://api.gold-api.com/price/XAU', { headers });
  const j = await r.json();
  logGold('Gold-API', num(j?.price));
} catch (e) { console.log('Gold-API fail', e.message); }
// 8 - CoinGecko PAXG (gold-backed, ~ gold price) - replaces dead Metals.live
try {
  const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=usd', { headers });
  const j = await r.json();
  logGold('PAX Gold (CoinGecko)', num(j?.['pax-gold']?.usd));
} catch (e) { console.log('PAXG fail', e.message); }

const sdgOnly = allSources.filter(s => !s.name.toLowerCase().includes('gold') && !s.name.toLowerCase().includes('pax')).map(s => s.price);
const bestPrice = sdgOnly.length ? Math.max(...sdgOnly) : 0;
const bestSource = allSources.find(s => s.price === bestPrice)?.name || 'Binance P2P';
const goldOnly = allSources.filter(s => s.name.toLowerCase().includes('gold') || s.name.toLowerCase().includes('pax')).map(s => s.price).sort((a,b)=>a-b);
const bestGold = goldOnly.length ? goldOnly[Math.floor(goldOnly.length/2)] : 0;

const out = {
  updatedAt: new Date().toISOString(),
  updatedAtLocal: new Date().toLocaleString('ar-SD', { timeZone: 'Africa/Khartoum' }),
  bestUSDT: { name: bestSource, price: bestPrice },
  bestPrice, usdt_sdg: bestPrice, bestGold,
  gold_per_gram_sdg: bestGold && bestPrice ? Number(((bestGold / 31.1035) * bestPrice).toFixed(2)) : 0,
  allSources, sourcesChecked: allSources.length
};
fs.writeFileSync('rates.json', JSON.stringify(out, null, 2));
console.log('Done:', out.bestUSDT, 'Gold:', bestGold, 'Sources:', allSources.length, JSON.stringify(allSources));
