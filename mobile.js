/* ===== Renivet Corporate Orders — mobile v2 logic ===== */
'use strict';
const inr = n => '₹' + n.toLocaleString('en-IN');
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const state = {
  screen:'landing', cat:null, // 'apparel' | 'merch'
  apparel:{ type:'', style:'', fabric:'', gsm:'', gsmCustom:'' },
  merch:{ category:'', fields:{} },
  colour:'', customColour:'',
  sizes:[],
  placements:[], notes:'',
  artwork:{ file:null, canva:'', later:false },
  qty:{ total:0, sheet:null },
  pay:{ method:'UPI' }
};
window.state = state;

const STEPS = ['Product','Customise','Quantity','Delivery','Quotation'];
const SCREEN_STEP = { product:0, customise:1, quantity:2, details:3, quote:4, review:4, requested:4, payment:4, confirmed:4 };
const BACK = { product:'landing', customise:'product', quantity:'customise', details:'quantity', quote:'details', review:'quote', requested:'review', payment:'requested', confirmed:'landing', landing:null };

const STYLES = { 'T-Shirt':['Round Neck','Crew Neck','Oversized','Regular Fit'], 'Hoodie':['Pullover','Zip Hoodie','Oversized'], 'Jacket':['Zip Jacket','Bomber','Coach Jacket'], 'Polo':['Classic Polo','Oversized Polo'], 'Sweatshirt':['Crew Neck','Hooded','Oversized'], 'Other':['Regular Fit','Oversized','Custom'] };
const NO_GSM = new Set(['Other']);
const FABRIC_NOTES = {
  'Organic Cotton':'Soft, breathable natural fibre — our most ordered base.',
  'Recycled Cotton':'Repurposed cotton fibres with a classic handfeel.',
  'Hemp':'Strong, quick-drying and gets softer with every wash.',
  'Linen Blend':'Light and airy — good for summer uniforms.',
  'Recycled Polyester':'Durable with sharp print definition.',
  'Other':'Tell us what you have in mind and our team will match it.'
};
const GSM_NOTES = {
  '160 GSM':'160 GSM · Lightweight — warm-weather tees.',
  '180 GSM':'180 GSM · Everyday weight — balanced drape.',
  '200 GSM':'200 GSM · Mid-weight — fuller, less sheer.',
  '220 GSM':'220 GSM · Dense — sweatshirts and structured tees.',
  '240 GSM':'240 GSM · Heavyweight — premium, winter-ready feel.',
  'Custom':'Custom weight — our team will confirm feasibility.'
};
const COLORS = [ {n:'Black',h:'#262626'},{n:'Forest Green',h:'#3A5440'},{n:'Sand',h:'#D8C6A0'},{n:'Off-White',h:'#F2ECDD'},{n:'Indigo',h:'#3A4266'},{n:'Terracotta',h:'#B0603C'} ];
const MC_FIELDS = {
  Bottles:[{k:'material',l:'Material',o:['Stainless Steel','Recycled Plastic','Glass','Other']},{k:'capacity',l:'Capacity',o:['500 ml','750 ml','1 L','Custom']}],
  Mugs:[{k:'material',l:'Material',o:['Ceramic','Stoneware','Bone China','Other']},{k:'size',l:'Size',o:['250 ml','330 ml','Custom']}],
  Bags:[{k:'material',l:'Material',o:['Canvas','Jute','Recycled PET','Other']},{k:'size',l:'Size',o:['Small','Medium','Large','Custom']}],
  Stationery:[{k:'item',l:'Item',o:['Notebook','Journal','Pen Set','Cards','Custom']},{k:'paper',l:'Paper',o:['Recycled Kraft','Cotton','Linen','Other']}],
  Other:[{k:'item',l:'What is the product?',text:true}]
};
const PLACES = { apparel:['Front','Back','Left chest','Sleeve'], merch:['Front','Back','Side'] };
const PRINT_UNIT = 60;
const UNITS = {
  apparel:{ 'Organic Cotton':600,'Recycled Cotton':550,'Hemp':700,'Linen Blend':750,'Recycled Polyester':650,'Other':600 },
  Bottles:{ 'Stainless Steel':450,'Recycled Plastic':250,'Glass':350,'Other':300 },
  Mugs:{ 'Ceramic':220,'Stoneware':260,'Bone China':320,'Other':220 },
  Bags:{ 'Canvas':350,'Jute':200,'Recycled PET':300,'Other':250 },
  Stationery:{ 'Recycled Kraft':180,'Cotton':240,'Linen':220,'Other':180 },
  Other:{ 'Other':300 }
};

