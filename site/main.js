import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

/* ================================================================
   Paraclete — hero + page interactions
   ================================================================ */

const COLORS = { teal: 0x14b8a6, deep: 0x0b3d3a, cream: 0xfff6e3 };
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ================================================================
   Hero: a matte toy-clay Paraclete van you can spin.
   ================================================================ */
function initVan() {
  const container = document.getElementById("scene");
  if (!container) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    showFallback(container);
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
  camera.position.set(0, 0, 8.2);

  // Soft studio light — matte clay, nothing glossy.
  scene.add(new THREE.AmbientLight(0xffffff, 1.05));
  const key = new THREE.DirectionalLight(0xfff6e3, 1.5);
  key.position.set(3, 5, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x14b8a6, 0.55);
  fill.position.set(-4, -2, 3);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.4);
  rim.position.set(-3, 3, -5);
  scene.add(rim);

  /* ---------- Materials ---------- */
  const matBody = new THREE.MeshStandardMaterial({ color: COLORS.teal, roughness: 0.55 });
  const matTrim = new THREE.MeshStandardMaterial({ color: COLORS.deep, roughness: 0.7 });
  const matCream = new THREE.MeshStandardMaterial({ color: COLORS.cream, roughness: 0.7 });

  /* ---------- Van ---------- */
  const van = new THREE.Group();

  const cargo = new THREE.Mesh(new RoundedBoxGeometry(2.5, 1.55, 1.35, 6, 0.14), matBody);
  cargo.position.set(0.55, 0.62, 0);
  van.add(cargo);

  const cab = new THREE.Mesh(new RoundedBoxGeometry(1.25, 1.2, 1.3, 6, 0.18), matBody);
  cab.position.set(-1.25, 0.44, 0);
  van.add(cab);

  const windshield = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.62, 1.05, 4, 0.05), matTrim);
  windshield.position.set(-1.83, 0.62, 0);
  windshield.rotation.z = -0.12;
  van.add(windshield);

  const sideWinGeo = new RoundedBoxGeometry(0.62, 0.5, 0.12, 5, 0.06);
  for (const side of [1, -1]) {
    const win = new THREE.Mesh(sideWinGeo, matTrim);
    win.position.set(-1.32, 0.68, side * 0.64);
    van.add(win);
  }

  const bumperGeo = new RoundedBoxGeometry(0.18, 0.22, 1.2, 4, 0.08);
  const bumperF = new THREE.Mesh(bumperGeo, matCream);
  bumperF.position.set(-1.9, -0.02, 0);
  van.add(bumperF);
  const bumperR = new THREE.Mesh(bumperGeo, matCream);
  bumperR.position.set(1.82, -0.02, 0);
  van.add(bumperR);

  const lampGeo = new THREE.CapsuleGeometry(0.07, 0.12, 4, 12).rotateZ(Math.PI / 2);
  for (const side of [1, -1]) {
    const lamp = new THREE.Mesh(lampGeo, matCream);
    lamp.position.set(-1.87, 0.26, side * 0.42);
    van.add(lamp);
  }

  // Wheels — deep tires, cream hubs, they actually roll
  const tireGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 32).rotateX(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.26, 24).rotateX(Math.PI / 2);
  const wheels = [];
  for (const [wx, wz] of [[-1.25, 0.6], [-1.25, -0.6], [1.15, 0.6], [1.15, -0.6]]) {
    const wheel = new THREE.Group();
    wheel.add(new THREE.Mesh(tireGeo, matTrim));
    wheel.add(new THREE.Mesh(hubGeo, matCream));
    wheel.position.set(wx, -0.3, wz);
    van.add(wheel);
    wheels.push(wheel);
  }

  // Supplied wordmark artwork on both cargo sides — never re-typed
  const wordmarkTex = new THREE.TextureLoader().load("assets/wordmark-cream-transparent.png");
  wordmarkTex.colorSpace = THREE.SRGBColorSpace;
  wordmarkTex.anisotropy = 8;
  const wmW = 1.85, wmH = wmW * (804 / 3250);
  const wmGeo = new THREE.PlaneGeometry(wmW, wmH);
  const wmMat = new THREE.MeshBasicMaterial({ map: wordmarkTex, transparent: true });
  for (const side of [1, -1]) {
    const wm = new THREE.Mesh(wmGeo, wmMat);
    wm.position.set(0.55, 0.66, side * 0.687);
    if (side === -1) wm.rotation.y = Math.PI;
    van.add(wm);
  }

  van.position.y = 0.06;

  // Soft blurred contact shadow on the "floor"
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 2.4),
    new THREE.MeshBasicMaterial({ map: makeShadowTexture(), transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.66;
  shadow.position.x = 0.3;

  const spinner = new THREE.Group(); // drag spins this
  spinner.add(van);
  spinner.add(shadow);
  spinner.rotation.y = -0.55; // three-quarter view so it reads 3D immediately

  const world = new THREE.Group(); // pointer-parallax tilt
  world.add(spinner);
  scene.add(world);

  /* ---------- Sizing / placement ---------- */
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    const narrow = w <= 880;
    // Mobile: van lives in its own short band, so pull the camera back to
    // fit the whole vehicle and centre it. Desktop: park it right of the copy.
    camera.position.z = narrow ? 6.7 : 8.2;

    const halfH = camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const halfW = halfH * camera.aspect;

    spinner.position.x = narrow ? 0 : Math.min(halfW * 0.4, 2.7);
    spinner.position.y = narrow ? 0 : 0.1;
  }
  new ResizeObserver(resize).observe(container);
  resize();

  /* ---------- Interaction: drag to spin, with inertia ---------- */
  let spinVel = reducedMotion ? 0 : 0.006;
  let dragging = false;
  let lastX = 0;
  let pointerX = 0, pointerY = 0;

  container.addEventListener("pointerdown", (e) => {
    dragging = true;
    lastX = e.clientX;
    container.setPointerCapture(e.pointerId);
  });
  container.addEventListener("pointermove", (e) => {
    if (dragging) {
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      spinVel = dx * 0.0045;
      spinner.rotation.y += spinVel;
    }
  });
  const endDrag = () => { dragging = false; };
  container.addEventListener("pointerup", endDrag);
  container.addEventListener("pointercancel", endDrag);

  // Pointer parallax — the scene leans gently toward the cursor.
  window.addEventListener("pointermove", (e) => {
    pointerX = (e.clientX / window.innerWidth) * 2 - 1;
    pointerY = (e.clientY / window.innerHeight) * 2 - 1;
  });

  // Gyro parallax on phones (iOS needs a gesture to grant permission).
  function enableGyro() {
    window.addEventListener("deviceorientation", (e) => {
      if (e.gamma == null || e.beta == null) return;
      pointerX = THREE.MathUtils.clamp(e.gamma / 30, -1, 1);
      pointerY = THREE.MathUtils.clamp((e.beta - 45) / 30, -1, 1);
    });
  }
  if (typeof DeviceOrientationEvent !== "undefined") {
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      container.addEventListener("pointerdown", () => {
        DeviceOrientationEvent.requestPermission()
          .then((s) => { if (s === "granted") enableGyro(); })
          .catch(() => {});
      }, { once: true });
    } else {
      enableGyro();
    }
  }

  /* ---------- Loop ---------- */
  const clock = new THREE.Clock();
  const renderFrame = () => {
    const t = clock.getElapsedTime();

    if (!dragging) {
      spinner.rotation.y += spinVel;
      const idle = reducedMotion ? 0 : 0.006;
      spinVel += (idle - spinVel) * 0.02; // ease back to slow idle drift
    }

    if (!reducedMotion) {
      van.position.y = 0.06 + Math.sin(t * 0.8) * 0.06;
      for (const w of wheels) w.rotation.z -= 0.02 + Math.abs(spinVel) * 2;
    }

    world.rotation.x += (pointerY * 0.12 - world.rotation.x) * 0.05;
    world.rotation.y += (pointerX * 0.16 - world.rotation.y) * 0.05;

    renderer.render(scene, camera);
  };

  // Pause the loop while the hero is scrolled off-screen. (Browsers already
  // throttle requestAnimationFrame when the whole tab is backgrounded.)
  let running = false;
  const start = () => { if (!running) { running = true; renderer.setAnimationLoop(renderFrame); } };
  const stop = () => { if (running) { running = false; renderer.setAnimationLoop(null); } };

  new IntersectionObserver((entries) => {
    entries[0].isIntersecting ? start() : stop();
  }, { threshold: 0 }).observe(container);

  start();
}

