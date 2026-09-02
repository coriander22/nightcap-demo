import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { COCKTAILS } from "./cocktails.js";

const DEG = Math.PI / 180;

export function createBar(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x140e0a);
  scene.fog = new THREE.Fog(0x140e0a, 8, 16);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 1.05;

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 40);
  const camHome = new THREE.Vector3(0, 1.58, 6.35);
  camera.position.copy(camHome);
  camera.lookAt(0, 1.22, 0);

  const clock = new THREE.Clock();
  const pointer = new THREE.Vector2(0, 0);
  let pointerLive = false;
  const raycaster = new THREE.Raycaster();

  const root = new THREE.Group();
  scene.add(root);

  addLights(scene);
  addRoom(root);
  const bottles = addBottles(root);
  const drinkware = addDrinkware(root);
  addLamp(root);

  const stream = makeStream();
  scene.add(stream.mesh);
  scene.add(stream.splash);

  const heroRim = new THREE.PointLight(0xffe6c4, 0, 2.6, 1.5);
  heroRim.position.set(-0.2, 1.52, 1.9);
  scene.add(heroRim);

  let selected = null;
  let hover = null;
  let spot = null;
  let iceDropped = 0;
  let wobbleAmp = 0;
  let pourT = 1;
  let liquidT = 0;
  let showcase = false;
  let inspectYaw = 0;
  let inspectPitch = 0;
  let readySent = false;
  let liquidColor = new THREE.Color("#d9c7a1");
  let targetLiquid = new THREE.Color("#d9c7a1");
  const camTarget = camHome.clone();
  const lookTarget = new THREE.Vector3(0, 1.22, 0);
  const lookNow = lookTarget.clone();

  const listeners = { hover: [], select: [], ready: [] };

  function emit(kind, payload) {
    listeners[kind].forEach((fn) => fn(payload));
  }

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    const portrait = camera.aspect < 0.85;
    camera.fov = portrait ? 50 : 40;
    camHome.set(0, portrait ? 1.72 : 1.58, portrait ? 7.4 : 6.35);
    if (!selected) camTarget.copy(camHome);
    camera.updateProjectionMatrix();
  }

  function setPointer(nx, ny, live = true) {
    pointer.x = nx;
    pointer.y = ny;
    pointerLive = live;
  }

  function pick() {
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(
      bottles.map((b) => b.hit),
      false
    );
    return hits[0] ? hits[0].object.userData.type : null;
  }

  function hoverType(type) {
    hover = type;
  }

  function spotTypes(types) {
    spot = types && types.length ? types : null;
  }

  function frameGlass(side) {
    const portrait = camera.aspect < 0.85;
    if (side === "left") {
      camTarget.set(1.34, 1.14, 2.06);
      lookTarget.set(0.62, 1.0, 1.46);
    } else {
      camTarget.set(portrait ? 0.42 : 0.82, 1.16, portrait ? 2.35 : 1.98);
      lookTarget.set(0.12, 1.0, 1.48);
    }
  }

  function dropIce(hue) {
    const cubes = drinkware.ice.children;
    let idx = cubes.findIndex((c) => !c.visible);
    if (idx < 0) idx = iceDropped % cubes.length;
    const cube = cubes[idx];
    if (hue) {
      if (!cube.userData.mat0) cube.userData.mat0 = cube.material;
      cube.material = cube.userData.mat0.clone();
      cube.material.color.set(hue).lerp(new THREE.Color(0xffffff), 0.45);
    }
    cube.userData.drop = true;
    cube.position.y = drinkware.iceHomes[idx].y + 0.24;
    cube.visible = true;
    iceDropped++;
    drinkware.ice.visible = true;
    return iceDropped;
  }

  function resetIce() {
    iceDropped = 0;
    drinkware.ice.children.forEach((c) => {
      c.userData.drop = false;
      if (c.userData.mat0) c.material = c.userData.mat0;
    });
  }

  function wobble() {
    wobbleAmp = 1;
  }

  function redress(drink) {
    drinkware.dress(drink);
  }

  function setLiquidColor(hex) {
    targetLiquid.set(hex);
  }

  function selectType(type, { pour = true } = {}) {
    selected = type;
    const drink = COCKTAILS.find((c) => c.type === type);
    if (!drink) return;
    targetLiquid.set(drink.color);
    targetLiquid.offsetHSL(0, 0.2, -0.03);
    bottles.forEach((b) => {
      b.selected = b.type === type;
    });
    drinkware.dress(drink);
    showcase = false;
    readySent = false;
    inspectYaw = 0;
    inspectPitch = 0;
    drinkware.rig.rotation.set(0, 0, 0);
    heroRim.intensity = 0;
    camTarget.copy(camHome);
    lookTarget.set(0, 1.22, 0);
    if (pour) {
      pourT = 0;
      liquidT = 0;
    } else {
      liquidT = 1;
      liquidColor.copy(targetLiquid);
      enterShowcase();
    }
    emit("select", type);
  }

  function enterShowcase() {
    showcase = true;
    heroRim.intensity = 11;
    const portrait = camera.aspect < 0.85;
    camTarget.set(portrait ? 0.42 : 0.82, 1.16, portrait ? 2.35 : 1.98);
    lookTarget.set(0.12, 1.0, 1.48);
    if (!readySent) {
      readySent = true;
      emit("ready", selected);
    }
  }

  function resetView() {
    showcase = false;
    readySent = false;
    inspectYaw = 0;
    inspectPitch = 0;
    selected = null;
    bottles.forEach((b) => {
      b.selected = false;
    });
    drinkware.rig.rotation.set(0, 0, 0);
    heroRim.intensity = 0;
    liquidT = Math.min(liquidT, 0.12);
    drinkware.liquid.visible = false;
    drinkware.surface.visible = false;
    drinkware.foam.visible = false;
    drinkware.ice.visible = false;
    drinkware.garnish.visible = false;
    resetIce();
    wobbleAmp = 0;
    camTarget.copy(camHome);
    lookTarget.set(0, 1.22, 0);
  }

  function clearSelect() {
    resetView();
  }

  function setInspectDrag(dx, dy) {
    if (!showcase) return;
    inspectYaw += dx * 0.01;
    inspectPitch = THREE.MathUtils.clamp(inspectPitch + dy * 0.007, -0.5, 0.4);
  }

  function snapshot({ title = "", subtitle = "" } = {}) {
    const src = renderer.domElement;
    const w = src.width;
    const h = src.height;
    const out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    const g = out.getContext("2d");
    g.drawImage(src, 0, 0);
    const barH = Math.round(Math.max(72, h * 0.11));
    g.fillStyle = "rgba(18, 12, 8, 0.78)";
    g.fillRect(0, h - barH, w, barH);
    g.fillStyle = "#f0e2c4";
    g.font = `600 ${Math.round(barH * 0.34)}px "Noto Serif SC", serif`;
    g.fillText(title, Math.round(w * 0.045), h - barH * 0.48);
    g.fillStyle = "#c4a070";
    g.font = `${Math.round(barH * 0.2)}px "Noto Sans SC", sans-serif`;
    g.fillText(subtitle || "MBTI 调酒吧", Math.round(w * 0.045), h - barH * 0.2);
    return out.toDataURL("image/png");
  }

  function projectBottle(type) {
    const b = bottles.find((x) => x.type === type);
    if (!b) return null;
    const v = new THREE.Vector3();
    b.group.getWorldPosition(v);
    v.y += 0.62;
    v.project(camera);
    return {
      x: (v.x * 0.5 + 0.5) * canvas.clientWidth,
      y: (-v.y * 0.5 + 0.5) * canvas.clientHeight,
    };
  }

  function tick() {
    const dt = Math.min(clock.getDelta(), 0.05);

    const follow = 1 - Math.exp(-3.2 * dt);
    camera.position.lerp(camTarget, follow);
    if (pointerLive && !selected) {
      camera.position.x += pointer.x * 0.08;
      camera.position.y += pointer.y * 0.04;
    }
    lookNow.lerp(lookTarget, follow);
    camera.lookAt(lookNow.x, lookNow.y, lookNow.z);

    bottles.forEach((b) => {
      const spotted = !selected && !!spot && spot.includes(b.type);
      const hot = !selected && b.type === hover;
      const wantScale = 0.92 * (hot ? 1.07 : spotted ? 1.05 : 1);
      const s = b.group.scale.x + (wantScale - b.group.scale.x) * 0.18;
      b.group.scale.setScalar(s);
      if (b.label?.material?.emissive) {
        b.label.material.emissive.setHex(hot ? 0x3a2810 : spotted ? 0x2a1c0c : 0x000000);
      }
      if (b.selected) {
        const lift = THREE.MathUtils.smoothstep(pourT, 0, 0.12);
        const fly = THREE.MathUtils.smoothstep(pourT, 0.12, 0.34);
        const park = THREE.MathUtils.smoothstep(pourT, 0.8, 1);
        const lifted = b.home.clone().add(new THREE.Vector3(0, 0.2 * lift, 0.1 * lift));
        const air = new THREE.Vector3().lerpVectors(lifted, b.pourPos, fly);
        b.group.position.lerpVectors(air, b.home, park);
        const tilt =
          lift * 0.18 +
          THREE.MathUtils.smoothstep(pourT, 0.22, 0.36) *
            (1 - THREE.MathUtils.smoothstep(pourT, 0.78, 0.9));
        b.group.rotation.z += (-48 * DEG * tilt - b.group.rotation.z) * 0.2;
        b.liquid.scale.y += ((tilt > 0.2 ? 0.72 : 1) - b.liquid.scale.y) * 0.08;
      } else {
        b.group.position.lerp(b.home, 0.1);
        b.group.rotation.z *= 0.82;
        b.liquid.scale.y += (1 - b.liquid.scale.y) * 0.1;
      }
    });

    if (selected && pourT < 1) {
      const rate = Number(window.__pourRate) > 0 ? Number(window.__pourRate) : 0.7;
      pourT = Math.min(1, pourT + dt * rate);
      updateStream(stream, bottles, selected, pourT, targetLiquid);
      if (pourT > 0.3) liquidT = Math.min(1, liquidT + dt * (1.1 * rate / 0.7));
    } else {
      stream.mesh.visible = false;
      if (stream.splash) stream.splash.visible = false;
    }
    if (selected && liquidT >= 0.95 && pourT >= 0.72 && !showcase) enterShowcase();

    if (showcase) {
      drinkware.rig.rotation.y = inspectYaw;
      drinkware.rig.rotation.x = inspectPitch;
    }
    if (wobbleAmp > 0.01) {
      drinkware.rig.rotation.z = Math.sin(clock.elapsedTime * 34) * 0.09 * wobbleAmp;
      wobbleAmp *= 0.92;
    } else {
      drinkware.rig.rotation.z *= 0.8;
    }

    liquidColor.lerp(targetLiquid, 0.12);
    const fill = THREE.MathUtils.smoothstep(liquidT, 0, 1);
    drinkware.liquid.scale.set(1, Math.max(0.08, fill), 1);
    drinkware.liquid.position.y = drinkware.liquidY + fill * drinkware.liquidRise;
    drinkware.liquid.material.color.copy(liquidColor);
    drinkware.liquid.visible = fill > 0.04;
    const surfY =
      drinkware.liquidY + fill * drinkware.liquidRise + drinkware.liquidHalf * Math.max(0.08, fill);
    drinkware.surface.position.y = surfY;
    drinkware.surface.visible = fill > 0.12;
    drinkware.surface.material.color.copy(liquidColor).offsetHSL(0, 0, 0.08);
    drinkware.foam.visible = fill > 0.55 && drinkware.wantFoam;
    drinkware.foam.position.y = surfY + 0.018;
    const foamIn = THREE.MathUtils.smoothstep(fill, 0.55, 0.85);
    drinkware.foam.scale.setScalar(0.4 + foamIn * 0.6);
    drinkware.ice.visible = (fill > 0.28 && drinkware.wantIce) || iceDropped > 0;
    if (drinkware.ice.visible) {
      const land = THREE.MathUtils.smoothstep(fill, 0.28, 0.62);
      drinkware.ice.children.forEach((cube, i) => {
        const home = drinkware.iceHomes[i];
        if (cube.userData.drop) cube.position.y += (home.y - cube.position.y) * 0.14;
        else cube.position.y = home.y + (1 - land) * 0.16;
      });
    }
    const gIn = THREE.MathUtils.smoothstep(fill, 0.45, 0.75);
    drinkware.garnish.visible = fill > 0.42;
    drinkware.garnish.position.y = drinkware.garnishY;
    drinkware.garnish.scale.setScalar(gIn < 1 ? gIn * 1.12 : 1);

    renderer.render(scene, camera);
  }

  function start() {
    resize();
    renderer.setAnimationLoop(tick);
  }

  window.addEventListener("resize", resize);

  return {
    start,
    resize,
    setPointer,
    pick,
    hoverType,
    spotTypes,
    frameGlass,
    dropIce,
    wobble,
    redress,
    setLiquidColor,
    selectType,
    clearSelect,
    resetView,
    setInspectDrag,
    snapshot,
    projectBottle,
    isShowcase() {
      return showcase;
    },
    on(kind, fn) {
      listeners[kind].push(fn);
    },
    get selected() {
      return selected;
    },
  };
}