function toast(msg){ const t=$('#toast'); t.textContent=msg; t.hidden=false; requestAnimationFrame(()=>t.classList.add('show')); clearTimeout(t._h); t._h=setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=>t.hidden=true,350); },2400); }

/* ---------- chips helper ---------- */
function chipGroup(container, options, selected, onToggle){
  container.innerHTML='';
  options.forEach(opt=>{
    const b=document.createElement('button'); b.type='button'; b.className='chip'; b.textContent=opt;
    if (selected().includes(opt)) b.classList.add('is-selected');
    b.addEventListener('click',()=>{ b.classList.toggle('is-selected'); onToggle(opt, b.classList.contains('is-selected')); });
    container.appendChild(b);
  });
}
function singleGroup(container, options, getSel, onPick){
  container.innerHTML='';
  options.forEach(opt=>{
    const b=document.createElement('button'); b.type='button'; b.className='chip'; b.textContent=opt;
    if (getSel()===opt) b.classList.add('is-selected');
    b.addEventListener('click',()=>{ [...container.children].forEach(c=>c.classList.remove('is-selected')); b.classList.add('is-selected'); onPick(opt); });
    container.appendChild(b);
  });
}

/* ---------- product screen ---------- */
$$('.cat-card').forEach(c=>c.addEventListener('click',()=>{
  state.cat = c.dataset.cat;
  go('product');
}));

function renderProduct(){
  const apparel = state.cat==='apparel';
  $('#pApparel').hidden=!apparel; $('#pMerch').hidden=apparel;
  $('#sizeField').hidden=!apparel;
  $('#productLede').textContent = apparel
    ? 'Choose your product, fabric and fit. We’ll help you bring your custom collection to life.'
    : 'Select the product you want to customise.';
  if (apparel){
    $('#gsmField').hidden = NO_GSM.has($('#apType').value);
    if (!$('#sizes').children.length)
      chipGroup($('#sizes'), ['S','M','L','XL','XXL'], ()=>state.sizes, (o,on)=>{ state.sizes = onPushRemove(state.sizes,o,on); });
  } else {
    singleGroup($('#mcCat'), ['Bottles','Mugs','Bags','Stationery','Other'], ()=>state.merch.category, opt=>{
      state.merch.category=opt; state.merch.fields={}; renderMcFields(opt);
    });
    if (state.merch.category) renderMcFields(state.merch.category);
  }
  updatePreview();
}
$('#s-product').addEventListener('click',()=>setTimeout(updatePreview,0));
function onPushRemove(arr,v,on){ if(on && !arr.includes(v)) arr.push(v); if(!on) arr=arr.filter(x=>x!==v); return arr; }

$('#apType').addEventListener('change',e=>{
  state.apparel.type=e.target.value; state.apparel.style='';
  $('#gsmField').hidden = NO_GSM.has(e.target.value);
  if (NO_GSM.has(e.target.value)) $('#gsmNote').hidden=true;
  singleGroup($('#apStyles'), STYLES[e.target.value]||[], ()=>state.apparel.style, v=>{ state.apparel.style=v; updatePreview(); });
});
$('#apFabric').addEventListener('change',e=>{
  state.apparel.fabric=e.target.value;
  const note=$('#fabricNote'); note.textContent=FABRIC_NOTES[e.target.value]||''; note.hidden=!e.target.value;
  updatePreview();
});
$('#apGsm').addEventListener('change',e=>{
  state.apparel.gsm=e.target.value; $('#apGsmCustom').hidden = e.target.value!=='Custom';
  const note=$('#gsmNote'); note.textContent=GSM_NOTES[e.target.value]||''; note.hidden=!e.target.value;
  updatePreview();
});
$('#apGsmCustom').addEventListener('input',e=>{ state.apparel.gsmCustom=e.target.value; updatePreview(); });
$('#customColorOn').addEventListener('change',e=>{
  $('#customColorWrap').hidden=!e.target.checked;
  if(e.target.checked){ $$('#colors .swatch').forEach(s=>s.classList.remove('is-selected')); state.colour=''; }
  updatePreview();
});
$('#customColorText').addEventListener('input',e=>{ state.customColour=e.target.value.trim(); updatePreview(); });
$('#s-product').addEventListener('input',updatePreview);
$('#s-product').addEventListener('change',updatePreview);

