/* NIGHTCAP 三部曲融合层 v2 —— 叠加在 MBTI 调酒吧 3D 酒柜之上的引导叙事。
   幕一：进门 → 「提取你的焦虑源」按钮 → loading → 焦虑图谱 + 指数 → 推荐基酒 → 点击后交给 3D 倒酒转场
   幕二：酒杯居左（3D showcase 相机左移），中列辅料说明，右列辅料仓库 + 冰柜；拖冰入杯 / 按住摇匀
   幕三：原有尾调页信息（配方行 / 诗 / 一首歌 / 明天的第一步）整页呈现 */

const FACTORS = [
  { label: "深夜消息", detail: "22:00–01:00 共 23 条", score: 82, w: 0.2 },
  { label: "未闭环任务", detail: "6 件卡点 / 悬置协作", score: 86, w: 0.22 },
  { label: "最长未回应", detail: "Ray 的方案已悬 26 小时", score: 74, w: 0.16 },
  { label: "周末侵入", detail: "休息日收到 41 条工作消息", score: 68, w: 0.16 },
  { label: "会议过载", detail: "14 场会议 · 日常的 2.1 倍", score: 60, w: 0.12 },
  { label: "@ 密度", detail: "本周被 @ 57 次", score: 58, w: 0.14 },
  { label: "被赞与支援", detail: "11 次点赞 · 6 次支援 · 缓冲 −6", score: -40, w: 0.15, neg: true },
];
const STRESS = Math.max(5, Math.min(96, Math.round(FACTORS.reduce((s, f) => s + f.score * f.w, 0))));
const PROOF = STRESS > 80 ? 5 : STRESS > 66 ? 4 : STRESS > 50 ? 3 : STRESS > 33 ? 2 : 1;

const SPIRITS = {
  vodka: { zh: "伏特加", en: "Vodka", proof: 1, abv: "40%", hue: "#d8d8d8", note: "近乎透明的纯净中性——把喧嚣过滤掉，只剩清醒的留白。" },
  gin: { zh: "金酒", en: "Gin", proof: 2, abv: "40%", hue: "#b8c8a8", note: "杜松子与草本层层展开，清冽而理性——适合仍在复盘的深夜。" },
  rum: { zh: "朗姆", en: "Rum", proof: 3, abv: "37.5%", hue: "#b4713a", note: "甘蔗糖蜜的温热甜香——让紧绷的肩线慢慢落下。" },
  tequila: { zh: "龙舌兰", en: "Tequila", proof: 4, abv: "40%", hue: "#c9b45a", note: "龙舌兰草的青草与胡椒——给敢于正面迎击这一天的人。" },
  whiskey: { zh: "威士忌", en: "Whiskey", proof: 5, abv: "43%", hue: "#c48a48", note: "谷物、橡木与焦糖的烟熏回甘——献给需要独处一会儿的你。" },
};
const SPIRIT_BY_PROOF = { 1: "vodka", 2: "gin", 3: "rum", 4: "tequila", 5: "whiskey" };

/* 他们的 16 杯 base 文案 → 我们的五系基酒 */
function spiritOf(drink) {
  const t = `${drink.base} ${drink.recipe.join(" ")}`;
  if (/威士忌|波本|黑麦|whiskey|bourbon|rye/i.test(t)) return "whiskey";
  if (/龙舌兰|梅斯卡|tequila|mezcal/i.test(t)) return "tequila";
  if (/朗姆|rum/i.test(t)) return "rum";
  if (/伏特加|vodka/i.test(t)) return "vodka";
  if (/金酒|gin/i.test(t)) return "gin";
  return drink.group === "NT" ? "whiskey" : drink.group === "SP" ? "rum" : "gin";
}

const BEHAVIOR = [
  { label: "回应节奏", v: 78 }, { label: "主动度", v: 62 },
  { label: "表达温度", v: 64 }, { label: "时间边界", v: 70 },
];
function predictPersona() {
  const act = (BEHAVIOR[0].v >= 50 ? 1 : 0) + (BEHAVIOR[1].v >= 50 ? 1 : 0) >= 1;
  const heat = (BEHAVIOR[2].v >= 50 ? 1 : 0) + (BEHAVIOR[3].v >= 50 ? 1 : 0) >= 1;
  return act && heat ? "captain" : act ? "lighthouse" : heat ? "greenhouse" : "deepsea";
}

