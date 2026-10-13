/* ============ RENIVET CORPORATE ORDERS — PROTOTYPE LOGIC ============ */
'use strict';

const inr = n => '₹' + n.toLocaleString('en-IN');

const state = {
  screen: 'landing',
  category: null,            // 'apparel' | 'nonapparel'
  maxStep: 0,
  apparel: { type:'', style:'', fabric:'', gsm:'', gsmCustom:'', colour:'', customColor:false, sizes:[] },
  nonapparel: { category:'', fields:{}, colour:'', notes:'' },
  customisation: { methods:[], placements:[], notes:'' },
  artwork: { file:null, canva:'', skipped:false },
  qty: { sizes:{}, simple:0 },
  company: {},
  payment: { method:'UPI' }
};
window.state = state; // console/debug access

/* ---------- config ---------- */
const STEPS = ['Product','Customisation','Artwork','Quantity','Quotation','Company','Review','Payment'];
const SCREEN_STEP = { landing:0, apparel:0, nonapparel:0, customisation:1, artwork:2, quantity:3, quotation:4, company:5, review:6, payment:7, confirmation:-1 };

const STYLES = {
  'T-Shirt':['Round Neck','Crew Neck','Oversized','Regular Fit'],
  'Hoodie':['Pullover Hoodie','Zip Hoodie','Oversized'],
  'Jacket':['Zip Jacket','Bomber','Coach Jacket'],
  'Polo':['Classic Polo','Oversized Polo'],
  'Sweatshirt':['Crew Neck','Hooded','Oversized'],
  'Other':['Regular Fit','Oversized','Custom']
};
const COLORS = [
  {name:'Black', hex:'#262626'}, {name:'Forest Green', hex:'#3A5440'},
  {name:'Sand', hex:'#D8C6A0'}, {name:'Off-White', hex:'#F2ECDD'},
  {name:'Indigo', hex:'#3A4266'}, {name:'Terracotta', hex:'#B0603C'},
  {name:'Clay Grey', hex:'#8D8C84'}
];
const NA_FIELDS = {
  'Bottles':[
    {key:'material', label:'Material', type:'chips', options:['Stainless Steel','Recycled Plastic','Glass','Other']},
    {key:'capacity', label:'Capacity', type:'chips', options:['500 ml','750 ml','1 L','Custom']}
  ],
  'Mugs':[
    {key:'material', label:'Material', type:'chips', options:['Ceramic','Stoneware','Bone China','Other']},
    {key:'capacity', label:'Capacity', type:'chips', options:['250 ml','330 ml','Custom']}
  ],
  'Bags':[
    {key:'material', label:'Material', type:'chips', options:['Canvas','Jute','Recycled PET','Other']},
    {key:'size', label:'Size', type:'chips', options:['Small','Medium','Large','Custom']}
  ],
  'Stationery':[
    {key:'item', label:'Item', type:'chips', options:['Notebook','Journal','Pen Set','Cards','Custom']},
    {key:'paper', label:'Paper', type:'chips', options:['Recycled Kraft','Cotton','Linen','Other']}
  ],
  'Other Merchandise':[
    {key:'item', label:'Product', type:'text', placeholder:'Describe the product you need'},
    {key:'material', label:'Material', type:'chips', options:['Mixed','Other']}
  ]
};
const UNITS = { apparel:{ 'Organic Cotton':600,'Recycled Cotton':550,'Hemp':700,'Linen Blend':750,'Recycled Polyester':650,'Other':600 },
  Bottles:{ 'Stainless Steel':450,'Recycled Plastic':250,'Glass':350,'Other':300 },
  Mugs:{ 'Ceramic':220,'Stoneware':260,'Bone China':320,'Other':220 },
  Bags:{ 'Canvas':350,'Jute':200,'Recycled PET':300,'Other':250 },
  Stationery:{ 'Recycled Kraft':180,'Cotton':240,'Linen':220,'Other':180 },
  'Other Merchandise':{ 'Mixed':300,'Other':300 } };
