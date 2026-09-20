/**
 * Local review server for the generated audio: listen to every section and
 * watch the subtitles and photos land exactly where the manifest puts them,
 * without uploading anything to R2.
 *
 *   pnpm tsx scripts/self-guided/tools/review-server.ts [--lang fr] [--port 4500]
 *
 * Serves straight from scripts/self-guided/output/ (manifest, MP3, WebP), so
 * re-running the generator and reloading the page is enough to see a change.
 * The sync rule is the webapp's: the last entry whose `t` is ≤ currentTime.
 */
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";
import { parseArgs } from "../lib/args.ts";
import { log } from "../lib/log.ts";
import { PATHS, parseLangs } from "../lib/sections.ts";

const args = parseArgs(process.argv.slice(2));
const lang = parseLangs(args.get("lang"))[0]!;
const port = Number(args.get("port") ?? 4500);

const manifestFile = resolve(PATHS.manifestDir, `${lang}.json`);
if (!existsSync(manifestFile)) throw new Error(`No manifest for "${lang}" — run pnpm self-guided:generate --lang ${lang}`);

const TYPES: Record<string, string> = { ".mp3": "audio/mpeg", ".webp": "image/webp", ".mp4": "video/mp4", ".json": "application/json; charset=utf-8" };

/** Static file with Range support — browsers need it to seek inside an MP3. */
function sendFile(req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse, file: string) {
  if (!existsSync(file)) { res.writeHead(404).end("not found"); return; }
  const { size } = statSync(file);
  const type = TYPES[extname(file)] ?? "application/octet-stream";
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "");
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Number(range[2]) : size - 1;
    res.writeHead(206, { "Content-Type": type, "Accept-Ranges": "bytes", "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": end - start + 1 });
    createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { "Content-Type": type, "Accept-Ranges": "bytes", "Content-Length": size, "Cache-Control": "no-store" });
  createReadStream(file).pipe(res);
}

