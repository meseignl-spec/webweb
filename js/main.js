/* =================================================================
   Interactions — progressive enhancement, all optional.
   The site is fully readable with JS disabled.
   ================================================================= */
(function () {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Current year in footer ---- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- Nav: condense on scroll ---- */
  const nav = document.getElementById("nav");
  const onScroll = () => {
    if (!nav) return;
    nav.classList.toggle("is-scrolled", window.scrollY > 40);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---- Reveal: set per-element delay from data attribute ---- */
  document.querySelectorAll(".reveal[data-reveal-delay]").forEach((el) => {
    el.style.setProperty("--reveal-delay", el.getAttribute("data-reveal-delay") + "ms");
  });

  /* ---- Scroll-reveal via IntersectionObserver ---- */
  const reveals = document.querySelectorAll(".reveal");
  if (prefersReduced || !("IntersectionObserver" in window)) {
    reveals.forEach((el) => el.classList.add("is-visible"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  }

  /* ---- Count-up stats ---- */
  const animateCount = (el) => {
    const target = parseFloat(el.getAttribute("data-count")) || 0;
    const suffix = el.getAttribute("data-suffix") || "";
    if (prefersReduced) {
      el.textContent = target + suffix;
      return;
    }
    const duration = 1600;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const stats = document.querySelectorAll(".stat__num");
  if (stats.length && "IntersectionObserver" in window) {
    const statIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            statIO.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    stats.forEach((el) => statIO.observe(el));
  } else {
    stats.forEach(animateCount);
  }

  /* ---- Mouse spotlight + parallax orbs + card glow ---- */
  if (!prefersReduced && window.matchMedia("(pointer: fine)").matches) {
    const orbs = document.querySelectorAll(".orb");
    let ticking = false;
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;

    const render = () => {
      // spotlight follows cursor
      document.documentElement.style.setProperty("--mx", mx + "px");
      document.documentElement.style.setProperty("--my", my + "px");

      // orb parallax (centered offset)
      const dx = (mx - window.innerWidth / 2);
      const dy = (my - window.innerHeight / 2);
      orbs.forEach((orb) => {
        const depth = parseFloat(orb.getAttribute("data-depth")) || 0.03;
        orb.style.transform = `translate(${-dx * depth}px, ${-dy * depth}px)`;
      });
      ticking = false;
    };

    window.addEventListener(
      "mousemove",
      (e) => {
        mx = e.clientX;
        my = e.clientY;
        if (!ticking) {
          requestAnimationFrame(render);
          ticking = true;
        }
      },
      { passive: true }
    );

    // per-card cursor glow
    document.querySelectorAll(".card").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--cx", e.clientX - r.left + "px");
        card.style.setProperty("--cy", e.clientY - r.top + "px");
      });
    });
  }
})();