function addLights(scene) {
  scene.add(new THREE.AmbientLight(0x2a1c12, 0.28));

  const key = new THREE.SpotLight(0xffc48a, 16, 14, 0.48, 0.55, 1.6);
  key.position.set(-1.4, 3.8, 3.6);
  key.target.position.set(0, 1.2, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key, key.target);

  [-1.45, 0, 1.45].forEach((x) => {
    const lamp = new THREE.PointLight(0xffb46b, 7.5, 3.4, 1.7);
    lamp.position.set(x, 2.42, -0.42);
    scene.add(lamp);
  });

  const barGlow = new THREE.PointLight(0xffb060, 5, 5, 1.8);
  barGlow.position.set(0, 2.05, -0.2);
  scene.add(barGlow);

  const fill = new THREE.DirectionalLight(0xffd8b0, 0.32);
  fill.position.set(-2.4, 3.0, 4.2);
  scene.add(fill);
}

function makeLabel(drink) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 320;
  const g = c.getContext("2d");
  g.fillStyle = drink.house ? "#e6d4a4" : "#d8c9a8";
  g.fillRect(0, 0, 256, 320);
  g.fillStyle = drink.color;
  g.fillRect(16, 16, 224, 14);
  g.fillRect(16, 290, 224, 14);
  g.fillStyle = "#2a1810";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = "700 30px 'Noto Sans SC', sans-serif";
  g.fillText(drink.type, 128, 80);
  g.font = "700 34px 'Noto Serif SC', serif";
  const name = drink.name;
  if (name.length > 4) {
    g.fillText(name.slice(0, 4), 128, 150);
    g.fillText(name.slice(4), 128, 192);
  } else {
    g.fillText(name, 128, 168);
  }
  g.fillStyle = "#6a4a30";
  g.font = "18px 'Noto Sans SC', sans-serif";
  g.fillText(drink.base.split("+")[0].trim(), 128, 250);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeWoodTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const g = c.getContext("2d");
  g.fillStyle = "#3c2618";
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i++) {
    const x = i * 7.4 + Math.sin(i * 1.7) * 4;
    g.strokeStyle = `rgba(18,10,6,${0.08 + (i % 5) * 0.03})`;
    g.lineWidth = 1 + (i % 3);
    g.beginPath();
    g.moveTo(x, 0);
    g.bezierCurveTo(x + 8, 160, x - 10, 320, x + 4, 512);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.2, 2.2);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function addRoom(root) {
  const woodMap = makeWoodTexture();
  const wood = new THREE.MeshStandardMaterial({
    color: 0x7a5640,
    map: woodMap,
    roughness: 0.78,
    metalness: 0.04,
  });
  const darker = new THREE.MeshStandardMaterial({
    color: 0x120c08,
    roughness: 0.92,
    metalness: 0.02,
  });
  const brass = new THREE.MeshStandardMaterial({
    color: 0xa88448,
    roughness: 0.38,
    metalness: 0.82,
  });
  const lacquer = new THREE.MeshStandardMaterial({
    color: 0x2c1210,
    roughness: 0.42,
    metalness: 0.08,
  });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 14), darker);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  root.add(floor);

  const back = new THREE.Mesh(new THREE.BoxGeometry(9.4, 4.4, 0.18), wood);
  back.position.set(0, 2.05, -1.35);
  back.receiveShadow = true;
  root.add(back);

  const panel = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.4, 0.08), lacquer);
  panel.position.set(0, 1.7, -1.24);
  root.add(panel);

  for (const y of [1.05, 1.95]) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.07, 0.58), wood);
    shelf.position.set(0, y, -0.92);
    shelf.castShadow = true;
    shelf.receiveShadow = true;
    root.add(shelf);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.025, 0.035), brass);
    lip.position.set(0, y + 0.04, -0.64);
    root.add(lip);
  }

  const counter = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.14, 1.6), wood);
  counter.position.set(0, 0.72, 1.35);
  counter.castShadow = true;
  counter.receiveShadow = true;
  root.add(counter);

  const apron = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.7, 0.12), lacquer);
  apron.position.set(0, 0.35, 2.04);
  root.add(apron);

  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 5.1, 16), brass);
  rail.rotation.z = Math.PI / 2;
  rail.position.set(0, 0.58, 2.1);
  root.add(rail);

  const left = new THREE.Mesh(new THREE.BoxGeometry(0.18, 4.4, 4.2), wood);
  left.position.set(-4.6, 2.05, 0.4);
  root.add(left);
  const right = left.clone();
  right.position.x = 4.6;
  root.add(right);
}