function updatePreview(){
  if (!$('#previewName')) return;
  const apparel = state.cat==='apparel';
  $('#previewImg').src = apparel ? 'assets/product-tee.png' : 'assets/merch-card.png';
  const name = productName();
  $('#previewName').textContent = name || (apparel ? 'Your product' : 'Your merchandise');
  const bits = specBits();
  $('#previewSpecs').textContent = bits.length ? bits.join(' · ') + (state.sizes.length?' · Sizes: '+state.sizes.join(', '):'')
    : 'Make your first selections and they’ll appear here.';
}

function renderMcFields(cat){
  const wrap=$('#mcDynamic'); wrap.innerHTML='';
  MC_FIELDS[cat].forEach(f=>{
    const div=document.createElement('div'); div.className='field';
    const lab=document.createElement('label'); lab.textContent=f.l; div.appendChild(lab);
    if (f.text){
      const inp=document.createElement('input'); inp.className='input'; inp.placeholder='Describe the product';
      inp.addEventListener('input',()=>state.merch.fields[f.k]=inp.value); div.appendChild(inp);
    } else {
      const chips=document.createElement('div'); chips.className='chips'; div.appendChild(chips);
      singleGroup(chips, f.o, ()=>state.merch.fields[f.k], v=>state.merch.fields[f.k]=v);
    }
    wrap.appendChild(div);
  });
}

function validateProduct(){
  const missing=[];
  if (state.cat==='apparel'){
    const a=state.apparel;
    if(!a.type) missing.push('product type');
    if(!a.style) missing.push('style');
    if(!a.fabric) missing.push('fabric');
    if(!(NO_GSM.has(a.type) || a.gsm)) missing.push('fabric weight');
    if(!state.sizes.length) missing.push('at least one size');
  } else {
    const req=(MC_FIELDS[state.merch.category]||[]).filter(f=>!f.text);
    if(!state.merch.category) missing.push('a product type');
    req.forEach(f=>{ if(!state.merch.fields[f.k]) missing.push(f.l.toLowerCase()); });
  }
  const ok=!missing.length;
  const err=$('#productError');
  err.hidden=ok;
  if(!ok) err.textContent='Still needed: '+missing.join(', ')+'.';
  return ok;
}

/* ---------- customise ---------- */
function renderCustomise(){
  const kind = state.cat==='apparel'?'apparel':'merch';
  if (!$('#colors').children.length){
    COLORS.forEach(c=>{
      const b=document.createElement('button'); b.type='button'; b.className='swatch';
      b.innerHTML=`<i style="background:${c.h}"></i><span>${c.n}</span>`;
      b.addEventListener('click',()=>{
        $$('#colors .swatch').forEach(s=>s.classList.remove('is-selected'));
        b.classList.add('is-selected'); state.colour=c.n; $('#customColorOn').checked=false; $('#customColorWrap').hidden=true;
        updatePreview();
      });
      $('#colors').appendChild(b);
    });
  }
  chipGroup($('#placements'), PLACES[kind], ()=>state.placements, (o,on)=>{ state.placements=onPushRemove(state.placements,o,on); });
  $('#custError').hidden=true;
}
$('#custNotes').addEventListener('input',e=>state.notes=e.target.value);

/* ---------- artwork ---------- */
const dz=$('#dropzone'), fi=$('#fileInput');
dz.addEventListener('click',()=>fi.click());
dz.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); fi.click(); } });
fi.addEventListener('change',()=>{ if(fi.files[0]) setFile(fi.files[0]); });
function setFile(f){
  $('#fileError').hidden=true;
  state.artwork.file={ name:f.name, size:f.size, type:f.name.split('.').pop().toUpperCase() };
  $('#fileName').textContent=f.name;
  $('#fileMeta').textContent=`${state.artwork.file.type} · ${(f.size/1048576).toFixed(1)} MB · Ready`;
  $('#fileBadge').textContent=state.artwork.file.type;
  $('#fileRow').hidden=false; dz.hidden=true;
  state.artwork.later=false;
}
$('#fileRemove').addEventListener('click',()=>{ state.artwork.file=null; fi.value=''; $('#fileRow').hidden=true; dz.hidden=false; });
$('#fileReplace').addEventListener('click',()=>fi.click());
$('#canvaLink').addEventListener('input',e=>state.artwork.canva=e.target.value.trim());
$('#shareLater').addEventListener('click',()=>{ state.artwork.later=true; toast('Noted — the team will follow up for your artwork.'); });