const PERSONAS = {
  captain: { zh: "救火队长", en: "THE CAPTAIN", ice: { hue: "#e0742e", name: "柑橘琥珀冰" }, track: { t: "暖流 analog nova", s: "Lo-fi Bossa · 92 BPM" } },
  lighthouse: { zh: "灯塔调度", en: "THE LIGHTHOUSE", ice: { hue: "#6fa3c8", name: "海盐蓝冰" }, track: { t: "冷雾 cool blue", s: "Cool Jazz · 76 BPM" } },
  greenhouse: { zh: "温室回应", en: "THE GREENHOUSE", ice: { hue: "#d98ba0", name: "蜜糖玫瑰冰" }, track: { t: "暮色 warm room", s: "Ambient Piano · 68 BPM" } },
  deepsea: { zh: "深海反刍", en: "THE DEEP SEA", ice: { hue: "#7bb49a", name: "薄荷深绿冰" }, track: { t: "下沉 weightless", s: "Deep Ambient · 54 BPM" } },
};

const ADDONS = [
  { k: "chamomile", name: "洋甘菊", en: "Chamomile Quiet", pct: 38, hue: "#9fb6d9", garnish: "flower",
    icon: "🌼", img: null,
    desc: "柔和的草本与苹果香气，用来降低持续在线后的紧绷感，让味觉从高警觉慢慢回到夜晚。",
    reason: "你的消息回复很快、深夜仍保持活跃。配方先加入一份柔和草本，提醒大脑：此刻不必继续待命。",
    evidence: ["平均 6 分钟回复", "最晚活跃 23:40", "深夜消息 23 条"] },
  { k: "lime", name: "青柠", en: "Lime Closure", pct: 27, hue: "#c9d46b", garnish: "lime",
    icon: "🍋", img: null,
    desc: "清亮酸度负责切开黏滞感，象征把模糊任务写成下一步，让悬置的协作重新获得边界。",
    reason: "本周仍有 6 件未闭环事项。青柠提供清晰的收口感，把反复回放的任务从脑内移到可执行清单。",
    evidence: ["未闭环 6 件", "最长等待 26 小时", "协作发起 62%"] },
  { k: "sea-salt", name: "海盐", en: "Sea Salt Boundary", pct: 21, hue: "#8fd0c6", garnish: "cucumber",
    icon: "🧂", img: null,
    desc: "微量咸感会托起基酒的层次，也代表把“全部接住”改写成有边界的负责。",
    reason: "你习惯主动推动协作，也容易把团队节奏背在自己身上。海盐保留担当，但削弱过度负责的苦涩。",
    evidence: ["周末消息 41 条", "被 @ 57 次", "协作主动度 62%"] },
  { k: "rosemary", name: "迷迭香", en: "Rosemary Focus", pct: 14, hue: "#7bb49a", garnish: "mint",
    icon: "🌿", img: null,
    desc: "冷冽草木香提供结构感，让复杂信息停在前景，而不是继续成为混乱的后台噪声。",
    reason: "你在高信息密度中仍倾向快速回应。少量迷迭香保留清醒，但不再把每一条消息都当作即时警报。",
    evidence: ["会议 14 场", "本周被 @ 57 次", "表达温度 64%"] },
];

const EMO_ICES = [
  { k: "sleep", name: "洋甘菊安眠冰", hue: "#9fb6d9", from: "给 23 条深夜消息 · 最晚活跃 23:40" },
  { k: "release", name: "青柠释怀冰", hue: "#c9d46b", from: "给 6 件未闭环 · 下一步已写好" },
  { k: "soft", name: "海盐松弛冰", hue: "#8fd0c6", from: "给 41 条周末消息 · 收回休息边界" },
];
const EMO_REC = STRESS > 66 ? "sleep" : STRESS > 38 ? "release" : "soft";