function addBottles(root) {
  const items = [];
  COCKTAILS.forEach((drink, i) => {
    const col = i % 8;
    const row = i < 8 ? 1 : 0;
    const x = -2.03 + col * 0.58;
    const z = -0.92;
    const baseY = row ? 2.0 : 1.1;
    const bottle = makeBottle(drink);
    bottle.home = new THREE.Vector3(x, baseY, z);
    bottle.pourPos = new THREE.Vector3(-0.38, 1.34, 1.5);
    bottle.restPos = new THREE.Vector3(-0.42, 0.8, 1.52);
    bottle.group.position.copy(bottle.home);
    root.add(bottle.group);
    items.push({ ...bottle, baseY, type: drink.type });
  });
  return items;
}

function bottleKind(drink) {
  const b = drink.base;
  if (b.includes("香槟") || b.includes("普罗塞克")) return "champagne";
  if (b.includes("龙舌兰") || b.includes("梅斯卡尔")) return "tequila";
  if (b.includes("金酒") || b.includes("伏特加")) return "gin";
  if (b.includes("玫瑰") || b.includes("牛奶")) return "wine";
  if (b.includes("朗姆") && drink.glass === "highball") return "soda";
  return "whiskey";
}

function bottleProfile(kind) {
  if (kind === "gin") {
    return {
      pts: [[0, 0], [0.075, 0], [0.085, 0.02], [0.08, 0.5], [0.055, 0.56], [0.032, 0.62], [0.03, 0.82], [0.036, 0.84]],
      liquidR: 0.062,
      liquidH: 0.42,
      liquidY: 0.24,
      labelY: 0.28,
      labelW: 0.14,
      labelH: 0.2,
      mouthY: 0.84,
      cap: "black",
    };
  }
  if (kind === "champagne") {
    return {
      pts: [[0, 0], [0.085, 0], [0.09, 0.02], [0.088, 0.38], [0.05, 0.48], [0.028, 0.58], [0.026, 0.88], [0.032, 0.9]],
      liquidR: 0.068,
      liquidH: 0.34,
      liquidY: 0.2,
      labelY: 0.22,
      labelW: 0.14,
      labelH: 0.18,
      mouthY: 0.9,
      cap: "gold",
    };
  }
  if (kind === "tequila") {
    return {
      pts: [[0, 0], [0.11, 0], [0.12, 0.02], [0.11, 0.36], [0.07, 0.42], [0.04, 0.48], [0.038, 0.66], [0.044, 0.68]],
      liquidR: 0.09,
      liquidH: 0.3,
      liquidY: 0.18,
      labelY: 0.2,
      labelW: 0.16,
      labelH: 0.18,
      mouthY: 0.68,
      cap: "cork",
    };
  }
  if (kind === "wine") {
    return {
      pts: [[0, 0], [0.09, 0], [0.095, 0.02], [0.092, 0.42], [0.06, 0.5], [0.03, 0.56], [0.028, 0.8], [0.034, 0.82]],
      liquidR: 0.072,
      liquidH: 0.36,
      liquidY: 0.22,
      labelY: 0.24,
      labelW: 0.15,
      labelH: 0.2,
      mouthY: 0.82,
      cap: "cork",
    };
  }
  if (kind === "soda") {
    return {
      pts: [[0, 0], [0.1, 0], [0.105, 0.02], [0.1, 0.46], [0.07, 0.52], [0.045, 0.56], [0.042, 0.7], [0.048, 0.72]],
      liquidR: 0.08,
      liquidH: 0.38,
      liquidY: 0.22,
      labelY: 0.24,
      labelW: 0.16,
      labelH: 0.2,
      mouthY: 0.72,
      cap: "red",
    };
  }
  return {
    pts: [[0, 0], [0.105, 0], [0.115, 0.02], [0.112, 0.44], [0.08, 0.5], [0.042, 0.54], [0.04, 0.7], [0.046, 0.72]],
    liquidR: 0.088,
    liquidH: 0.36,
    liquidY: 0.22,
    labelY: 0.24,
    labelW: 0.16,
    labelH: 0.2,
    mouthY: 0.72,
    cap: "cork",
  };
}

