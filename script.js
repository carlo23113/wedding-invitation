(() => {
  "use strict";

  const WEDDING_DATE = new Date("2027-05-08T16:00:00+08:00");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const body = document.body;
  body.classList.add("is-locked");
  const curtain = document.getElementById("curtain");

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
    body.classList.remove("is-locked");
    // Start the hero entrance while the curtain is sweeping aside
    setTimeout(() => body.classList.add("is-revealed"), reduceMotion ? 0 : 700);
    setTimeout(() => {
      curtain.classList.add("is-gone");
      startPetals();
    }, reduceMotion ? 50 : 3000);
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
  document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

  /* ---------- Scroll-driven effects ---------- */
  const progress = document.getElementById("progress");
  const nav = document.getElementById("nav");
  const heroContent = document.querySelector(".hero__content");
  const scheduleWrap = document.querySelector(".schedule__wrap");
  const scheduleLine = document.getElementById("scheduleLine");
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
