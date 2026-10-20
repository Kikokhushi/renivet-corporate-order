const puppeteer = require('puppeteer-core');
const SCREENS = [
  ['01-landing','landing'], ['02-product','product'], ['03-customise','customise'],
  ['04-quantity','quantity'], ['05-details','details'], ['06-quote','quote'],
  ['07-review','review'], ['08-requested','requested'],
  ['09-payment','payment'], ['10-confirmed','confirmed']
];
const BASE = 'http://localhost:8123/mobile.html';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new', args: ['--hide-scrollbars']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 900, deviceScaleFactor: 2 });
  const unstick = () => page.addStyleTag({ content: '.actions{position:static!important;background:none!important;padding-bottom:24px}' });

  for (const [file, screen] of SCREENS) {
    await page.goto(`${BASE}?screen=${screen}`, { waitUntil: 'networkidle0' });
    await unstick();
    await new Promise(r => setTimeout(r, 400));
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `renders-mobile/${file}.png`, fullPage: true });
    console.log('captured', file);
  }

  await page.goto(`${BASE}?screen=quantity`, { waitUntil: 'networkidle0' });
  await unstick();
  await page.evaluate(() => { state.qty.sheet = null; state.qty.total = 10; go('quantity'); });
  await new Promise(r => setTimeout(r, 300));
  const err = await page.$('#qtyError:not([hidden])');
  console.log('moq error visible:', !!err);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: 'renders-mobile/04b-quantity-moq-error.png', fullPage: true });
  console.log('captured 04b');
  await browser.close();
})();
