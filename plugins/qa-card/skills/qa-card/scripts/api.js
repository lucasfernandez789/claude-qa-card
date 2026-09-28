// Generic API client for testing environments (self-signed TLS).
// Env: QA_API (e.g. https://testing.example.org:4000), QA_USER, QA_PASS,
//      QA_LOGIN_PATH (default /auth/login/).
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
let TOKEN;

async function login() {
  const r = await fetch(process.env.QA_API + (process.env.QA_LOGIN_PATH || '/auth/login/'), {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: process.env.QA_USER, password: process.env.QA_PASS }),
  });
  const j = await r.json();
  TOKEN = j.token || j.data?.token || j.accessToken || j.data?.accessToken;
  if (!TOKEN) throw new Error('Login failed: ' + JSON.stringify(j).slice(0, 300));
  return j;
}

async function call(method, path, body) {
  const r = await fetch(process.env.QA_API + path, {
    method, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + TOKEN },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  let data; try { data = JSON.parse(t); } catch { data = t; }
  return { status: r.status, data };
}

// Decodes {type:'Buffer',data:[...]} or base64 payloads returned by report endpoints.
function toBuffer(v) {
  if (!v) return null;
  if (v.type === 'Buffer') return Buffer.from(v.data);
  if (typeof v === 'string') return Buffer.from(v.replace(/^data:.*?;base64,/, ''), 'base64');
  if (v.data) return toBuffer(v.data);
  return null;
}

module.exports = { login, call, toBuffer };