const BRAND_UNIT = { 'Screen Printing':60,'Digital Printing':70,'Embroidery':120,'Embossing':90,'Engraving':100,'Other':80 };

/* ---------- helpers ---------- */
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const setPath = (obj,path,val)=>{ const k=path.split('.'); const last=k.pop(); let t=obj; k.forEach(p=>t=t[p]); t[last]=val; };
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.hidden=false; requestAnimationFrame(()=>t.classList.add('show')); clearTimeout(t._h); t._h=setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=>t.hidden=true,350); },2600); }

/* model bindings (plain inputs) */
$$('[data-model]').forEach(el=>{
  const ev = el.tagName==='SELECT' ? 'change' : (el.type==='checkbox' ? 'change' : 'input');
  el.addEventListener(ev, ()=>{
    const path = el.dataset.model;
    setPath(state, path, el.type==='checkbox' ? el.checked : el.value);
    if (path==='apparel.gsm') $('#apGsmCustom').hidden = el.value!=='Custom';
    if (path==='apparel.customColorOn'){ $('#apCustomColorText').hidden = !el.checked; state.apparel.customColor = el.checked; }
  });
});

/* ---------- navigation ---------- */
function go(screen){
  state.screen = screen;
  $$('.screen').forEach(s=>s.classList.toggle('is-active', s.id==='screen-'+screen));
  const st = SCREEN_STEP[screen];
  if (st>=0) state.maxStep = Math.max(state.maxStep, st);
  renderProgress();
  $('#progressBar').hidden = (screen==='landing'||screen==='confirmation');
  if (screen==='customisation') renderPlacements();
  if (screen==='quantity') renderQuantity();
  if (screen==='quotation') renderQuotation();
  if (screen==='review') renderReview();
  if (screen==='payment') renderPayment();
  if (screen==='confirmation') renderConfirmation();
  window.scrollTo({top:0});
}
document.addEventListener('click', e=>{
  const nav = e.target.closest('[data-nav]');
  if (nav){ e.preventDefault(); const t=nav.dataset.nav;
    if ((t==='customisation') && (nav.closest('#screen-apparel')||nav.closest('#screen-nonapparel'))){
      if (!validateProduct()) return;
      if (nav.closest('#screen-apparel')) state.category='apparel';
    }
    if (t==='quantity' && nav.closest('#screen-artwork')){ if(!state.artwork.file && !state.artwork.canva && !state.artwork.skipped){ toast('Upload artwork, paste a Canva link, or choose to share later'); return; } }
    if (t==='review' && nav.closest('#screen-company')){ if(!validateCompany()) return; }
    go(t);
  }
  const back = e.target.closest('[data-back="product"]');
  if (back){ e.preventDefault(); go(state.category==='nonapparel'?'nonapparel':'apparel'); }
});

/* ---------- progress ---------- */
function renderProgress(){
  const cur = SCREEN_STEP[state.screen];
  const wrap = $('#progressSteps'); wrap.innerHTML='';
  STEPS.forEach((name,i)=>{
    const el = document.createElement('span');
    const done = i<cur, current = i===cur;
    el.className = 'pstep'+(done?' is-done':'')+(current?' is-current':'')+(i<=state.maxStep?' clickable':'');
    el.innerHTML = `<b>${done?'✓':String(i+1).padStart(2,'0')}</b>${name}`;
    if (i<=state.maxStep && !current){
      el.addEventListener('click',()=>{
        const target = Object.keys(SCREEN_STEP).find(k=>SCREEN_STEP[k]===i && k!=='landing');
        if (i===0) go(state.category==='apparel'?'apparel':state.category==='nonapparel'?'nonapparel':'landing');
        else if (target) go(target);
      });
    }
    wrap.appendChild(el);
    if (i<STEPS.length-1){ const sep=document.createElement('span'); sep.className='psep'; sep.textContent='→'; wrap.appendChild(sep); }
  });
  const compact = $('#progressCompact');
  const pct = cur>=0 ? Math.round((cur+1)/STEPS.length*100) : 100;
  compact.innerHTML = `<span>Step <b>${cur+1}</b> of ${STEPS.length}</span><span>${STEPS[cur]||''}</span>
    <span class="progress__rail"><i style="width:${pct}%"></i></span>`;
}

