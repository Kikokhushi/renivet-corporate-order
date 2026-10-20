const puppeteer = require('puppeteer-core');
const Chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const log = (...a) => console.log(...a);
(async () => {
  const b = await puppeteer.launch({ executablePath: Chrome, args: ['--force-device-scale-factor=1'] });
  const p = await b.newPage();
  await p.setViewport({ width: 390, height: 900 });
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
  await p.goto('http://localhost:8123/mobile.html', { waitUntil: 'networkidle0' });

  const active = () => p.evaluate(() => document.querySelector('.screen.is-active').id);
  const txt = s => p.evaluate(sel => { const e = document.querySelector(sel); return e ? (e.hidden ? '(hidden)' : e.textContent.trim()) : '(missing)'; }, s);
  const click = s => p.click(s);
  const chip = (sel, t) => p.evaluate((s, txt) => { const b = [...document.querySelectorAll(s + ' button')].find(e => e.textContent.trim() === txt); if (!b) throw new Error('chip not found: ' + txt); b.click(); }, sel, t);
  const setv = (sel, v) => p.evaluate((s, v) => { const e = document.querySelector(s); e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); }, sel, v);
  const setin = (sel, v) => p.evaluate((s, v) => { const e = document.querySelector(s); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, sel, v);
  const check = (name, cond) => log((cond ? 'PASS' : 'FAIL') + ' · ' + name);

  // 1 · landing vertical cards
  check('landing active', (await active()) === 's-landing');
  const stacked = await p.evaluate(() => getComputedStyle(document.querySelector('.cat-grid')).flexDirection);
  check('category cards vertical (column)', stacked === 'column');

  // 2 · product
  await click('.cat-card[data-cat="apparel"]');
  check('product screen opens', (await active()) === 's-product');
  const hasColorsOnProduct = await p.evaluate(() => !!document.querySelector('#s-product #colors'));
  check('colour removed from product screen', !hasColorsOnProduct);
  await click('#s-product [data-go="customise"]');
  check('product validation blocks', (await active()) === 's-product');
  const pe = await txt('#productError');
  check('product error: no colour mention', !pe.includes('colour') && pe.includes('product type'));
  log('  productError = ' + pe);
  await setv('#apType', 'T-Shirt');
  await chip('#apStyles', 'Round Neck');
  await setv('#apFabric', 'Organic Cotton');
  await setv('#apGsm', '180 GSM');
  await chip('#sizes', 'S'); await chip('#sizes', 'M'); await chip('#sizes', 'L');
  await click('#s-product [data-go="customise"]');
  check('advance to customise', (await active()) === 's-customise');

  // 3 · customise: colour + placement + upload below placement
  const order = await p.evaluate(() => {
    const ids = ['colors', 'placements', 'dropzone'];
    const y = ids.map(i => document.getElementById(i).getBoundingClientRect().top + scrollY);
    return y[1] < y[2];
  });
  check('file upload directly below print placement', order);
  await click('#s-customise [data-go="quantity"]');
  check('customise validation blocks', (await active()) === 's-customise');
  const ce = await txt('#custError');
  check('custError lists colour+placement+artwork', ce.includes('print colour') && ce.includes('print placement') && ce.includes('share later'));
  log('  custError = ' + ce);
  await chip('#colors', 'Black');
  await chip('#placements', 'Front'); await chip('#placements', 'Back');
  await click('#shareLater');
  await click('#s-customise [data-go="quantity"]');
  check('advance to quantity', (await active()) === 's-quantity');

  // 4 · quantity — Excel-first, no mid-flow summaries
  const noSummary = await p.evaluate(() => !document.querySelector('#qsRows') && !document.querySelector('#miniSummary') && !document.querySelector('.q-summary'));
  check('no mid-order summary anywhere', noSummary);
  const stepLabel = await txt('#stepLabel'); check('step bar says of 05', stepLabel.includes('of 05'));
  const ctaTxt = await txt('#qtyCta'); check('quantity CTA says Next', ctaTxt.includes('Next'));
  await setin('#simpleInput', '10');
  check('MOQ error at 10 units', (await txt('#qtyError')) !== '(hidden)');
  check('CTA disabled at 10', await p.evaluate(() => document.querySelector('#qtyCta').disabled));
  require('fs').writeFileSync(__dirname + '/test_size_breakup.csv', 'size,qty\nS,10\nM,20\nL,15\nXL,5\n');
  await (await p.$('#excelInput')).uploadFile(__dirname + '/test_size_breakup.csv');
  await new Promise(r => setTimeout(r, 300));
  check('sheet chip shows file + fetched total', (await txt('#sheetName')).includes('test_size_breakup') && (await txt('#sheetSummary')).includes('50'));
  check('CTA enabled after sheet', !(await p.evaluate(() => document.querySelector('#qtyCta').disabled)));
  await click('#qtyCta');
  check('advance to details', (await active()) === 's-details');

  // 5 · details: required delivery date
  const detCta = await txt('#s-details .btn-primary');
  check('delivery CTA says Continue for quotation', detCta.includes('Continue for quotation'));
  const delDate = await p.evaluate(() => document.querySelector('#delDate') && document.querySelector('#delDate').type);
  check('delivery date input (type=date)', delDate === 'date');
  await click('#s-details [data-go="quote"]');
  check('details validation blocks (empty date)', (await active()) === 's-details');
  await setin('#coName', 'Studio Arc'); await setin('#coPerson', 'Aarav Mehta');
  await setin('#coEmail', 'aarav@studioarc.in'); await setin('#coPhone', '+91 98450 12345');
  await setin('#billLine', '42 Residency Road'); await setin('#billCity', 'Bengaluru');
  await setin('#billState', 'Karnataka'); await setin('#billPin', '560025'); await setin('#billCountry', 'India');
  await setin('#delDate', '2026-08-15');
  await click('#s-details [data-go="quote"]');
  check('details pass -> quote (CTA goes to quotation)', (await active()) === 's-quote');

  // 6 · quote -> review
  const qSpecs = await txt('#qSpecs'); check('quote specs have no "method"', !qSpecs.toLowerCase().includes('screen printing'));
  log('  qSpecs = ' + qSpecs);
  await click('#s-quote [data-go="review"]');
  check('advance to review', (await active()) === 's-review');
  const rv = await txt('#reviewBlocks');
  check('review shows Print colour', rv.includes('Print colour') && rv.includes('Black'));
  check('review shows Artwork row', rv.includes('Artwork'));

  // 7 · submit -> payment -> confirmed
  await click('#submitReq');
  check('requested screen', (await active()) === 's-requested');
  await click('#s-requested [data-go="payment"]');
  check('payment screen', (await active()) === 's-payment');
  const help = await txt('#s-payment .help-card');
  check('payment help & support block', help.includes('98450') && help.includes('orders@renivet.in'));
  await click('#payCta');
  await new Promise(r => setTimeout(r, 2300));
  check('confirmed screen', (await active()) === 's-confirmed');
  const cf = await p.evaluate(() => ({
    date: document.querySelector('#cfDate').textContent,
    name: document.querySelector('#cfContact').textContent,
    email: document.querySelector('#cfEmail').textContent,
    phone: document.querySelector('#cfPhone').textContent,
  }));
  check('confirmed shows delivery date + contact', cf.date.includes('2026') && cf.name === 'Aarav Mehta' && cf.email.includes('studioarc'));
  log('  confirmed = ' + JSON.stringify(cf));

  log(errs.length ? 'JS ERRORS:\n' + errs.join('\n') : 'NO JS ERRORS');
  await b.close();
})().catch(e => { console.error('TEST CRASH:', e.message); process.exit(1); });
