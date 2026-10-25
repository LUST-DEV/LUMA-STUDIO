(() => {
  const landingPage = document.querySelector(".landing-page");
  if (landingPage && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const revealTargets = landingPage.querySelectorAll(
      ".landing-main > .brand-strip, .landing-main > section:not(.hero-section), .feature-card, .step-card, .format-card, .landing-faq-list details, .privacy-points li, .docs-promo, .cta-box"
    );

    if ("IntersectionObserver" in window) {
      const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -36px 0px" });

      revealTargets.forEach((element, index) => {
        element.classList.add("landing-reveal");
        element.style.setProperty("--reveal-delay", `${Math.min(index % 6, 5) * 70}ms`);
        revealObserver.observe(element);
      });
    }
  }

  const header = document.querySelector(".landing-header");
  if (!header) return;

  const toggle = header.querySelector(".menu-toggle");
  const navigation = header.querySelector("#landing-navigation");
  if (!toggle || !navigation) return;

  function closeMenu() {
    header.classList.remove("menu-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Ouvrir le menu");
  }

  toggle.addEventListener("click", () => {
    const isOpen = header.classList.toggle("menu-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Fermer le menu" : "Ouvrir le menu");
  });

  navigation.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  document.addEventListener("click", (event) => {
    if (!header.contains(event.target)) closeMenu();
  });
})();