/* ---------- screen 02: apparel ---------- */
function buildChips(container, options, selected, onPick, multi=false){
  container.innerHTML='';
  options.forEach(opt=>{
    const b=document.createElement('button'); b.type='button'; b.className='chip'; b.textContent=opt;
    if (multi ? selected.includes(opt) : selected===opt) b.classList.add('is-selected');
    b.addEventListener('click',()=>onPick(opt,b));
    container.appendChild(b);
  });
}
buildChips($('#apparelStyles'), STYLES['T-Shirt'], state.apparel.style, opt=>{
  state.apparel.style=opt;
  $$('#apparelStyles .chip').forEach(c=>c.classList.toggle('is-selected',c.textContent===opt));
});
$('#apType').addEventListener('change', e=>{
  state.apparel.style='';
  buildChips($('#apparelStyles'), STYLES[e.target.value]||STYLES['Other'], '', opt=>{
    state.apparel.style=opt;
    $$('#apparelStyles .chip').forEach(c=>c.classList.toggle('is-selected',c.textContent===opt));
  });
});

COLORS.forEach(c=>{
  const b=document.createElement('button'); b.type='button'; b.className='swatch';
  b.innerHTML=`<i style="background:${c.hex}"></i><span>${c.name}</span>`;
  b.addEventListener('click',()=>{
    state.apparel.colour=c.name;
    $$('#apparelColors .swatch').forEach(s=>s.classList.remove('is-selected'));
    b.classList.add('is-selected');
  });
  $('#apparelColors').appendChild(b);
});

['S','M','L','XL','XXL'].forEach(sz=>{
  const b=document.createElement('button'); b.type='button'; b.className='chip'; b.textContent=sz;
  b.addEventListener('click',()=>{
    b.classList.toggle('is-selected');
    state.apparel.sizes = $$('#apparelSizes .is-selected').map(c=>c.textContent);
  });
  $('#apparelSizes').appendChild(b);
});

function validateProduct(){
  if (state.category==='nonapparel') return true;
  const a=state.apparel;
  const customColorText = $('#apCustomColorText').value.trim();
  const colourOk = a.colour || (a.customColor && customColorText);
  const ok = a.type && a.style && a.fabric && a.gsm && colourOk && a.sizes.length;
  $('#apError').hidden = !!ok;
  return !!ok;
}

