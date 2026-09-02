import { COCKTAILS, QUESTIONS, getCocktail, typeFromAnswers, TASTE_LABELS } from "./cocktails.js";
import { createBar } from "./scene.js";
import { createLiquid } from "./liquid.js";
import { createAudio } from "./audio.js";
import { NC } from "./nightcap.js";

const $ = (id) => document.getElementById(id);

const ui = {
  door: $("door"),
  enter: $("enter"),
  quizBtn: $("quiz-btn"),
  surprise: $("surprise"),
  rail: $("rail"),
  sheet: $("sheet"),
  quiz: $("quiz"),
  hover: $("hover-tag"),
  toast: $("toast"),
  inspect: $("inspect"),
  shot: $("shot"),
  again: $("again"),
  caption: $("caption"),
  capType: $("cap-type"),
  capName: $("cap-name"),
  overlay: $("liquid-overlay"),
  mute: $("mute"),
};

const bar = createBar($("stage"));
const liquid = createLiquid($("liquid-overlay"));
const sound = createAudio();
NC.setSound(sound);

let answers = [];
let quizOn = false;
let lastHover = null;

/* NIGHTCAP 引导三部曲：0 未开始 / 1 已定基酒待选瓶 / 2 辅料冰已调待倒酒 */
let guided = true;
let ncStage = 0;
const ncPick = { spirit: null, addon: null, ices: [], persona: null };

function startAct1() {
  NC.openAct1({
    onPour: (spirit) => {
      ncPick.spirit = spirit;
      ncStage = 1;
      const target = COCKTAILS.find((c) => NC.spiritOf(c) === spirit) || COCKTAILS[0];
      bar.spotTypes(null);
      bar.selectType(target.type, { pour: true });
      flashToast(`基酒锁定 · ${NC.SPIRITS[spirit].zh} · ${target.name}`);
    },
    onSkip: () => { guided = false; ncStage = 0; bar.spotTypes(null); },
  });
}

function finishAct2(drink, res) {
  ncStage = 3;
  Object.assign(ncPick, res);
  const addon = NC.ADDONS.find((a) => a.k === res.addon);
  if (addon) {
    drink.garnish = addon.garnish;
    bar.redress(drink);
    bar.setLiquidColor(NC.mixColor(drink.color, addon.hue, 0.3));
  }
  if (res.ices && res.ices.length) { drink.ice = true; bar.redress(drink); }
  bar.frameGlass("center");
  NC.openReveal({
    drink,
    spiritKey: ncPick.spirit || NC.spiritOf(drink),
    addonKey: res.addon,
    personaKey: res.persona,
  });
}

function renderRail(active) {
  if (!ui.rail) return; /* 底部 MBTI 轨道已移除 */
  ui.rail.innerHTML = COCKTAILS.map((c) => {
    const on = c.type === active ? " is-on" : "";
    const house = c.house ? " is-house" : "";
    return `<button class="${on}${house}" data-type="${c.type}" aria-pressed="${c.type === active}">
      <i class="swatch" style="background:${c.color}"></i>
      <span class="code">${c.type}</span>
      <span class="tiny">${c.name}</span>
    </button>`;
  }).join("");
}

function meter(n) {
  return `<span class="meter" aria-hidden="true">${[1, 2, 3, 4, 5]
    .map((i) => `<i class="${i <= n ? "on" : ""}"></i>`)
    .join("")}</span>`;
}

function fillSheet(drink) {
  const tastes = TASTE_LABELS.map(
    ([key, label]) =>
      `<div class="taste-row"><span>${label}</span>${meter(drink.taste[key])}</div>`
  ).join("");
  ui.sheet.innerHTML = `
    <button class="close-sheet" id="close-sheet" type="button">收起</button>
    <div class="kicker">
      <span>${drink.type}</span>
      <span>${drink.house ? "店里主打" : GROUPS_NAME(drink.group)}</span>
    </div>
    <h2>${drink.name}</h2>
    <p class="base">${drink.base}</p>
    <p class="who">${drink.who}。</p>
    <p class="why">${drink.why}</p>
    <hr class="rule" />
    <h3>味道</h3>
    <div class="tastes">${tastes}</div>
    <h3>杯里有什么</h3>
    <ul class="recipe">${drink.recipe.map((r) => `<li>${r}</li>`).join("")}</ul>
    <p class="when">什么时候点：${drink.when}</p>
    <p class="extra">${drink.ice ? "加冰" : "不加冰"} · 装饰：${garnishName(drink.garnish)}</p>
  `;
  $("close-sheet").onclick = () => closeSheet();
}

