import { hexToRgb } from "./cocktails.js";

export function createLiquid(host) {
  const dust = [];
  const drops = [];
  const bubbles = [];
  let theme = hexToRgb("#e6d4a4");
  let energy = 0.2;
  let pour = 0;
  let fizz = 0;

  const sketch = (p) => {
    p.setup = () => {
      const c = p.createCanvas(host.clientWidth, host.clientHeight);
      c.parent(host);
      c.elt.style.pointerEvents = "none";
      p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
      p.clear();
      for (let i = 0; i < 40; i++) dust.push(makeDust(p));
    };

    p.windowResized = () => {
      p.resizeCanvas(host.clientWidth, host.clientHeight);
    };

    p.draw = () => {
      p.clear();
      pour = Math.max(0, pour - 0.014);
      energy += ((pour > 0 ? 0.9 : 0.2) - energy) * 0.05;
      drawVignette(p);
      drawDust(p);
      if (pour > 0.02) spawnDrops(p);
      if (fizz > 0) spawnBubbles(p);
      drawDrops(p);
      drawBubbles(p);
    };
  };

  function makeDust(p) {
    return {
      x: Math.random() * p.width,
      y: Math.random() * p.height,
      r: 0.5 + Math.random() * 1.4,
      s: 0.12 + Math.random() * 0.35,
      a: 16 + Math.random() * 36,
      ph: Math.random() * Math.PI * 2,
    };
  }

  function drawVignette(p) {
    const g = p.drawingContext.createRadialGradient(
      p.width * 0.5,
      p.height * 0.48,
      p.width * 0.15,
      p.width * 0.5,
      p.height * 0.5,
      p.width * 0.82
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(12,8,5,0.38)");
    p.drawingContext.fillStyle = g;
    p.noStroke();
    p.rect(0, 0, p.width, p.height);
  }

  function drawDust(p) {
    p.noStroke();
    dust.forEach((d) => {
      d.y -= d.s;
      d.x += Math.sin(p.frameCount * 0.01 + d.ph) * 0.1;
      if (d.y < -8) {
        d.y = p.height + 6;
        d.x = Math.random() * p.width;
      }
      p.fill(theme.r + 30, theme.g + 22, theme.b + 8, d.a * energy);
      p.circle(d.x, d.y, d.r);
    });
  }

  function spawnDrops(p) {
    if (Math.random() > 0.5) return;
    drops.push({
      x: p.width * (0.42 + Math.random() * 0.16),
      y: p.height * 0.28,
      vy: 2.4 + Math.random() * 3.4,
      vx: (Math.random() - 0.5) * 1.4,
      life: 1,
      r: 2 + Math.random() * 3,
    });
  }

  function spawnBubbles(p) {
    if (Math.random() > 0.35 * (fizz / 5)) return;
    bubbles.push({
      x: p.width * (0.44 + Math.random() * 0.12),
      y: p.height * 0.58,
      r: 1.2 + Math.random() * 2.4,
      life: 1,
      vy: 0.6 + Math.random() * 1.1,
    });
  }

  function drawDrops(p) {
    p.noStroke();
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.x += d.vx;
      d.y += d.vy;
      d.life -= 0.02;
      p.fill(theme.r, theme.g, theme.b, 230 * d.life);
      p.circle(d.x, d.y, d.r);
      if (d.life <= 0 || d.y > p.height * 0.62) drops.splice(i, 1);
    }
  }

  function drawBubbles(p) {
    p.noFill();
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      b.y -= b.vy;
      b.life -= 0.01;
      p.stroke(255, 230, 200, 140 * b.life);
      p.strokeWeight(1);
      p.circle(b.x, b.y, b.r);
      if (b.life <= 0) bubbles.splice(i, 1);
    }
  }

  const instance = new window.p5(sketch);

  return {
    setTheme(hex, opts = {}) {
      theme = hexToRgb(hex);
      fizz = opts.fizz || 0;
    },
    burst() {
      pour = 1;
    },
    resize() {
      if (instance && instance.resizeCanvas) {
        instance.resizeCanvas(host.clientWidth, host.clientHeight);
      }
    },
  };
}
