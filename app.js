/* ==========================================================
   صدى — خريطة صوتية حيّة للمدينة
   - الخريطة: Leaflet + CARTO dark tiles
   - الأصوات: نسخ تجريبية مولَّدة بـ Web Audio (استبدليها بتسجيلات حقيقية
     بإضافة رابط ملف صوتي كعنصر رابع في أي صوت، شوفي README)
   ========================================================== */
(() => {
  'use strict';

  const D = 30;          // مدة كل صوت بالثواني
  const TOUR_SEC = 12;   // مدة كل محطة بالجولة الصوتية
  const BINS = 96;       // عدد أعمدة الموجة
  const COLORS = { black: '#030407', cobalt: '#1558C9', lime: '#D4FF24', ink: '#f3f1ea' };

  /* ---------------------------------------------------------
     البيانات
     كل صوت: [نوع الصوت, العنوان, اسم المسجِّل, (اختياري) رابط ملف صوتي]
     --------------------------------------------------------- */
  const PERIODS = [
    { id: 'fajr',    label: 'الفجر', tint: 0.26 },
    { id: 'morning', label: 'الصبح', tint: 0.12 },
    { id: 'evening', label: 'المسا', tint: 0.20 },
    { id: 'night',   label: 'الليل', tint: 0.07 },
  ];

  const PLACES = [
    { id: 'balad', name: 'وسط البلد', lat: 31.9522, lng: 35.9330, r: 650, v: {
      fajr:    ['adhan',  'أذان الفجر فوق المدرّج', 'أبو يزن'],
      morning: ['market', 'بسطة خضرة بالسوق', 'أم خالد'],
      evening: ['oud',    'موسيقى من محل قديم', 'سليم'],
      night:   ['cafe',   'كاسات شاي آخر الليل', 'رامي'] } },
    { id: 'weibdeh', name: 'جبل اللويبدة', lat: 31.9605, lng: 35.9205, r: 520, v: {
      fajr:    ['adhan',  'أذان الفجر من شرفة', 'ليلى'],
      morning: ['cafe',   'قهوة الصبح على الدرج', 'لانا'],
      evening: ['kids',   'ضحك أطفال بزقاق', 'هديل'],
      night:   ['oud',    'عود من شباك مفتوح', 'نور'] } },
    { id: 'amman', name: 'جبل عمّان', lat: 31.9515, lng: 35.9075, r: 560, v: {
      fajr:    ['birds',  'عصافير قبل الشمس', 'دانة'],
      morning: ['traffic','زحمة الدوّار الأول', 'مازن'],
      evening: ['cafe',   'طاولة زهر ع الرصيف', 'عمر'],
      night:   ['rain',   'مطر على سطح', 'جود'] } },
    { id: 'hussein', name: 'جبل الحسين', lat: 31.9685, lng: 35.9140, r: 520, v: {
      fajr:    ['adhan',  'أذان من مأذنة الحيّ', 'إبراهيم'],
      morning: ['market', 'نداء بائع ع العربية', 'أبو سامر'],
      evening: ['rain',   'أول مطرة بالخريف', 'ريم'],
      night:   ['night',  'صراصير وكلاب من بعيد', 'طارق'] } },
    { id: 'abdoun', name: 'عبدون', lat: 31.9440, lng: 35.8880, r: 600, v: {
      fajr:    ['birds',  'شحارير ع الجسر', 'سمر'],
      morning: ['cafe',   'صباح كافيه هادي', 'ياسمين'],
      evening: ['traffic','ساعة الذروة عند الجسر', 'كريم'],
      night:   ['night',  'ليل الفيلات', 'فراس'] } },
    { id: 'shmeisani', name: 'الشميساني', lat: 31.9660, lng: 35.8960, r: 500, v: {
      fajr:    ['adhan',  'أذان الفجر بين العمارات', 'محمود'],
      morning: ['traffic','أبواق الصبح', 'هالة'],
      evening: ['cafe',   'استراحة الموظفين', 'عبير'],
      night:   ['oud',    'عود من سيارة ركنت', 'وسام'] } },
    { id: 'marka', name: 'ماركا', lat: 31.9840, lng: 35.9860, r: 700, v: {
      fajr:    ['adhan',  'أذان الفجر فوق السطوح', 'خالد'],
      morning: ['market', 'سوق الخضرة', 'أم محمد'],
      evening: ['kids',   'لعب كرة بالحارة', 'عدي'],
      night:   ['night',  'هدوء آخر الليل', 'سناء'] } },
    { id: 'sweileh', name: 'صويلح', lat: 32.0270, lng: 35.8440, r: 800, v: {
      fajr:    ['birds',  'فجر بين الأشجار', 'غادة'],
      morning: ['kids',   'طابور المدرسة', 'معلّمة هناء'],
      evening: ['oud',    'سهرة عيلة', 'بهاء'],
      night:   ['rain',   'مطر ع الزينقو', 'أسيل'] } },
  ];

  /* ---------------------------------------------------------
     أدوات صغيرة
     --------------------------------------------------------- */
  const $ = (s, el = document) => el.querySelector(s);
  const periodOf = id => PERIODS.find(p => p.id === id);
  const hash = str => { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = seed => { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const fmt = s => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const toAr = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function pickPeriodNow() {
    const h = new Date().getHours();
    if (h >= 4 && h < 7) return 'fajr';
    if (h >= 7 && h < 15) return 'morning';
    if (h >= 15 && h < 21) return 'evening';
    return 'night';
  }

  function variantOf(place, periodId) {
    if (place.custom) return { kind: 'user', ...place.custom };
    const a = place.v[periodId];
    return { kind: a[0], title: a[1], by: a[2], file: a[3] };
  }

  const state = {
    period: pickPeriodNow(),
    place: null,
    tour: { on: false, i: 0, count: 0 },
    markers: new Map(),   // id -> {marker, circle, label}
    binsStore: {},        // "place|period" -> Float32Array
  };

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
  }

  /* ---------------------------------------------------------
     محرك الصوت (Web Audio)
     --------------------------------------------------------- */
  let ctx, master, analyser, wet, noiseBuf;

  function initAudio() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.9;
      analyser = ctx.createAnalyser(); analyser.fftSize = 1024; analyser.smoothingTimeConstant = 0.5;
      master.connect(analyser); analyser.connect(ctx.destination);

      // صدى بسيط (delay مع feedback)
      wet = ctx.createGain(); wet.gain.value = 1;
      const dl = ctx.createDelay(1); dl.delayTime.value = 0.27;
      const fb = ctx.createGain(); fb.gain.value = 0.38;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
      wet.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(master);

      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const ch = noiseBuf.getChannelData(0);
      for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function makeSession(wetAmt = 0.25, dur = D, fade = true) {
    const bus = ctx.createGain(); bus.connect(master);
    const send = ctx.createGain(); send.gain.value = wetAmt; bus.connect(send); send.connect(wet);
    const t0 = ctx.currentTime + 0.05;
    if (fade) {
      bus.gain.setValueAtTime(0, t0);
      bus.gain.linearRampToValueAtTime(1, t0 + 1.2);
      bus.gain.setValueAtTime(1, t0 + dur - 1.5);
      bus.gain.linearRampToValueAtTime(0, t0 + dur);
    } else bus.gain.value = 1;
    const srcs = [];
    return {
      bus, send, t0, dur, srcs, audio: null, ended: false,
      stop(fadeSec = 0.35) {
        const n = ctx.currentTime;
        try { bus.gain.cancelScheduledValues(n); bus.gain.setValueAtTime(bus.gain.value, n); bus.gain.linearRampToValueAtTime(0, n + fadeSec); } catch (e) {}
        setTimeout(() => {
          srcs.forEach(s => { try { s.stop(); } catch (e) {} });
          try { bus.disconnect(); send.disconnect(); } catch (e) {}
        }, fadeSec * 1000 + 100);
      },
    };
  }

  function noise(S, { type = 'bandpass', f = 800, q = 1, g = 0.1, lfo = 0, depth = 0 } = {}) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const flt = ctx.createBiquadFilter(); flt.type = type; flt.frequency.value = f; flt.Q.value = q;
    const gn = ctx.createGain(); gn.gain.value = g;
    src.connect(flt); flt.connect(gn); gn.connect(S.bus);
    if (lfo) {
      const o = ctx.createOscillator(); o.frequency.value = lfo;
      const og = ctx.createGain(); og.gain.value = depth;
      o.connect(og); og.connect(gn.gain); o.start(S.t0); o.stop(S.t0 + D + 0.3); S.srcs.push(o);
    }
    src.start(S.t0, Math.random() * 1.5); src.stop(S.t0 + D + 0.3); S.srcs.push(src);
    return gn;
  }

  function tone(S, t, { f = 440, dur = 0.3, type = 'sine', peak = 0.1, glide, att = 0.01, filt, q = 1, ft = 'bandpass' } = {}) {
    const T = S.t0 + t;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f, T);
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, T + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, T);
    g.gain.linearRampToValueAtTime(peak, T + Math.min(att, dur * 0.5));
    g.gain.exponentialRampToValueAtTime(0.0001, T + dur);
    let last = o;
    if (filt) { const b = ctx.createBiquadFilter(); b.type = ft; b.frequency.value = filt; b.Q.value = q; o.connect(b); last = b; }
    last.connect(g); g.connect(S.bus);
    o.start(T); o.stop(T + dur + 0.05); S.srcs.push(o);
  }

  function click(S, t, { f = 3000, dur = 0.04, peak = 0.1, q = 2 } = {}) {
    const T = S.t0 + t;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(peak, T); g.gain.exponentialRampToValueAtTime(0.0001, T + dur);
    src.connect(b); b.connect(g); g.connect(S.bus);
    src.start(T, Math.random() * 1.5, dur + 0.02); S.srcs.push(src);
  }

  function chirps(S, r, a, b, n) {
    for (let i = 0; i < n; i++) {
      const t = a + r() * (b - a), base = 2400 + r() * 2200, k = 2 + Math.floor(r() * 4);
      const up = r() < 0.5;
      for (let j = 0; j < k; j++) tone(S, t + j * 0.11, { f: base, glide: base * (up ? 1.35 : 0.7), dur: 0.08, peak: 0.03 + r() * 0.03, att: 0.005 });
    }
  }

  function cricket(S, f, rate, g) {
    const o = ctx.createOscillator(); o.frequency.value = f;
    const a = ctx.createGain(); a.gain.value = g;
    const lf = ctx.createOscillator(); lf.frequency.value = rate;
    const lg = ctx.createGain(); lg.gain.value = g;
    lf.connect(lg); lg.connect(a.gain); o.connect(a); a.connect(S.bus);
    [o, lf].forEach(x => { x.start(S.t0); x.stop(S.t0 + D + 0.3); S.srcs.push(x); });
  }

  const SYNTH = {
    rain(S, r) {
      noise(S, { type: 'highpass', f: 1800, g: 0.16 });
      noise(S, { f: 600, q: 0.7, g: 0.1, lfo: 0.15, depth: 0.04 });
      for (let i = 0; i < 110; i++) { const f = 900 + r() * 1800; tone(S, r() * D, { f, glide: f * 0.5, dur: 0.05 + r() * 0.05, peak: 0.025 + r() * 0.03, att: 0.003 }); }
      const th = noise(S, { type: 'lowpass', f: 110, g: 0 });
      th.gain.setValueAtTime(0, S.t0 + 14); th.gain.linearRampToValueAtTime(0.35, S.t0 + 16); th.gain.linearRampToValueAtTime(0, S.t0 + 22);
    },
    market(S, r) {
      noise(S, { f: 700, q: 0.6, g: 0.09, lfo: 0.27, depth: 0.03 });
      noise(S, { type: 'highpass', f: 3000, g: 0.01 });
      for (let i = 0; i < 34; i++) { const f = 110 + r() * 120; tone(S, r() * (D - 1), { f, glide: f * (0.8 + r() * 0.5), type: 'sawtooth', dur: 0.25 + r() * 0.4, peak: 0.045, filt: 600 + r() * 900, q: 2.2, att: 0.05 }); }
      for (let i = 0; i < 5; i++) tone(S, 3 + r() * 24, { f: 170, glide: 250, type: 'sawtooth', dur: 0.8, peak: 0.09, filt: 900, q: 1.5, att: 0.08 });
      for (let i = 0; i < 10; i++) tone(S, r() * D, { f: 3200 + r() * 900, dur: 0.3, peak: 0.03 });
    },
    kids(S, r) {
      noise(S, { f: 1500, q: 0.4, g: 0.04, lfo: 0.2, depth: 0.015 });
      for (let i = 0; i < 9; i++) {
        const t = 1 + r() * 26, base = 620 + r() * 260, n = 4 + Math.floor(r() * 4);
        for (let k = 0; k < n; k++) { const f = base * (1 - k * 0.04); tone(S, t + k * 0.11, { f, glide: f * 0.8, type: 'triangle', dur: 0.1, peak: 0.08, filt: 1300, q: 1.2 }); }
      }
      for (let i = 0; i < 6; i++) tone(S, 2 + r() * 26, { f: 130, glide: 50, dur: 0.18, peak: 0.18 });
      for (let i = 0; i < 14; i++) { const f = 1700 + r() * 700; tone(S, r() * D, { f, glide: f * 1.3, type: 'triangle', dur: 0.14, peak: 0.04, filt: 1800, q: 1 }); }
    },
    oud(S, r) {
      const sc = [146.83, 155.56, 185, 196, 220, 233.08, 261.63, 293.66];
      const pluck = (t, f) => { tone(S, t, { f, dur: 1.5, type: 'triangle', peak: 0.18, att: 0.004, filt: 2200, ft: 'lowpass' }); tone(S, t, { f: f * 2, dur: 0.6, peak: 0.04, att: 0.004 }); };
      let idx = 3, t = 1;
      while (t < D - 3) {
        idx = Math.max(0, Math.min(7, idx + [-2, -1, -1, 0, 1, 1, 2][Math.floor(r() * 7)]));
        pluck(t, sc[idx]);
        t += [0.25, 0.25, 0.5, 0.5, 0.75][Math.floor(r() * 5)] + (r() < 0.12 ? 0.5 : 0);
      }
      pluck(t + 0.2, sc[0]);
      const pat = 'D.T.TD.T';
      for (let s = 0, tt = 5; tt < D - 1; s++, tt += 0.25) {
        const c = pat[s % pat.length];
        if (c === 'D') tone(S, tt, { f: 95, glide: 60, dur: 0.22, peak: 0.2 });
        else if (c === 'T') click(S, tt, { f: 2500, dur: 0.05, peak: 0.08 });
      }
      for (let i = 0; i < 70; i++) click(S, r() * D, { f: 4000, dur: 0.012, peak: 0.05 + r() * 0.05, q: 0.5 });
      noise(S, { type: 'highpass', f: 5000, g: 0.008 });
    },
    adhan(S, r) {
      // نسخة تجريبية (لحن مقام بيات بصوت اصطناعي)، استبدليها بتسجيل حقيقي
      const ph = [[392, 2.8], [440, 1.8], [392, 1.2], [349.2, 1.6], [320.2, 1.0], [293.7, 3.2]];
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 392;
      const vib = ctx.createOscillator(); vib.frequency.value = 5.3;
      const vg = ctx.createGain(); vg.gain.value = 5; vib.connect(vg); vg.connect(o.frequency);
      const g = ctx.createGain(); g.gain.value = 0;
      [[800, 5], [1300, 6]].forEach(([f, q]) => { const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; o.connect(b); b.connect(g); });
      g.connect(S.bus);
      let t = S.t0 + 1.5;
      for (let rep = 0; rep < 2; rep++) {
        ph.forEach(([f, d]) => {
          o.frequency.setTargetAtTime(f, t, 0.12);
          g.gain.setTargetAtTime(0.11, t, 0.15);
          t += d;
          g.gain.setTargetAtTime(0.04, t - 0.25, 0.1);
        });
        g.gain.setTargetAtTime(0.0001, t, 0.3);
        t += 2.2;
      }
      [o, vib].forEach(x => { x.start(S.t0); x.stop(S.t0 + D + 0.3); S.srcs.push(x); });
      tone(S, 0, { f: 146.8, dur: D - 1, peak: 0.05, att: 2 });
      noise(S, { type: 'lowpass', f: 400, g: 0.02, lfo: 0.1, depth: 0.01 });
      chirps(S, r, 25, 29, 5);
    },
    cafe(S, r) {
      noise(S, { f: 900, q: 0.7, g: 0.08, lfo: 0.23, depth: 0.025 });
      for (let i = 0; i < 16; i++) { const f = 2300 + r() * 1400, t = r() * D; tone(S, t, { f, dur: 0.35, peak: 0.04 }); tone(S, t, { f: f * 1.5, dur: 0.2, peak: 0.02 }); }
      for (let i = 0; i < 5; i++) { const t = r() * (D - 3), n = 3 + Math.floor(r() * 4); for (let k = 0; k < n; k++) click(S, t + k * 0.13 + r() * 0.03, { f: 1800, dur: 0.04, peak: 0.12 }); }
      for (let i = 0; i < 8; i++) { const f = 140 + r() * 60; tone(S, r() * D, { f, glide: f * 1.2, type: 'sawtooth', dur: 0.4, peak: 0.04, filt: 800, q: 2, att: 0.06 }); }
    },
    night(S, r) {
      cricket(S, 4400, 13, 0.02);
      cricket(S, 5100, 17, 0.014);
      noise(S, { type: 'lowpass', f: 400, g: 0.05, lfo: 0.1, depth: 0.02 });
      [6, 15, 24].forEach(t0 => { const n = 2 + Math.floor(r() * 2); for (let k = 0; k < n; k++) tone(S, t0 + k * 0.3, { f: 380, glide: 220, type: 'sawtooth', dur: 0.16, peak: 0.07, filt: 900, q: 2 }); });
      const car = noise(S, { type: 'lowpass', f: 300, g: 0 });
      car.gain.setValueAtTime(0, S.t0 + 17); car.gain.linearRampToValueAtTime(0.14, S.t0 + 20); car.gain.linearRampToValueAtTime(0, S.t0 + 24);
    },
    traffic(S, r) {
      noise(S, { type: 'lowpass', f: 260, g: 0.2, lfo: 0.1, depth: 0.05 });
      noise(S, { f: 1200, q: 0.5, g: 0.03 });
      for (let i = 0; i < 5; i++) tone(S, r() * (D - 6), { f: 70, glide: 105, type: 'sawtooth', dur: 4, peak: 0.08, filt: 400, att: 1.5 });
      for (let i = 0; i < 7; i++) { const t = r() * (D - 1), d = 0.25 + r() * 0.4; tone(S, t, { f: 420, type: 'square', dur: d, peak: 0.04, filt: 900 }); tone(S, t, { f: 530, type: 'square', dur: d, peak: 0.04, filt: 1100 }); }
    },
    birds(S, r) {
      noise(S, { type: 'lowpass', f: 500, g: 0.025, lfo: 0.08, depth: 0.01 });
      chirps(S, r, 0, D - 1, 34);
      [4, 13, 21].forEach(t0 => { for (let k = 0; k < 3; k++) tone(S, t0 + k * 0.5, { f: 480, glide: 420, dur: 0.35, peak: 0.05, att: 0.05 }); });
    },
  };

  function synthSession(kind, seed) {
    const wetAmt = { adhan: 0.55, oud: 0.3, rain: 0.15, night: 0.3 }[kind] ?? 0.2;
    const S = makeSession(wetAmt);
    SYNTH[kind](S, rng(seed));
    return S;
  }

  function fileSession(url) {
    const a = new Audio(); a.crossOrigin = 'anonymous'; a.preload = 'auto'; a.src = url;
    const S = makeSession(0.1, D, false);
    S.t0 = ctx.currentTime; S.audio = a;
    const src = ctx.createMediaElementSource(a); src.connect(S.bus);
    a.addEventListener('loadedmetadata', () => { if (isFinite(a.duration)) S.dur = Math.min(D, a.duration); });
    a.addEventListener('ended', () => { S.ended = true; });
    a.play().catch(() => toast('ما قدرنا نشغّل الملف الصوتي'));
    S.srcs.push({ stop() { a.pause(); } });
    return S;
  }

  /* =========================================================
     واجهة بأسلوب خرائط جوجل: لوحة جانبية + شرائح + دبابيس
     ========================================================= */
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const svgIcon = (d, size = 20, sw = 2) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  const ICON_PLAY = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.6v12.8a1 1 0 0 0 1.5.86l10.6-6.4a1 1 0 0 0 0-1.72L9.5 4.74A1 1 0 0 0 8 5.6z" fill="currentColor"/></svg>';
  const ICON_PAUSE = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4.2" height="14" rx="1.2" fill="currentColor"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.2" fill="currentColor"/></svg>';

  const KIND = {
    adhan:   { label: 'أذان',   d: 'M6 21V12a6 6 0 0 1 12 0v9M4 21h16M12 2.5V6' },
    market:  { label: 'سوق',    d: 'M4 9h16l-1.5 10h-13L4 9zM8 9l3-5M16 9l-3-5' },
    rain:    { label: 'مطر',    d: 'M7 15a4 4 0 0 1 .6-7.9A5 5 0 0 1 17 8.5 3.5 3.5 0 0 1 17 15M9 18v2.5M13 18v2.5M17 18v2.5' },
    kids:    { label: 'أطفال',  d: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8.5 14a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01' },
    oud:     { label: 'موسيقى', d: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z' },
    cafe:    { label: 'مقهى',   d: 'M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9zM17 10h2a2 2 0 0 1 0 4h-2M8 3v3M12 3v3' },
    night:   { label: 'ليل',    d: 'M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z' },
    traffic: { label: 'شارع',   d: 'M5 16v-5l2-5h10l2 5v5M3 16h18M7.5 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM16.5 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z' },
    birds:   { label: 'طبيعة',  d: 'M20 4C10 4 5 9 5 16c0 1 .2 2 .5 3 1-5 4-8 9-10-4 3-6 6-7 11 1 .3 2 .5 3 .5 7 0 12-5 12-16z' },
    user:    { label: 'تسجيلك', d: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM6 11a6 6 0 0 0 12 0M12 17v4' },
  };
  const KIND_ORDER = ['adhan', 'market', 'rain', 'kids', 'oud', 'cafe', 'night', 'traffic', 'birds'];
  const IC = {
    back: 'M9 6l6 6-6 6', close: 'M6 6l12 12M18 6L6 18',
    share: 'M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 15V4M8 8l4-4 4 4',
    heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
    pin: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
    tour: 'M3 12h4l3-8 4 16 3-8h4',
  };
  const kindOf = v => KIND[v.kind] || KIND.user;
  const isMobile = () => window.matchMedia('(max-width:760px)').matches;

  Object.assign(state, {
    view: 'list', query: '', kind: null, favOnly: false,
    favs: new Set(), layers: new Map(),
  });
  try { state.favs = new Set(JSON.parse(localStorage.getItem('sada-favs') || '[]')); } catch (e) {}
  const saveFavs = () => { try { localStorage.setItem('sada-favs', JSON.stringify([...state.favs])); } catch (e) {} };

  const ALL = PLACES.slice();   // + التسجيلات اللي بيضيفها المستخدم
  const ui = { panel: $('#panel'), body: $('#panelBody'), mini: $('#mini'), q: $('#q'), chips: $('#chips'), range: $('#timeRange'), ticks: $('#ticks'), tourBtn: $('#tourBtn'), tourLabel: $('#tourLabel') };

  /* ---------- الخريطة ---------- */
  const map = L.map('map', { center: [31.975, 35.925], zoom: 12, minZoom: 10, maxZoom: 18, zoomControl: false, zoomSnap: 0.5 });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  className: 'dark-tiles',
  attribution: '© OpenStreetMap'
}).addTo(map);
  map.attributionControl.setPosition('bottomleft');

  function flyToPlace(pl, zoom) {
    const z = Math.max(map.getZoom(), zoom || 13.5);
    const pt = map.project(L.latLng(pl.lat, pl.lng), z);
    if (isMobile()) pt.y += window.innerHeight * 0.17;
    else if (!document.body.classList.contains('panel-closed')) pt.x += 204;
    map.flyTo(map.unproject(pt, z), z, { duration: 0.9 });
  }

  /* ---------- الدبابيس ---------- */
  function makeIcon(pl) {
    const k = kindOf(variantOf(pl, state.period)), delay = (Math.random() * 2.6).toFixed(2);
    return L.divIcon({
      className: 'gpin-wrap',
      html: `<div class="gpin ${pl.custom ? 'user' : ''}"><span class="ring" style="animation-delay:-${delay}s"></span><span class="pb">${svgIcon(k.d, 18, 2.2)}</span></div>`,
      iconSize: [40, 40], iconAnchor: [20, 20],
    });
  }

  function addPlaceToMap(pl) {
    if (!ALL.includes(pl)) ALL.push(pl);
    const circle = L.circle([pl.lat, pl.lng], {
      radius: pl.r, color: COLORS.cobalt, weight: 1.5, opacity: 0.8,
      fillColor: COLORS.cobalt, fillOpacity: 0.16, className: 'district',
    });
    const label = L.marker([pl.lat, pl.lng], {
      icon: L.divIcon({ className: 'district-label', html: `<span>${esc(pl.name)}</span>`, iconSize: [120, 24], iconAnchor: [60, -22] }),
      interactive: false, keyboard: false,
    });
    const marker = L.marker([pl.lat, pl.lng], { icon: makeIcon(pl), title: pl.name, alt: pl.name, draggable: !!pl.custom, riseOnHover: true });
    marker.bindTooltip('', { direction: 'top', offset: [0, -18], className: 'tip' });
    marker.on('click', () => selectPlace(pl, { play: true }));
    circle.on('click', () => selectPlace(pl, { play: true }));
    if (pl.custom) marker.on('dragend', () => { const ll = marker.getLatLng(); pl.lat = ll.lat; pl.lng = ll.lng; circle.setLatLng(ll); label.setLatLng(ll); });
    state.layers.set(pl.id, { marker, circle, label, on: false });
    refreshMarkers();
  }

  function matches(pl) {
    const v = variantOf(pl, state.period);
    if (state.kind && v.kind !== state.kind) return false;
    if (state.favOnly && !state.favs.has(pl.id)) return false;
    const q = state.query.trim().toLowerCase();
    if (q) {
      const hay = (pl.name + ' ' + v.title + ' ' + v.by + ' ' + kindOf(v).label).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  function refreshMarkers() {
    state.layers.forEach((m, id) => {
      const pl = ALL.find(p => p.id === id);
      if (!pl) return;
      const vis = matches(pl);
      if (vis && !m.on) { m.circle.addTo(map); m.label.addTo(map); m.marker.addTo(map); m.on = true; }
      if (!vis && m.on) { map.removeLayer(m.circle); map.removeLayer(m.label); map.removeLayer(m.marker); m.on = false; }
      if (vis) {
        m.marker.setIcon(makeIcon(pl));
        m.marker.setTooltipContent(esc(pl.custom ? 'تسجيلك' : pl.name) + ' · ' + esc(variantOf(pl, state.period).title));
      }
    });
    refreshMarkerStates();
  }

  function refreshMarkerStates() {
    state.layers.forEach((m, id) => {
      const e = m.marker.getElement();
      const playing = !!active && active.place.id === id, sel = !!state.place && state.place.id === id;
      if (e) { e.classList.toggle('playing', playing); e.classList.toggle('sel', sel); }
      m.circle.setStyle({ fillOpacity: playing ? 0.42 : sel ? 0.28 : 0.16, weight: playing || sel ? 2.5 : 1.5 });
    });
  }

  /* ---------- الموجة ---------- */
  function previewBins(seed) {
    const r = rng(seed), a = new Float32Array(BINS); let v = 0.3;
    for (let i = 0; i < BINS; i++) { v = 0.7 * v + 0.3 * r(); a[i] = v * 0.22; }
    return a;
  }
  function sizeCanvas(cv) {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(10, Math.round(cv.clientWidth * dpr)), h = Math.max(10, Math.round(cv.clientHeight * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    return dpr;
  }
  function drawWave(cv, bins, p) {
    if (!cv) return;
    const dpr = sizeCanvas(cv), c = cv.getContext('2d'), w = cv.width, h = cv.height;
    c.clearRect(0, 0, w, h);
    const n = bins.length, gap = w / n, bw = Math.max(2, gap * 0.58);
    for (let i = 0; i < n; i++) {
      const v = Math.min(1, bins[i] * 3.4) + 0.07, bh = v * h * 0.95, x = w - (i * gap + (gap + bw) / 2);
      c.fillStyle = (i / n) <= p ? COLORS.lime : 'rgba(255,255,255,.34)';
      c.fillRect(x, (h - bh) / 2, bw, bh);
    }
    if (p > 0 && p < 1) { c.fillStyle = '#fff'; c.fillRect(w - p * w - 1.5 * dpr, 0, 3 * dpr, h); }
  }
  const binsFor = (pl, periodId) => {
    if (active && active.place === pl && active.period === periodId) return active.bins;
    const key = pl.id + '|' + periodId;
    return state.binsStore[key] || previewBins(hash(key));
  };

  /* ---------- اللوحة: القائمة ---------- */
  const COMBOS = [];
  PLACES.forEach(p => PERIODS.forEach(pp => COMBOS.push([p, pp])));
  const [tdPlace, tdPeriod] = (() => {
    const d = new Date();
    const dayNum = Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 864e5);
    return COMBOS[(dayNum * 7 + 3) % COMBOS.length];
  })();

  function todayHTML() {
    const v = variantOf(tdPlace, tdPeriod.id), r = rng(hash('today' + tdPlace.id + tdPeriod.id));
    let bars = '', x = 0.4;
    for (let i = 0; i < 44; i++) { x = 0.55 * x + 0.45 * r(); bars += `<i class="${i === 27 ? 'hot' : ''}" style="height:${(18 + x * 82).toFixed(0)}%"></i>`; }
    return `<section class="today">
      <p class="kicker">صوت اليوم · يتغيّر كل ٢٤ ساعة</p>
      <h2>${esc(v.title)}</h2>
      <p>${esc(tdPlace.name)} · ${tdPeriod.label}</p>
      <div class="bars" aria-hidden="true">${bars}</div>
      <div class="today-foot">
        <button class="pill-lime" data-act="today" type="button">${ICON_PLAY.replace('width="22" height="22"', 'width="16" height="16"')} اسمعه</button>
        <small>بعد <span id="tdCountdown" dir="ltr">--:--:--</span></small>
      </div>
    </section>`;
  }

  function itemHTML(pl) {
    const v = variantOf(pl, state.period), k = kindOf(v);
    const isAct = !!active && active.place === pl, playing = isAct && !active.paused;
    return `<li class="${isAct ? 'is-active' : ''}">
      <button class="item" type="button" data-act="open" data-id="${pl.id}">
        <span class="ico">${svgIcon(k.d, 22)}</span>
        <span class="meta"><b>${esc(v.title)}</b><small>${esc(pl.custom ? 'من حيّك' : pl.name)} · ${k.label}</small></span>
      </button>
      <button class="lplay" type="button" data-act="play" data-id="${pl.id}" aria-label="${playing ? 'إيقاف مؤقت' : 'شغّل'}">${(playing ? ICON_PAUSE : ICON_PLAY).replace(/width="22" height="22"/, 'width="18" height="18"')}</button>
    </li>`;
  }

  function renderList() {
    const items = ALL.filter(matches);
    const filtered = state.query || state.kind || state.favOnly;
    let title = 'أصوات ' + periodOf(state.period).label;
    if (state.query) title = 'نتائج البحث';
    else if (state.favOnly) title = 'المحفوظة';
    else if (state.kind) title = KIND[state.kind].label + ' · ' + periodOf(state.period).label;
    let html = `<header class="brandbar">
      <svg width="34" height="34" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="7" fill="#D4FF24"/><circle cx="32" cy="32" r="15" fill="none" stroke="#1558C9" stroke-width="4"/><circle cx="32" cy="32" r="25" fill="none" stroke="#1558C9" stroke-width="3" opacity=".55"/></svg>
      <div><h1>صدى</h1><p>خريطة صوتية حيّة لعمّان</p></div></header>`;
    if (!filtered) html += todayHTML();
    html += `<div class="sec-head"><h2>${title}</h2><span>${toAr(items.length)} صوت</span></div>`;
    html += items.length
      ? `<ul class="list">${items.map(itemHTML).join('')}</ul>`
      : `<div class="empty"><b>ما لقينا صوت</b>جرّبي كلمة ثانية، أو شيلي التصفية.</div>`;
    html += `<div class="foot-links"><button type="button" data-act="about">عن صدى</button><button type="button" data-act="record">سجّل صوتك</button><span>الخرائط © OpenStreetMap © CARTO</span></div>`;
    ui.body.innerHTML = html;
  }

  /* ---------- اللوحة: التفاصيل ---------- */
  const nearby = pl => ALL.filter(p => p !== pl).map(p => ({ p, d: Math.hypot(p.lat - pl.lat, (p.lng - pl.lng) * 0.85) })).sort((a, b) => a.d - b.d).slice(0, 3).map(x => x.p);

  function renderDetail() {
    const pl = state.place, v = variantOf(pl, state.period), k = kindOf(v);
    const isAct = !!active && active.place === pl, playing = isAct && !active.paused, fav = state.favs.has(pl.id);
    let html = `
      <div class="d-top">
        <button class="icon-btn" type="button" data-act="back" aria-label="رجوع">${svgIcon(IC.back, 22)}</button>
        <button class="icon-btn" type="button" data-act="close" aria-label="إغلاق">${svgIcon(IC.close, 20)}</button>
      </div>
      <div class="d-hero"><canvas id="wave" aria-label="موجة الصوت"></canvas></div>
      <div class="d-head">
        <h1>${esc(v.title)}</h1>
        <p>${esc(pl.custom ? 'من حيّك' : pl.name)} · <span class="kind-tag">${svgIcon(k.d, 15)} ${k.label}</span></p>
        <p class="d-time" id="pTime" dir="ltr">0:00 / 0:30</p>
      </div>
      <div class="d-actions">
        <button class="act primary" type="button" data-act="toggle"><span class="circ">${playing ? ICON_PAUSE : ICON_PLAY}</span><span>${playing ? 'إيقاف' : 'شغّل'}</span></button>
        <button class="act" type="button" data-act="share"><span class="circ">${svgIcon(IC.share, 21)}</span><span>شارك</span></button>
        <button class="act ${fav ? 'on' : ''}" type="button" data-act="fav"><span class="circ">${svgIcon(IC.heart, 21).replace('fill="none"', fav ? 'fill="currentColor"' : 'fill="none"')}</span><span>${fav ? 'محفوظ' : 'احفظ'}</span></button>
        <button class="act" type="button" data-act="tour-from"><span class="circ">${svgIcon(IC.tour, 21)}</span><span>جولة من هنا</span></button>
      </div>
      <ul class="d-info">
        <li>${svgIcon(IC.pin, 22)}<div><b>${esc(pl.custom ? 'موقع تسجيلك' : pl.name)}</b><small>عمّان · ${periodOf(state.period).label}</small></div></li>
        <li>${svgIcon(KIND.user.d, 22)}<div><b>سجّله ${esc(v.by)}</b><small>٣٠ ثانية</small></div></li>
      </ul>`;
    if (!pl.custom) {
      html += `<div class="sec-head"><h2>نفس الحيّ بوقت ثاني</h2></div><div class="periods">` +
        PERIODS.map(pp => { const pv = variantOf(pl, pp.id), pk = kindOf(pv);
          return `<button class="pcard ${pp.id === state.period ? 'on' : ''}" type="button" data-act="period" data-id="${pp.id}"><span class="ico">${svgIcon(pk.d, 18)}</span><span><b>${pp.label}</b><small>${esc(pv.title)}</small></span></button>`;
        }).join('') + `</div>`;
    }
    const near = nearby(pl);
    if (near.length) html += `<div class="sec-head"><h2>أصوات قريبة</h2></div><ul class="list">${near.map(itemHTML).join('')}</ul>`;
    html += `<div class="d-pad"></div>`;
    ui.body.innerHTML = html;
    drawWave($('#wave'), binsFor(pl, state.period), 0);
  }

  function renderMini() {
    const show = !!active && state.view === 'list';
    ui.mini.hidden = !show;
    if (!show) { ui.mini.innerHTML = ''; return; }
    const v = active.v, k = kindOf(v);
    ui.mini.innerHTML = `
      <button class="mini-main" type="button" data-act="open" data-id="${active.place.id}">
        <span class="ico">${svgIcon(k.d, 20)}</span>
        <span style="min-width:0"><b>${esc(v.title)}</b><small>${esc(active.place.custom ? 'من حيّك' : active.place.name)}</small></span>
      </button>
      <button class="mini-btn lime" type="button" data-act="toggle" aria-label="تشغيل أو إيقاف مؤقت">${active.paused ? ICON_PLAY : ICON_PAUSE}</button>
      <button class="mini-btn" type="button" data-act="stop" aria-label="إيقاف">${svgIcon(IC.close, 18)}</button>
      <i class="mini-bar"><b id="miniBar"></b></i>`;
  }

  function renderPanel() {
    const sc = ui.body.scrollTop;
    if (state.view === 'detail' && state.place) renderDetail(); else renderList();
    ui.body.scrollTop = sc;
    renderMini();
  }

  /* ---------- التحكم بالتشغيل ---------- */
  let active = null;
  let rafId = 0;
  const timeBuf = new Uint8Array(1024);

  function startSound(place, periodId, opts = {}) {
    initAudio(); stopSound(true);
    const v = variantOf(place, periodId);
    const S = v.file ? fileSession(v.file) : synthSession(v.kind, hash(place.id + periodId));
    active = { S, place, period: periodId, v, key: place.id + '|' + periodId, bins: new Float32Array(BINS), paused: false, tourLimit: opts.tour ? TOUR_SEC : null };
    refreshMarkerStates(); renderPanel();
    if (!rafId) rafId = requestAnimationFrame(loop);
  }

  function stopSound(silent) {
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    if (active) { active.S.stop(silent ? 0.12 : 0.35); state.binsStore[active.key] = active.bins; active = null; }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    if (!silent) { refreshMarkerStates(); renderPanel(); }
  }

  function togglePause() {
    if (!active) { if (state.place) startSound(state.place, state.period); return; }
    active.paused = !active.paused;
    if (active.paused) { if (active.S.audio) active.S.audio.pause(); ctx.suspend(); }
    else { ctx.resume(); if (active.S.audio) active.S.audio.play(); }
    renderPanel();
  }

  function loop() { rafId = 0; tick(); if (active && !rafId) rafId = requestAnimationFrame(loop); }

  function tick() {
    if (!active) return;
    const S = active.S;
    const t = S.audio ? S.audio.currentTime : ctx.currentTime - S.t0, dur = S.dur || D;
    const p = Math.max(0, Math.min(1, t / dur));
    if (!active.paused) {
      analyser.getByteTimeDomainData(timeBuf);
      let sum = 0; for (let i = 0; i < timeBuf.length; i++) { const x = (timeBuf[i] - 128) / 128; sum += x * x; }
      const rms = Math.sqrt(sum / timeBuf.length), i = Math.min(BINS - 1, Math.floor(p * (BINS - 1)));
      active.bins[i] = Math.max(active.bins[i], rms);
    }
    if (state.view === 'detail' && state.place === active.place) {
      drawWave($('#wave'), active.bins, p);
      const pt = $('#pTime'); if (pt) pt.textContent = fmt(Math.max(0, t)) + ' / ' + fmt(dur);
    }
    const mb = $('#miniBar'); if (mb) mb.style.width = (p * 100) + '%';
    if (active.tourLimit && t >= active.tourLimit) { tourNext(); return; }
    if (t >= dur || S.ended) stopSound(false);
  }

  /* ---------- تنقّل اللوحة ---------- */
  function selectPlace(place, { play = false, tour = false, pan = true } = {}) {
    if (!tour && state.tour.on) { state.tour.on = false; updateTourBtn(); }
    state.place = place; state.view = 'detail';
    if (pan) flyToPlace(place, 13.5);
    if (play && !(active && active.place === place && active.period === state.period)) startSound(place, state.period, { tour });
    else renderPanel();
    ui.body.scrollTop = 0;
    refreshMarkerStates();
    if (isMobile()) document.body.classList.remove('sheet-expanded');
  }

  function goList() {
    state.view = 'list'; state.place = null;
    renderPanel(); ui.body.scrollTop = 0; refreshMarkerStates();
  }

  function toggleFav(pl) {
    if (!pl) return;
    if (state.favs.has(pl.id)) { state.favs.delete(pl.id); toast('انشالت من المحفوظة'); }
    else { state.favs.add(pl.id); toast('انحفظت'); }
    saveFavs(); renderPanel(); refreshMarkers();
  }

  /* ---------- الجولة الصوتية ---------- */
  const TOUR_ORDER = PLACES.slice().sort((a, b) => a.lng - b.lng);
  function updateTourBtn() {
    ui.tourBtn.classList.toggle('on', state.tour.on);
    ui.tourLabel.textContent = state.tour.on ? 'إيقاف الجولة' : 'جولة صوتية';
  }
  function startTour(from) {
    if (state.tour.on && !from) { stopTour(); return; }
    const i = from ? Math.max(0, TOUR_ORDER.indexOf(from)) : 0;
    state.tour = { on: true, i, count: 0 };
    updateTourBtn(); goTour();
  }
  function goTour() {
    const p = TOUR_ORDER[state.tour.i];
    flyToPlace(p, 13.5);
    selectPlace(p, { play: true, tour: true, pan: false });
  }
  function tourNext() {
    state.tour.count++;
    if (state.tour.count >= TOUR_ORDER.length) { stopTour(); toast('خلصت الجولة. شكراً إنك سمعت المدينة'); return; }
    state.tour.i = (state.tour.i + 1) % TOUR_ORDER.length;
    goTour();
  }
  function stopTour() { state.tour.on = false; updateTourBtn(); if (active) stopSound(false); }

  /* ---------- خريطة الزمن ---------- */
  function buildTicks() {
    ui.ticks.innerHTML = '';
    PERIODS.forEach((p, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = p.label; b.dataset.id = p.id;
      b.addEventListener('click', () => setPeriod(p.id));
      ui.ticks.appendChild(b);
    });
  }

  function setPeriod(id) {
    state.period = id;
    ui.range.value = PERIODS.findIndex(p => p.id === id);
    $$('button', ui.ticks).forEach(b => b.classList.toggle('active', b.dataset.id === id));
    $$('.chip[data-chip="period"]').forEach(b => b.classList.toggle('on', b.dataset.v === id));
    document.documentElement.style.setProperty('--tint', (periodOf(id).tint * 0.5).toFixed(3));
    refreshMarkers();
    if (active && !active.place.custom) startSound(active.place, id, { tour: !!active.tourLimit });
    else renderPanel();
  }

  /* ---------- الشرائح ---------- */
  function buildChips() {
    let h = PERIODS.map(p => `<button class="chip only-m ${p.id === state.period ? 'on' : ''}" type="button" data-chip="period" data-v="${p.id}">${svgIcon(IC.clock, 16)}${p.label}</button>`).join('');
    h += `<button class="chip" type="button" data-chip="fav">${svgIcon(IC.heart, 16)}المحفوظة</button>`;
    h += KIND_ORDER.map(k => `<button class="chip" type="button" data-chip="kind" data-v="${k}">${svgIcon(KIND[k].d, 16)}${KIND[k].label}</button>`).join('');
    ui.chips.innerHTML = h;
  }
  function syncChips() {
    $$('.chip[data-chip="kind"]').forEach(b => b.classList.toggle('on', b.dataset.v === state.kind));
    const f = $('.chip[data-chip="fav"]'); if (f) f.classList.toggle('on', state.favOnly);
  }
  function applyFilters() {
    state.view = 'list'; state.place = null;
    syncChips(); refreshMarkers(); renderPanel(); ui.body.scrollTop = 0;
  }

  /* ---------- مساعدات ---------- */
  function updateStats() { renderPanel(); }
  function playToday() {
    if (state.query || state.kind || state.favOnly) { state.query = ''; state.kind = null; state.favOnly = false; ui.q.value = ''; $('#clearQ').hidden = true; syncChips(); }
    setPeriod(tdPeriod.id);
    selectPlace(tdPlace, { play: true });
  }
  function tickCountdown() {
    const cd = $('#tdCountdown'); if (!cd) return;
    const n = new Date(), m = new Date(n); m.setHours(24, 0, 0, 0);
    const s = Math.floor((m - n) / 1000);
    cd.textContent = [Math.floor(s / 3600), Math.floor(s % 3600 / 60), s % 60].map(x => String(x).padStart(2, '0')).join(':');
  }

  /* =========================================================
     بطاقة المشاركة + التسجيل
     ========================================================= */
  /* ---------------------------------------------------------
     بطاقة المشاركة (ستوري ١٠٨٠×١٩٢٠)
     --------------------------------------------------------- */
  function wrapText(c, text, maxW) {
    const words = text.split(' '), lines = []; let cur = '';
    words.forEach(w => { const t = cur ? cur + ' ' + w : w; if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
    if (cur) lines.push(cur); return lines;
  }

  async function renderShareCard(place, periodId) {
    try { await Promise.all([document.fonts.load('700 100px Amiri'), document.fonts.load('400 40px "IBM Plex Sans Arabic"')]); } catch (e) {}
    const cv = $('#shareCanvas'), c = cv.getContext('2d'), W = 1080, H = 1920;
    const v = variantOf(place, periodId), key = place.id + '|' + periodId;
    let bins = state.binsStore[key];
    if (!bins || bins.reduce((a, b) => a + b, 0) < 0.5) bins = previewBins(hash(key)).map(x => x * 3.4);
    c.direction = 'rtl'; c.textAlign = 'center';

    c.fillStyle = COLORS.black; c.fillRect(0, 0, W, H);
    const g = c.createRadialGradient(W / 2, H * 0.62, 40, W / 2, H * 0.62, 900);
    g.addColorStop(0, 'rgba(21,88,201,.55)'); g.addColorStop(1, 'rgba(21,88,201,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(21,88,201,.5)'; c.lineWidth = 3;
    [220, 380, 540, 700].forEach(r => { c.beginPath(); c.arc(W / 2, H * 0.62, r, 0, Math.PI * 2); c.stroke(); });

    c.fillStyle = COLORS.ink; c.font = '700 170px Amiri, serif'; c.fillText('صدى', W / 2, 330);
    c.fillStyle = 'rgba(243,241,234,.66)'; c.font = '400 40px "IBM Plex Sans Arabic", sans-serif'; c.fillText('خريطة صوتية حيّة للمدينة', W / 2, 410);

    c.fillStyle = COLORS.lime; c.font = '600 44px "IBM Plex Sans Arabic", sans-serif';
    c.fillText((place.custom ? 'تسجيلي' : periodOf(periodId).label) + ' · عمّان', W / 2, 730);
    c.fillStyle = COLORS.ink; c.font = '700 150px Amiri, serif';
    c.fillText(place.custom ? 'حيّي' : place.name, W / 2, 880);

    const x0 = 100, ww = W - 200, cy = 1130, n = bins.length, gap = ww / n, bw = gap * 0.58, hot = Math.floor(n * 0.62);
    for (let i = 0; i < n; i++) {
      const bh = (Math.min(1, bins[i] * 3.4) + 0.06) * 300;
      c.fillStyle = i === hot ? COLORS.lime : COLORS.cobalt;
      c.fillRect(W - x0 - i * gap - bw, cy - bh / 2, bw, bh);
    }

    c.fillStyle = COLORS.ink; c.font = '700 78px Amiri, serif';
    wrapText(c, v.title, 860).slice(0, 2).forEach((ln, i) => c.fillText(ln, W / 2, 1380 + i * 96));
    c.fillStyle = 'rgba(243,241,234,.66)'; c.font = '400 40px "IBM Plex Sans Arabic", sans-serif';
    c.fillText('سجّله ' + v.by, W / 2, 1590);

    const pw = 520, ph = 112, px = (W - pw) / 2, py = 1680;
    c.fillStyle = COLORS.lime; c.beginPath(); c.roundRect ? c.roundRect(px, py, pw, ph, 56) : c.rect(px, py, pw, ph); c.fill();
    c.fillStyle = COLORS.black; c.font = '600 46px "IBM Plex Sans Arabic", sans-serif'; c.fillText('اسمع الحيّ على صدى', W / 2, py + 72);

    // شريط ٦٠/٣٠/١٠
    c.fillStyle = COLORS.black; c.fillRect(0, H - 24, W * 0.6, 24);
    c.fillStyle = COLORS.cobalt; c.fillRect(W * 0.6, H - 24, W * 0.3, 24);
    c.fillStyle = COLORS.lime; c.fillRect(W * 0.9, H - 24, W * 0.1, 24);
  }

  async function openShare() {
    if (!state.place) return;
    await renderShareCard(state.place, state.period);
    $('#shareDlg').showModal();
  }
  function cardBlob() { return new Promise(res => $('#shareCanvas').toBlob(res, 'image/png')); }
  $('#shareDownload').addEventListener('click', async () => {
    const b = await cardBlob(), a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = 'sada-' + (state.place ? state.place.id : 'card') + '.png'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  });
  $('#shareNative').addEventListener('click', async () => {
    const b = await cardBlob(), file = new File([b], 'sada.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'صدى', text: 'اسمع حيّي على صدى' }); } catch (e) {}
    } else toast('المشاركة المباشرة مش مدعومة هون، نزّلي الصورة');
  });
  $('#shareClose').addEventListener('click', () => $('#shareDlg').close());

  /* ---------------------------------------------------------
     التسجيل
     --------------------------------------------------------- */
  const rec = { mr: null, stream: null, chunks: [], timer: 0, t0: 0, blob: null, url: null, an: null, buf: null, src: null };
  const recDlg = $('#recDlg');
  const recStep = n => { ['recS1', 'recS2', 'recS3'].forEach((id, i) => { $('#' + id).hidden = i !== n - 1; }); };
  const recMsg = m => { const e = $('#recMsg'); e.textContent = m || ''; e.hidden = !m; };

  function recCleanup() {
    clearInterval(rec.timer); rec.timer = 0;
    if (rec.mr && rec.mr.state !== 'inactive') { rec.mr.onstop = null; try { rec.mr.stop(); } catch (e) {} }
    if (rec.stream) rec.stream.getTracks().forEach(t => t.stop());
    if (rec.src) { try { rec.src.disconnect(); } catch (e) {} rec.src = null; }
    rec.stream = null; rec.mr = null;
  }

  function openRecorder() {
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices) { toast('المتصفح هذا ما بيدعم التسجيل'); return; }
    if (active) stopSound(false);
    recMsg(''); recStep(1); recDlg.showModal();
  }

  async function recStart() {
    recMsg('');
    try { rec.stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch (e) { recMsg('ما قدرنا نوصل للمايك. اسمحي بالوصول من إعدادات المتصفح وجرّبي مرة ثانية.'); return; }
    initAudio();
    rec.src = ctx.createMediaStreamSource(rec.stream);
    rec.an = ctx.createAnalyser(); rec.an.fftSize = 256; rec.buf = new Uint8Array(rec.an.fftSize); rec.src.connect(rec.an);
    rec.chunks = [];
    rec.mr = new MediaRecorder(rec.stream);
    rec.mr.ondataavailable = e => { if (e.data.size) rec.chunks.push(e.data); };
    rec.mr.onstop = () => {
      rec.blob = new Blob(rec.chunks, { type: rec.mr.mimeType || 'audio/webm' });
      if (rec.url) URL.revokeObjectURL(rec.url);
      rec.url = URL.createObjectURL(rec.blob);
      $('#recAudio').src = rec.url;
      clearInterval(rec.timer);
      if (rec.stream) rec.stream.getTracks().forEach(t => t.stop());
      if (rec.src) { try { rec.src.disconnect(); } catch (e) {} rec.src = null; }
      recStep(3);
    };
    rec.mr.start(); rec.t0 = performance.now(); recStep(2);
    rec.timer = setInterval(() => {
      const s = (performance.now() - rec.t0) / 1000;
      $('#recTime').textContent = fmt(s); $('#recBar').style.width = Math.min(100, s / D * 100) + '%';
      rec.an.getByteTimeDomainData(rec.buf);
      let sum = 0; for (let i = 0; i < rec.buf.length; i++) { const x = (rec.buf[i] - 128) / 128; sum += x * x; }
      $('#recOrb').style.setProperty('--lvl', Math.min(1, Math.sqrt(sum / rec.buf.length) * 4).toFixed(2));
      if (s >= D) rec.mr.stop();
    }, 80);
  }

  let userCount = 0;
  function recAdd() {
    const c = map.getCenter(), n = ++userCount;
    const pl = {
      id: 'u' + n, name: 'صوتك', lat: c.lat, lng: c.lng, r: 300,
      custom: { title: $('#recName').value.trim() || 'صوت من حيّي', by: $('#recBy').value.trim() || 'مجهول', file: rec.url },
    };
    rec.url = null; // صار مملوك للنقطة
    addPlaceToMap(pl);
    recDlg.close();
    map.flyTo([pl.lat, pl.lng], Math.max(map.getZoom(), 14), { duration: 1.2 });
    selectPlace(pl, { play: false, pan: false });
    toast('تمت الإضافة! اسحبي النقطة لمكان حيّك');
    $('#recName').value = ''; $('#recBy').value = '';
    updateStats();
  }

  recDlg.addEventListener('close', () => { recCleanup(); if (rec.url) { URL.revokeObjectURL(rec.url); rec.url = null; } });
  $('#recClose').addEventListener('click', () => recDlg.close());
  $('#recStart').addEventListener('click', recStart);
  $('#recStop').addEventListener('click', () => { if (rec.mr && rec.mr.state === 'recording') rec.mr.stop(); });
  $('#recRetry').addEventListener('click', () => { recMsg(''); recStep(1); });
  $('#recAdd').addEventListener('click', recAdd);
  document.querySelectorAll('[data-open-recorder]').forEach(b => b.addEventListener('click', openRecorder));
  [recDlg, $('#shareDlg')].forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));

  /* =========================================================
     ربط الأحداث + تشغيل
     ========================================================= */
  ui.panel.addEventListener('click', e => {
    const t = e.target.closest('[data-act]'); if (!t) return;
    const a = t.dataset.act, id = t.dataset.id, pl = id ? ALL.find(p => p.id === id) : null;
    switch (a) {
      case 'open': if (pl) selectPlace(pl, { play: !(active && active.place === pl) }); break;
      case 'play':
        if (!pl) break;
        if (active && active.place === pl) togglePause();
        else { startSound(pl, state.period); flyToPlace(pl, 13.5); refreshMarkerStates(); }
        break;
      case 'toggle':
        if (active && (state.view === 'list' || active.place === state.place)) togglePause();
        else if (state.place) startSound(state.place, state.period);
        break;
      case 'stop': stopSound(false); break;
      case 'back': goList(); break;
      case 'close': stopSound(true); goList(); break;
      case 'share': openShare(); break;
      case 'fav': toggleFav(state.place); break;
      case 'tour-from': startTour(state.place); break;
      case 'period': setPeriod(id); break;
      case 'today': playToday(); break;
      case 'about': $('#aboutDlg').showModal(); break;
      case 'record': openRecorder(); break;
    }
  });

  ui.chips.addEventListener('click', e => {
    const c = e.target.closest('.chip'); if (!c) return;
    const k = c.dataset.chip;
    if (k === 'period') { setPeriod(c.dataset.v); return; }
    if (k === 'fav') state.favOnly = !state.favOnly;
    if (k === 'kind') state.kind = state.kind === c.dataset.v ? null : c.dataset.v;
    applyFilters();
  });

  $('#searchForm').addEventListener('submit', e => {
    e.preventDefault();
    const first = ALL.find(matches);
    if (first && state.query.trim()) selectPlace(first, { play: true });
    ui.q.blur();
  });
  ui.q.addEventListener('input', () => {
    state.query = ui.q.value; $('#clearQ').hidden = !ui.q.value;
    applyFilters();
    if (isMobile()) document.body.classList.add('sheet-expanded');
  });
  $('#clearQ').addEventListener('click', () => { ui.q.value = ''; state.query = ''; $('#clearQ').hidden = true; applyFilters(); ui.q.focus(); });
  $('#menuBtn').addEventListener('click', () => $('#aboutDlg').showModal());
  $('#aboutClose').addEventListener('click', () => $('#aboutDlg').close());
  $('#aboutDlg').addEventListener('click', e => { if (e.target.id === 'aboutDlg') e.target.close(); });

  ui.tourBtn.addEventListener('click', () => startTour());
  ui.range.addEventListener('input', () => setPeriod(PERIODS[+ui.range.value].id));
  $('#zoomIn').addEventListener('click', () => map.zoomIn());
  $('#zoomOut').addEventListener('click', () => map.zoomOut());

  let meMarker = null;
  $('#locateBtn').addEventListener('click', () => {
    if (!navigator.geolocation) { toast('الموقع مش مدعوم بهالمتصفح'); return; }
    navigator.geolocation.getCurrentPosition(pos => {
      const ll = [pos.coords.latitude, pos.coords.longitude];
      if (meMarker) map.removeLayer(meMarker);
      meMarker = L.circleMarker(ll, { radius: 8, color: '#fff', weight: 3, fillColor: COLORS.cobalt, fillOpacity: 1 }).addTo(map);
      map.flyTo(ll, 14, { duration: 1.2 });
    }, () => toast('ما قدرنا نحدد موقعك'), { enableHighAccuracy: true, timeout: 8000 });
  });

  $('#collapseBtn').addEventListener('click', () => document.body.classList.toggle('panel-closed'));

  // شيت الموبايل: ضغطة أو سحب
  (() => {
    const h = $('#sheetHandle'); let y0 = null;
    const set = open => document.body.classList.toggle('sheet-expanded', open);
    h.addEventListener('click', () => set(!document.body.classList.contains('sheet-expanded')));
    h.addEventListener('touchstart', e => { y0 = e.touches[0].clientY; }, { passive: true });
    h.addEventListener('touchend', e => {
      if (y0 === null) return;
      const dy = e.changedTouches[0].clientY - y0; y0 = null;
      if (dy < -30) { set(true); e.preventDefault(); } else if (dy > 30) { set(false); e.preventDefault(); }
    });
  })();

  window.addEventListener('resize', () => { if (state.view === 'detail' && state.place) drawWave($('#wave'), binsFor(state.place, state.period), 0); });
  document.addEventListener('keydown', e => {
    const tag = document.activeElement.tagName;
    if (document.querySelector('dialog[open]')) return;
    if (e.key === 'Escape' && state.view === 'detail') { goList(); return; }
    if (e.code === 'Space' && state.place && !/INPUT|BUTTON|TEXTAREA|AUDIO/.test(tag)) { e.preventDefault(); togglePause(); }
  });

  PLACES.forEach(addPlaceToMap);
  buildChips();
  buildTicks();
  updateTourBtn();
  setPeriod(state.period);
  tickCountdown(); setInterval(tickCountdown, 1000);
})();