function makeBottle(drink) {
  const group = new THREE.Group();
  group.scale.setScalar(0.92);
  const spec = bottleProfile(bottleKind(drink));
  const color = new THREE.Color(drink.color);

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0xf3ece4,
    roughness: 0.05,
    metalness: 0,
    transmission: 1,
    thickness: 0.14,
    ior: 1.5,
    attenuationColor: 0xc9a070,
    attenuationDistance: 0.32,
  });
  const body = new THREE.Mesh(
    new THREE.LatheGeometry(spec.pts.map(([x, y]) => new THREE.Vector2(x, y)), 28),
    bodyMat
  );
  body.castShadow = true;
  group.add(body);

  const liquid = new THREE.Mesh(
    new THREE.CylinderGeometry(spec.liquidR, spec.liquidR * 0.96, spec.liquidH, 20),
    new THREE.MeshBasicMaterial({ color })
  );
  liquid.position.y = spec.liquidY;
  group.add(liquid);

  const capColor = { cork: 0x8a5a32, gold: 0xd4b36a, black: 0x1a1410, red: 0x8a1c18 }[spec.cap];
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.038, 0.04, 0.07, 12),
    new THREE.MeshStandardMaterial({
      color: capColor,
      roughness: spec.cap === "gold" ? 0.28 : 0.55,
      metalness: spec.cap === "gold" ? 0.8 : 0.05,
    })
  );
  cap.position.y = spec.mouthY + 0.03;
  group.add(cap);

  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(
      spec.liquidR + 0.02,
      spec.liquidR + 0.018,
      spec.labelH,
      28,
      1,
      true,
      -0.72,
      1.44
    ),
    new THREE.MeshStandardMaterial({
      map: makeLabel(drink),
      roughness: 0.62,
      metalness: 0,
      side: THREE.DoubleSide,
    })
  );
  label.position.y = spec.labelY;
  group.add(label);

  const mouth = new THREE.Object3D();
  mouth.position.set(0, spec.mouthY, 0);
  group.add(mouth);

  const hit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.18, 0.95, 8),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hit.position.y = 0.4;
  hit.userData.type = drink.type;
  group.add(hit);

  return { group, liquid, hit, mouth, label, type: drink.type, selected: false };
}