/* ---------- screen 03: non-apparel ---------- */
$$('#naCategories .prod-cat').forEach(btn=>{
  btn.addEventListener('click',()=>{
    $$('#naCategories .prod-cat').forEach(b=>b.classList.remove('is-selected'));
    btn.classList.add('is-selected');
    const cat = btn.dataset.na;
    state.category='nonapparel';
    state.nonapparel.category=cat; state.nonapparel.fields={}; state.nonapparel.colour='';
    renderNaFields(cat);
    $('#naContinue').disabled=false;
  });
});
function renderNaFields(cat){
  const wrap=$('#naDynamic'); wrap.hidden=false; wrap.innerHTML='';
  NA_FIELDS[cat].forEach(f=>{
    const div=document.createElement('div'); div.className='field'+(f.type==='text'?' field--span2':'');
    div.innerHTML=`<label>${f.label}</label>`;
    if (f.type==='text'){
      const inp=document.createElement('input'); inp.className='input'; inp.placeholder=f.placeholder||'';
      inp.addEventListener('input',()=>state.nonapparel.fields[f.key]=inp.value);
      div.appendChild(inp);
    } else {
      const chips=document.createElement('div'); chips.className='chips'; div.appendChild(chips);
      f.options.forEach(opt=>{
        const b=document.createElement('button'); b.type='button'; b.className='chip'; b.textContent=opt;
        b.addEventListener('click',()=>{
          chips.querySelectorAll('.chip').forEach(c=>c.classList.remove('is-selected'));
          b.classList.add('is-selected'); state.nonapparel.fields[f.key]=opt;
        });
        chips.appendChild(b);
      });
    }
    wrap.appendChild(div);
  });
  const colourDiv=document.createElement('div'); colourDiv.className='field field--span2';
  colourDiv.innerHTML='<label>Colour</label>';
  const sw=document.createElement('div'); sw.className='swatches';
  COLORS.forEach(c=>{
    const b=document.createElement('button'); b.type='button'; b.className='swatch';
    b.innerHTML=`<i style="background:${c.hex}"></i><span>${c.name}</span>`;
    b.addEventListener('click',()=>{
      sw.querySelectorAll('.swatch').forEach(s=>s.classList.remove('is-selected'));
      b.classList.add('is-selected'); state.nonapparel.colour=c.name;
    });
    sw.appendChild(b);
  });
  colourDiv.appendChild(sw); wrap.appendChild(colourDiv);

  const notesDiv=document.createElement('div'); notesDiv.className='field field--span2';
  notesDiv.innerHTML='<label for="naNotes">Product-specific requirements <span class="label-note">optional</span></label><textarea id="naNotes" rows="3" placeholder="Anything the production team should know about this product?"></textarea>';
  wrap.appendChild(notesDiv);
  $('#naNotes').addEventListener('input',e=>state.nonapparel.notes=e.target.value);
}
$('#naContinue').addEventListener('click',()=>{ if(!state.nonapparel.category){ toast('Choose a product category to continue'); } });

/* ---------- screen 04: customisation ---------- */
const PLACEMENTS = { apparel:['Front','Back','Left Chest','Right Chest','Sleeve','Custom'],
                     merch:['Front','Back','Side','Lid','Custom'] };
function renderPlacements(){
  const list = state.category==='nonapparel' ? PLACEMENTS.merch : PLACEMENTS.apparel;
  const sel = state.customisation.placements.filter(p=>list.includes(p));
  buildChips($('#placements'), list, sel, opt=>{
    const chip = $$('#placements .chip').find(c=>c.textContent===opt);
    chip.classList.toggle('is-selected');
    state.customisation.placements = $$('#placements .is-selected').map(c=>c.textContent);
  }, true);
}
renderPlacements();
$$('#brandMethods input').forEach(cb=>{
  cb.addEventListener('change',()=>{
    state.customisation.methods = $$('#brandMethods input:checked').map(c=>c.value);
  });
});
$('#custContinue').addEventListener('click', e=>{
  const ok = state.customisation.methods.length && state.customisation.placements.length;
  $('#custError').hidden = !!ok;
  if (!ok) e.stopPropagation();
  else { state.customisation.notes = $('#custNotes').value; if(state.category!=='nonapparel') state.category='apparel'; }
});