const PAGE = /* html */ `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Relecture — narration ${lang.toUpperCase()}</title>
<style>
 :root{--paper:#F7F3EC;--paper2:#EDE7DC;--hair:#E4DCD0;--ink:#1C1714;--muted:#6B5A4E;--red:#8B0000;--gold:#C9A24A;--well:#2A2320;
  --serif:Georgia,"Times New Roman",serif;--sans:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Helvetica,sans-serif}
 *{box-sizing:border-box}
 body{margin:0;background:var(--paper);color:var(--ink);font:14px/1.5 var(--sans)}
 header{position:sticky;top:0;z-index:3;background:var(--paper);border-bottom:1px solid var(--hair);padding:10px 16px}
 h1{font:700 17px/1.2 var(--serif);margin:0 0 8px}
 .tabs{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px}
 .tab{flex:0 0 auto;border:1px solid var(--hair);background:var(--paper);color:var(--muted);border-radius:999px;
  padding:6px 11px;font:600 12px var(--sans);cursor:pointer;white-space:nowrap}
 .tab[aria-selected=true]{background:var(--red);border-color:var(--red);color:var(--paper)}
 main{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:18px;padding:16px;align-items:start}
 @media(max-width:900px){main{grid-template-columns:1fr}}
 .stage{background:var(--well);border-radius:14px;overflow:hidden;position:relative;aspect-ratio:4/3;display:grid;place-items:center}
 .stage img,.stage video{width:100%;height:100%;object-fit:contain;background:var(--well)}
 .stage .none{color:#C9B8A6;font:italic 14px var(--serif);text-align:center;padding:24px;
  background:repeating-linear-gradient(135deg,#2A2320 0 10px,#302925 10px 20px);width:100%;height:100%;display:grid;place-items:center}
 .cap{background:var(--paper2);border-radius:0 0 14px 14px;padding:9px 12px;font-size:12px;color:var(--muted);min-height:34px}
 .sub{font:20px/1.45 var(--serif);margin:14px 0 4px;min-height:3em}
 .sub b{background:rgba(201,162,74,.28);font-weight:inherit;border-radius:3px}
 audio{width:100%;margin-top:8px}
 .meta{font-size:12px;color:var(--muted);margin-top:6px}
 aside h2{font:700 12px var(--sans);letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:0 0 8px}
 aside section{background:var(--paper2);border:1px solid var(--hair);border-radius:12px;padding:12px;margin-bottom:14px}
 ol{list-style:none;margin:0;padding:0;max-height:42vh;overflow:auto}
 li{display:flex;gap:9px;padding:5px 6px;border-radius:7px;cursor:pointer;align-items:flex-start}
 li:hover{background:var(--paper)}
 li[data-cur=1]{background:var(--paper);box-shadow:inset 3px 0 0 var(--gold)}
 .t{flex:0 0 46px;font:600 11px ui-monospace,Menlo,monospace;color:var(--red);padding-top:2px}
 .thumb{flex:0 0 46px;height:35px;object-fit:cover;border-radius:4px;background:var(--well)}
 .cue .name{font:600 11px ui-monospace,Menlo,monospace;color:var(--muted)}
 .txt{flex:1;min-width:0;font-size:12.5px}
</style></head><body>
<header>
  <h1>Relecture de la narration — ${lang.toUpperCase()}</h1>
  <div class="tabs" id="tabs" role="tablist"></div>
</header>
<main>
  <div>
    <div class="stage" id="stage"></div>
    <div class="cap" id="cap"></div>
    <p class="sub" id="sub"></p>
    <audio id="audio" controls preload="metadata"></audio>
    <div class="meta" id="meta"></div>
  </div>
  <aside>
    <section><h2>Photos (<span id="nphoto">0</span>)</h2><ol id="cues"></ol></section>
    <section><h2>Sous-titres (<span id="nsub">0</span>)</h2><ol id="subs"></ol></section>
  </aside>
</main>
<script type="module">
const $ = (id) => document.getElementById(id);
const mmss = (s) => Math.floor(s/60) + ":" + String(Math.floor(s%60)).padStart(2,"0");
const m = await (await fetch("manifest.json")).json();
let cur = 0;

$("tabs").innerHTML = m.sections.map((s,i) =>
  \`<button class="tab" role="tab" data-i="\${i}" aria-selected="\${i===0}">\${i+1}. \${s.id.replace(/^\\d+-/,"")}</button>\`).join("");
$("tabs").addEventListener("click", e => { const b = e.target.closest(".tab"); if (b) load(Number(b.dataset.i)); });

function load(i){
  cur = i;
  const s = m.sections[i];
  document.querySelectorAll(".tab").forEach((b,j)=>b.setAttribute("aria-selected", String(j===i)));
  $("audio").src = "audio/" + s.id + ".mp3";
  $("meta").textContent = \`\${s.id} · \${mmss(s.durationSec)} · \${s.subs.length} sous-titres · \${s.media.length} photos · hash \${s.sourceHash}\`;
  $("cues").innerHTML = s.media.map((c,k)=>
    \`<li class="cue" data-t="\${c.t}" data-k="\${k}"><span class="t">\${mmss(c.t)}</span>\`+
    \`<img class="thumb" src="photos/\${c.img.split("/").pop()}" loading="lazy">\`+
    \`<span class="txt"><span class="name">\${c.img.split("/").pop().replace(".webp","")}\${c.video ? " · vidéo" : ""}</span><br>\${c.cap}</span></li>\`).join("");
  $("subs").innerHTML = s.subs.map((x,k)=>
    \`<li data-t="\${x.t}" data-k="\${k}"><span class="t">\${mmss(x.t)}</span><span class="txt">\${x.text}</span></li>\`).join("");
  $("nphoto").textContent = s.media.length;
  $("nsub").textContent = s.subs.length;
  shownMedia = shownSub = null;
  paint(0);
}
for (const list of ["cues","subs"]) $(list).addEventListener("click", e => {
  const li = e.target.closest("li"); if (li) { $("audio").currentTime = Number(li.dataset.t) + .01; $("audio").play(); }
});

const last = (arr, t) => { let k = -1; for (let i=0;i<arr.length;i++) if (arr[i].t <= t) k = i; else break; return k; };
// timeupdate fires ~4x a second. Rebuilding the stage every time threw the
// <img> away and decoded it again, which read as a flicker on the stills and
// kept the animated maps replaying their first frames forever. Nothing is
// touched unless the cue — or the subtitle — actually changes.
let shownMedia = null, shownSub = null;
function paint(t){
  const s = m.sections[cur];
  const mi = last(s.media, t), si = last(s.subs, t);
  if (mi !== shownMedia) {
    shownMedia = mi;
    const c = mi < 0 ? null : s.media[mi];
    $("stage").innerHTML = !c
      ? '<div class="none">Pas de photo pour ce passage —<br>regardez autour de vous.</div>'
      : c.video
        // une vidéo se cale sur l'horloge de l'audio, comme dans le lecteur :
        // muette, en boucle, remise à zéro quand le cue revient
        ? \`<video src="photos/\${c.video.split("/").pop()}" poster="photos/\${c.img.split("/").pop()}" muted playsinline autoplay loop></video>\`
        : \`<img src="photos/\${c.img.split("/").pop()}">\`;
    $("cap").textContent = mi < 0 ? "" : s.media[mi].cap;
    document.querySelectorAll("#cues li").forEach((li,k)=>li.dataset.cur = k===mi ? 1 : 0);
  }
  if (si !== shownSub) {
    shownSub = si;
    $("sub").innerHTML = si < 0 ? "" : "<b>" + s.subs[si].text + "</b>";
    document.querySelectorAll("#subs li").forEach((li,k)=>{
      li.dataset.cur = k===si ? 1 : 0;
      if (k===si) li.scrollIntoView({block:"nearest"});
    });
  }
  syncClip(t);
}
// Une vidéo de cue tourne sur l'horloge de l'audio, pas sur la sienne : elle
// s'arrête avec la narration et suit un déplacement dans la barre. On ne
// recale que les écarts francs, sinon l'image saute à chaque timeupdate.
function syncClip(t){
  const v = $("stage").querySelector("video");
  const c = shownMedia < 0 ? null : m.sections[cur].media[shownMedia];
  if (!v || !c) return;
  if (v.duration) {
    const want = Math.max(0, t - c.t) % v.duration;
    if (Math.abs(v.currentTime - want) > .4) v.currentTime = want;
  }
  if ($("audio").paused) v.pause(); else v.play().catch(()=>{});
}
$("audio").addEventListener("timeupdate", () => paint($("audio").currentTime));
$("audio").addEventListener("seeked", () => paint($("audio").currentTime));
$("audio").addEventListener("play", () => syncClip($("audio").currentTime));
$("audio").addEventListener("pause", () => syncClip($("audio").currentTime));
$("audio").addEventListener("ended", () => { if (cur+1 < m.sections.length) { load(cur+1); $("audio").play(); } });
load(0);
</script></body></html>`;

createServer((req, res) => {
  const path = decodeURIComponent((req.url ?? "/").split("?")[0]!);
  if (path === "/") { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }); res.end(PAGE); return; }
  if (path === "/manifest.json") { sendFile(req, res, manifestFile); return; }
  const audio = /^\/audio\/([a-z0-9-]+)\.mp3$/.exec(path);
  if (audio) { sendFile(req, res, resolve(PATHS.audioDir, lang, `${audio[1]}.mp3`)); return; }
  const photo = /^\/photos\/([A-Za-z0-9_-]+)\.(webp|mp4)$/.exec(path);
  if (photo) { sendFile(req, res, resolve(PATHS.photosDir, `${photo[1]}.${photo[2]}`)); return; }
  res.writeHead(404).end("not found");
}).listen(port, () => {
  const manifest = JSON.parse(readFileSync(manifestFile, "utf8")) as { sections: unknown[]; totalDurationSec: number };
  log.info("review", `${manifest.sections.length} sections, ${Math.round(manifest.totalDurationSec / 60)} min — http://localhost:${port}`);
});
