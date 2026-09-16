(() => {
  'use strict';

  // ReelLab quality layer: cleans unreliable browser OCR/ASR, prevents hallucinated
  // topics/hashtags, and produces genuinely different hook/caption variants.
  const $ = id => document.getElementById(id);
  const normalize = s => String(s || '').replace(/\s+/g, ' ').trim();
  const lower = s => normalize(s).toLowerCase();

  const topicMap = [
    { keys:['ماشین','خودرو','پژو','پراید','سمند','دنا','تیبا','خودروی','رانندگی','موتور','موتورسیکلت','car','motorcycle'], name:'خودرو و ماشین', tags:['#خودرو','#ماشین','#رانندگی'] },
    { keys:['غذا','آشپزی','آشپز','رستوران','پیتزا','کیک','دسر','غذای','فود','pizza','cake','food'], name:'غذا و آشپزی', tags:['#غذا','#آشپزی','#فود'] },
    { keys:['ورزش','تمرین','فیتنس','بدنسازی','باشگاه','لاغری','ورزشی','gym','fitness','workout'], name:'ورزش و فیتنس', tags:['#ورزش','#فیتنس','#تمرین'] },
    { keys:['موبایل','گوشی','تکنولوژی','تکنولوژی','لپ‌تاپ','لپ تاپ','گجت','اپلیکیشن','ترفند','اندروید','آیفون','iphone','android','tech'], name:'موبایل و تکنولوژی', tags:['#تکنولوژی','#موبایل','#ترفند'] },
    { keys:['پول','درآمد','کسب و کار','کسب‌وکار','اقتصاد','سرمایه','فروش','بازاریابی','مشتری','درآمدزایی','business','marketing'], name:'کسب‌وکار و درآمد', tags:['#کسب_و_کار','#درآمد','#بازاریابی'] },
    { keys:['سفر','گردشگری','ایرانگردی','هتل','ساحل','طبیعت','مسافرت','شهر','گردش','travel'], name:'سفر و گردشگری', tags:['#سفر','#گردشگری','#ایرانگردی'] },
    { keys:['آموزش','یادگیری','آموز','ترفند','نکته','اکسل','excel','tutorial','learn'], name:'آموزش و یادگیری', tags:['#آموزش','#یادگیری','#نکات_کاربردی'] },
    { keys:['لباس','استایل','مد','فشن','آرایش','میکاپ','زیبایی','fashion','style','makeup'], name:'مد و زیبایی', tags:['#استایل','#مد','#زیبایی'] },
    { keys:['گیم','بازی','گیمر','game','gaming'], name:'بازی و گیم', tags:['#گیم','#بازی','#گیمر'] },
    { keys:['کتاب','فیلم','سریال','موسیقی','آهنگ','movie','music','book'], name:'سرگرمی و فرهنگ', tags:['#سرگرمی','#موسیقی','#فیلم'] }
  ];

  const badSpeech = /^(?:\[music\]|music|thank you|thanks|oh|uh|um|hmm|you|yeah|yes|no|i swear)(?:[\s,.-]*(?:\[music\]|music|thank you|thanks|oh|uh|um|hmm|you|yeah|yes|no|i swear))*[.!?]*$/i;
  const cleanSignal = raw => {
    let s = normalize(raw).replace(/\[(?:music|applause|laughter|noise)[^\]]*\]/gi, ' ');
    s = s.replace(/[^\p{L}\p{N}\s،,.!?؟:؛'"‌-]/gu, ' ');
    s = normalize(s);
    const words = s.split(/\s+/).filter(Boolean);
    if (!words.length) return '';
    const compact = [];
    for (const w of words) {
      const prev = compact[compact.length - 1];
      if (!prev || lower(prev) !== lower(w)) compact.push(w);
    }
    // Remove obvious repeated cycles such as "I swear I swear" or OCR duplication.
    for (let n = Math.min(8, Math.floor(compact.length / 2)); n >= 1; n--) {
      const a = compact.slice(-n).map(lower).join(' ');
      const b = compact.slice(-2*n, -n).map(lower).join(' ');
      if (a && a === b) compact.splice(-n, n);
    }
    s = normalize(compact.join(' '));
    if (s.length < 5 || badSpeech.test(s)) return '';
    const letters = (s.match(/[\p{L}]/gu) || []).length;
    if (letters / Math.max(1, s.length) < 0.35) return '';
    return s;
  };

  const cleanOcr = raw => {
    let s = normalize(raw).replace(/[^\p{L}\p{N}\s،,.!?؟:؛'"‌-]/gu, ' ');
    const chunks = s.split(/\s+/).filter(Boolean);
    const kept = [];
    for (const w of chunks) {
      if (w.length < 2) continue;
      if (/^\d{1,3}$/.test(w)) continue;
      if (!/[\p{L}]/u.test(w)) continue;
      kept.push(w);
    }
    const out=[];
    for (const w of kept) if (!out.some(x => lower(x) === lower(w))) out.push(w);
    return normalize(out.join(' '));
  };

  const infer = (manual, speech, ocr, visibleTopic) => {
    const supplied = normalize(manual);
    if (supplied.length >= 4) {
      const hit = topicMap.find(x => x.keys.some(k => lower(supplied).includes(lower(k))));
      return { name: hit ? hit.name : supplied.slice(0, 60), tags: hit ? hit.tags : [], confidence: hit ? 'بالا' : 'متوسط', source:'توضیح کاربر' };
    }
    const all = lower(`${speech} ${ocr}`);
    let best=null, score=0;
    for (const t of topicMap) {
      let n=0;
      for (const k of t.keys) if (all.includes(lower(k))) n += k.length >= 5 ? 2 : 1;
      if (n > score) { score=n; best=t; }
    }
    if (best && score >= 2) return { name:best.name, tags:best.tags, confidence:score >= 4 ? 'بالا' : 'متوسط', source:'سیگنال واقعی Reel' };
    if (visibleTopic && !/تشخیص داده نشد|نامشخص/i.test(visibleTopic)) return {name:visibleTopic, tags:[], confidence:'پایین', source:'تحلیل قبلی'};
    return { name:'موضوع نامشخص', tags:[], confidence:'پایین', source:'نامطمئن' };
  };

  const distinctHooks = (goal, topic, signal, currentHook) => {
    const base = normalize(currentHook) || normalize(signal);
    const t = topic.name === 'موضوع نامشخص' ? 'این موضوع' : topic.name;
    if (!base) return [
      `اول نتیجه را بگو: «در ${t} دقیقاً چی قراره یاد بگیری؟»`,
      `یک سؤال واقعی درباره ${t} مطرح کن؛ جوابش را آخر ویدیو بده.`,
      `با مهم‌ترین نکته ${t} شروع کن؛ مقدمه را حذف کن.`
    ];
    const short = base.length > 75 ? base.slice(0,75).trim() + '…' : base;
    return [
      `نتیجه را اول ببین: ${short}`,
      `به نظرت چرا ${t} این‌طوریه؟ ${short}`,
      `قبل از اینکه ردش کنی، این بخش ${t} رو ببین: ${short}`
    ];
  };

  const captionFor = (goal, topic, signal, manualTopic) => {
    const t = topic.name === 'موضوع نامشخص' ? normalize(manualTopic) : topic.name;
    if (!t) return `موضوع ویدیو هنوز مشخص نیست. یک جمله درباره محتوای Reel بنویس تا کپشن واقعاً مرتبط ساخته شود.\n\n#ریلز`;
    const s = normalize(signal);
    const detail = s && s.length >= 10 ? `\n\nنکته‌ای که توی ویدیو می‌بینی: «${s.slice(0,120)}»` : '';
    const ending = goal === 'sales' ? 'اگه به کارت میاد، جزئیاتش رو ببین.' : goal === 'followers' ? 'اگه این مدل محتوا به کارت میاد، همراه شو.' : goal === 'engagement' ? 'تو چی فکر می‌کنی؟ نظرت رو بنویس.' : 'اگه به درد یکی می‌خوره، براش بفرست.';
    return `${t} رو کوتاه و واقعی ببین؛ بدون حرف اضافه.${detail}\n\n${ending}`;
  };

  const ctaFor = goal => ({
    reach:'اگه به درد یکی می‌خوره، براش بفرست.',
    followers:'اگه این مدل محتوا به کارت میاد، فالو کن.',
    engagement:'تو چی فکر می‌کنی؟ توی کامنت بگو.',
    sales:'اگه برات مناسبه، جزئیاتش رو ببین.'
  }[goal] || 'اگه به کارت میاد، ذخیره‌اش کن.');

  function replaceText(el, text) { if (el) el.textContent = text; }
  function renderHooks(list) {
    const box=$('hooks'); if(!box)return; box.textContent='';
    list.forEach((text,i)=>{
      const card=document.createElement('div'); card.className=`hook${i===0?' recommended':''}`;
      const small=document.createElement('small'); small.textContent=i===0?'پیشنهاد ۱':`گزینه ${i+1}`;
      const span=document.createElement('span'); span.textContent=text; card.append(small,span);
      const btn=document.createElement('button'); btn.type='button'; btn.className='use-btn'; btn.textContent='انتخاب این قلاب';
      btn.onclick=()=>{ const input=$('hookInput'); if(input) input.value=text; document.querySelectorAll('.hook').forEach(x=>x.classList.remove('chosen')); card.classList.add('chosen'); replaceText($('status'),'قلاب انتخاب شد؛ دوباره تحلیل کن تا کپشن هم با همین قلاب ساخته شود.'); };
      card.append(btn); box.appendChild(card);
    });
  }
  function renderTags(tags, topicKnown) {
    const box=$('hashtags'); if(!box)return; box.textContent='';
    const safe = topicKnown ? tags.slice(0,5) : ['#ریلز'];
    safe.forEach(t=>{const s=document.createElement('span');s.className='hashtag';s.textContent=t;box.appendChild(s);});
  }

  function improve() {
    const results=$('results'); if(!results || results.hidden) return;
    const bodyText=results.innerText || '';
    const speechMatch=bodyText.match(/گفتار تشخیص‌داده‌شده\s*([\s\S]*?)(?:\n\s*\d+[:٫]\d+|\n\s*متن روی تصویر|\n\s*👁️)/i);
    const ocrMatch=bodyText.match(/متن روی ویدیو شناسایی‌شده\s*([\s\S]*?)(?:\n\s*👁️|\n\s*عناصر تصویری)/i);
    const speech=cleanSignal(speechMatch ? speechMatch[1] : '');
    const ocr=cleanOcr(ocrMatch ? ocrMatch[1] : '');
    const manual=normalize($('reelTopic')?.value || '');
    const currentHook=normalize($('hookInput')?.value || '');
    const visibleTopic=(bodyText.match(/موضوع تشخیص‌داده‌شده:\s*([^•\n]+)/)||[])[1]||'';
    const topic=infer(manual,speech,ocr,visibleTopic);
    const goal=$('goal')?.value || 'reach';
    const reliable=topic.confidence !== 'پایین' && topic.name !== 'موضوع نامشخص';

    // Never let unreliable ASR/OCR become a hook.
    const speechBlock=results.querySelector('.findings') || $('findings');
    if(speechBlock && speech) {
      [...speechBlock.querySelectorAll('article')].forEach(a=>{
        if(/قلاب از گفتار/i.test(a.textContent||'')) a.querySelector('p')?.replaceChildren(document.createTextNode(`گفتار پاک‌سازی‌شده: «${speech}»`));
      });
    }

    const summary=$('summary');
    if(summary) {
      const topicNode=[...summary.querySelectorAll('*')].find(x=>/موضوع تشخیص‌داده‌شده/.test(x.textContent||''));
      if(topicNode && topicNode.childNodes.length) topicNode.textContent=`موضوع تشخیص‌داده‌شده: ${topic.name} • اطمینان ${topic.confidence} • منبع: ${topic.source}`;
    }

    const hooks=distinctHooks(goal,topic,speech,currentHook);
    renderHooks(hooks);
    replaceText($('captionSuggestion'), captionFor(goal,topic,speech,manual));
    replaceText($('captionReason'), reliable ? 'کپشن از موضوع و سیگنال واقعی Reel ساخته شد؛ جمله‌های نامفهوم و متن تکراری حذف شدند.' : 'موتور از حدس‌زدن موضوع جلوگیری کرد. برای کپشن دقیق‌تر، یک جمله درباره موضوع Reel وارد کن.');
    renderTags(topic.tags,reliable);
    replaceText($('ctaSuggestion'), ctaFor(goal));

    const findings=$('findings');
    if(findings && !reliable) {
      const article=document.createElement('article'); article.className='finding warn';
      const b=document.createElement('b'); b.textContent='🟡 موضوع هنوز قابل اعتماد نیست';
      const p=document.createElement('p'); p.textContent='برای جلوگیری از کپشن و هشتگ اشتباه، موتور حدس نمی‌زند. یک جمله درباره موضوع Reel وارد کن و دوباره تحلیل بگیر.';
      article.append(b,p); findings.appendChild(article);
    }
  }

  function boot() {
    const grid=document.querySelector('.grid');
    if(grid && !$('reelTopic')) {
      const label=document.createElement('label'); label.className='field wide';
      label.innerHTML='<span>موضوع Reel / خلاصه کوتاه (اختیاری)</span><input id="reelTopic" type="text" maxlength="180" placeholder="مثلاً: تجربه من از خرید یک ماشین دست‌دوم؛ یا آموزش یک ترفند اکسل">';
      const cap=$('caption'); const capLabel=cap?.closest('.field');
      if(capLabel) grid.insertBefore(label,capLabel); else grid.appendChild(label);
    }
    const btn=$('analyzeBtn'); if(!btn || btn.dataset.v2Bound) return; btn.dataset.v2Bound='1';
    btn.addEventListener('click',()=>setTimeout(improve,1200));
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
