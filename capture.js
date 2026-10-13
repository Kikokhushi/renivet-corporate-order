const puppeteer = require('puppeteer-core');
const SCREENS = [
  ['01-landing','landing'], ['02-product','product'], ['03-customise','customise'],
  ['04-artwork','artwork'], ['05-quantity','quantity'], ['06-quote','quote'],
  ['07-details','details'], ['08-review','review'], ['09-requested','requested'],
  ['10-payment','payment'], ['11-confirmed','confirmed']
];
const BASE = 'http://localhost:8123/mobile.html';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new', args: ['--hide-scrollbars']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 900, deviceScaleFactor: 2 });

  for (const [file, screen] of SCREENS) {
    await page.goto(`${BASE}?screen=${screen}`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 400));
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `renders-mobile/${file}.png`, fullPage: true });
    console.log('captured', file);
  }

  await page.goto(`${BASE}?screen=quantity`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    const set = (k, v) => {
      const i = document.querySelector(`[data-qin="${k}"]`);
      i.value = v; i.dispatchEvent(new Event('input', { bubbles: true }));
    };
    set('S', 10); set('M', 0); set('L', 0); set('XL', 0);
  });
  await new Promise(r => setTimeout(r, 300));
  const err = await page.$('#qtyError:not([hidden])');
  console.log('moq error visible:', !!err);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: 'renders-mobile/05b-quantity-moq-error.png', fullPage: true });
  console.log('captured 05b');
  await browser.close();
})();
