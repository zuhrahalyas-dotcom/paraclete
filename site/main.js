/* ================================================================
   Paraclete — hero + page interactions
   ================================================================ */

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Header: transparent over the hero video, solid cream once you scroll. */
function initHeader() {
  const header = document.getElementById("site-header");
  if (!header) return;
  const update = () => {
    header.classList.toggle("scrolled", window.scrollY > window.innerHeight * 0.65);
  };
  window.addEventListener("scroll", update, { passive: true });
  update();
}

/* Hero video: pause for reduced motion (the poster frame stays). */
function initHeroVideo() {
  const video = document.getElementById("hero-video");
  if (!video) return;
  if (reducedMotion) {
    video.removeAttribute("autoplay");
    video.pause();
    return;
  }
  // some browsers block autoplay until a play() nudge
  video.play().catch(() => {});
}

/* Scroll reveals */
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

/* Quote form (static demo — swap for a real endpoint later) */
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

initHeader();
initHeroVideo();
initReveals();
initForm();
