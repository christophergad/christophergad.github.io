(() => {
  if (window.parent !== window) return;

  function localRoute(url) {
    if (!url || url === "/") return "/";
    if (/^https?:\/\//i.test(url)) return url;
    const hashIndex = url.indexOf("#");
    const hash = hashIndex >= 0 ? url.slice(hashIndex) : "";
    let path = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
    if (/\.[a-z0-9]+$/i.test(path)) return path + hash;
    return path.replace(/\/$/, "") + ".html" + hash;
  }

  function openExternal(url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function navigate(url) {
    if (/^https?:\/\//i.test(url)) return openExternal(url);
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
    let start = Number.isInteger(message.index) ? message.index : images.indexOf(message.url);
    show(start < 0 ? 0 : start);
  }

  function closeLightbox() {
    if (!overlay) return;
    overlay.classList.remove("is-open");
    document.documentElement.classList.remove("cg-lightbox-open");
  }

  window.addEventListener("message", event => {
    const message = event.data || {};
    if (message.type === "navigate" && message.url) navigate(message.url);
    if (message.type === "externalNavigate" && message.url) openExternal(message.url);
    if (message.type === "openProjectImage" && message.url) openLightbox(message);
  });

  document.querySelectorAll("a[data-wix-route]").forEach(a => {
    const route = a.getAttribute("data-wix-route");
    if (route) {
      a.href = localRoute(route);
      a.removeAttribute("target");
    }
  });
})();