function poemFor(spiritZh, P) {
  if (STRESS > 66) return `这一周，你在 <i>深夜消息</i> 与 <i>未闭环</i> 里辗转，<br>如今以 <b>${spiritZh}</b> 压阵、<b>${P.ice.name}</b> 镇场——<br>先抚慰，再沉底。剩下的，明天再说。`;
  if (STRESS > 38) return `节奏不快不慢的一周，你稳稳接住了它。<br>以 <b>${spiritZh}</b> 为底，<b>${P.ice.name}</b> 留一线清醒，<br>敬那个没有慌乱的自己。`;
  return `难得松弛的一周，被善意包围。<br>这杯 <b>${spiritZh}</b> 轻盈明快，<b>${P.ice.name}</b> 叮当作响，<br>像今晚不必设的闹钟。`;
}
function todoFor() {
  if (STRESS > 66) return "从 6 件未闭环里挑最小的一件，写下 15 分钟能做完的下一步。";
  if (STRESS > 38) return "给 Ray 的方案留一句明确的「下一步」，结束 26 小时的悬置。";
  return "没有 urgent。把明天的启动时间往后放 30 分钟。";
}

function mixColor(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (sh) => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
}

let sound = null;
const sfx = (n) => { try { sound && sound.play(n); } catch (e) {} };
const $id = (id) => document.getElementById(id);

/* ---------- 焦虑图谱（轻量力导向） ---------- */
function startGraph(cv) {
  const ctx = cv.getContext("2d");
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const W = cv.offsetWidth, H = cv.offsetHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  ctx.scale(dpr, dpr);
  const cx = W / 2, cy = H / 2;
  const nodes = FACTORS.map((f, i) => {
    const a = (i / FACTORS.length) * Math.PI * 2 - Math.PI / 2;
    const r = Math.min(W, H) * 0.36;
    return { f, a, r, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, tx: 0, ty: 0 };
  });
  let t = 0;
  (function loop() {
    if (!cv.isConnected) return;
    t += 0.016;
    ctx.clearRect(0, 0, W, H);
    nodes.forEach((n, i) => {
      const wob = Math.sin(t * 0.9 + i * 1.7) * 5;
      n.tx = cx + Math.cos(n.a) * (n.r + wob);
      n.ty = cy + Math.sin(n.a) * (n.r + wob * 0.6);
      n.x += (n.tx - n.x) * 0.08; n.y += (n.ty - n.y) * 0.08;
      ctx.strokeStyle = n.f.neg ? "rgba(126,168,143,0.4)" : `rgba(196,138,72,${0.18 + n.f.w * 1.4})`;
      ctx.lineWidth = 0.6 + n.f.w * 3;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(n.x, n.y); ctx.stroke();
      const rad = 3 + Math.abs(n.f.score) / 22;
      ctx.fillStyle = n.f.neg ? "#7ea88f" : "#d8a35c";
      ctx.beginPath(); ctx.arc(n.x, n.y, rad, 0, 7); ctx.fill();
      ctx.fillStyle = "rgba(240,226,196,0.62)";
      ctx.font = "9px 'Noto Sans SC', sans-serif";
      ctx.textAlign = n.x > cx ? "left" : "right";
      ctx.fillText(n.f.label, n.x + (n.x > cx ? rad + 4 : -rad - 4), n.y + 3);
    });
    ctx.fillStyle = "#f0e2c4";
    ctx.beginPath(); ctx.arc(cx, cy, 5.5, 0, 7); ctx.fill();
    ctx.fillStyle = "rgba(240,226,196,0.8)";
    ctx.font = "10px 'Noto Sans SC', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("你", cx, cy - 10);
    requestAnimationFrame(loop);
  })();
}

