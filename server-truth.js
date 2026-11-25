/* TOMCO — السيرفر هو مصدر الحقيقة الوحيد
   كل أسعار الموازي = مربوطة بسعر USDT من السيرفر
   يجبر السعر كل 10 ثواني — حتى لو الجلبة المحلية حاولت تغيّرو */
(function(){
  var RATES_URL = 'https://raw.githubusercontent.com/Tomco73/tomco/main/rates.json';

  function serverBest(){
    try {
      var b = JSON.parse(localStorage.getItem('tomco_usdt_source') || 'null');
      if (b && b.price && b.ts && (Date.now() - b.ts < 20 * 60 * 1000)) return b;
    } catch(e){}
    return null;
  }

  function applyServer(price, source){
    try {
      if (!price || price < 5000 || price > 30000) return;
      if (!window.tomcoRates) window.tomcoRates = {};
      window.tomcoRates.usdParallel = price;      /* الدولار الموازي = سعر USDT */
      window.tomcoHighestUSDT = price;
      window.tomcoUSDTBest = { price: price, source: source || 'server', ts: Date.now() };
      /* أعد حساب كل العملات الموازية من سعر USDT */
      try { if (typeof applyGlobalConversions === 'function') applyGlobalConversions(); } catch(e){}
      try { if (typeof renderRates === 'function') renderRates(); } catch(e){}
    } catch(e){}
  }

  /* 1) طبّق السعر المحفوظ فوراً + كل 10 ثواني (يفوز على الجلبة المحلية دائماً) */
  function enforce(){
    var b = serverBest();
    if (b) applyServer(b.price, b.source);
  }
  try { enforce(); } catch(e){}
  setInterval(function(){ try { enforce(); } catch(e){} }, 10 * 1000);

  /* 2) اجلب من السيرفر مباشرة كل 60 ثانية كضمان */
  function fetchServer(){
    try {
      fetch(RATES_URL + '?t=' + Date.now(), { cache: 'no-store' })
        .then(function(r){ return r.json(); })
        .then(function(d){
          var p = d && (d.usdt || d.price || (d.rates && d.rates.usdt));
          var src = d && (d.source || d.provider || 'server');
          if (p) {
            try { localStorage.setItem('tomco_usdt_source', JSON.stringify({ price: p, source: src, ts: Date.now() })); } catch(e){}
            applyServer(p, src);
          }
        })
        .catch(function(){});
    } catch(e){}
  }
  try { fetchServer(); } catch(e){}
  setInterval(function(){ try { fetchServer(); } catch(e){} }, 60 * 1000);
})();