function GROUPS_NAME(id) {
  return { NT: "分析家", NF: "外交家", SJ: "守护者", SP: "探险家" }[id] || id;
}

function garnishName(g) {
  return (
    {
      orange: "橙片",
      lime: "青柠",
      chili: "辣椒",
      mint: "薄荷",
      cucumber: "黄瓜片",
      berry: "莓果",
      cinnamon: "肉桂",
      flower: "桂花",
      peach: "桃片",
    }[g] || "无"
  );
}

function openSheet(type, { pour = true, direct = false } = {}) {
  const drink = getCocktail(type);
  if (!drink) return;
  if (guided && (ncStage === 1 || ncStage === 2)) return; // 倒酒转场 / 辅料页进行中，不接单
  hideInspect();
  fillSheet(drink);
  ui.sheet.classList.add("is-open");
  renderRail(type);
  liquid.setTheme(drink.glow || drink.color, { fizz: drink.taste.fizz });
  if (pour) {
    liquid.burst();
    flashToast(drink.name);
    sound.play("lift");
    setTimeout(() => sound.play("pour"), 220);
  }
  bar.selectType(type, { pour });
}

function hideInspect() {
  ui.inspect.classList.remove("is-on");
  ui.inspect.hidden = true;
  ui.caption.classList.remove("is-on");
  ui.caption.hidden = true;
  if (ui.overlay) ui.overlay.style.opacity = "1";
}

function showInspect() {
  const drink = getCocktail(bar.selected);
  ui.inspect.hidden = false;
  ui.inspect.classList.add("is-on");
  ui.caption.hidden = false;
  ui.caption.classList.add("is-on");
  if (drink) {
    ui.capType.textContent = drink.type;
    ui.capName.textContent = drink.name;
  }
  if (ui.overlay) ui.overlay.style.opacity = "0";
}

function closeSheet() {
  ui.sheet.classList.remove("is-open");
  hideInspect();
  renderRail(null);
  bar.clearSelect();
}

function flashToast(text) {
  ui.toast.textContent = text;
  ui.toast.classList.add("is-on");
  clearTimeout(flashToast._t);
  flashToast._t = setTimeout(() => ui.toast.classList.remove("is-on"), 1400);
}

function clink() {
  sound.play("clink");
}

function renderQuiz() {
  const step = answers.length;
  if (step >= QUESTIONS.length) {
    const type = typeFromAnswers(answers);
    ui.quiz.classList.remove("is-open");
    quizOn = false;
    ui.quizBtn.classList.remove("is-on");
    openSheet(type, { pour: true });
    return;
  }
  const q = QUESTIONS[step];
  ui.quiz.innerHTML = `
    <div class="progress">第 ${step + 1} / ${QUESTIONS.length} 问</div>
    <h2>${q.prompt}</h2>
    <div class="choices">
      <button class="choice" data-key="${q.a.key}">
        <strong>${q.a.label}</strong>
        <span>${q.a.line}</span>
      </button>
      <button class="choice" data-key="${q.b.key}">
        <strong>${q.b.label}</strong>
        <span>${q.b.line}</span>
      </button>
    </div>
    <button class="skip" type="button" id="quiz-close">先自己挑</button>
  `;
  ui.quiz.querySelectorAll(".choice").forEach((btn) => {
    btn.onclick = () => {
      answers.push({ axis: q.axis, key: btn.dataset.key });
      renderQuiz();
    };
  });
  $("quiz-close").onclick = stopQuiz;
}

function startQuiz() {
  answers = [];
  quizOn = true;
  closeSheet();
  ui.quiz.classList.add("is-open");
  ui.quizBtn.classList.add("is-on");
  renderQuiz();
}

function stopQuiz() {
  quizOn = false;
  ui.quiz.classList.remove("is-open");
  ui.quizBtn.classList.remove("is-on");
}

ui.enter.onclick = () => {
  ui.door.classList.add("is-gone");
  sound.play("door");
  sound.startBgm();
  if (guided) setTimeout(startAct1, 1000);
};

$("brand").onclick = () => {
  stopQuiz();
  closeSheet();
};

ui.quizBtn.onclick = () => {
  if (quizOn) stopQuiz();
  else startQuiz();
};

ui.surprise.onclick = () => {
  stopQuiz();
  const pick = COCKTAILS[Math.floor(Math.random() * COCKTAILS.length)];
  openSheet(pick.type);
};

ui.rail?.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-type]");
  if (!btn) return;
  stopQuiz();
  if (bar.selected === btn.dataset.type && ui.sheet.classList.contains("is-open")) {
    closeSheet();
    return;
  }
  openSheet(btn.dataset.type);
});

