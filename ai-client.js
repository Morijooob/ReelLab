(()=>{
'use strict';
const ENDPOINT=(window.REELLAB_AI_ENDPOINT||'https://reellab-ai.m73216r.workers.dev').replace(/\/$/,'');
const $=id=>document.getElementById(id), text=v=>String(v??'').trim();
const esc=v=>text(v);
function setStatus(msg,tone=''){const el=$('status');if(el){el.textContent=msg;el.dataset.tone=tone;}}
function addFinding(title,body,kind='warn'){const f=$('findings');if(!f)return;const a=document.createElement('article');a.className=`finding ${kind}`;const b=document.createElement('b');b.textContent=title;const p=document.createElement('p');p.textContent=body;a.append(b,p);f.appendChild(a)}
function render(r){
 const results=$('results'),summary=$('summary'),metrics=$('metrics'),findings=$('findings'),hooks=$('hooks'),cap=$('captionSuggestion'),capReason=$('captionReason'),tags=$('hashtags'),cta=$('ctaSuggestion');
 if(results)results.hidden=false;if(summary)summary.textContent='';if(metrics)metrics.textContent='';if(findings)findings.textContent='';if(hooks)hooks.textContent='';if(tags)tags.textContent='';
 const topic=text(r.topic)||'موضوع قابل اعتماد تشخیص داده نشد';
 const s=document.createElement('div');s.innerHTML=`<strong>موضوع تشخیص‌داده‌شده:</strong> ${esc(topic)}<br><span>اطمینان: ${esc(r.topic_confidence||'پایین')}</span><br><span>${esc(r.summary||'')}</span>`;summary?.appendChild(s);
 const add=(label,val)=>{const m=document.createElement('div');m.className='metric';const b=document.createElement('b');b.textContent=val;s=document.createElement('span');s.textContent=label;m.append(b,s);metrics?.appendChild(m)};
 let s2;
 if(metrics){const vals=[['آمادگی قبل انتشار',`${Number(r.readiness_score)||0}/100`],['اعتماد موضوع',text(r.topic_confidence)||'پایین'],['قلاب معتبر',r.hook_confidence&&r.hook_confidence!=='none'?'بله':'خیر']];vals.forEach(([l,v])=>{const m=document.createElement('div');m.className='metric';const b=document.createElement('b');b.textContent=v;const sp=document.createElement('span');sp.textContent=l;m.append(b,sp);metrics.appendChild(m)})}
 (r.blocking_issues||[]).forEach(x=>addFinding('🔴 مشکل مسدودکننده',x,'bad'));
 (r.warnings||[]).forEach(x=>addFinding('⚠️ هشدار',x,'warn'));
 if(r.topic_evidence?.length)addFinding('🔎 شواهد موضوع',r.topic_evidence.join(' • '),'ok');
 if(text(r.speech))addFinding('🎙️ گفتار معتبر',r.speech,'ok');
 if(text(r.ocr)&&r.ocr_valid)addFinding('🔤 متن روی تصویر',r.ocr,'ok');
 if((r.visual_evidence||[]).length)addFinding('👁️ شواهد بصری',r.visual_evidence.join(' • '),'ok');
 if(text(r.hook)&&r.hook_confidence!=='none')addFinding('🎣 قلاب معتبر',`${r.hook} • ${Number(r.hook_start_seconds||0).toFixed(1)} تا ${Number(r.hook_end_seconds||0).toFixed(1)} ثانیه`,'ok');
 const hookList=r.hook?[r.hook,...(r.key_moments||[]).slice(0,2).map(x=>x.description).filter(Boolean)]:['قلاب از داده نامطمئن ساخته نمی‌شود.'];
 hookList.slice(0,3).forEach((x,i)=>{const d=document.createElement('div');d.className='hook'+(i===0?' recommended':'');const sm=document.createElement('small');sm.textContent=i===0?'پیشنهاد اصلی':`گزینه ${i+1}`;const sp=document.createElement('span');sp.textContent=x;d.append(sm,sp);hooks?.appendChild(d)});
 if(cap){cap.textContent=text(r.caption)||'کپشن حدسی متوقف شد؛ ابتدا موضوع قابل اعتماد لازم است.'}if(capReason)capReason.textContent=(r.caption? 'کپشن بر اساس شواهد معتبر Reel ساخته شد.':'موضوع قابل اعتماد نیست؛ کپشن تولید نشد.');
 if(tags){(r.hashtags||[]).forEach(x=>{const d=document.createElement('span');d.className='hashtag';d.textContent=x;tags.appendChild(d)});if(!(r.hashtags||[]).length)tags.textContent='موضوع نامشخص — هشتگ حدسی ساخته نشد'}
 if(cta)cta.textContent=text(r.cta)||'CTA معتبر بدون شناخت موضوع پیشنهاد نمی‌شود.';
 const timing=$('timingText');if(timing)timing.textContent='در این نسخه زمان انتشار فقط برای آزمایش است؛ از داده واقعی حساب خودت یاد بگیر.';
 const ex=$('experimentText');if(ex)ex.textContent='یک متغیر را تغییر بده، منتشر کن و نتیجه واقعی را در آزمایش‌ها ثبت کن.';
}
async function analyze(file){
 const fd=new FormData();fd.append('video',file,file.name||'reel.mp4');fd.append('goal',text($('goal')?.value));fd.append('topic',text($('reelTopic')?.value));fd.append('hook',text($('hookInput')?.value));fd.append('caption',text($('caption')?.value));fd.append('cta',text($('cta')?.value));
 setStatus('🧠 در حال تحلیل واقعی ویدیو با موتور چندوجهی…','');
 const ac=new AbortController();const timer=setTimeout(()=>ac.abort(),120000);
 try{const res=await fetch(ENDPOINT,{method:'POST',body:fd,signal:ac.signal,headers:{Accept:'application/json'}});const raw=await res.text();let data;try{data=JSON.parse(raw)}catch{throw new Error('AI_BAD_RESPONSE')};if(!res.ok)throw new Error(data.error||`AI_HTTP_${res.status}`);if(!data.result)throw new Error('AI_EMPTY_RESULT');render(data.result);setStatus('🟢 تحلیل چندوجهی واقعی انجام شد.','ok');window.dispatchEvent(new CustomEvent('reellab:ai-result',{detail:data.result}));return true}catch(e){const msg=e?.name==='AbortError'?'زمان تحلیل تمام شد.':e?.message||'اتصال به موتور هوشمند برقرار نشد.';setStatus(`⚠️ موتور هوشمند فعلاً در دسترس نیست: ${msg}`,'error');return false}finally{clearTimeout(timer)}}
function boot(){const btn=$('analyzeBtn');if(!btn)return;btn.addEventListener('click',async ev=>{const file=$('videoInput')?.files?.[0];if(!file)return;ev.preventDefault();ev.stopImmediatePropagation();btn.disabled=true;try{await analyze(file)}finally{btn.disabled=false}},true)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