/* ---------- pricing ---------- */
function totalQty(){ return state.qty.total; }
function unitProduct(){
  if (state.cat==='apparel'){
    const a=state.apparel; let u=UNITS.apparel[a.fabric]||600;
    const g=parseInt(a.gsm==='Custom'?(a.gsmCustom||180):(a.gsm||180));
    u += Math.round((g-160)/40)*25;
    if (a.style==='Oversized') u+=40;
    return u;
  }
  const m=state.merch.fields.material||'Other';
  return (UNITS[state.merch.category]||{})[m]||300;
}
function price(){
  const q=totalQty(), product=unitProduct()*q;
  const brandPer=PRINT_UNIT*Math.max(1,state.placements.length);
  const custom=brandPer*q;
  const shipping=q>200?5000:q>100?3500:q>50?2500:1500;
  const subtotal=product+custom+shipping, gst=Math.round(subtotal*.12);
  const total=subtotal+gst;
  return { q, product, custom, shipping, subtotal, gst, total, advance:Math.round(total/2), balance:total-Math.round(total/2) };
}

/* ---------- quantity ---------- */
function renderQuantity(){
  $('#simpleInput').value = state.qty.total || 0;
  const chip=$('#sheetChip');
  if (state.qty.sheet){ $('#sheetName').textContent=state.qty.sheet.name; $('#sheetSummary').textContent=state.qty.sheet.summary; chip.hidden=false; }
  else chip.hidden=true;
  updateQty();
}
$('#simpleInput').addEventListener('input',e=>{ state.qty.total=Math.max(0,+e.target.value||0); updateQty(); });
$$('[data-s]').forEach(b=>b.addEventListener('click',()=>{
  state.qty.total=Math.max(0,state.qty.total + (b.dataset.s==='+'?5:-5));
  $('#simpleInput').value=state.qty.total; updateQty();
}));
$('#excelBtn').addEventListener('click',()=>$('#excelInput').click());
$('#excelInput').addEventListener('change',e=>{
  const f=e.target.files[0]; if(!f) return;
  state.qty.sheet={ name:f.name, summary:'50 units · S 10 · M 20 · L 15 · XL 5' };
  state.qty.total=50;
  renderQuantity();
  $('#excelNote').textContent='Sheet received — we’ll re-verify the totals when our team reviews your order.';
  toast('Sheet read — total quantity set to 50 units.');
});
function updateQty(){
  const t=state.qty.total;
  const ok=t>=50;
  $('#qtyCta').disabled=!ok;
  $('#qtyError').hidden=!(t>0 && !ok);
}

/* ---------- summary text ---------- */
function colourName(){ return state.colour || state.customColour || ''; }
function productName(){
  return state.cat==='apparel' ? (state.apparel.type||'') + (state.apparel.style?' · '+state.apparel.style:'')
    : (state.merch.category||'') + (state.merch.fields.material?' · '+state.merch.fields.material:'');
}
function specBits(){
  if (state.cat==='apparel'){
    const a=state.apparel;
    return [a.fabric, a.gsm==='Custom'?(a.gsmCustom+' GSM'):a.gsm, colourName()].filter(Boolean);
  }
  const m=state.merch.fields;
  return [m.capacity||m.size||m.paper, colourName()].filter(Boolean);
}
/* ---------- quote ---------- */
function renderQuote(){
  const p=price();
  $('#quoteImg').src = state.cat==='apparel' ? 'assets/product-tee.png' : 'assets/merch-card.png';
  $('#qName').textContent=productName();
  $('#qSpecs').textContent=[...specBits(), state.placements.length?'Print: '+state.placements.join(' + '):''].filter(Boolean).join(' · ');
  $('#qRows').innerHTML=`
    <div class="qrow"><span>Product cost</span><b>${inr(p.product)}</b></div>
    <div class="qrow"><span>Customisation cost</span><b>${inr(p.custom)}</b></div>
    <div class="qrow"><span>Shipping</span><b>${inr(p.shipping)}</b></div>
    <div class="qrow qrow--sub"><span>Subtotal</span><b>${inr(p.subtotal)}</b></div>
    <div class="qrow"><span>GST (12%)</span><b>${inr(p.gst)}</b></div>`;
  $('#qTotal').textContent=inr(p.total);
}