const stage = $("stage");
let drag = null;

bar.on("ready", () => {
  stage.style.cursor = "grab";
  sound.stopPour();
  const drink = getCocktail(bar.selected);
  if (drink?.ice) sound.play("ice");
  sound.play("clink");
  if (guided && ncStage === 1 && drink) {
    ncStage = 2;
    hideInspect();
    bar.frameGlass("left");
    NC.openAct2(drink, {
      onIce: (hue) => bar.dropIce(hue),
      onShake: () => bar.wobble(),
      onDone: (res) => finishAct2(drink, res),
      onSkip: () => finishAct2(drink, { addon: null, ices: [], persona: null }),
    });
    return;
  }
  showInspect();
});

window.addEventListener("nc-shot", () => ui.shot.onclick());
window.addEventListener("nc-again", () => ui.again.onclick());
window.addEventListener("nc-closed-reveal", () => showInspect());

ui.shot.onclick = () => {
  const drink = getCocktail(bar.selected);
  if (!drink) return;
  sound.play("shutter");
  const url = bar.snapshot({
    title: `${drink.type}  ${drink.name}`,
    subtitle: `${drink.base} · 深夜酒馆 NIGHTCAP`,
  });
  const a = document.createElement("a");
  a.href = url;
  a.download = `nightcap-${drink.type}-${drink.name}.png`;
  a.click();
  flashToast("截图已保存");
};

ui.again.onclick = () => {
  stopQuiz();
  closeSheet();
  NC.closeAll();
  ncPick.spirit = ncPick.addon = ncPick.persona = null;
  ncPick.ices = [];
  bar.spotTypes(null);
  if (guided) { ncStage = 0; setTimeout(startAct1, 700); } else ncStage = 0;
};

function onPointer(ev) {
  if (drag && bar.isShowcase()) {
    bar.setInspectDrag(ev.clientX - drag.x, ev.clientY - drag.y);
    drag.x = ev.clientX;
    drag.y = ev.clientY;
    drag.moved = true;
    return;
  }
  const rect = stage.getBoundingClientRect();
  const nx = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  const ny = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);
  bar.setPointer(nx, ny);
  const type = bar.pick();
  bar.hoverType(type);
  if (type !== lastHover) {
    lastHover = type;
    if (!type) {
      ui.hover.classList.remove("is-on");
      stage.style.cursor = "default";
      return;
    }
    const drink = getCocktail(type);
    const pos = bar.projectBottle(type);
    ui.hover.textContent = `${drink.type} · ${drink.name}`;
    if (pos) {
      ui.hover.style.left = `${pos.x}px`;
      ui.hover.style.top = `${pos.y}px`;
    }
    ui.hover.classList.add("is-on");
    stage.style.cursor = "pointer";
  } else if (type) {
    const pos = bar.projectBottle(type);
    if (pos) {
      ui.hover.style.left = `${pos.x}px`;
      ui.hover.style.top = `${pos.y}px`;
    }
  }
}

stage.addEventListener("pointerdown", (ev) => {
  if (!bar.isShowcase()) return;
  drag = { x: ev.clientX, y: ev.clientY, moved: false };
  try { stage.setPointerCapture(ev.pointerId); } catch (e) {}
  stage.style.cursor = "grabbing";
});
stage.addEventListener("pointermove", onPointer);
stage.addEventListener("pointerup", (ev) => {
  if (drag) {
    const moved = drag.moved;
    drag = null;
    stage.style.cursor = bar.isShowcase() ? "grab" : "default";
    if (moved) return;
  }
  if (bar.isShowcase()) return;
  const type = bar.pick();
  if (!type) return;
  stopQuiz();
  openSheet(type);
});
stage.addEventListener("pointerleave", () => {
  drag = null;
  bar.setPointer(0, 0, false);
  bar.hoverType(null);
  lastHover = null;
  ui.hover.classList.remove("is-on");
  stage.style.cursor = bar.isShowcase() ? "grab" : "default";
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!$("nc3").hidden) { NC.closeAll(); return; }
    stopQuiz();
    closeSheet();
  }
});

bar.on("select", () => {
  hideInspect();
  stage.style.cursor = "default";
});

function renderMute() {
  if (!ui.mute) return;
  ui.mute.textContent = sound.isMuted() ? "声音关" : "声音开";
  ui.mute.setAttribute("aria-pressed", sound.isMuted() ? "true" : "false");
}

if (ui.mute) {
  ui.mute.onclick = () => {
    sound.setMuted(!sound.isMuted());
    renderMute();
  };
  renderMute();
}

renderRail(null);
bar.start();