function addDrinkware(root) {
  const rig = new THREE.Group();
  rig.position.set(0.12, 0.8, 1.48);
  root.add(rig);

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xf7f2ea,
    roughness: 0.06,
    metalness: 0,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  });

  const glasses = {
    rocks: makeGlassMesh(
      [
        [0, 0],
        [0.16, 0],
        [0.17, 0.02],
        [0.155, 0.28],
        [0.16, 0.3],
      ],
      glassMat
    ),
    highball: makeGlassMesh(
      [
        [0, 0],
        [0.11, 0],
        [0.12, 0.02],
        [0.11, 0.42],
        [0.115, 0.44],
      ],
      glassMat
    ),
    coupe: makeGlassMesh(
      [
        [0, 0],
        [0.12, 0],
        [0.12, 0.016],
        [0.025, 0.028],
        [0.02, 0.26],
        [0.05, 0.3],
        [0.2, 0.36],
        [0.21, 0.44],
      ],
      glassMat
    ),
    nick: makeGlassMesh(
      [
        [0, 0],
        [0.1, 0],
        [0.1, 0.014],
        [0.02, 0.024],
        [0.018, 0.22],
        [0.04, 0.25],
        [0.13, 0.32],
        [0.12, 0.4],
      ],
      glassMat
    ),
    flute: makeGlassMesh(
      [
        [0, 0],
        [0.09, 0],
        [0.09, 0.014],
        [0.016, 0.022],
        [0.016, 0.22],
        [0.04, 0.3],
        [0.05, 0.5],
        [0.055, 0.52],
      ],
      glassMat
    ),
  };
  Object.values(glasses).forEach((g) => {
    g.visible = false;
    rig.add(g);
  });
  glasses.coupe.visible = true;

  const liquid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.15, 0.18, 28),
    new THREE.MeshBasicMaterial({ color: 0xc48a32 })
  );
  liquid.position.set(0, 0.18, 0);
  liquid.visible = false;
  rig.add(liquid);

  const surface = new THREE.Mesh(
    new THREE.CircleGeometry(0.16, 32),
    new THREE.MeshBasicMaterial({ color: 0xe0b050 })
  );
  surface.rotation.x = -Math.PI / 2;
  surface.visible = false;
  rig.add(surface);

  const foam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.14, 0.028, 20),
    new THREE.MeshStandardMaterial({ color: 0xf3ece0, roughness: 0.92, metalness: 0 })
  );
  foam.visible = false;
  rig.add(foam);

  const ice = new THREE.Group();
  const iceMat = new THREE.MeshStandardMaterial({
    color: 0xe8f2f6,
    roughness: 0.22,
    metalness: 0.05,
    transparent: true,
    opacity: 0.82,
  });
  const iceHomes = [];
  [
    [-0.05, 0.13, 0.03],
    [0.045, 0.15, -0.03],
    [0.0, 0.2, 0.045],
    [0.02, 0.11, 0.05],
  ].forEach((p, i) => {
    const cube = new THREE.Mesh(new RoundedBoxGeometry(0.09, 0.075, 0.085, 3, 0.016), iceMat);
    cube.position.set(p[0], p[1], p[2]);
    cube.rotation.set(0.4 * i, 0.6 * i, 0.2);
    ice.add(cube);
    iceHomes.push(new THREE.Vector3(p[0], p[1], p[2]));
  });
  ice.visible = false;
  ice.renderOrder = 2;
  rig.add(ice);

  const garnish = new THREE.Group();
  garnish.visible = false;
  garnish.renderOrder = 3;
  rig.add(garnish);

  const napkin = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.01, 0.42),
    new THREE.MeshStandardMaterial({ color: 0xcbb896, roughness: 0.88 })
  );
  napkin.position.set(0, 0, 0);
  rig.add(napkin);

  const layout = {
    rocks: { liquidY: 0.14, rise: 0.01, garnishY: 0.3, ice: true, r: 0.15, h: 0.24 },
    highball: { liquidY: 0.2, rise: 0.04, garnishY: 0.44, ice: true, r: 0.1, h: 0.32 },
    coupe: { liquidY: 0.365, rise: 0.008, garnishY: 0.46, ice: false, r: 0.188, h: 0.09 },
    nick: { liquidY: 0.33, rise: 0.008, garnishY: 0.42, ice: false, r: 0.12, h: 0.09 },
    flute: { liquidY: 0.36, rise: 0.04, garnishY: 0.54, ice: false, r: 0.046, h: 0.26 },
  };

  const state = {
    rig,
    liquid,
    surface,
    foam,
    ice,
    iceHomes,
    garnish,
    liquidY: 0.34,
    liquidRise: 0.04,
    liquidHalf: 0.06,
    garnishY: 0.44,
    wantIce: false,
    wantFoam: false,
    dress(drink) {
      const kind = layout[drink.glass] ? drink.glass : "coupe";
      Object.entries(glasses).forEach(([k, mesh]) => {
        mesh.visible = k === kind;
      });
      const L = layout[kind];
      state.liquidY = L.liquidY;
      state.liquidRise = L.rise;
      state.garnishY = L.garnishY;
      state.wantIce = !!drink.ice;
      state.wantFoam = (drink.taste?.fizz || 0) >= 3;
      const tint = new THREE.Color(drink.color);
      tint.offsetHSL(0, 0.22, -0.04);
      liquid.material.color.copy(tint);
      liquid.geometry.dispose();
      liquid.geometry = new THREE.CylinderGeometry(L.r, L.r * 0.94, L.h, 28);
      state.liquidHalf = L.h * 0.5;
      surface.geometry.dispose();
      surface.geometry = new THREE.CircleGeometry(L.r * 0.97, 32);
      surface.material.color.copy(tint).offsetHSL(0, 0, 0.1);
      foam.geometry.dispose();
      foam.geometry = new THREE.CylinderGeometry(L.r * 0.9, L.r * 0.96, 0.03, 20);
      buildGarnish(garnish, drink.garnish);
    },
  };
  return state;
}

