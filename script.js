(() => {
  "use strict";

  const WEDDING_DATE = new Date("2027-05-08T16:00:00+08:00");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const body = document.body;
  const root = document.documentElement;
  const curtain = document.getElementById("curtain");

  /* ---------- Scroll lock until the curtain opens ---------- */
  // Always start at the top, even on reload
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);

  const SCROLL_KEYS = new Set([" ", "PageDown", "PageUp", "End", "Home", "ArrowDown", "ArrowUp", "Spacebar"]);
  const blockEvent = (e) => e.preventDefault();
  const blockKeys = (e) => {
    if (SCROLL_KEYS.has(e.key)) e.preventDefault();
  };
  const pinTop = () => {
    if (window.scrollY !== 0) window.scrollTo(0, 0);
  };

  function lockScroll() {
    root.classList.add("is-locked");
    body.classList.add("is-locked");
    window.addEventListener("wheel", blockEvent, { passive: false });
    window.addEventListener("touchmove", blockEvent, { passive: false });
    window.addEventListener("keydown", blockKeys);
    window.addEventListener("scroll", pinTop);
  }

  function unlockScroll() {
    root.classList.remove("is-locked");
    body.classList.remove("is-locked");
    window.removeEventListener("wheel", blockEvent);
    window.removeEventListener("touchmove", blockEvent);
    window.removeEventListener("keydown", blockKeys);
    window.removeEventListener("scroll", pinTop);
  }

  lockScroll();

  /* ---------- Split hero names into letters ---------- */
  document.querySelectorAll(".split").forEach((el) => {
    const base = parseFloat(el.dataset.delay || "0");
    const text = el.textContent.trim();
    el.textContent = "";
    el.setAttribute("aria-label", text);
    [...text].forEach((ch, i) => {
      const span = document.createElement("span");
      span.className = "char";
      span.setAttribute("aria-hidden", "true");
      span.textContent = ch;
      span.style.setProperty("--cd", `${base + i * 0.09}s`);
      el.appendChild(span);
    });
  });

  /* ---------- Curtain: wait for load, then open ---------- */
  curtain.classList.add("is-loading");

  const openCurtain = () => {
    if (curtain.classList.contains("is-open")) return;
    curtain.classList.add("is-open");
    if (window.VelvetCurtain) window.VelvetCurtain.open();
    // Let guests scroll once the drapes have parted
    setTimeout(unlockScroll, reduceMotion ? 0 : 1400);
    // Start the hero entrance while the curtain is sweeping aside
    setTimeout(() => body.classList.add("is-revealed"), reduceMotion ? 0 : 700);
    setTimeout(() => {
      curtain.classList.add("is-gone");
      if (window.VelvetCurtain) window.VelvetCurtain.stop();
      startPetals();
    }, reduceMotion ? 50 : curtain.classList.contains("has-gl") ? 4100 : 3000);
  };

  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  const pageLoaded = new Promise((resolve) => {
    if (document.readyState === "complete") resolve();
    else window.addEventListener("load", resolve, { once: true });
  });
  const minimumShow = new Promise((r) => setTimeout(r, reduceMotion ? 0 : 2400));

  Promise.all([fontsReady, pageLoaded, minimumShow]).then(openCurtain);
  // Safety net in case a resource hangs
  setTimeout(openCurtain, 6000);
  // Guests can also tap the curtain to open it early
  curtain.addEventListener("click", openCurtain);

  /* ---------- Floating petals ---------- */
  const petalsEl = document.getElementById("petals");
  const petalColors = ["#0b5d45", "#3f8f6f", "#9cc5b2", "#ece4cf"];

  function spawnPetal() {
    const p = document.createElement("span");
    p.className = "petal";
    const size = 7 + Math.random() * 9;
    const duration = 11 + Math.random() * 9;
    p.style.left = `${Math.random() * 100}vw`;
    p.style.setProperty("--s", `${size}px`);
    p.style.setProperty("--t", `${duration}s`);
    p.style.setProperty("--x", `${(Math.random() - 0.5) * 300}px`);
    p.style.setProperty("--r", `${(Math.random() > 0.5 ? 1 : -1) * (270 + Math.random() * 540)}deg`);
    p.style.setProperty("--o", (0.25 + Math.random() * 0.35).toFixed(2));
    p.style.setProperty("--c", petalColors[Math.floor(Math.random() * petalColors.length)]);
    p.addEventListener("animationend", () => p.remove());
    petalsEl.appendChild(p);
  }

  function startPetals() {
    if (reduceMotion) return;
    for (let i = 0; i < 6; i++) setTimeout(spawnPetal, i * 400);
    setInterval(() => {
      if (!document.hidden && petalsEl.childElementCount < 18) spawnPetal();
    }, 1500);
  }

  /* ---------- Countdown ---------- */
  const units = {
    days: document.querySelector('[data-unit="days"]'),
    hours: document.querySelector('[data-unit="hours"]'),
    minutes: document.querySelector('[data-unit="minutes"]'),
    seconds: document.querySelector('[data-unit="seconds"]'),
  };

  function setUnit(el, value) {
    if (el.textContent === value) return;
    el.textContent = value;
    el.classList.remove("tick");
    void el.offsetWidth; // restart animation
    el.classList.add("tick");
  }

  function updateCountdown() {
    const diff = Math.max(0, WEDDING_DATE - Date.now());
    const s = Math.floor(diff / 1000);
    setUnit(units.days, String(Math.floor(s / 86400)).padStart(3, "0"));
    setUnit(units.hours, String(Math.floor((s % 86400) / 3600)).padStart(2, "0"));
    setUnit(units.minutes, String(Math.floor((s % 3600) / 60)).padStart(2, "0"));
    setUnit(units.seconds, String(s % 60).padStart(2, "0"));
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);

  /* ---------- Scroll reveal ---------- */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );
  document.querySelectorAll(".reveal, .reveal-photo").forEach((el) => revealObserver.observe(el));

  /* ---------- Photos: fall back to a styled frame if one can't load ---------- */
  document.querySelectorAll(".photo img, .band__media img").forEach((img) => {
    const markMissing = () => img.parentElement.classList.add("is-missing");
    if (img.complete && img.naturalWidth === 0 && img.src) markMissing();
    else img.addEventListener("error", markMissing, { once: true });
  });

  /* ---------- Scroll-driven effects ---------- */
  const progress = document.getElementById("progress");
  const nav = document.getElementById("nav");
  const heroContent = document.querySelector(".hero__content");
  const scheduleWrap = document.querySelector(".schedule__wrap");
  const scheduleLine = document.getElementById("scheduleLine");
  const band = document.querySelector(".band");
  const bandMedia = document.querySelector(".band__media");
  let ticking = false;

  function onScroll() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    nav.classList.toggle("is-scrolled", y > 60);

    if (!reduceMotion && y < window.innerHeight) {
      heroContent.style.transform = `translateY(${y * 0.35}px)`;
      heroContent.style.opacity = String(1 - y / (window.innerHeight * 0.9));
    }

    const r = scheduleWrap.getBoundingClientRect();
    const vh = window.innerHeight;
    const pct = Math.min(1, Math.max(0, (vh * 0.75 - r.top) / r.height));
    scheduleLine.style.transform = `scaleY(${pct})`;

    if (!reduceMotion) {
      const b = band.getBoundingClientRect();
      if (b.bottom > 0 && b.top < vh) {
        const rel = (b.top + b.height / 2 - vh / 2) / (vh + b.height);
        bandMedia.style.transform = `translateY(${rel * -24}%)`;
      }
    }

    ticking = false;
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        requestAnimationFrame(onScroll);
        ticking = true;
      }
    },
    { passive: true }
  );
  onScroll();

  /* ---------- Lightbox ---------- */
  const lightbox = document.getElementById("lightbox");
  const lbImg = document.getElementById("lightboxImg");
  const lbCaption = document.getElementById("lightboxCaption");
  const photos = [...document.querySelectorAll(".gallery .photo")];
  let lbIndex = 0;
  let lastFocus = null;

  function showPhoto(i) {
    const usable = photos.filter((f) => !f.classList.contains("is-missing"));
    if (!usable.length) return;
    lbIndex = (i + usable.length) % usable.length;
    const img = usable[lbIndex].querySelector("img");
    lbImg.classList.add("is-swapping");
    setTimeout(() => {
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt;
      lbCaption.textContent = img.alt;
      lbImg.classList.remove("is-swapping");
    }, lightbox.classList.contains("is-open") ? 250 : 0);
  }

  function openLightbox(fig) {
    if (fig.classList.contains("is-missing")) return;
    lastFocus = document.activeElement;
    const usable = photos.filter((f) => !f.classList.contains("is-missing"));
    showPhoto(usable.indexOf(fig));
    lightbox.hidden = false;
    body.style.overflow = "hidden";
    requestAnimationFrame(() => lightbox.classList.add("is-open"));
    document.getElementById("lightboxClose").focus();
  }

  function closeLightbox() {
    lightbox.classList.remove("is-open");
    body.style.overflow = "";
    setTimeout(() => (lightbox.hidden = true), 500);
    if (lastFocus) lastFocus.focus();
  }

  photos.forEach((fig) => {
    fig.tabIndex = 0;
    fig.setAttribute("role", "button");
    fig.addEventListener("click", () => openLightbox(fig));
    fig.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openLightbox(fig);
      }
    });
  });

  document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
  document.getElementById("lightboxPrev").addEventListener("click", () => showPhoto(lbIndex - 1));
  document.getElementById("lightboxNext").addEventListener("click", () => showPhoto(lbIndex + 1));
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", (e) => {
    if (lightbox.hidden) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") showPhoto(lbIndex - 1);
    if (e.key === "ArrowRight") showPhoto(lbIndex + 1);
  });

  let touchX = null;
  lightbox.addEventListener("touchstart", (e) => (touchX = e.touches[0].clientX), { passive: true });
  lightbox.addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) showPhoto(lbIndex + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  /* ---------- Mobile menu ---------- */
  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");

  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("is-menu-open");
    toggle.setAttribute("aria-expanded", String(open));
    body.style.overflow = open ? "hidden" : "";
  });

  links.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      nav.classList.remove("is-menu-open");
      toggle.setAttribute("aria-expanded", "false");
      body.style.overflow = "";
    })
  );

  /* ---------- RSVP ---------- */
  const form = document.getElementById("rsvpForm");
  const thanks = document.getElementById("rsvpThanks");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let valid = true;

    ["name", "email"].forEach((id) => {
      const input = form.elements[id];
      const field = input.closest(".field");
      field.classList.remove("is-invalid");
      if (!input.checkValidity() || !input.value.trim()) {
        void field.offsetWidth;
        field.classList.add("is-invalid");
        valid = false;
      }
    });

    if (!valid) return;

    const data = Object.fromEntries(new FormData(form));
    // TODO: send `data` to your RSVP backend (Google Form, Formspree, etc.)
    console.log("RSVP", data);

    const first = data.name.trim().split(" ")[0];
    thanks.textContent =
      data.attending === "yes"
        ? `Thank you, ${first}! We can't wait to celebrate with you.`
        : `Thank you, ${first}. You'll be missed dearly.`;
    thanks.classList.add("is-shown");
    form.querySelector(".btn span").textContent = "Reply Sent";
    form.querySelector(".btn").disabled = true;
  });
})();