/* ---------- details validation ---------- */
function validateDetails(){
  let bad=0;
  $$('#s-details [data-req]').forEach(el=>{
    const v=el.value.trim();
    const emailOk = el.type!=='email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    el.classList.toggle('invalid', !v || !emailOk);
    if(!v||!emailOk) bad++;
  });
  $('#detailsError').hidden=!bad;
  if(bad) $('#s-details .invalid')?.scrollIntoView({behavior:'smooth',block:'center'});
  return !bad;
}
$('#sameAddr').addEventListener('change',e=>$('#shipFields').hidden=e.target.checked);

/* ---------- review ---------- */
function renderReview(){
  const p=price(), co={ name:$('#coName').value, person:$('#coPerson').value, desig:$('#coDesig').value, email:$('#coEmail').value, phone:$('#coPhone').value, gst:$('#coGst').value };
  const bill=[$('#billLine').value,$('#billCity').value,$('#billState').value,$('#billPin').value,$('#billCountry').value].filter(Boolean).join(', ');
  const ship=$('#sameAddr').checked?'Same as billing':[$('#shipLine').value,$('#shipCity').value,$('#shipState').value,$('#shipPin').value].filter(Boolean).join(', ');
  const art = state.artwork.file ? `${state.artwork.file.name} (${state.artwork.file.type})` : state.artwork.canva ? 'Canva design link' : 'To be shared with the team';
  const block=(title,editTarget,rows)=>`<section class="rv"><div class="rv__head"><h3>${title}</h3><button class="rv__edit" data-go="${editTarget}">Edit</button></div>
    <dl>${rows.filter(r=>r[1]).map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl></section>`;
  $('#reviewBlocks').innerHTML =
    block('Product','product',[['Product',productName()],['Specifications',specBits().join(' · ')],['Sizes',state.cat==='apparel'?state.sizes.join(', '):'']]) +
    block('Customisation','customise',[['Print colour',colourName()],['Placement',state.placements.join(', ')],['Artwork',art],['Notes',state.notes]]) +
    block('Quantity','quantity',[['Size breakup',state.qty.sheet?state.qty.sheet.name:'Entered manually'],['Total',p.q+' units']]) +
    block('Company and delivery','details',[['Company',co.name],['Contact',co.person+(co.desig?' · '+co.desig:'')],['Email',co.email],['Phone',co.phone],['GST',co.gst],['Billing',bill],['Shipping',ship],['Required delivery',$('#delDate').value]]) +
    block('Estimated cost','quote',[['Subtotal',inr(p.subtotal)],['GST',inr(p.gst)],['Estimated total',inr(p.total)]]);
}

/* ---------- payment + confirmed ---------- */
function renderRequested(){
  $('#rqProduct').textContent=productName();
  $('#rqQty').textContent=totalQty()+' units';
}
function renderPayment(){
  const p=price();
  $('#fpProduct').textContent=productName()+' · '+specBits().join(' · ');
  $('#fpQty').textContent=p.q+' units';
  $('#fpRows').innerHTML=`
    <div class="qrow"><span>Product cost</span><b>${inr(p.product)}</b></div>
    <div class="qrow"><span>Customisation cost</span><b>${inr(p.custom)}</b></div>
    <div class="qrow"><span>Shipping</span><b>${inr(p.shipping)}</b></div>
    <div class="qrow"><span>GST (12%)</span><b>${inr(p.gst)}</b></div>`;
  $('#fpTotal').textContent=inr(p.total);
  $('#fpAdvance').textContent=inr(p.advance);
  $('#fpBalance').textContent=inr(p.balance);
  $('#payCta').textContent=`Pay 50% Advance · ${inr(p.advance)}`;
}
function renderConfirmed(){
  const p=price();
  $('#cfProduct').textContent=productName();
  $('#cfQty').textContent=p.q+' units';
  $('#cfPaid').textContent=inr(p.advance);
  $('#cfBalance').textContent=inr(p.balance);
  $('#cfDate').textContent=$('#delDate').value||'To be confirmed';
  const person=$('#coPerson').value.trim(), email=$('#coEmail').value.trim(), phone=$('#coPhone').value.trim();
  $('#cfContact').textContent=person||'—';
  $('#cfEmail').textContent=email||'—';
  $('#cfPhone').textContent=phone||'—';
}
$$('input[name="pm"]').forEach(r=>r.addEventListener('change',()=>{ state.pay.method=r.value; }));
$('#payCta').addEventListener('click',()=>{
  $('#overlay').hidden=false;
  setTimeout(()=>{ $('#overlay').hidden=true; go('confirmed'); },1800);
});