function makeGlassMesh(pairs, mat) {
  const pts = pairs.map(([x, y]) => new THREE.Vector2(x, y));
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(pts, 36), mat);
  mesh.castShadow = true;
  return mesh;
}

function buildGarnish(group, kind) {
  while (group.children.length) {
    const ch = group.children[0];
    group.remove(ch);
    if (ch.geometry) ch.geometry.dispose();
  }
  if (!kind) return;
  if (kind === "orange" || kind === "lime" || kind === "peach") {
    const col = kind === "lime" ? 0x8cbc3a : kind === "peach" ? 0xf0a060 : 0xef8a20;
    const slice = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.02, 20),
      new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.25, roughness: 0.55 })
    );
    slice.rotation.z = 0.95;
    slice.position.set(0.16, 0.03, 0.02);
    group.add(slice);
  } else if (kind === "chili") {
    const pod = new THREE.Mesh(
      new THREE.ConeGeometry(0.038, 0.18, 10),
      new THREE.MeshStandardMaterial({ color: 0xe01818, emissive: 0x7a0000, emissiveIntensity: 0.25, roughness: 0.4 })
    );
    pod.rotation.z = 0.85;
    pod.position.set(0.16, 0.06, 0.02);
    group.add(pod);
  } else if (kind === "mint") {
    for (const x of [-0.02, 0.02]) {
      const leaf = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0x3a8a3a, roughness: 0.5 })
      );
      leaf.scale.set(0.6, 1.3, 0.25);
      leaf.position.set(x, 0.06, 0);
      leaf.rotation.z = x * 8;
      group.add(leaf);
    }
  } else if (kind === "cucumber") {
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.012, 16),
      new THREE.MeshStandardMaterial({ color: 0x8fbf7a, roughness: 0.55 })
    );
    disc.rotation.z = 1.1;
    disc.position.set(0.12, 0.02, 0);
    group.add(disc);
  } else if (kind === "berry") {
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 10, 10),
        new THREE.MeshStandardMaterial({ color: 0x8a2048, roughness: 0.45 })
      );
      b.position.set(-0.03 + i * 0.03, 0.03, 0.02 * (i - 1));
      group.add(b);
    }
  } else if (kind === "cinnamon") {
    const stick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.14, 8),
      new THREE.MeshStandardMaterial({ color: 0x6a3a18, roughness: 0.7 })
    );
    stick.rotation.z = 0.35;
    stick.position.set(0.08, 0.04, 0);
    group.add(stick);
  } else if (kind === "flower") {
    const petal = new THREE.Mesh(
      new THREE.CircleGeometry(0.085, 12),
      new THREE.MeshStandardMaterial({
        color: 0xf0c040,
        emissive: 0xd4a020,
        emissiveIntensity: 0.35,
        roughness: 0.5,
        side: THREE.DoubleSide,
      })
    );
    petal.rotation.x = -0.95;
    petal.position.set(0.16, 0.04, 0.03);
    group.add(petal);
  }
}

