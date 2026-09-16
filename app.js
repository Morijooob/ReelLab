(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const tabs = [...document.querySelectorAll('.tab')];
  const uploadPanel = $('uploadPanel');
  const urlPanel = $('urlPanel');
  const videoInput = $('videoInput');
  const fileName = $('fileName');
  const urlInput = $('urlInput');
  const goal = $('goal');
  const experimentName = $('experimentName');
  const caption = $('caption');
  const cta = $('cta');
  const analyzeBtn = $('analyzeBtn');
  const status = $('status');
  const results = $('results');
  const summary = $('summary');
  const metrics = $('metrics');
  const findings = $('findings');
  const experimentText = $('experimentText');
  const hooks = $('hooks');
  const resetBtn = $('resetBtn');
  const saveExperimentBtn = $('saveExperimentBtn');
  const copyExperimentBtn = $('copyExperimentBtn');
  const history = $('history');
  const historyList = $('historyList');
  const clearHistoryBtn = $('clearHistoryBtn');
  const STORAGE_KEY = 'reellab.experiments.v1';
  const MAX_HISTORY = 12;
  let mode = 'upload';
  let selectedFile = null;
  let videoMeta = null;
  let lastAnalysis = null;

  const goalNames = { reach: 'دیده‌شدن', followers: 'فالوور', engagement: 'تعامل', sales: 'فروش' };
  const setStatus = (text, tone = '') => { status.textContent = text; status.dataset.tone = tone; };
  const isInstagramReel = (value) => {
    try {
      const u = new URL(value);
      return /(^|\.)instagram\.com$/i.test(u.hostname) && (/\/reel\//i.test(u.pathname) || /\/reels\//i.test(u.pathname));
    } catch { return false; }
  };
  const addFinding = (title, text, kind = 'warn') => {
    const box = document.createElement('article');
    box.className = `finding ${kind}`;
    const b = document.createElement('b'); b.textContent = title;
    const p = document.createElement('p'); p.textContent = text;
    box.append(b, p); findings.appendChild(box);
  };
  const addMetric = (label, value) => {
    const box = document.createElement('div'); box.className = 'metric';
    const b = document.createElement('b'); b.textContent = value;
    const s = document.createElement('span'); s.textContent = label;
    box.append(b, s); metrics.appendChild(box);
  };
  const addHook = (label, text) => {
    const box = document.createElement('div'); box.className = 'hook';
    const small = document.createElement('small'); small.textContent = label;
    const span = document.createElement('span'); span.textContent = text;
    box.append(small, span); hooks.appendChild(box);
  };
  const formatDuration = (seconds) => {
    if (!Number.isFinite(seconds)) return '—';
    const s = Math.round(seconds); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  const getVideoMeta = (file) => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => { const m = { duration: video.duration, width: video.videoWidth, height: video.videoHeight }; URL.revokeObjectURL(url); resolve(m); };
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error('VIDEO_METADATA')); };
    video.src = url;
  });
  const readHistory = () => {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(data) ? data.slice(0, MAX_HISTORY) : [];
    } catch { return []; }
  };
  const writeHistory = (items) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_HISTORY))); return true; }
    catch { setStatus('ذخیره محلی ممکن نشد؛ فضای مرورگر را بررسی کن.', 'error'); return false; }
  };
  const renderHistory = () => {
    const items = readHistory();
    history.hidden = items.length === 0;
    historyList.textContent = '';
    items.forEach((item) => {
      const card = document.createElement('article'); card.className = 'history-card';
      const head = document.createElement('div'); head.className = 'history-head';
      const title = document.createElement('strong'); title.textContent = item.name || 'آزمایش بدون نام';
      const date = document.createElement('small'); date.textContent = new Date(item.createdAt).toLocaleString('fa-IR');
      head.append(title, date); card.append(head);
      const meta = document.createElement('p'); meta.className = 'history-meta'; meta.textContent = `${goalNames[item.goal] || item.goal} • ${item.duration ? formatDuration(item.duration) : 'بدون ویدیو'} • کپشن ${item.captionLength} کاراکتر • CTA ${item.hasCta ? 'دارد' : 'ندارد'}`; card.append(meta);
      const plan = document.createElement('p'); plan.className = 'history-plan'; plan.textContent = item.experiment; card.append(plan);
      const outcomeLabel = document.createElement('label'); outcomeLabel.className = 'field';
      const outcomeSpan = document.createElement('span'); outcomeSpan.textContent = 'نتیجه بعد از انتشار';
      const outcome = document.createElement('input'); outcome.type = 'text'; outcome.maxLength = 220; outcome.placeholder = 'مثلاً: 12K بازدید، 340 لایک، 18 فالو'; outcome.value = item.outcome || '';
      outcome.addEventListener('change', () => { const all = readHistory(); const found = all.find((x) => x.id === item.id); if (found) { found.outcome = outcome.value.trim(); writeHistory(all); } });
      outcomeLabel.append(outcomeSpan, outcome); card.append(outcomeLabel);
      const noteLabel = document.createElement('label'); noteLabel.className = 'field';
      const noteSpan = document.createElement('span'); noteSpan.textContent = 'یادداشت یادگیری';
      const note = document.createElement('textarea'); note.rows = 2; note.maxLength = 400; note.placeholder = 'چه چیزی از این آزمایش یاد گرفتی؟'; note.value = item.note || '';
      note.addEventListener('change', () => { const all = readHistory(); const found = all.find((x) => x.id === item.id); if (found) { found.note = note.value.trim(); writeHistory(all); } });
      noteLabel.append(noteSpan, note); card.append(noteLabel);
      const remove = document.createElement('button'); remove.className = 'ghost danger'; remove.type = 'button'; remove.textContent = 'حذف این آزمایش';
      remove.addEventListener('click', () => { writeHistory(readHistory().filter((x) => x.id !== item.id)); renderHistory(); });
      card.append(remove); historyList.appendChild(card);
    });
  };
  const buildExperimentText = () => `آزمایش: ${experimentName.value.trim() || 'بدون نام'}\nهدف: ${goalNames[goal.value]}\n${experimentText.textContent}\nهوک‌ها: ${[...hooks.querySelectorAll('.hook span')].map((x) => x.textContent).join(' | ')}`;
  const copyText = async (text) => {
    try { await navigator.clipboard.writeText(text); return true; }
    catch {
      const area = document.createElement('textarea'); area.value = text; area.style.position = 'fixed'; area.style.opacity = '0'; document.body.appendChild(area); area.select(); let ok = false; try { ok = document.execCommand('copy'); } catch {} area.remove(); return ok;
    }
  };

  tabs.forEach((tab) => tab.addEventListener('click', () => {
    mode = tab.dataset.mode;
    tabs.forEach((t) => { const active = t === tab; t.classList.toggle('active', active); t.setAttribute('aria-selected', String(active)); });
    uploadPanel.hidden = mode !== 'upload'; urlPanel.hidden = mode !== 'url'; setStatus('');
  }));

  videoInput.addEventListener('change', async () => {
    selectedFile = videoInput.files?.[0] || null; videoMeta = null;
    if (!selectedFile) { fileName.textContent = 'ویدیو روی سرور آپلود نمی‌شود؛ تحلیل در مرورگر انجام می‌شود.'; return; }
    fileName.textContent = selectedFile.name;
    if (!selectedFile.type.startsWith('video/')) { selectedFile = null; videoInput.value = ''; setStatus('فایل انتخاب‌شده ویدیو نیست.', 'error'); return; }
    try { videoMeta = await getVideoMeta(selectedFile); setStatus(`ویدیو آماده است • ${formatDuration(videoMeta.duration)} • ${videoMeta.width}×${videoMeta.height}`, 'ok'); }
    catch { setStatus('خواندن مشخصات ویدیو ممکن نشد؛ یک فایل ویدیویی دیگر امتحان کن.', 'error'); }
  });

  analyzeBtn.addEventListener('click', async () => {
    setStatus('در حال تحلیل…'); results.hidden = true; summary.textContent = ''; metrics.textContent = ''; findings.textContent = ''; hooks.textContent = '';
    const cap = caption.value.trim(); const action = cta.value.trim(); const selectedGoal = goal.value;
    if (mode === 'url') {
      const url = urlInput.value.trim();
      if (!url) { setStatus('لینک Reel را وارد کن.', 'error'); return; }
      if (!isInstagramReel(url)) { setStatus('این لینک شبیه لینک معتبر Instagram Reel نیست.', 'error'); return; }
    }
    if (mode === 'upload' && selectedFile && !videoMeta) {
      try { videoMeta = await getVideoMeta(selectedFile); } catch { setStatus('ویدیو قابل تحلیل نیست.', 'error'); return; }
    }
    const duration = videoMeta?.duration ?? null;
    const width = videoMeta?.width ?? null; const height = videoMeta?.height ?? null;
    const vertical = width && height ? (height / width >= 1.45) : null;
    const capLen = cap.length;
    let summaryTitle = 'گلوگاه‌های قابل‌تست پیدا شد';
    let summaryText = `هدف این Reel: ${goalNames[selectedGoal]}. نتیجه بر اساس داده‌های واردشده در همین مرورگر است.`;
    if (!videoMeta) { summaryTitle = 'تحلیل اولیه، بدون فایل ویدیو'; summaryText = 'بدون خود ویدیو، فقط ورودی‌های متنی بررسی می‌شوند. برای تشخیص قاب و طول، فایل را هم اضافه کن.'; }
    const sm = document.createElement('strong'); sm.textContent = summaryTitle;
    const sp = document.createElement('p'); sp.textContent = summaryText; summary.append(sm, sp);
    addMetric('مدت ویدیو', duration == null ? '—' : formatDuration(duration)); addMetric('قاب', vertical === null ? '—' : (vertical ? 'عمودی' : `${width}×${height}`)); addMetric('کپشن', `${capLen} کاراکتر`); addMetric('CTA', action ? 'دارد' : 'ندارد');
    if (!videoMeta) addFinding('ویدیو اضافه نشده', 'برای تحلیل واقعی طول و قاب، ویدیو را آپلود کن. در حالت لینک، Reel مستقیماً از Instagram دریافت نمی‌شود.', 'warn');
    if (duration !== null) { if (duration < 5) addFinding('ریسک طول خیلی کوتاه', 'نسخه‌ای حدود 7 تا 12 ثانیه را هم تست کن، اگر پیام محتوا اجازه می‌دهد.', 'warn'); else if (duration > 45) addFinding('ریسک طول بالا', 'یک نسخه کوتاه‌تر از همان ایده بساز تا مشخص شود افت توجه از طول ویدیو می‌آید یا نه.', 'warn'); else addFinding('طول در محدوده قابل‌تست', 'طول به‌تنهایی هشدار جدی ایجاد نمی‌کند؛ آزمایش را روی شروع و پیام اصلی متمرکز کن.', 'good'); }
    if (vertical === false) addFinding('قاب غیربهینه برای Reel', 'نسخه 9:16 را تست کن تا محتوای اصلی فضای عمودی بیشتری بگیرد.', 'warn');
    if (!cap) addFinding('کپشن خالی است', 'یک کپشن کوتاه و مشخص اضافه کن و نتیجه را با نسخه بدون کپشن مقایسه کن.', 'warn'); else if (capLen < 20) addFinding('کپشن بسیار کوتاه است', 'یک توضیح یا زمینه کوتاه اضافه کن که ارزش محتوا را روشن کند؛ سپس با نسخه فعلی مقایسه کن.', 'warn'); else addFinding('کپشن قابل استفاده است', 'در آزمایش بعدی فقط یک متغیر کپشن را تغییر بده تا اثر آن قابل‌تشخیص بماند.', 'good');
    if (!action) addFinding('CTA مشخص نیست', 'اگر هدف تعامل، فالوور یا فروش است، یک دعوت به اقدام مشخص و متناسب با همان هدف تست کن.', 'warn'); else addFinding('CTA ثبت شده', `CTA فعلی «${action}» است؛ آن را ثابت نگه دار و بیشتر روی هوک ابتدای ویدیو آزمایش کن.`, 'good');
    if (mode === 'url') addFinding('محدودیت MVP', 'لینک Instagram فقط اعتبارسنجی می‌شود؛ Reel از Instagram دانلود یا در سرور پردازش نمی‌شود.', 'good');
    let experiment = 'نسخه B را بساز و فقط هوک 1 تا 2 ثانیه اول را تغییر بده؛ طول، موضوع و CTA را ثابت نگه دار.';
    if (selectedGoal === 'followers') experiment = 'دو هوک با وعده متفاوت تست کن؛ CTA فالو را ثابت نگه دار تا اثر هوک جداگانه قابل مشاهده باشد.';
    if (selectedGoal === 'engagement') experiment = 'هوک را به یک سؤال یا تضاد مشخص تبدیل کن و CTA تعامل را ثابت نگه دار.';
    if (selectedGoal === 'sales') experiment = 'نسخه‌ای با نمایش سریع‌تر نتیجه/محصول بساز و CTA را ثابت نگه دار تا تغییر اصلی فقط در شروع باشد.';
    if (duration !== null && duration > 45) experiment = 'یک نسخه کوتاه‌تر بساز و فقط طول را تغییر بده؛ سپس عملکرد دو نسخه را با هدف یکسان مقایسه کن.';
    experimentText.textContent = experiment;
    const hookBase = selectedGoal === 'sales' ? ['قبل از خرید این 3 نکته را ببین','اگر این اشتباه را بکنی، هزینه‌اش را می‌دهی','نتیجه را در چند ثانیه ببین'] : selectedGoal === 'followers' ? ['اگر این موضوع برات مهمه، اینو ببین','3 چیزی که کاش زودتر می‌دانستم','این اشتباه باعث می‌شود دیده نشوی'] : selectedGoal === 'engagement' ? ['تو کدام گزینه را انتخاب می‌کنی؟','یک اشتباه رایج که خیلی‌ها انجام می‌دهند','با من موافقی یا نه؟'] : ['قبل از رد کردن، این یک نکته را ببین','اگر فقط 10 ثانیه وقت داری، اینو ببین','این بخش ماجرا را کمتر کسی می‌گوید'];
    hookBase.forEach((h, i) => addHook(`هوک ${i + 1}`, h));
    lastAnalysis = { name: experimentName.value.trim(), goal: selectedGoal, duration, captionLength: capLen, hasCta: Boolean(action), experiment, hooks: hookBase, createdAt: new Date().toISOString() };
    results.hidden = false; results.scrollIntoView({ behavior: 'smooth', block: 'start' }); setStatus('تحلیل کامل شد.', 'ok');
  });

  saveExperimentBtn.addEventListener('click', () => {
    if (!lastAnalysis) { setStatus('اول تحلیل را اجرا کن.', 'error'); return; }
    const items = readHistory();
    items.unshift({ ...lastAnalysis, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, outcome: '', note: '' });
    if (writeHistory(items)) { renderHistory(); setStatus('آزمایش در همین مرورگر ذخیره شد.', 'ok'); history.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });

  copyExperimentBtn.addEventListener('click', async () => { const ok = await copyText(buildExperimentText()); setStatus(ok ? 'برنامه آزمایش کپی شد.' : 'کپی خودکار ممکن نشد.', ok ? 'ok' : 'error'); });
  clearHistoryBtn.addEventListener('click', () => { localStorage.removeItem(STORAGE_KEY); renderHistory(); setStatus('تاریخچه پاک شد.', 'ok'); });

  resetBtn.addEventListener('click', () => { videoInput.value = ''; selectedFile = null; videoMeta = null; lastAnalysis = null; fileName.textContent = 'ویدیو روی سرور آپلود نمی‌شود؛ تحلیل در مرورگر انجام می‌شود.'; urlInput.value = ''; experimentName.value = ''; caption.value = ''; cta.value = ''; results.hidden = true; setStatus(''); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  renderHistory();
})();