/* ---------- screen 05: artwork ---------- */
const dz=$('#dropzone'), fi=$('#fileInput');
dz.addEventListener('click',()=>fi.click());
dz.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); fi.click(); } });
['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{ e.preventDefault(); dz.classList.add('is-drag'); }));
['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{ e.preventDefault(); dz.classList.remove('is-drag'); }));
dz.addEventListener('drop',e=>{ if(e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]); });
fi.addEventListener('change',()=>{ if(fi.files[0]) setFile(fi.files[0]); });
function setFile(f){
  const ok=/\.(pdf|png|svg|ai)$/i.test(f.name);
  if(!ok){ toast('Accepted formats: PDF · PNG · SVG · AI'); return; }
  state.artwork.file={ name:f.name, size:f.size, type:(f.name.split('.').pop()||'').toUpperCase() };
  $('#fileName').textContent=f.name;
  $('#fileSize').textContent=(f.size/1048576).toFixed(1)+' MB';
  $('#fileIcon').textContent=state.artwork.file.type;
  $('#fileCard').hidden=false; dz.style.display='none';
  state.artwork.skipped=false; state.artwork.canva='';
}
$('#fileRemove').addEventListener('click',()=>{
  state.artwork.file=null; fi.value=''; $('#fileCard').hidden=true; dz.style.display='';
});
$('#fileReplace').addEventListener('click',()=>fi.click());
$('#canvaLink').addEventListener('input',e=>state.artwork.canva=e.target.value.trim());
$('#skipArtwork').addEventListener('click',()=>{
  state.artwork.skipped=true; toast('No problem — the team will follow up for your artwork.');
});

/* ---------- pricing engine ---------- */
function unitProduct(){
  if (state.category!=='nonapparel'){
    const a=state.apparel; let u = UNITS.apparel[a.fabric]||600;
    const g=parseInt(a.gsm)||parseInt(a.gsmCustom)||180;
    u += Math.round((g-160)/40)*25;
    if (a.style==='Oversized') u+=40;
    return u;
  }
  const n=state.nonapparel; const m=n.fields.material||n.fields.item||'Other';
  return (UNITS[n.category]||{})[m]||300;
}
function price(){
  const total = totalQty();
  const pu = unitProduct();
  const product = pu*total;
  const brandPer = state.customisation.methods.reduce((s,m)=>s+(BRAND_UNIT[m]||60),0);
  const places = Math.max(1,state.customisation.placements.length);
  const custom = brandPer*places*total;
  const shipping = total>200?5000: total>100?3500: total>50?2500:1500;
  const subtotal = product+custom+shipping;
  const gst = Math.round(subtotal*0.12);
  return {pu,total,product,custom,shipping,subtotal,gst,total_price:subtotal+gst, advance:Math.round((subtotal+gst)/2)};
}
function totalQty(){ return state.category==='nonapparel' ? state.qty.simple : Object.values(state.qty.sizes).reduce((a,b)=>a+(+b||0),0); }

/* ---------- screen 06: quantity ---------- */
function renderQuantity(){
  const apparel = state.category!=='nonapparel';
  $('#qtyApparel').hidden = !apparel; $('#qtySimple').hidden = apparel;
  if (apparel){
    const body=$('#sizeRows'); body.innerHTML='';
    state.apparel.sizes.forEach(sz=>{
      if (state.qty.sizes[sz]==null) state.qty.sizes[sz]=0;
      const tr=document.createElement('tr');
      tr.innerHTML=`<td class="size-name">${sz}</td>
        <td><span class="stepper"><button class="step-btn" data-sz="${sz}" data-d="-1">−</button>
        <input type="number" min="0" value="${state.qty.sizes[sz]}" data-sz-input="${sz}">
        <button class="step-btn" data-sz="${sz}" data-d="1">+</button></span></td><td></td>`;
      body.appendChild(tr);
    });
  }
  updateQtyUI();
}
$('#sizeRows').addEventListener('click',e=>{
  const b=e.target.closest('.step-btn'); if(!b) return;
  const sz=b.dataset.sz; state.qty.sizes[sz]=Math.max(0,(state.qty.sizes[sz]||0)+ +b.dataset.d);
  $(`[data-sz-input="${sz}"]`).value=state.qty.sizes[sz]; updateQtyUI();
});
$('#sizeRows').addEventListener('input',e=>{
  const inp=e.target.closest('[data-sz-input]'); if(!inp) return;
  state.qty.sizes[inp.dataset.szInput]=Math.max(0,+inp.value||0); updateQtyUI();
});
$('#simpleQty').addEventListener('input',e=>{ state.qty.simple=Math.max(0,+e.target.value||0); updateQtyUI(); });
$$('[data-simple]').forEach(b=>b.addEventListener('click',()=>{
  state.qty.simple=Math.max(0,state.qty.simple + (b.dataset.simple==='+'?5: -5));
  $('#simpleQty').value=state.qty.simple; updateQtyUI();
}));
function updateQtyUI(){
  const total=totalQty();
  $('#qtyTotalApparel').textContent=total;
  $('#qtyContinue').disabled=!(total>=50);
  $('#minError').hidden = !(total>0 && total<50);
}
$('#qtyContinue').addEventListener('click',e=>{ if(totalQty()<50) e.stopPropagation(); });

/* ---------- screen 07: quotation ---------- */
function productLine(){
  if (state.category!=='nonapparel'){
    const a=state.apparel;
    return `${a.type}${a.style?' · '+a.style:''}`;
  }
  const n=state.nonapparel;
  return `${n.fields.item||n.category} · ${n.fields.material||''}`.replace(/ · $/,'');
}
function specLine(){
  if (state.category!=='nonapparel'){
    const a=state.apparel;
    const colour = a.colour || ($('#apCustomColorText').value.trim()||'Custom');
    return [a.fabric, a.gsm==='Custom'? (a.gsmCustom+' GSM') : a.gsm, colour, a.style, 'Sizes: '+a.sizes.join('/')].filter(Boolean).join('<br>');
  }
  const n=state.nonapparel;
  return [n.category, n.fields.material, n.fields.capacity||n.fields.size||n.fields.paper, n.colour].filter(Boolean).join('<br>');
}
function renderQuotation(){
  const p=price();
  $('#qProduct').textContent=productLine();
  $('#qSpecs').innerHTML=specLine();
  $('#qCustom').innerHTML=[state.customisation.methods.join(' + '), state.customisation.placements.join(' + ')].filter(Boolean).join('<br>');
  $('#qQty').textContent=p.total+' units';
  const apparel = state.category!=='nonapparel';
  $('#quoteImg').src = apparel ? 'assets/product-tee.png' : 'assets/merch-card.png';
  $('#quoteImgCap').textContent=productLine();
  $('#qProductCost').textContent=inr(p.product);
  $('#qCustomCost').textContent=inr(p.custom);
  $('#qShipping').textContent=inr(p.shipping);
  $('#qSubtotal').textContent=inr(p.subtotal);
  $('#qGst').textContent=inr(p.gst);
  $('#qTotal').textContent=inr(p.total_price);
}

/* ---------- screen 08: company ---------- */
$('#sameAddr').addEventListener('change',e=>$('#shipBlock').hidden=e.target.checked);
function validateCompany(){
  let bad=0;
  $$('#screen-company [data-req]').forEach(el=>{
    const v=el.value.trim();
    const emailOk = el.type!=='email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    el.classList.toggle('invalid', !v || !emailOk);
    if(!v||!emailOk) bad++;
  });
  $('#coError').hidden=!bad;
  if (bad) $('#screen-company .invalid')?.scrollIntoView({behavior:'smooth',block:'center'});
  return !bad;
}

/* ---------- screen 09: review ---------- */
function reviewBlock(title, editTarget, html){
  return `<section class="rv-block"><div class="rv-block__head"><h4>${title}</h4>
    <button class="rv-edit" data-nav="${editTarget}">Edit</button></div>${html}</section>`;
}
function renderReview(){
  const p=price(), a=state.apparel, n=state.nonapparel, c=state.customisation, co=state.company;
  const apparel = state.category!=='nonapparel';
  const dl = pairs => `<dl class="rv-grid">${pairs.map(([k,v])=>`<dt>${k}</dt><dd>${v||'—'}</dd>`).join('')}</dl>`;
  let html='';
  html+=reviewBlock('Product', apparel?'apparel':'nonapparel',
    `<div class="rv-pair"><img src="assets/product-tee.png" alt="">${dl([['Name',productLine()],['Type',apparel?a.type:n.category]])}</div>`);
  html+=reviewBlock('Specifications', apparel?'apparel':'nonapparel',
    dl(apparel? [['Fabric',a.fabric],['GSM',a.gsm==='Custom'?a.gsmCustom+' GSM':a.gsm],['Colour',a.colour||$('#apCustomColorText').value||'Custom'],['Style',a.style],['Sizes',a.sizes.join(', ')]]
             : [['Category',n.category],['Material',n.fields.material],['Spec',n.fields.capacity||n.fields.size||n.fields.paper],['Colour',n.colour],['Requirements',n.notes]]));
  html+=reviewBlock('Customisation','customisation',
    dl([['Branding method',c.methods.join(', ')],['Placement',c.placements.join(', ')],['Requirements',c.notes||'None']]));
  html+=reviewBlock('Artwork','artwork',
    (state.artwork.file
      ? `<span class="rv-file">${state.artwork.file.name} · ${state.artwork.file.type} · ${(state.artwork.file.size/1048576).toFixed(1)} MB</span>`
      : state.artwork.canva
        ? `<span class="rv-file">Canva design link attached</span>`
        : `<span class="rv-file">To be shared with the team later</span>`));
  html+=reviewBlock('Quantity','quantity',
    dl(apparel? a.sizes.map(s=>[s,state.qty.sizes[s]||0]).concat([['Total',`<b>${p.total} units</b>`]])
             : [['Total',`<b>${p.total} units</b>`]]));
  html+=reviewBlock('Company Details','company',
    dl([['Company',co.name],['Contact',co.person],[ 'Designation',co.designation],['Email',co.email],['Phone',co.phone],['GST',co.gst],
        ['Billing',[co.billLine,co.billCity,co.billState,co.billPin,co.billCountry].filter(Boolean).join(', ')],
        ['Shipping',$('#sameAddr').checked?'Same as billing':[co.shipLine,co.shipCity,co.shipState,co.shipPin].filter(Boolean).join(', ')]]));
  html+=reviewBlock('Price','quotation',
    dl([['Subtotal',inr(p.subtotal)],['GST (12%)',inr(p.gst)],['Shipping',inr(p.shipping)],['Estimated Total',`<b style="font-family:var(--serif);font-size:18px">${inr(p.total_price)}</b>`]]));
  $('#reviewSections').innerHTML=html;
  $('#rvTotal').textContent=inr(p.total_price);
  $('#rvDue').textContent='₹'+p.advance.toLocaleString('en-IN')+'  · 50%';
}
$('#confirmCheck').addEventListener('change',e=>$('#rvConfirm').disabled=!e.target.checked);

/* ---------- screen 10: payment ---------- */
function renderPayment(){
  const p=price();
  $('#payTotal').textContent=inr(p.total_price);
  $('#payAdvance').textContent=inr(p.advance);
  $('#payBalance').textContent=inr(p.total_price-p.advance);
  $('#payBtnAmt').textContent='· '+inr(p.advance);
}
$$('input[name="paym"]').forEach(r=>r.addEventListener('change',()=>{
  state.payment.method=r.value;
  $('#upiField').hidden = r.value!=='UPI';
}));
$('#payBtn').addEventListener('click',()=>{
  $('#payOverlay').hidden=false;
  setTimeout(()=>{ $('#payOverlay').hidden=true; go('confirmation'); },1900);
});

/* ---------- screen 11: confirmation ---------- */
function renderConfirmation(){
  const p=price();
  $('#cfProduct').textContent=productLine()+' — '+(state.apparel.fabric||'');
  $('#cfQty').textContent=p.total+' units';
  $('#cfPaid').textContent=inr(p.advance);
  $('#cfBalance').textContent=inr(p.total_price-p.advance);
}
$('#cfDetails').addEventListener('click',()=>toast('Order dashboard is out of scope for this prototype — the team will email updates.'));

/* ---------- entry ---------- */
document.addEventListener('keydown',e=>{
  if ((e.key==='Enter'||e.key===' ') && e.target.classList?.contains('category-card')){
    e.preventDefault(); go(e.target.dataset.nav);
  }
});
renderProgress();
$('#progressBar').hidden=true;