function addLamp(root) {
  const brass = new THREE.MeshStandardMaterial({
    color: 0xb08a4a,
    roughness: 0.32,
    metalness: 0.88,
  });
  const shade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.42, 0.28, 24, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0xc9a36a,
      emissive: 0xffc27a,
      emissiveIntensity: 0.35,
      side: THREE.DoubleSide,
      roughness: 0.6,
    })
  );
  shade.position.set(-0.15, 3.35, 1.15);
  root.add(shade);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.1, 10), brass);
  rod.position.set(-0.15, 4.0, 1.15);
  root.add(rod);
  const bulb = new THREE.PointLight(0xffd09a, 10, 4.5, 1.8);
  bulb.position.set(-0.15, 3.28, 1.15);
  root.add(bulb);
}

function makeStream() {
  const dummy = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0.2, 1.2, 0),
    new THREE.Vector3(0.4, 0.8, 0)
  );
  const mesh = new THREE.Mesh(
    buildTaperTube(dummy, 20, 8, 0.012, 0.005),
    new THREE.MeshPhysicalMaterial({
      color: 0xe6d4a4,
      emissive: 0xe6d4a4,
      emissiveIntensity: 0.22,
      roughness: 0.08,
      metalness: 0,
      transmission: 0.55,
      thickness: 0.04,
      ior: 1.36,
      attenuationColor: 0xe6d4a4,
      attenuationDistance: 0.08,
    })
  );
  mesh.visible = false;
  mesh.frustumCulled = false;

  const splashGeo = new THREE.BufferGeometry();
  const splashPos = new Float32Array(12 * 3);
  splashGeo.setAttribute("position", new THREE.BufferAttribute(splashPos, 3));
  const splash = new THREE.Points(
    splashGeo,
    new THREE.PointsMaterial({
      color: 0xe6d4a4,
      size: 0.018,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    })
  );
  splash.visible = false;
  splash.frustumCulled = false;
  return { mesh, splash, splashPos };
}

