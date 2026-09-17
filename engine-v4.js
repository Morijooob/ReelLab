(()=>{
'use strict';
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));
const hasAny=(s,words)=>words.some(w=>s.includes(w));
const add=(p,tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;p.append(e);return e};
function analyzeText(){
 const hook=clean($('hookInput')?.value).toLowerCase(), cap=clean($('caption')?.value).toLowerCase(), cta=clean($('cta')?.value).toLowerCase(), topic=clean($('reelTopic')?.value).toLowerCase();
 const rows=[]; let score=0;
 if(!hook) rows.push(['🔴 قلاب','قلاب وارد نشده؛ موتور درباره کیفیت قلاب حدس نمی‌زند.']);
 else { let s=0;if(hook.length>=18)s+=8;if(hook.length>=35)s+=4;if(/[؟?!]/.test(hook))s+=4;if(hasAny(hook,['چطور','چرا','قبل از','اشتباه','راز','نکته','اگر','اگه','این را','این رو']))s+=4;score+=Math.min(20,s);rows.push([s>=14?'🟢 قلاب':'🟠 قلاب',`سیگنال‌های قابل مشاهده قلاب: طول ${hook.length} کاراکتر${/[؟?!]/.test(hook)?'، نشانه سؤال/تعجب دارد':''}. این ارزیابی کیفیت واقعی نگه‌داشتن مخاطب را تضمین نمی‌کند.`]);}
 if(!cap) rows.push(['🔴 کپشن','کپشن خالی است؛ پیشنهاد ساختاری بر اساس متن موجود ممکن نیست.']);
 else {let s=0;if(cap.length>=80)s+=8;if(cap.length>=180)s+=4;if(/[؟?!]/.test(cap))s+=3;if(hasAny(cap,['ذخیره','فالو','کامنت','نظر','ارسال','لینک','ببین','بنویس']))s+=5;score+=Math.min(20,s);rows.push([s>=14?'🟢 کپشن':'🟠 کپشن',`کپشن ${cap.length} کاراکتر دارد و از نظر ساختاری بررسی شد.`]);}
 if(!cta) rows.push(['🟠 CTA','CTA مشخص وارد نشده است.']);
 else {let s=hasAny(cta,['فالو','ذخیره','کامنت','نظر','لینک','بفرست','ارسال','خرید','تماس','ببین'])?15:7;score+=s;rows.push([s>=15?'🟢 CTA':'🟠 CTA','CTA قابل مشاهده است؛ اثر واقعی آن فقط با داده انتشار سنجیده می‌شود.']);}
 if(!topic) rows.push(['🟠 موضوع','موضوع دستی وارد نشده؛ تحلیل موضوعی فقط وقتی سیگنال معتبر داشته باشد قابل اتکاست.']);
 else {score+=20;rows.push(['🟢 موضوع','موضوع دستی مشخص است و برای تحلیل متن به‌عنوان سیگنال معتبر استفاده شد.']);}
 return {score:clamp(score),rows};
}
function validateVideo(){
 const file=$('videoInput')?.files?.[0];
 if(!file)return {ok:false,reason:'ویدیویی انتخاب نشده است.'};
 const type=String(file.type||'').toLowerCase();
 if(!type.startsWith('video/'))return {ok:false,reason:'فایل انتخاب‌شده نوع ویدیویی معتبر ندارد.'};
 if(file.size>250*1024*1024)return {ok:false,reason:'حجم ویدیو بیش از 250MB است؛ برای تحلیل مرورگری مناسب نیست.'};
 return {ok:true};
}
function render(){
 const v=validateVideo(); if(!v.ok)return;
 const ta=analyzeText();
 let card=$('contentQualityGate');
 if(!card){const r=$('results');if(!r||r.hidden)return;card=document.createElement('article');card.id='contentQualityGate';card.className='tool-card';r.insertBefore(card,r.querySelector('.hook-builder')||r.firstElementChild);}
 card.textContent='';add(card,'p','eyebrow','CONTENT QUALITY GATE 🛡️');add(card,'h3',null,'کنترل کیفیت خروجی موتور');add(card,'p',null,'این لایه فقط از داده‌های واقعاً موجود استفاده می‌کند و از ادعای پیش‌بینی ویو یا تشخیص قطعی محتوای پنهان خودداری می‌کند.');
 const grid=add(card,'div','metrics');const m=add(grid,'div','metric');add(m,'b',null,`${ta.score}/100`);add(m,'span',null,'کیفیت سیگنال متنی');
 const f=add(card,'div','findings');ta.rows.forEach(x=>{const a=add(f,'article','finding '+(x[0].startsWith('🟢')?'ok':x[0].startsWith('🔴')?'bad':'warn'));add(a,'b',null,x[0]);add(a,'p',null,x[1]);});
}
const schedule=()=>{const r=$('results');if(!r)return;const run=()=>{if(!r.hidden)render();};if(!r.hidden)run();else{const o=new MutationObserver(run);o.observe(r,{attributes:true,attributeFilter:['hidden']});setTimeout(()=>o.disconnect(),30000);}};
window.addEventListener('load',schedule);$('analyzeBtn')?.addEventListener('click',schedule);$('hookInput')?.addEventListener('input',()=>{if(!$('results')?.hidden)render()});$('caption')?.addEventListener('input',()=>{if(!$('results')?.hidden)render()});$('cta')?.addEventListener('input',()=>{if(!$('results')?.hidden)render()});$('reelTopic')?.addEventListener('input',()=>{if(!$('results')?.hidden)render()});
})();
