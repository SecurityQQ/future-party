// Playback test for the served app (dist/local). Checks the radio, the Research → party buttons,
// skipping of videos that cannot embed, and continuous play in the listening room.
// Run (muted, headless; Yab's guard blocks this page, so use Chrome directly):
//   (cd dist/local && python3 -m http.server 8799 --bind 127.0.0.1 &)
//   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --mute-audio \
//     --autoplay-policy=no-user-gesture-required --remote-debugging-port=9333 --user-data-dir=/tmp/rs-chrome \
//     --user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36" &
//   bun test_playback.ts 9333 /tmp [url]   # screenshots land in the second argument; url defaults to the local server
//   bun test_playback.ts 9333 /tmp https://resonance-2050.vercel.app/   # the hosted copy (direct player)
//   bun test_playback.ts 9333 /tmp file:///…/dist/Resonance_History_and_Future.html   # single file (relay player from the host)
// Minimal CDP driver: bun cdp.ts <port> <script.js-steps-file>
const port = process.argv[2] || '9333';
const out = process.argv[3] || '.';
const base = process.argv[4] || 'http://localhost:8799/index.html';
const tab = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let seq = 0; const pending = new Map();
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } else if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') console.log('console.error:', JSON.stringify(d.params.args.map(a => a.value ?? a.description)).slice(0, 200)); else if (d.method === 'Runtime.exceptionThrown') console.log('EXCEPTION:', d.params.exceptionDetails.exception?.description?.slice(0, 300)); };
const send = (method, params = {}) => new Promise(r => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, userGesture: true }); return r.result?.result?.value ?? r.result?.exceptionDetails?.exception?.description ?? r; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'png' }); await Bun.write(`${out}/${name}.png`, Buffer.from(r.result.data, 'base64')); };
await send('Runtime.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false });
const log = (k, v) => console.log(k.padEnd(28), typeof v === 'string' ? v : JSON.stringify(v));
const status = () => ev('JSON.stringify(window.ResonanceRadio.status())').then(JSON.parse);
const waitFor = async (pred, ms = 20000) => { const t0 = Date.now(); let s; while (Date.now() - t0 < ms) { s = await status(); if (pred(s)) return s; await sleep(1000); } return s; };

// 1. Load the full app over http
await send('Page.navigate', { url: base }); await sleep(3000);
log('title', await ev('document.title'));
log('views', await ev('[...document.querySelectorAll("[data-mode]")].map(a=>a.dataset.mode).join(",")'));

// 2. Radio: open, first item of the history route
await ev('document.getElementById("radio-open").click()');
let s = await waitFor(s => s.state === 1 && s.time > 1 && s.video === s.expected);
log('radio route #1', s);
log('radio title', await ev('document.getElementById("radio-title").innerText'));
await shot('radio-playing');
// 3. End of video -> next item
await ev('window.ResonanceRadio.seekEnd()');
s = await waitFor(s => s.index === 1 && s.state === 1 && s.time > 1 && s.video === s.expected);
log('after end -> next', s);
// 4. Next button
await ev('document.getElementById("radio-next").click()');
s = await waitFor(s => s.index === 2 && s.state === 1 && s.time > 1 && s.video === s.expected);
log('next button', s);
// 5. Party list from the Research tab (item 3)
await ev('location.hash="#research"'); await sleep(1500);
log('research visible', await ev('!document.getElementById("research-view").hidden'));
await ev('document.querySelector("[data-rs-party=\'2\']").click()');
s = await waitFor(s => s.list === 'party' && s.index === 2 && s.state === 1 && s.time > 1 && s.video === s.expected);
log('party #3 from research', s);
// 6. Queue click: future lab item 5
await ev('document.querySelector("[data-radio=future]").click()');
s = await waitFor(s => s.list === 'future' && s.state === 1 && s.time > 1 && s.video === s.expected);
log('future list', s);
await ev('document.getElementById("radio-queue-toggle").click()'); await sleep(300);
await ev('document.querySelector("#radio-queue [data-at=\'4\']").click()');
s = await waitFor(s => s.list === 'future' && s.index === 4 && s.state === 1 && s.time > 1 && s.video === s.expected);
log('queue click future #5', s);
await shot('radio-queue');
// 7. A video that cannot play embedded (Arca, age-restricted, future #2): skipped
await ev('document.querySelector("#radio-queue [data-at=\'1\']").click()');
s = await waitFor(s => s.failed.length > 0 || (s.index === 1 && s.state === 1 && s.time > 1 && s.video === s.expected), 25000);
log('arca #2 result', s);
log('note', await ev('document.getElementById("radio-note").innerText'));
s = await waitFor(s => s.index === 2 && s.state === 1 && s.time > 1 && s.video === s.expected, 25000);
log('after skip', s);
// 8. Listening room: continuous play moves stop 1 -> 2 when a recording ends
await ev('document.getElementById("radio-close").click()');
await ev('location.hash="#track=1"'); await sleep(1500);
log('auto-next visible', await ev('!document.getElementById("auto-next").hidden'));
await ev('document.getElementById("auto-next").click()');
await ev('document.getElementById("play-full").click()');
const hs = async () => ev(`JSON.stringify((()=>{const f=document.querySelector("#embed-container iframe");const relay=!!f&&f.src.includes("/player.html");const st=document.getElementById("player-status").textContent;let state=null,t=null;if(f&&!relay&&window.YT&&YT.get){const p=YT.get(f.id);state=p&&p.getPlayerState?p.getPlayerState():null;t=p&&p.getCurrentTime?p.getCurrentTime():null;}if(relay){state=/^Playing/.test(st)?1:null;t=state?2:null;}return {hash:location.hash,status:st,relay,iframe:f?(relay?"relay":f.id):null,state,t};})())`).then(JSON.parse);
const waitH = async (pred, ms = 20000) => { const t0 = Date.now(); let h; while (Date.now() - t0 < ms) { h = await hs(); if (pred(h)) return h; await sleep(1000); } return h; };
let h = await waitH(h => h.state === 1 && h.t > 1);
log('room stop 1', h);
await ev('(()=>{const f=document.querySelector("#embed-container iframe");if(f.src.includes("/player.html")){f.contentWindow.postMessage({resonanceCmd:"seekEnd"},"*");return;}const p=YT.get(f.id);p.seekTo(p.getDuration()-2,true)})()');
h = await waitH(h => h.hash === '#track=2' && h.state === 1 && h.t > 1, 30000);
log('room after end', h);
await shot('room-continuous');
// 9. Radio pauses when the room plays, room stops when the radio plays
await ev('document.getElementById("radio-open").click()');
s = await waitFor(s => s.state === 1 && s.time > 1 && s.video === s.expected);
h = await hs();
log('radio resumed; room iframe', { radio: s.list + '#' + (s.index + 1) + ' state ' + s.state, roomIframe: h.iframe ?? 'none' });
await ev('document.getElementById("radio-close").click()');
// 10. Future Lab player: the sample of the selected work plays in the page
await ev('location.hash="#future"'); await sleep(1000);
await ev(`location.hash=[...document.querySelectorAll('a[href^="#future="]')].map(a=>a.getAttribute('href')).find(h=>!/=(library|signals|horizon|atlas)$/.test(h))`); await sleep(1500);
await ev('document.getElementById("future-play-sample").click()');
const fs = async () => ev('JSON.stringify({status:document.getElementById("future-player-status").textContent,frame:(document.querySelector("#future-embed iframe")||{}).src?.split("?")[0]||null})').then(JSON.parse);
let f = await fs(); { const t0 = Date.now(); while (Date.now() - t0 < 20000 && !/^Playing/.test(f.status)) { await sleep(1000); f = await fs(); } }
log('future lab sample', f);
await shot('future-lab');
ws.close(); process.exit(0);