function buildTaperTube(curve, tubular, radial, rStart, rEnd) {
  const positions = [];
  const normals = [];
  const indices = [];
  let normal = new THREE.Vector3(0, 0, 1);
  const frames = [];
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular;
    const p = curve.getPointAt(t);
    const T = curve.getTangentAt(t).normalize();
    const B = new THREE.Vector3().crossVectors(T, normal);
    if (B.lengthSq() < 1e-6) {
      normal.set(0, 1, 0);
      B.crossVectors(T, normal);
    }
    B.normalize();
    normal.crossVectors(B, T).normalize();
    frames.push({ p, n: normal.clone(), b: B.clone() });
  }
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular;
    const r = rStart * (1 - t) + rEnd * t;
    const { p, n, b } = frames[i];
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const nx = n.x * c + b.x * s;
      const ny = n.y * c + b.y * s;
      const nz = n.z * c + b.z * s;
      positions.push(p.x + nx * r, p.y + ny * r, p.z + nz * r);
      normals.push(nx, ny, nz);
    }
  }
  for (let i = 0; i < tubular; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const d = a + radial + 1;
      indices.push(a, d, a + 1, d, d + 1, a + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  return geo;
}

function updateStream(stream, bottles, type, pourT, color) {
  const bottle = bottles.find((b) => b.type === type);
  if (!bottle || pourT < 0.3 || pourT > 0.78) {
    stream.mesh.visible = false;
    stream.splash.visible = false;
    return;
  }
  const from = new THREE.Vector3();
  bottle.mouth.getWorldPosition(from);
  const dir = new THREE.Vector3(0.55, -0.35, 0.05).applyQuaternion(bottle.group.quaternion);
  const to = new THREE.Vector3(0.12, 1.06, 1.48);
  const mid = from.clone().add(dir.multiplyScalar(0.18)).add(new THREE.Vector3(0.08, -0.16, 0));
  const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
  stream.mesh.geometry.dispose();
  const fat = 0.013 + Math.sin(((pourT - 0.3) / 0.48) * Math.PI) * 0.005;
  stream.mesh.geometry = buildTaperTube(curve, 26, 8, fat, fat * 0.38);
  stream.mesh.material.color.copy(color);
  stream.mesh.material.emissive.copy(color);
  stream.mesh.material.attenuationColor.copy(color);
  stream.mesh.visible = true;

  stream.splash.visible = true;
  stream.splash.material.color.copy(color);
  const arr = stream.splashPos;
  for (let i = 0; i < 12; i++) {
    const a = i * 0.7 + pourT * 14;
    const rad = 0.04 + (i % 4) * 0.012;
    arr[i * 3] = to.x + Math.cos(a) * rad;
    arr[i * 3 + 1] = to.y + 0.02 + ((i * 17 + pourT * 40) % 8) * 0.006;
    arr[i * 3 + 2] = to.z + Math.sin(a) * rad;
  }
  stream.splash.geometry.attributes.position.needsUpdate = true;
}
