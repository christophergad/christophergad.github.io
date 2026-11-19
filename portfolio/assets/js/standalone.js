(() => {
  if (window.parent !== window) return;

  const BASE = "/portfolio";

  // Standalone mode: block the legacy Wix iframe wheel listener before it runs.
  // We intentionally do NOT call preventDefault(), so native browser scrolling remains intact.
  window.addEventListener("wheel", event => {
    if (!document.documentElement.classList.contains("cg-lightbox-open")) {
      event.stopImmediatePropagation();
    }
  }, { capture: true, passive: true });

  // Standalone mode: handle Wix-era route links before old inline handlers can
  // post their original wixsite.com hrefs.
  document.addEventListener("click", event => {
    const link = event.target && event.target.closest
      ? event.target.closest("a[data-wix-route]")
      : null;
    if (!link) return;

    const route = link.getAttribute("data-wix-route");
    if (!route) return;

    // Preserve normal modified-click behavior; hrefs are rewritten below.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    location.href = localRoute(route);
  }, true);

  function localRoute(url) {
    if (!url) return BASE + "/";
    if (/^https?:\/\//i.test(url)) return url;

    const hashAt = url.indexOf("#");
    const hash = hashAt >= 0 ? url.slice(hashAt) : "";
    let path = hashAt >= 0 ? url.slice(0, hashAt) : url;

    if (path === "/" || path === "" || path === BASE || path === BASE + "/") {
      return BASE + "/" + hash;
    }

    if (path.startsWith(BASE + "/")) path = path.slice(BASE.length);

    if (/\.[a-z0-9]+$/i.test(path)) {
      return BASE + (path.startsWith("/") ? path : "/" + path) + hash;
    }

    path = path.replace(/^\/+|\/+$/g, "");
    return BASE + "/" + path + ".html" + hash;
  }

  function navigate(url) {
    if (/^https?:\/\//i.test(url)) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    location.href = localRoute(url);
  }

  let overlay, imageEl, prevBtn, nextBtn, counter;
  let images = [], index = 0;

  function ensureLightbox() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.className = "cg-standalone-lightbox";
    overlay.innerHTML = `
      <button class="cg-lightbox-close" aria-label="Close image">×</button>
      <button class="cg-lightbox-nav cg-lightbox-prev" aria-label="Previous image">‹</button>
      <figure class="cg-lightbox-figure">
        <img class="cg-lightbox-image" alt="Project image">
        <figcaption class="cg-lightbox-counter"></figcaption>
      </figure>
      <button class="cg-lightbox-nav cg-lightbox-next" aria-label="Next image">›</button>`;
    document.body.appendChild(overlay);
    imageEl = overlay.querySelector(".cg-lightbox-image");
    prevBtn = overlay.querySelector(".cg-lightbox-prev");
    nextBtn = overlay.querySelector(".cg-lightbox-next");
    counter = overlay.querySelector(".cg-lightbox-counter");
    overlay.querySelector(".cg-lightbox-close").onclick = closeLightbox;
    overlay.addEventListener("click", e => { if (e.target === overlay) closeLightbox(); });
    prevBtn.onclick = () => show(index - 1);
    nextBtn.onclick = () => show(index + 1);
    document.addEventListener("keydown", e => {
      if (!overlay.classList.contains("is-open")) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") show(index - 1);
      if (e.key === "ArrowRight") show(index + 1);
    });
  }

  function show(nextIndex) {
    ensureLightbox();
    if (!images.length) return;
    index = (nextIndex + images.length) % images.length;
    imageEl.src = images[index];
    imageEl.alt = `Project image ${index + 1} of ${images.length}`;
    counter.textContent = images.length > 1 ? `${index + 1} / ${images.length}` : "";
    prevBtn.hidden = nextBtn.hidden = images.length <= 1;
    overlay.classList.add("is-open");
    document.documentElement.classList.add("cg-lightbox-open");
  }

  function openLightbox(message) {
    images = Array.isArray(message.images) && message.images.length
      ? message.images.filter(Boolean)
      : [message.url].filter(Boolean);
    if (!images.length) return;
    const requested = Number.isInteger(message.index) ? message.index : images.indexOf(message.url);
    show(requested < 0 ? 0 : requested);
  }

  function closeLightbox() {
    if (!overlay) return;
    overlay.classList.remove("is-open");
    document.documentElement.classList.remove("cg-lightbox-open");
  }

  window.addEventListener("message", event => {
    const message = event.data || {};

    if (message.type === "portfolioBridgeHello") {
      // Standalone GitHub pages are not embedded in Wix.
      // Intentionally do NOT activate the legacy Wix scroll bridge.
      return;
    }

    if (message.type === "navigate" && message.url) {
      navigate(message.url);
      return;
    }

    if (message.type === "externalNavigate" && message.url) {
      window.open(message.url, "_blank", "noopener,noreferrer");
      return;
    }

    if (message.type === "openProjectImage" && message.url) {
      openLightbox(message);
    }
  });

  document.querySelectorAll("a[data-wix-route]").forEach(a => {
    const route = a.getAttribute("data-wix-route");
    if (!route) return;
    a.href = localRoute(route);
    a.removeAttribute("target");
  });

  function setupExpandableGalleries() {
    document.querySelectorAll("[data-cg-expand]").forEach(oldBtn => {
      const key = oldBtn.getAttribute("data-cg-expand");
      if (!key) return;

      const expanded = document.querySelector('[data-cg-expanded="' + CSS.escape(key) + '"]');
      if (!expanded) return;

      const footer = oldBtn.closest(".cg-gallery-footer");
      const preview = footer && footer.previousElementSibling &&
        footer.previousElementSibling.classList.contains("cg-gallery")
          ? footer.previousElementSibling
          : null;

      const expandedItems = Array.from(expanded.querySelectorAll("[data-cg-image]"));
      if (!expandedItems.length) {
        if (footer) footer.style.display = "none";
        return;
      }

      // Remove any listeners added by the old Wix-era gallery code.
      const btn = oldBtn.cloneNode(true);
      oldBtn.replaceWith(btn);

      expanded.removeAttribute("style");
      expanded.setAttribute("hidden", "");

      const label = btn.querySelector("span:first-child");
      const arrow = btn.querySelector(".cg-gallery-arrow");

      // Standardize the standalone control.
      const originalText = label ? label.textContent.trim() : "";
      const countMatch = originalText.match(/(\d+)/);
      const countText = countMatch ? " " + countMatch[1] + " images" : " images";
      if (label) label.textContent = "Browse all" + countText;
      if (arrow) arrow.textContent = "↓";
      btn.setAttribute("aria-expanded", "false");

      btn.addEventListener("click", event => {
        event.preventDefault();
        event.stopImmediatePropagation();

        expanded.removeAttribute("hidden");
        btn.setAttribute("aria-expanded", "true");

        // The action is intentionally one-way: once the user asks to browse all,
        // keep the complete gallery open for normal page scrolling.
        if (footer) footer.style.display = "none";

        requestAnimationFrame(() => {
          expanded.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        });
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupExpandableGalleries, { once: true });
  } else {
    setupExpandableGalleries();
  }

})();