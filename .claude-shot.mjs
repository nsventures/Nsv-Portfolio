import { chromium } from 'playwright'
const d = '/private/tmp/claude-501/-Users-nsv-06-Desktop-nsvportfolio-1/b2df62a6-34ae-4a98-b7df-4e267c8bd046/scratchpad/'
const browser = await chromium.launch()
const p = await browser.newPage({ viewport: {width:1440,height:900}, deviceScaleFactor: 1.5, reducedMotion: 'no-preference' })
await p.goto('http://localhost:5198/', { waitUntil: 'load' })
await p.waitForTimeout(2500)
await p.getByRole('button', { name: 'Our Commercial' }).click()
await p.waitForTimeout(1200)
const gaps = async (label) => {
  const m = await p.evaluate(() => {
    const btns = [...document.querySelectorAll('[role=dialog] button')].filter(b => /page$/.test(b.getAttribute('aria-label')||'') && b.offsetParent !== null)
    const imgs = [...document.querySelectorAll('[role=dialog] img')].map(i => i.getBoundingClientRect())
    const left = Math.min(...imgs.map(r => r.left)), right = Math.max(...imgs.map(r => r.right))
    const prev = btns.find(b => b.getAttribute('aria-label')==='Previous page')?.getBoundingClientRect()
    const next = btns.find(b => b.getAttribute('aria-label')==='Next page')?.getBoundingClientRect()
    return { gapL: Math.round(left - prev.right), gapR: Math.round(next.left - right) }
  })
  console.log(label.padEnd(16), 'gap left', m.gapL + 'px | gap right', m.gapR + 'px')
}
await gaps('closed cover')
await p.screenshot({ path: d+'arrows2-closed.png' })
await p.getByRole('button', { name: 'Next page' }).first().click(); await p.waitForTimeout(1200)
await gaps('open spread')
await p.screenshot({ path: d+'arrows2-spread.png' })
await browser.close()
