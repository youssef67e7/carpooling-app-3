/** WERET — three parallel curves above the wordmark (viewBox 280×38). */
(function () {
  const VB = "0 0 280 38";

  const PATHS = {
    legLeft: "M 22 8 Q 140 2 258 8",
    legRight: "M 22 18 Q 140 12 258 18",
    road: "M 22 28 Q 140 22 258 28",
  };

  const VARIANTS = {
    login: { strokeW: 3.8, showAura: true, animate: true },
    sidebar: { strokeW: 4.6, showAura: false, animate: true },
    inline: { strokeW: 3.2, showAura: false, animate: true },
    eyebrow: { strokeW: 3.4, showAura: false, animate: true },
  };

  const ORDER = [
    { key: "legLeft", d: PATHS.legLeft, delay: "0s", glint: "1.05s" },
    { key: "legRight", d: PATHS.legRight, delay: "0.12s", glint: "1.3s" },
    { key: "road", d: PATHS.road, delay: "0.24s", glint: "1.55s" },
  ];

  function strokeLayers(strokeW) {
    return ORDER.map(({ key, d, delay, glint }) => `
      <path class="weret-logo-mark__glow weret-logo-mark__glow--${key}"
        pathLength="100" d="${d}" style="animation-delay:${delay}, ${glint}" />
      <path class="weret-logo-mark__stroke weret-logo-mark__stroke--${key}"
        pathLength="100" d="${d}" style="stroke-width:${strokeW};animation-delay:${delay}, ${glint}" />`).join("");
  }

  function buildCarSvg(variant) {
    const cfg = VARIANTS[variant] || VARIANTS.login;
    const aura = cfg.showAura
      ? `<ellipse class="weret-logo-mark__aura" cx="140" cy="18" rx="98" ry="14"/>`
      : "";
    return `
    <svg class="weret-logo-mark__car" viewBox="${VB}" aria-hidden="true" focusable="false">
      ${aura}
      ${strokeLayers(cfg.strokeW)}
    </svg>`;
  }

  function buildLogo(variant) {
    const root = document.createElement("div");
    root.className = `weret-logo-mark weret-logo-mark--${variant}`;
    root.setAttribute("role", "img");
    root.setAttribute("aria-label", "WERET");

    const tile = document.createElement("div");
    tile.className = "weret-logo-mark__tile";
    tile.innerHTML = `${buildCarSvg(variant)}<span class="weret-logo-mark__text">WERET</span>`;
    root.appendChild(tile);
    return root;
  }

  function mount() {
    document.querySelectorAll("[data-weret-logo]").forEach((host) => {
      host.replaceChildren(buildLogo(host.getAttribute("data-weret-logo") || "login"));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
