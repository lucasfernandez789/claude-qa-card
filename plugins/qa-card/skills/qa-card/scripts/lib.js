// Generic Playwright helper for testing environments.
// Env: QA_URL (front base, e.g. https://testing.example.org/#/), QA_USER, QA_PASS,
//      QA_USER_LABEL / QA_PASS_LABEL (login field labels, default "Usuario" / "Contraseña").
const { chromium } = require('playwright');

async function open({ headless = true } = {}) {
  const b = await chromium.launch({ headless });
  const ctx = await b.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1400, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage();
  p.errors = [];
  p.on('console', m => m.type() === 'error' && p.errors.push(m.text()));
  await p.goto(process.env.QA_URL, { waitUntil: 'networkidle' });
  await p.getByLabel(process.env.QA_USER_LABEL || 'Usuario').fill(process.env.QA_USER);
  await p.getByLabel(process.env.QA_PASS_LABEL || 'Contraseña').fill(process.env.QA_PASS);
  await p.getByRole('button', { name: /iniciar sesi|ingresar|login/i }).click();
  await p.waitForLoadState('networkidle');
  await p.waitForTimeout(1500);
  // Hash-router navigation keeping the sessionStorage session alive.
  const go = async route => { await p.evaluate(h => { location.hash = '#/' + h; }, route); await p.waitForLoadState('networkidle'); await p.waitForTimeout(1500); };
  // Confirms "¿Desea...?" SweetAlerts, dismisses error ones; returns the texts seen.
  const drainSwal = async (rounds = 4) => {
    const seen = [];
    for (let k = 0; k < rounds; k++) {
      await p.waitForTimeout(1500);
      const pop = p.locator('.swal2-popup:visible');
      if (!(await pop.count())) continue;
      const txt = (await pop.innerText()).replace(/\s+/g, ' ');
      seen.push(txt);
      const btn = /Desea|confirmar/i.test(txt) ? p.locator('.swal2-confirm:visible') : p.locator('.swal2-cancel:visible, .swal2-confirm:visible').first();
      if (await btn.count()) await btn.click();
    }
    return seen;
  };
  // Logs non-GET API calls (method, path, status, short body) for evidence.
  const logApi = (apiHost) => {
    p.on('response', async r => {
      if (r.request().method() === 'GET' || !r.url().includes(apiHost)) return;
      let t = ''; try { t = (await r.text()).slice(0, 250); } catch {}
      console.log('API', r.status(), r.request().method(), r.url().split(apiHost)[1], t);
    });
  };
  return { b, ctx, p, go, drainSwal, logApi };
}

module.exports = { open };
