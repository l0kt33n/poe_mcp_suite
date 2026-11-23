// Minimal client for the PoB TCP API (the server LaunchPoBWithAPI.bat starts).
// Shared by pob_sync.mjs and pob_sim_harness.mjs. No dependencies beyond Node 18+.
import net from 'net';

export async function connect({ host = '127.0.0.1', port = Number(process.env.POB_API_TCP_PORT || 59166) } = {}) {
  const sock = net.createConnection({ host, port });
  sock.setEncoding('utf8');
  let buf = '';
  const waiters = [];
  sock.on('data', (c) => {
    buf += c;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const l = buf.slice(0, i);
      buf = buf.slice(i + 1);
      const w = waiters.shift();
      if (w) w(l);
    }
  });
  await new Promise((res, rej) => { sock.once('connect', res); sock.once('error', rej); });
  const nextLine = () => new Promise((r) => waiters.push(r));
  await nextLine(); // ready banner
  const call = async (action, params = {}) => {
    sock.write(JSON.stringify({ action, params }) + '\n');
    return JSON.parse(await nextLine());
  };
  const close = async () => { try { await call('quit'); } catch {} sock.destroy(); };
  // Rounded stats helper: fields -> {name: value}
  const stats = async (fields) => {
    const r = await call('get_stats', { fields });
    const s = r.stats || {};
    delete s._meta;
    for (const k in s) if (typeof s[k] === 'number') s[k] = Math.round(s[k] * 10) / 10;
    return s;
  };
  return { call, stats, close };
}
