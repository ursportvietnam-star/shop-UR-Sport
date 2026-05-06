const puppeteer = require('puppeteer'); 
(async () => { 
  const browser = await puppeteer.launch(); 
  const page = await browser.newPage(); 
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString())); 
  page.on('console', msg => { 
    if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); 
  }); 
  await page.goto('http://localhost:3000/quan-tri', {waitUntil: 'networkidle0'}); 
  await page.waitForSelector('button'); 
  const btns = await page.$$('button'); 
  for (const b of btns) { 
    const text = await page.evaluate(el => el.textContent, b); 
    if (text.includes('Thêm sản phẩm')) { 
      console.log('Clicking button...'); 
      await b.click(); 
      await new Promise(r => setTimeout(r, 2000)); 
      break; 
    } 
  } 
  await browser.close(); 
})();
