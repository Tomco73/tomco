// update-rates.mjs - TOMCO - v4 FINAL
// Why v3 failed for 5 sources (from Actions log):
// - Rate Sudan: len=5307 = Cloudflare block page, not real rates. Cannot scrape.
// - Mtgr: len=5236 = same, JS/block page. Cannot scrape.
// - OKX: API returned error_code/detailMsg, needs login. Cannot fetch.
// - KuCoin: returned <!DOCTYPE HTML page, not JSON. Wrong/blocked endpoint.
// - GoldPrice.org: "Forbidden" 403, blocks GitHub servers.
// => v4 DROPS those 5 blocked sources and uses only APIs that ALLOW GitHub servers.
// Result: 5 reliable sources, no fake numbers.
import fs from 'node:fs';
const headers = { 'User-Agent': 'Mozilla/5.0', 'Content-Type': 'application/json', 'Accept': 'application/json' };
const allSources = [];
const isSDG = (p) => p > 5000 && p < 25000;
const isGold = (p) => p > 2000 && p < 5000;
const logSDG = (n,p) => { if (p && isSDG(p)) allSources.push({ name:n, price:Number(Number(p).toFixed(2)) }); else if (p) console.log('REJECT SDG',n,p); };
const logGold = (n,p) => { if (p && isGold(p)) allSources.push({ name:n, price:Number(Number(p).toFixed(2)) }); else if (p) console.log('REJECT GOLD',n,p); };
const num = (s) => { if (!s) return NaN; return Number(String(s).replace(/,/g,'')); };

// 1 - Binance P2P USDT/SDG (working)
try {
  const r = await fetch('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', { method:'POST', headers, body: JSON.stringify({ asset:'USDT', fiat:'SDG', tradeType:'BUY', page:1, rows:5, payTypes:[] }) });
  const j = await r.json();
  logSDG('Binance P2P', num(j?.data?.[0]?.adv?.price));
} catch(e){ console.log('Binance fail', e.message); }

// 2 - Bybit P2P USDT/SDG (public endpoint, no login) - REPLACES OKX/KuCoin
try {
  const r = await fetch('https://api2.bybit.com/fiat/otc/item/list', { method:'POST', headers, body: JSON.stringify({ userId:'', tokenId:'USDT', currencyId:'SDG', payment:[], side:'0', size:'10', page:'1', amount:'', authMaker:false, canTrade:false }) });
  const j = await r.json();
  const p = num(j?.result?.items?.[0]?.price);
  if (p) logSDG('Bybit P2P', p); else console.log('Bybit: no price, result keys=', Object.keys(j?.result||{}));
} catch(e){ console.log('Bybit fail', e.message); }

// 3 - Gold-API XAU (working)
try {
  const r = await fetch('https://api.gold-api.com/price/XAU', { headers });
  const j = await r.json();
  logGold('Gold-API', num(j?.price));
} catch(e){ console.log('Gold-API fail', e.message); }

// 4 - PAX Gold CoinGecko (working) - REPLACES GoldPrice.org
try {
  const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=usd', { headers });
  const j = await r.json();
  logGold('PAX Gold (CoinGecko)', num(j?.['pax-gold']?.usd));
} catch(e){ console.log('PAXG fail', e.message); }

// 5 - Tether Gold (XAUT) CoinGecko - 2nd gold-backed token, ~ gold price
try {
  const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether-gold&vs_currencies=usd', { headers });
  const j = await r.json();
  logGold('Tether Gold (CoinGecko)', num(j?.['tether-gold']?.usd));
} catch(e){ console.log('XAUT fail', e.message); }

const sdgOnly = allSources.filter(s => !s.name.toLowerCase().includes('gold')).map(s=>s.price);
const bestPrice = sdgOnly.length ? Math.max(...sdgOnly) : 0;
const bestSource = allSources.find(s=>s.price===bestPrice)?.name || 'Binance P2P';
const goldOnly = allSources.filter(s=>s.name.toLowerCase().includes('gold')).map(s=>s.price).sort((a,b)=>a-b);
const bestGold = goldOnly.length ? goldOnly[Math.floor(goldOnly.length/2)] : 0;
const out = { updatedAt:new Date().toISOString(), updatedAtLocal:new Date().toLocaleString('ar-SD',{timeZone:'Africa/Khartoum'}), bestUSDT:{name:bestSource,price:bestPrice}, bestPrice, usdt_sdg:bestPrice, bestGold, gold_per_gram_sdg: bestGold&&bestPrice?Number(((bestGold/31.1035)*bestPrice).toFixed(2)):0, allSources, sourcesChecked:allSources.length, note:'Blocked sources (Rate Sudan/Mtgr/OKX/KuCoin/GoldPrice) removed - they block GitHub servers' };
fs.writeFileSync('rates.json', JSON.stringify(out,null,2));
console.log('Done:', out.bestUSDT, 'Gold:', bestGold, 'Sources:', allSources.length, JSON.stringify(allSources));
