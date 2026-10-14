// Cloudflare Access verification. Fails closed when not configured.
const b64urlToBytes = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const decodeJson = s => JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));

let certCache = { url: '', keys: null, at: 0 };
async function getKeys(teamDomain, fetchImpl) {
  const url = `https://${teamDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')}/cdn-cgi/access/certs`;
  if (certCache.url === url && Date.now() - certCache.at < 10 * 60 * 1000) return certCache.keys;
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error('无法获取 Access 证书');
  certCache = { url, keys: (await res.json()).keys || [], at: Date.now() };
  return certCache.keys;
}

export async function verifyAccessJwt(token, { teamDomain, aud, fetchImpl = fetch, now = Date.now() }) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('缺少 Access 令牌');
  const header = decodeJson(parts[0]);
  const payload = decodeJson(parts[1]);
  if (header.alg !== 'RS256') throw new Error('不支持的签名算法');
  const jwk = (await getKeys(teamDomain, fetchImpl)).find(k => k.kid === header.kid);
  if (!jwk) throw new Error('未知的签名密钥');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  if (!ok) throw new Error('签名无效');
  const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!auds.includes(aud)) throw new Error('aud 不匹配');
  if (!payload.exp || payload.exp * 1000 < now) throw new Error('令牌已过期');
  return payload;
}

export async function authenticate(request, env, fetchImpl = fetch) {
  const { ADMIN_EMAIL, ACCESS_TEAM_DOMAIN, ACCESS_AUD } = env;
  if (!ADMIN_EMAIL || !ACCESS_TEAM_DOMAIN || !ACCESS_AUD) throw new Error('服务器未配置 ADMIN_EMAIL / ACCESS_TEAM_DOMAIN / ACCESS_AUD');
  const token = request.headers.get('Cf-Access-Jwt-Assertion') || (request.headers.get('Cookie') || '').match(/CF_Authorization=([^;]+)/)?.[1];
  const payload = await verifyAccessJwt(token, { teamDomain: ACCESS_TEAM_DOMAIN, aud: ACCESS_AUD, fetchImpl });
  const allowed = ADMIN_EMAIL.split(',').map(s => s.trim().toLowerCase());
  if (!allowed.includes(String(payload.email || '').toLowerCase())) throw new Error('邮箱无权限');
  return payload.email;
}
