import { authenticate } from '../_lib/auth.js';
import { json } from '../_lib/github.js';

export async function onRequest(context) {
  try { context.data.email = await authenticate(context.request, context.env); }
  catch (e) { return json({ error: `未授权：${e.message}` }, 401); }
  try { return await context.next(); }
  catch (e) { return json({ error: e.message }, e.status && e.status < 500 ? e.status : 500); }
}