/* Radial blob → soft contact shadow. */
function makeShadowTexture() {
  const s = 256;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(4, 26, 24, 0.55)");
  g.addColorStop(0.55, "rgba(4, 26, 24, 0.28)");
  g.addColorStop(1, "rgba(4, 26, 24, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function showFallback(container) {
  const img = document.createElement("img");
  img.src = "assets/monogram-cream-on-teal.png";
  img.alt = "";
  img.className = "fallback";
  container.appendChild(img);
  const hint = document.querySelector(".hero-hint");
  if (hint) hint.style.display = "none";
}

/* ================================================================
   Header: transparent over the hero, solid cream once you scroll.
   ================================================================ */
function initHeader() {
  const header = document.getElementById("site-header");
  if (!header) return;
  const update = () => {
    header.classList.toggle("scrolled", window.scrollY > window.innerHeight * 0.7);
  };
  window.addEventListener("scroll", update, { passive: true });
  update();
}

/* ================================================================
   Scroll reveals
   ================================================================ */
function initReveals() {
  const els = document.querySelectorAll(".reveal");
  if (reducedMotion || !("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.15 }
  );
  els.forEach((el) => io.observe(el));
}

/* ================================================================
   Quote form (static demo — swap for a real endpoint later)
   ================================================================ */
function initForm() {
  const form = document.getElementById("quote-form");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = form.querySelector('[name="email"]');
    const name = form.querySelector('[name="name"]');
    if (!name.value.trim() || !email.value.includes("@")) {
      (name.value.trim() ? email : name).focus();
      return;
    }
    form.querySelector(".form-note").hidden = false;
    form.querySelector("button").disabled = true;
  });
}

initVan();
initHeader();
initReveals();
initForm();