/* ---------- 幕一：提取焦虑源 → 图谱 → 推荐基酒 ---------- */
function openAct1({ onPour, onSkip }) {
  const el = $id("nc1");
  el.className = "nc-overlay";
  const spiritKey = SPIRIT_BY_PROOF[PROOF];
  const sp = SPIRITS[spiritKey];
  el.innerHTML = `
    <div class="nc-panel nc-act1 a1-float">
      <p class="nc-guide"><i>第一步</i>根据你的过去焦虑情况，为你推荐一支基酒</p>
      <div class="nc-kicker"><span>ACT I</span><span>base spirit · 基酒</span></div>
      <div class="nc-a1-body">
        <button class="nc-primary nc-big" id="nc1-go" type="button">提取你的焦虑源</button>
        <p class="nc-hint nc-c">钉钉协作数据 · 本周 7 项因子 · 只在本地蒸馏</p>
      </div>
    </div>`;
  el.hidden = false;

  $id("nc1-go").onclick = () => {
    sfx("lift");
    el.querySelector(".nc-act1").classList.remove("a1-float");
    const body = el.querySelector(".nc-a1-body");
    body.innerHTML = `
      <div class="nc-loader"><i></i><i></i><i></i></div>
      <p class="nc-scan" id="nc1-scan">拉取本周 IM 记录…</p>`;
    const msgs = ["拉取本周 IM 记录…", "加权 7 项焦虑因子…", "蒸馏烈度与基酒…"];
    let mi = 0;
    const mt = setInterval(() => { mi = Math.min(mi + 1, 2); const s = $id("nc1-scan"); if (s) s.textContent = msgs[mi]; }, 620);
    setTimeout(() => {
      clearInterval(mt);
      body.innerHTML = `
        <canvas class="nc-graph" id="nc1-graph"></canvas>
        <div class="nc-proof">
          <span>焦虑指数 <b id="nc1-num">0</b></span>
          <span class="nc-meter">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= PROOF ? "on" : ""}"></i>`).join("")}</span>
          <span>建议烈度 Lv.${PROOF}</span>
        </div>
        <div class="nc-spirit" id="nc1-spirit">
          <i class="nc-orb" style="--h:${sp.hue}"></i>
          <div>
            <b>${sp.zh}</b><s>${sp.en} · ${sp.abv}</s>
            <p>${sp.note}</p>
          </div>
        </div>
        <div class="nc-btns">
          <button class="nc-primary" id="nc1-pour" type="button">用这支基酒倒杯</button>
          <button class="nc-ghost" id="nc1-skip" type="button">自己挑一瓶</button>
        </div>`;
      startGraph($id("nc1-graph"));
      const num = $id("nc1-num");
      const t0 = performance.now();
      (function count(now) {
        const p = Math.min(1, (now - t0) / 900);
        num.textContent = Math.round(STRESS * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(count);
      })(t0);
      setTimeout(() => $id("nc1-spirit")?.classList.add("on"), 700);
      $id("nc1-pour").onclick = () => { el.hidden = true; onPour(spiritKey); };
      $id("nc1-skip").onclick = () => { el.hidden = true; onSkip(); };
    }, 1900);
  };
}

/* ---------- 幕二：酒杯居左 + 辅料说明 + 辅料仓库/冰柜 ---------- */
function openAct2(drink, { onIce, onShake, onDone, onSkip }) {
  const el = $id("nc2");
  el.className = "nc-overlay nc-stage";
  const personaKey = predictPersona();
  const P = PERSONAS[personaKey];
  const st = { addon: null, ices: [], shaken: 0, dragging: null };

  el.innerHTML = `
    <div class="nc-guide-top" id="nc2-guide"><i>第二步</i>现在来为你挑选你的专属配料和冰块</div>
    <div class="nc-stage-grid">
      <div class="nc-zone" id="nc2-zone">
        <div class="nc-zpill" id="nc2-zpill">
          <span class="nc-strack"><i id="nc2-sbar"></i></span>
          <span class="nc-zhint" id="nc2-zhint">酒保正在按你的职场性格搭配辅料与冰…</span>
        </div>
        <div class="nc-btns nc-zbtns" id="nc2-zbtns" hidden>
          <button class="nc-primary" id="nc2-pour" type="button">辅料已调和 · 进入尾调</button>
          <button class="nc-ghost" id="nc2-skip" type="button">跳过</button>
        </div>
      </div>
      <aside class="nc-detail" id="nc2-detail">
        <span class="nc-cap2">辅料的说明</span>
        <span class="nc-dimg" id="nc2-dimgwrap" hidden><b class="nc-dico" id="nc2-dico"></b><img id="nc2-dimg" alt="" hidden></span>
        <b class="dn">—</b><s class="de"></s>
        <p class="dd">点右侧辅料仓库里的名片，这里展开它的说明与推荐理由。</p>
        <p class="dr"></p>
        <ul class="dv"></ul>
      </aside>
      <div class="nc-right">
        <div class="nc-wh">
          <span class="nc-cap2">辅料仓库</span>
          <div class="nc-loadbox" id="nc2-load">
            <span class="nc-strack"><i id="nc2-lbar"></i></span>
            <p class="nc-scanline" id="nc2-scan">正在根据你的职场性格专属搭配辅料…</p>
          </div>
          <div class="nc-fbars" id="nc2-fbars" hidden></div>
          <div class="nc-shelf" id="nc2-cards" hidden></div>
        </div>
        <div class="nc-tray" id="nc2-tray" hidden>
          <span class="nc-cap2">冰柜 · 拖入左侧杯中</span>
        </div>
      </div>
    </div>`;
  el.hidden = false;

  const zone = $id("nc2-zone");
  const zhint = $id("nc2-zhint");

  /* 进场先 loading（演示用，故意放慢）：进度条 + 文案推进，完成后辅料与冰逐步上架 */
  const LOAD_MSGS = [
    "拉取本周 IM 风格…",
    "解析职场人格底色…",
    "正在根据你的职场性格专属搭配辅料…",
    "把情绪冻成冰 · 冰柜备货…",
  ];
  const loadT0 = performance.now(), LOAD_DUR = 5200;
  (function loadStep(now) {
    if (el.hidden) return;
    const p = Math.min(1, (now - loadT0) / LOAD_DUR);
    const lbar = $id("nc2-lbar");
    if (lbar) lbar.style.width = `${p * 100}%`;
    const s = $id("nc2-scan");
    if (s) s.textContent = LOAD_MSGS[p < 0.3 ? 0 : p < 0.55 ? 1 : p < 0.8 ? 2 : 3];
    if (p < 1) requestAnimationFrame(loadStep);
    else revealStock();
  })(loadT0);

  function revealStock() {
    const load = $id("nc2-load");
    if (load) load.remove();
    const seq = (st.seq = (st.seq || 0) + 1);
    const later = (fn, ms) => setTimeout(() => { if (!el.hidden && st.seq === seq) fn(); }, ms);
    const pop = (n, delay) => n.animate?.(
      [{ opacity: 0, transform: "translateY(14px) scale(.7)" }, { opacity: 1, transform: "none" }],
      { duration: 460, delay, easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" });

    const bars = $id("nc2-fbars");
    bars.hidden = false;
    bars.innerHTML = ADDONS.slice(0, 3).map((a) => `
      <div class="nc-fi"><span>${a.name}</span><span class="nc-fit"><i style="--h:${a.hue};width:0"></i></span><b>${a.pct}%</b></div>`).join("");
    pop(bars, 0);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      bars.querySelectorAll(".nc-fit i").forEach((i, n) => { i.style.width = `${ADDONS[n].pct * 2}%`; });
    }));

    /* 货架：先立空木架，推荐辅料再逐格上架 */
    const cards = $id("nc2-cards");
    cards.hidden = false;
    cards.innerHTML = "";
    pop(cards, 120);
    ADDONS.forEach((a, i) => later(() => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "nc-shelf-item";
      btn.dataset.k = a.k;
      btn.style.setProperty("--h", a.hue);
      btn.innerHTML = `
        <span class="nc-niche">
          <s class="nc-tag">${a.pct}%</s>
          ${a.img
            ? `<img class="nc-simg" src="${a.img}" alt="${a.name}" loading="lazy">`
            : `<b class="nc-ico">${a.icon}</b>`}
        </span>
        <i class="nc-sname">${a.name}</i>`;
      btn.onclick = () => selectAddon(a.k);
      cards.appendChild(btn);
      pop(btn, 0);
      if (i === 0) selectAddon(a.k);
      sfx("clink");
    }, 500 + i * 520));

    /* 冰柜：等辅料上齐再开柜，冰块逐块落进去 */
    const trayStart = 500 + ADDONS.length * 520 + 260;
    const cubes = trayCubes();
    later(() => {
      const tray = $id("nc2-tray");
      tray.hidden = false;
      pop(tray, 0);
      sfx("lift");
    }, trayStart);
    cubes.forEach((c, i) => later(() => { addCube(c); sfx("ice"); }, trayStart + 340 + i * 380));
    later(() => {
      zhint.textContent = "从右侧冰柜拖一块冰进杯里";
      const g = $id("nc2-guide");
      if (g) { g.classList.add("bye"); setTimeout(() => g.remove(), 700); }
    }, trayStart + 340 + cubes.length * 380);
  }

  function trayCubes() {
    return [
      { k: "persona", name: P.ice.name, hue: P.ice.hue, pred: true },
      ...EMO_ICES.map((x) => ({ ...x, pred: x.k === EMO_REC })),
    ];
  }

  function addCube(c) {
    const tray = $id("nc2-tray");
    const b = document.createElement("button");
    b.type = "button";
    b.className = `nc-cube${c.pred ? " pred" : ""}`;
    b.style.setProperty("--h", c.hue);
    b.title = c.name;
    b.innerHTML = `<i></i><s>${c.name}</s>`;
    tray.appendChild(b);
    b.animate?.(
      [{ opacity: 0, transform: "translateY(-16px) scale(.6)" }, { opacity: 1, transform: "none" }],
      { duration: 420, easing: "cubic-bezier(.16,1,.3,1)" });
    b.addEventListener("pointerdown", (ev) => startDrag(ev, c, b));
  }

  function selectAddon(k) {
    st.addon = k;
    const a = ADDONS.find((x) => x.k === k);
    const d = $id("nc2-detail");
    d.style.setProperty("--h", a.hue);
    const wrap = $id("nc2-dimgwrap");
    wrap.hidden = false;
    const im = $id("nc2-dimg"), ico = $id("nc2-dico");
    if (a.img) { im.hidden = false; im.src = a.img; ico.hidden = true; }
    else { ico.hidden = false; ico.textContent = a.icon || "🍸"; im.hidden = true; }
    d.querySelector(".dn").textContent = a.name;
    d.querySelector(".de").textContent = a.en;
    d.querySelector(".dd").textContent = a.desc;
    d.querySelector(".dr").textContent = a.reason;
    d.querySelector(".dv").innerHTML = a.evidence.map((x) => `<li>${x}</li>`).join("");
    el.querySelectorAll(".nc-shelf-item").forEach((c) => c.classList.toggle("on", c.dataset.k === k));
    sfx("clink");
  }

  /* 冰柜 */
  function buildTray() {
    trayCubes().forEach((c) => addCube(c));
  }

  function startDrag(ev, cube, src) {
    if (st.ices.length >= 2 || st.ices.includes(cube.k)) return;
    ev.preventDefault();
    st.dragging = cube;
    const ghost = document.createElement("div");
    ghost.className = "nc-ghost";
    ghost.style.setProperty("--h", cube.hue);
    document.body.appendChild(ghost);
    const move = (e) => {
      ghost.style.left = `${e.clientX}px`; ghost.style.top = `${e.clientY}px`;
      const z = zone.getBoundingClientRect();
      zone.classList.toggle("over", e.clientX > z.left && e.clientX < z.right && e.clientY > z.top && e.clientY < z.bottom);
    };
    move(ev);
    const up = (e) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      ghost.remove();
      zone.classList.remove("over");
      st.dragging = null;
      const z = zone.getBoundingClientRect();
      if (e.clientX > z.left && e.clientX < z.right && e.clientY > z.top && e.clientY < z.bottom) addIce(cube, src);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up); /* 手势被系统中断也要清理 dragging，否则会永久卡住摇匀 */
  }

  function addIce(cube, src) {
    st.ices.push(cube.k);
    src.classList.add("used");
    onIce && onIce(cube.hue);
    sfx("ice");
    zhint.textContent = st.ices.length >= 2 ? "冰已够 · 在杯上按住上下摇匀" : "再拖一块，或在杯上按住上下摇匀";
    if (st.ices.length) zone.classList.add("shakeable");
  }

  /* 摇匀手势（在左侧酒杯区按住上下动）；跟踪挂 window，不依赖 pointer capture，
     避免捕获被浏览器中断（pointercancel）后进度卡死 */
  let lastY = null;
  function shakeMove(e) {
    if (lastY == null || st.shaken >= 1) return;
    const dy = Math.abs(e.clientY - lastY);
    lastY = e.clientY;
    st.shaken = Math.min(1, st.shaken + dy / 520);
    onShake && onShake();
    $id("nc2-sbar").style.width = `${st.shaken * 100}%`;
    zhint.textContent = `摇匀中 · ${Math.round(st.shaken * 100)}%`;
    if (st.shaken >= 1) {
      zone.classList.add("done");
      zhint.textContent = "辅料与冰已调和";
      $id("nc2-zbtns").hidden = false;
      sfx("clink");
      shakeEnd();
    }
  }
  function shakeEnd() {
    lastY = null;
    zone.classList.remove("grab");
    window.removeEventListener("pointermove", shakeMove);
    window.removeEventListener("pointerup", shakeEnd);
    window.removeEventListener("pointercancel", shakeEnd);
  }
  zone.addEventListener("pointerdown", (e) => {
    if (e.target.closest("#nc2-zbtns")) return; /* 按钮上的点击不启动摇匀 */
    if (st.dragging || st.shaken >= 1) return;
    if (!st.ices.length) { zone.classList.add("nope"); setTimeout(() => zone.classList.remove("nope"), 400); return; }
    lastY = e.clientY;
    zone.classList.add("grab");
    window.addEventListener("pointermove", shakeMove);
    window.addEventListener("pointerup", shakeEnd);
    window.addEventListener("pointercancel", shakeEnd);
  });

  $id("nc2-pour").onclick = () => { el.hidden = true; onDone({ addon: st.addon, ices: st.ices, persona: personaKey }); };
  $id("nc2-skip").onclick = () => { el.hidden = true; onSkip(); };
}

/* ---------- 生成式曲目：按这杯的基酒与名字实时作曲（lo-fi 黑胶） ---------- */
let vinylTrack = null;
let vinylPlaying = false;

function hashSeed(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const TRACK_KEYS = { whiskey: 220, tequila: 196, rum: 174.61, gin: 261.63, vodka: 164.81 };

function createVinylTrack(drink, spiritKey) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const master = ctx.createGain();
  master.gain.value = 0.0001;
  master.connect(ctx.destination);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 2400; lp.connect(master);
  const delay = ctx.createDelay(1);
  delay.delayTime.value = 0.31;
  const fb = ctx.createGain(); fb.gain.value = 0.22;
  delay.connect(fb); fb.connect(delay); delay.connect(lp);
  const rnd = mulberry(hashSeed(drink.name + spiritKey));
  const root = TRACK_KEYS[spiritKey] || 220;
  const prog = [0, 8, 5, 3];
  const penta = [0, 3, 5, 7, 10, 12];
  const BAR = 2.6;
  const semi = (f, s) => f * Math.pow(2, s / 12);
  let bar = 0, timer = null, crackle = null, nextT = 0;

  function pad(t, f) {
    [0, 4, 7, 12].forEach((iv, i) => {
      const o = ctx.createOscillator();
      o.type = "triangle"; o.frequency.value = semi(f, iv); o.detune.value = (i - 1.5) * 6;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.5);
      g.gain.exponentialRampToValueAtTime(0.0001, t + BAR * 0.98);
      o.connect(g); g.connect(lp); o.start(t); o.stop(t + BAR);
    });
  }
  function bass(t, f) {
    const o = ctx.createOscillator();
    o.type = "sine"; o.frequency.value = f / 2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    o.connect(g); g.connect(lp); o.start(t); o.stop(t + 1.2);
  }
  function pluck(t, f) {
    const o = ctx.createOscillator();
    o.type = "sine"; o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.055, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    o.connect(g); g.connect(lp); g.connect(delay); o.start(t); o.stop(t + 0.8);
  }
  function scheduleBar(t) {
    const f = semi(root, prog[bar % prog.length]);
    pad(t, f); bass(t, f);
    for (let b = 0; b < 4; b++) {
      if (rnd() < 0.62) pluck(t + b * (BAR / 4) + rnd() * 0.12, semi(root, penta[(rnd() * penta.length) | 0] + 12));
    }
    bar++;
  }
  function startCrackle() {
    const n = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() < 0.0016 ? (Math.random() * 2 - 1) * 0.5 : (Math.random() * 2 - 1) * 0.06);
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1800;
    const g = ctx.createGain(); g.gain.value = 0.05;
    src.connect(hp); hp.connect(g); g.connect(master); src.start();
    crackle = src;
  }
  function tick() { while (nextT < ctx.currentTime + 1.0) { scheduleBar(nextT); nextT += BAR; } }

  return {
    start() {
      ctx.resume();
      master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.4);
      startCrackle();
      nextT = ctx.currentTime + 0.15;
      tick();
      timer = setInterval(tick, 400);
    },
    stop() {
      clearInterval(timer); timer = null;
      master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.25);
      try { crackle && crackle.stop(ctx.currentTime + 0.8); } catch (e) {}
      setTimeout(() => { if (!timer) ctx.close().catch(() => {}); }, 1200);
    },
  };
}

function stopVinyl() {
  if (vinylTrack) { vinylTrack.stop(); vinylTrack = null; }
  vinylPlaying = false;
}

/* ---------- 幕三：原有尾调页 ---------- */
function openReveal({ drink, spiritKey, addonKey, personaKey }) {
  const el = $id("nc3");
  el.className = "nc-overlay nc-page";
  const sp = SPIRITS[spiritKey] || SPIRITS[spiritOf(drink)];
  const addon = ADDONS.find((a) => a.k === addonKey) || ADDONS[0];
  const P = PERSONAS[personaKey || predictPersona()];
  el.innerHTML = `
    <div class="nc-page-grid">
      <div class="nc-page-left">
        <button class="nc-vinyl" id="nc3-vinyl" type="button" aria-label="播放这杯的生成式曲目">
          <span class="vc-disc">
            <span class="vc-label"><b>NC</b><s>33⅓ RPM</s></span>
            <i class="vc-spindle"></i>
          </span>
          <span class="vc-arm"></span>
          <span class="vc-hint" id="nc3-vhint">点击播放 · 生成式曲目</span>
        </button>
      </div>
      <div class="nc-page-card">
        <div class="nc-kicker"><span>ACT III</span><span>tonight's special · 尾调</span></div>
        <h2>${drink.name}</h2>
        <p class="nc-pgen">${drink.type} · ${P.en} · ${sp.en} base</p>
        <div class="nc-rows">
          <div><span>Base 基酒</span><b>${sp.zh} · 烈度 Lv.${sp.proof}</b></div>
          <div><span>Addon 职场辅料</span><b>${addon.name} · 配方 ${addon.pct}%</b></div>
          <div><span>Ice 冰块</span><b>${P.ice.name}</b></div>
          <div><span>Persona 人格</span><b>${P.zh}</b></div>
        </div>
        <p class="nc-poem">${poemFor(sp.zh, P)}</p>
        <div class="nc-track"><b>♪ ${P.track.t}</b><s>${sp.zh} 调 · lo-fi 生成 · 点左侧黑胶播放</s></div>
        <div class="nc-todo"><span>明天的第一步</span><p>${todoFor()}</p></div>
        <div class="nc-btns">
          <button class="nc-primary" id="nc3-shot" type="button">保存截图</button>
          <button class="nc-ghost" id="nc3-again" type="button">再调一杯</button>
          <button class="nc-ghost" id="nc3-close" type="button">看这杯</button>
        </div>
      </div>
    </div>`;
  el.hidden = false;
  const vbtn = $id("nc3-vinyl");
  vbtn.onclick = () => {
    if (vinylPlaying) {
      stopVinyl();
      vbtn.classList.remove("playing");
      $id("nc3-vhint").textContent = "点击播放 · 生成式曲目";
    } else {
      vinylTrack = createVinylTrack(drink, spiritKey);
      vinylTrack.start();
      vinylPlaying = true;
      vbtn.classList.add("playing");
      $id("nc3-vhint").textContent = `播放中 · ${P.track.t}`;
      sfx("lift");
    }
  };
  $id("nc3-shot").onclick = () => window.dispatchEvent(new CustomEvent("nc-shot"));
  $id("nc3-again").onclick = () => { stopVinyl(); window.dispatchEvent(new CustomEvent("nc-again")); };
  $id("nc3-close").onclick = () => {
    stopVinyl();
    el.hidden = true;
    window.dispatchEvent(new CustomEvent("nc-closed-reveal"));
  };
}

function closeAll() {
  stopVinyl();
  ["nc1", "nc2", "nc3"].forEach((id) => { const el = $id(id); if (el) el.hidden = true; });
}

export const NC = {
  STRESS, PROOF, SPIRITS, ADDONS, spiritOf, mixColor,
  openAct1, openAct2, openReveal, closeAll,
  setSound(s) {
    sound = s;
    try {
      s.onMute((m) => {
        if (!m || !vinylPlaying) return;
        stopVinyl();
        const v = $id("nc3-vinyl");
        if (v) v.classList.remove("playing");
        const h = $id("nc3-vhint");
        if (h) h.textContent = "点击播放 · 生成式曲目";
      });
    } catch (e) {}
  },
};
