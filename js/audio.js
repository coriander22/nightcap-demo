const STORAGE = "mbti-bar-muted";

export function createAudio() {
  const bgm = new Audio("./audio/bgm.mp3");
  bgm.loop = true;
  bgm.preload = "auto";
  bgm.volume = 0.28;

  let ctx = null;
  let muted = localStorage.getItem(STORAGE) === "1";
  let pourStop = null;
  const listeners = [];

  function context() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function notify() {
    listeners.forEach((fn) => fn(muted));
  }

  function setMuted(next) {
    muted = next;
    localStorage.setItem(STORAGE, muted ? "1" : "0");
    bgm.muted = muted;
    if (muted && pourStop) pourStop();
    notify();
  }

  function env(audio, t, peak, attack, release) {
    const g = audio.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
    return g;
  }

  function tone(audio, type, freq, t, peak, attack, release) {
    const o = audio.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    const g = env(audio, t, peak, attack, release);
    o.connect(g);
    g.connect(audio.destination);
    o.start(t);
    o.stop(t + attack + release + 0.02);
    return o;
  }

  function noiseBuffer(audio, seconds) {
    const n = Math.floor(audio.sampleRate * seconds);
    const buf = audio.createBuffer(1, n, audio.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  function play(name) {
    if (muted) return;
    const audio = context();
    const t = audio.currentTime;

    if (name === "door") {
      tone(audio, "sine", 180, t, 0.05, 0.04, 0.45);
      tone(audio, "triangle", 420, t + 0.08, 0.03, 0.02, 0.25);
    }

    if (name === "lift") {
      tone(audio, "sine", 140, t, 0.045, 0.01, 0.16);
      tone(audio, "triangle", 520, t + 0.04, 0.02, 0.01, 0.12);
    }

    if (name === "pour") {
      if (pourStop) pourStop();
      const src = audio.createBufferSource();
      src.buffer = noiseBuffer(audio, 2.4);
      src.loop = true;
      const filter = audio.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1400, t);
      filter.frequency.linearRampToValueAtTime(900, t + 1.8);
      filter.Q.value = 0.7;
      const g = audio.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.045, t + 0.12);
      g.gain.setValueAtTime(0.04, t + 1.4);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.3);
      src.connect(filter);
      filter.connect(g);
      g.connect(audio.destination);
      src.start(t);
      src.stop(t + 2.4);
      pourStop = () => {
        try {
          src.stop();
        } catch {
          /* already stopped */
        }
        pourStop = null;
      };
    }

    if (name === "ice") {
      [0, 0.06, 0.13].forEach((off, i) => {
        tone(audio, "triangle", 1800 - i * 220, t + off, 0.028, 0.005, 0.07);
        tone(audio, "sine", 920 - i * 80, t + off, 0.016, 0.004, 0.05);
      });
    }

    if (name === "clink") {
      const o = audio.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(880, t);
      o.frequency.exponentialRampToValueAtTime(1960, t + 0.05);
      o.frequency.exponentialRampToValueAtTime(620, t + 0.32);
      const g = env(audio, t, 0.07, 0.015, 0.36);
      o.connect(g);
      g.connect(audio.destination);
      o.start(t);
      o.stop(t + 0.4);
    }

    if (name === "shutter") {
      const src = audio.createBufferSource();
      src.buffer = noiseBuffer(audio, 0.12);
      const g = env(audio, t, 0.05, 0.004, 0.08);
      src.connect(g);
      g.connect(audio.destination);
      src.start(t);
      src.stop(t + 0.12);
    }
  }

  function startBgm() {
    bgm.muted = muted;
    const p = bgm.play();
    if (p && p.catch) p.catch(() => {});
  }

  function stopPour() {
    if (pourStop) pourStop();
  }

  return {
    play,
    startBgm,
    stopPour,
    setMuted,
    isMuted() {
      return muted;
    },
    onMute(fn) {
      listeners.push(fn);
      fn(muted);
    },
  };
}