/* ---------- navigation ---------- */
function go(screen){
  if (state.screen==='product' && screen==='customise' && !validateProduct()) return;
  if (state.screen==='customise' && screen==='quantity'){
    const colourOk = state.colour || ($('#customColorOn').checked && state.customColour);
    const artOk = state.artwork.file || state.artwork.canva || state.artwork.later;
    const missing=[];
    if(!colourOk) missing.push('a print colour (or a custom shade)');
    if(!state.placements.length) missing.push('at least one print placement');
    if(!artOk) missing.push('your artwork file, a design link, or “share later”');
    const ok=!missing.length;
    const err=$('#custError'); err.hidden=ok;
    if(!ok){ err.textContent='Still needed: '+missing.join(', ')+'.'; return; }
  }
  if (state.screen==='details' && screen==='quote' && !validateDetails()) return;

  state.screen=screen;
  $$('.screen').forEach(s=>s.classList.toggle('is-active', s.id==='s-'+screen));

  const step = SCREEN_STEP[screen];
  const inFlow = step!==undefined;
  $('#stepbar').hidden = !inFlow;
  if (inFlow){
    $('#stepLabel').textContent=`Step ${String(step+1).padStart(2,'0')} of ${String(STEPS.length).padStart(2,'0')}`;
    $('#stepName').textContent=STEPS[step];
    $('#stepNext').textContent = step < STEPS.length-1 ? 'Next · '+STEPS[step+1] : 'Final step';
    $('#stepFill').style.width=((step+1)/STEPS.length*100)+'%';
  }
  const back = BACK[screen];
  const hb=$('#headerBack');
  hb.style.visibility = back? 'visible':'hidden';
  hb.onclick = ()=>{ if(back) go(back); };

  if (screen==='product') renderProduct();
  if (screen==='customise') renderCustomise();
  if (screen==='quantity') renderQuantity();
  if (screen==='quote') renderQuote();
  if (screen==='review') renderReview();
  if (screen==='requested') renderRequested();
  if (screen==='payment') renderPayment();
  if (screen==='confirmed') renderConfirmed();
  window.scrollTo(0,0);
}
document.addEventListener('click',e=>{
  const g=e.target.closest('[data-go]');
  if (g && !g.classList.contains('cat-card')){ e.preventDefault(); go(g.dataset.go); }
});
$('#submitReq').addEventListener('click',()=>go('requested'));

go('landing');

/* ---------- deep links for design review / Figma import ----------
   #screen=product|customise|quantity|details|quote|review|requested|payment|confirmed
   pre-fills the Studio Arc sample order so every screen renders with real data. */
function prefillSample(){
  const setv=(el,v)=>{el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));};
  const setin=(el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));};
  const chip=(sel,txt)=>{const b=[...document.querySelectorAll(sel+' button')].find(e=>e.textContent.trim()===txt); if(b) b.click();};
  state.cat='apparel';
  renderProduct();
  renderCustomise();
  setv($('#apType'),'T-Shirt');
  chip('#apStyles','Round Neck');
  setv($('#apFabric'),'Organic Cotton');
  setv($('#apGsm'),'180 GSM');
  chip('#colors','Black');
  ['S','M','L','XL'].forEach(s=>chip('#sizes',s));
  chip('#placements','Front');
  chip('#placements','Back');
  state.artwork.file={name:'StudioArc_Logo.pdf',size:430080,type:'PDF'};
  $('#fileName').textContent='StudioArc_Logo.pdf';
  $('#fileMeta').textContent='PDF · 0.4 MB · Ready';
  $('#fileBadge').textContent='PDF';
  $('#fileRow').hidden=false; $('#dropzone').hidden=true;
  const vals={coName:'Studio Arc Design Pvt. Ltd.',coPerson:'Aarav Mehta',coDesig:'Head of Brand',coEmail:'aarav@studioarc.in',coPhone:'+91 98450 12345',coGst:'29ABCDE1234F1Z5',billLine:'42 Residency Road',billCity:'Bengaluru',billState:'Karnataka',billPin:'560025',billCountry:'India',delDate:'2026-08-15'};
  for (const k in vals) setin(document.getElementById(k), vals[k]);
}
(function deepLink(){
  const m=(location.hash+'?'+location.search).match(/screen=([a-z]+)/i); if(!m) return;
  const target=m[1];
  prefillSample();
  state.qty.sheet={ name:'StudioArc_size_breakup.xlsx', summary:'50 units · S 10 · M 20 · L 15 · XL 5' };
  state.qty.total=50;
  go('quantity');
  if (target!=='quantity') go(target);
})();
