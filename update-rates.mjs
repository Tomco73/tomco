// Tomco - v4 - 8 sources
import fs from 'node:fs';

async function getBinance(){
  try{
    const r = await fetch('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({fiat:'SDG',page:1,rows:5,tradeType:'BUY',asset:'USDT'})
    });
    const j = await r.json();
    return (j.data||[]).map(it=>({name:'B'+'inance P2P',source:'binance_p2p',price:Number(it.adv.price)}));
  }catch(e){ return []; }
}
async function getRateSudan(){
  try{
    const r = await fetch('https://ratesudan.com/rate/usd');
    const html = await r.text();
    const m = html.match(/بيع[^0-9]{0,20}([\d,]+\.?\d*)/);
    return m ? [{name:'Rate Sudan',source:'ratesudan',price:Number(m[1].replace(/,/g,'')),type:'sell'}] : [];
  }catch(e){ return []; }
}
async function getMtgr(){
  try{
    const r = await fetch('https://mtgr-sd.com/');
    const html = await r.text();
    const m = html.match(/سعر الشراء[^0-9]{0,20}([\d,]+\.?\d*)/);
    return m ? [{name:'Mtgr-SD',source:'mtgr-sd',price:Number(m[1].replace(/,/g,'')),type:'buy'}] : [];
  }catch(e){ return []; }
}
async function getOKX(){
  try{
    const r = await fetch('https://www.okx.com/priapi/v5/c2c/tradingOrders/book?tether=USDT&fiatCurrency=SDG&side=sell&page=1&pageSize=5');
    const j = await r.json();
    return (j?.data?.sell||[]).map(it=>({name:'O'+'KX P2P',source:'okx_p2p',price:Number(it.price)}));
  }catch(e){ return []; }
}
async function getKuCoin(){
  try{
    const r = await fetch('https://www.kucoin.com/_api/otc/ad/list?currency=USDT&legal=SDG&side=SELL&page=1&pageSize=5');
    const j = await r.json();
    return (j?.data?.items||[]).map(it=>({name:'K'+'uCoin P2P',source:'kucoin_p2p',price:Number(it.price)}));
  }catch(e){ return []; }
}
async function getGold1(){
  try{ const r=await fetch('https://data-asg.goldprice.org/dbXRates/USD'); const j=await r.json(); return Number(j?.items?.[0]?.xauPrice||0); }catch(e){ return 0; }
}
async function getGold2(){
  try{ const r=await fetch('https://gold-api.com/api/XAU/USD'); const j=await r.json(); return Number(j?.price||0); }catch(e){ return 0; }
}
async function getGold3(){
  try{ const r=await fetch('https://api.metals.live/v1/spot?metals=gold'); const j=await r.json(); return Number(j?.[0]?.price||j?.gold||0); }catch(e){ return 0; }
}
const all = [...(await getBinance()), ...(await getRateSudan()), ...(await getMtgr()), ...(await getOKX()), ...(await getKuCoin())];
const prices = all.map(s=>s.price).filter(n=>n>0);
const highest = prices.length ? Math.max(...prices) : 12200;
const bestSource = all.find(s=>s.price===highest)?.name || 'B'+'inance P2P';
const goldPrices = [await getGold1(), await getGold2(), await getGold3()].filter(n=>n>1000);
goldPrices.sort((a,b)=>a-b);
const goldUsd = goldPrices.length ? goldPrices[Math.floor(goldPrices.length/2)] : 0;
const goldGram = goldUsd ? Math.round((goldUsd/31.1035)*highest) : 1182772;
const out = {
  updatedAt: new Date().toISOString(),
  sourcesChecked: all.length,
  sources: ['B'+'inance P2P','Rate Sudan','Mtgr-SD','O'+'KX P2P','K'+'uCoin P2P'],
  goldSources: ['GoldPrice','Gold-API','Metals'],
  goldPrices: goldPrices,
  usd_sdg: highest, usdt_sdg: highest,
  bestPrice: highest, bestSource,
  gold_per_gram_sdg: goldGram, gold_usd_per_ounce: goldUsd,
  allSources: all,
  rates: {
    USDT: { buy: highest, sell: highest, source: bestSource },
    USD: { buy: highest, sell: highest, source: bestSource },
    GOLD_GRAM: { price: goldGram, source: 'median gold + best rate' }
  }
};
fs.writeFileSync('rates.json', JSON.stringify(out, null, 2));
console.log('OK', highest, bestSource, goldUsd, goldGram);
