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

  let overlay, imageEl, prevBtn, nextBtn, counter, thumbnailsEl, lightboxContent;
  let images = [], imageAlts = [], index = 0, galleryBrowserMode = false;

  function ensureLightbox() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.className = "cg-standalone-lightbox";
    overlay.innerHTML = `
      <div class="cg-lightbox-content" role="dialog" aria-modal="true" aria-label="Project image gallery">
        <button class="cg-lightbox-close" aria-label="Close image">×</button>
        <div class="cg-lightbox-viewer">
          <button class="cg-lightbox-nav cg-lightbox-prev" aria-label="Previous image">‹</button>
          <figure class="cg-lightbox-figure">
            <img class="cg-lightbox-image" alt="Project image">
            <figcaption class="cg-lightbox-counter"></figcaption>
          </figure>
          <button class="cg-lightbox-nav cg-lightbox-next" aria-label="Next image">›</button>
        </div>
        <div class="cg-lightbox-thumbnails" aria-label="All gallery images"></div>
      </div>`;
    document.body.appendChild(overlay);

    lightboxContent = overlay.querySelector(".cg-lightbox-content");
    imageEl = overlay.querySelector(".cg-lightbox-image");
    prevBtn = overlay.querySelector(".cg-lightbox-prev");
    nextBtn = overlay.querySelector(".cg-lightbox-next");
    counter = overlay.querySelector(".cg-lightbox-counter");
    thumbnailsEl = overlay.querySelector(".cg-lightbox-thumbnails");

    overlay.querySelector(".cg-lightbox-close").onclick = closeLightbox;
    overlay.addEventListener("click", e => {
      if (e.target === overlay) closeLightbox();
    });
    prevBtn.onclick = () => show(index - 1);
    nextBtn.onclick = () => show(index + 1);

    document.addEventListener("keydown", e => {
      if (!overlay.classList.contains("is-open")) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") show(index - 1);
      if (e.key === "ArrowRight") show(index + 1);
    });
  }

  function renderGalleryThumbnails() {
    ensureLightbox();
    thumbnailsEl.innerHTML = "";

    if (!galleryBrowserMode || images.length <= 1) {
      thumbnailsEl.hidden = true;
      overlay.classList.remove("is-gallery-browser");
      return;
    }

    overlay.classList.add("is-gallery-browser");
    thumbnailsEl.hidden = false;

    images.forEach((url, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cg-lightbox-thumb";
      btn.setAttribute("aria-label", `View image ${i + 1} of ${images.length}`);
      btn.innerHTML = `<img src="${url}" alt="">`;
      btn.addEventListener("click", () => {
        show(i);
        requestAnimationFrame(() => {
          overlay.scrollTo({ top: 0, behavior: "smooth" });
        });
      });
      thumbnailsEl.appendChild(btn);
    });
  }

  function updateSelectedThumbnail() {
    if (!thumbnailsEl || thumbnailsEl.hidden) return;
    thumbnailsEl.querySelectorAll(".cg-lightbox-thumb").forEach((btn, i) => {
      btn.classList.toggle("is-selected", i === index);
      btn.setAttribute("aria-current", i === index ? "true" : "false");
    });
  }

  function show(nextIndex) {
    ensureLightbox();
    if (!images.length) return;
    index = (nextIndex + images.length) % images.length;
    imageEl.src = images[index];
    imageEl.alt = imageAlts[index] || `Project image ${index + 1} of ${images.length}`;
    counter.textContent = images.length > 1 ? `${index + 1} / ${images.length}` : "";
    prevBtn.hidden = nextBtn.hidden = images.length <= 1;
    updateSelectedThumbnail();
    overlay.classList.add("is-open");
    document.documentElement.classList.add("cg-lightbox-open");
  }

  function openLightbox(message, browserMode = false) {
    images = Array.isArray(message.images) && message.images.length
      ? message.images.filter(Boolean)
      : [message.url].filter(Boolean);

    imageAlts = Array.isArray(message.alts) && message.alts.length
      ? message.alts
      : images.map((_, i) => i === message.index ? (message.alt || "") : "");

    if (!images.length) return;

    galleryBrowserMode = browserMode;
    const requested = Number.isInteger(message.index) ? message.index : images.indexOf(message.url);
    renderGalleryThumbnails();
    show(requested < 0 ? 0 : requested);

    requestAnimationFrame(() => {
      overlay.scrollTop = 0;
    });
  }

  function closeLightbox() {
    if (!overlay) return;
    overlay.classList.remove("is-open", "is-gallery-browser");
    document.documentElement.classList.remove("cg-lightbox-open");
    galleryBrowserMode = false;
    if (thumbnailsEl) {
      thumbnailsEl.hidden = true;
      thumbnailsEl.innerHTML = "";
    }
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

  function setupGalleryBrowsers() {
    document.querySelectorAll("[data-cg-expand]").forEach(oldBtn => {
      const key = oldBtn.getAttribute("data-cg-expand");
      if (!key) return;

      const expanded = document.querySelector('[data-cg-expanded="' + CSS.escape(key) + '"]');
      if (!expanded) return;

      const items = Array.from(expanded.querySelectorAll("[data-cg-image]"))
        .map(el => {
          const img = el.querySelector("img");
          return {
            url: (el.getAttribute("data-cg-image") || "").trim(),
            alt: (img && img.alt) || "Project image"
          };
        })
        .filter(item => item.url);

      const footer = oldBtn.closest(".cg-gallery-footer");
      if (!items.length) {
        if (footer) footer.style.display = "none";
        return;
      }

      // Keep the complete source gallery hidden on the page. It is now used only
      // as the data source for the standalone gallery-browser lightbox.
      expanded.setAttribute("hidden", "");
      expanded.style.display = "none";

      // Clone to remove any legacy Wix-era click listeners.
      const btn = oldBtn.cloneNode(true);
      oldBtn.replaceWith(btn);

      const label = btn.querySelector("span:first-child");
      const arrow = btn.querySelector(".cg-gallery-arrow");
      if (label) label.textContent = `Browse all ${items.length} images`;
      if (arrow) arrow.textContent = "→";

      btn.addEventListener("click", event => {
        event.preventDefault();
        event.stopImmediatePropagation();

        openLightbox({
          url: items[0].url,
          alt: items[0].alt,
          images: items.map(item => item.url),
          alts: items.map(item => item.alt),
          index: 0
        }, true);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupGalleryBrowsers, { once: true });
  } else {
    setupGalleryBrowsers();
  }

})();