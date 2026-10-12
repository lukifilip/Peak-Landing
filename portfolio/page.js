// Peak public portfolio: progressive enhancement only. Without it the page
// still shows everything essential; with it, the drill-in sheets, the
// carousel's dots, the header name, View All and calm image loading work.
(() => {
  'use strict';
  const doc = document;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // ── Images: fade in; fall back to the source, then to the placeholder ──
  const settle = (image) => image.classList.add('loaded');
  const fail = (image) => {
    const original = image.getAttribute('data-original');
    if (original && image.getAttribute('src') !== original) {
      image.removeAttribute('srcset');
      image.setAttribute('src', original);
      return;
    }
    image.remove(); // uncovers the initials, the glyph or the grey band
  };
  const watchImage = (image) => {
    if (image.complete) {
      if (image.naturalWidth > 0) settle(image); else if (image.getAttribute('src')) fail(image);
      return;
    }
    image.addEventListener('load', () => settle(image));
    image.addEventListener('error', () => fail(image));
  };
  doc.querySelectorAll('img.fade').forEach(watchImage);

  // ── Header: frosted once scrolled, the name once its capsule is gone ──
  const bar = doc.querySelector('[data-bar]');
  const nameEl = doc.getElementById('person-name');
  if (bar) {
    const onScroll = () => bar.classList.toggle('scrolled', window.scrollY > 2);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }
  if (bar && nameEl && 'IntersectionObserver' in window) {
    const barHeight = bar.getBoundingClientRect().height;
    new IntersectionObserver(([entry]) => {
      const gone = !entry.isIntersecting && entry.boundingClientRect.top < barHeight;
      bar.classList.toggle('named', gone);
    }, { rootMargin: `-${Math.round(barHeight)}px 0px 0px 0px`, threshold: 0 }).observe(nameEl);
  }

  // ── Expertise: View All expands in place ──
  doc.querySelectorAll('.view-all').forEach((button) => {
    const listEl = doc.getElementById(button.getAttribute('aria-controls'));
    if (!listEl) return;
    const more = button.textContent;
    const less = button.getAttribute('data-less');
    button.hidden = false;
    button.addEventListener('click', () => {
      const open = listEl.classList.toggle('expanded');
      button.setAttribute('aria-expanded', String(open));
      button.textContent = open ? less : more;
    });
  });

  // ── Featured carousel: dots follow the scroll; arrows on hover ──
  // From 768 px the CSS lays the pieces out as a grid, so they are announced
  // as a plain list there, and as a carousel of slides only below it.
  const grid = window.matchMedia('(min-width: 768px)');
  doc.querySelectorAll('.carousel').forEach((carousel) => {
    const track = carousel.querySelector('[data-track]');
    const dots = [...carousel.querySelectorAll('.pdot')];
    const slides = [...track.children];
    const prev = carousel.querySelector('[data-nav="-1"]');
    const next = carousel.querySelector('[data-nav="1"]');
    const describe = () => {
      const role = (el, name) => (grid.matches
        ? el.removeAttribute('aria-roledescription')
        : el.setAttribute('aria-roledescription', name));
      role(carousel, 'carousel');
      slides.forEach((slide) => role(slide, 'slide'));
    };
    describe();
    grid.addEventListener('change', describe);
    const step = () => (slides[1] ? slides[1].offsetLeft - slides[0].offsetLeft : track.clientWidth);
    const current = () => Math.max(0, Math.min(slides.length - 1, Math.round(track.scrollLeft / step())));
    let frame = 0;
    const update = () => {
      frame = 0;
      const i = current();
      dots.forEach((d, n) => d.classList.toggle('on', n === i));
      if (prev) prev.disabled = i === 0;
      if (next) next.disabled = i === slides.length - 1;
    };
    track.addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(update); }, { passive: true });
    [prev, next].forEach((button) => {
      if (!button) return;
      button.hidden = false;
      button.addEventListener('click', () => {
        const target = slides[current() + Number(button.getAttribute('data-nav'))];
        if (target) {
          track.scrollTo({
            left: target.offsetLeft - slides[0].offsetLeft,
            behavior: reduceMotion.matches ? 'auto' : 'smooth',
          });
        }
      });
    });
    update();
  });

  // ── Sheets: one <dialog>, its content picked by the URL hash ──
  //   #project-<key>, #company-<key>, #work
  // Each sheet is a history entry, so Back closes it and the link is
  // shareable. Content comes from <template>s already in the page.
  const sheet = doc.getElementById('sheet');
  if (!sheet || typeof sheet.showModal !== 'function') return;
  const content = doc.getElementById('sheet-content');
  const backButton = sheet.querySelector('.sheet-back');
  const closeButton = sheet.querySelector('.sheet-close');
  const route = (hash) => (/^#(project-[0-9a-f]+|company-[0-9a-f]+|work)$/.exec(hash || '') || [])[1] || null;

  let stack = [];       // sheet routes shown, oldest first
  let pushed = 0;       // history entries this page added for them
  let opener = null;    // where focus returns when the sheet closes
  let closeTimer = 0;

  const fitShowMore = () => {
    content.querySelectorAll('[data-clamp]').forEach((paragraph) => {
      const button = paragraph.parentElement.querySelector('.show-more');
      if (!button) return;
      button.hidden = paragraph.scrollHeight <= paragraph.clientHeight + 1;
      button.onclick = () => {
        const open = paragraph.classList.toggle('expanded');
        button.textContent = button.getAttribute(open ? 'data-less' : 'data-more');
        button.setAttribute('aria-expanded', String(open));
      };
    });
  };

  const render = (name) => {
    const template = doc.getElementById(`sheet-${name}`);
    if (!template) return false;
    content.replaceChildren(template.content.cloneNode(true));
    content.scrollTop = 0;
    const heading = content.querySelector('.sheet-title');
    if (heading) heading.id = 'sheet-heading';
    content.querySelectorAll('img.fade').forEach(watchImage);
    backButton.hidden = stack.length < 2;
    return true;
  };

  const open = (name) => {
    clearTimeout(closeTimer);
    if (!sheet.open) {
      const active = doc.activeElement;
      opener = active && active !== doc.body ? active : null;
      sheet.showModal();
      void sheet.offsetHeight; // start the slide-in from the closed position
      sheet.classList.add('is-open');
    }
    if (!render(name)) return;
    fitShowMore();
    const heading = content.querySelector('.sheet-title');
    (heading || closeButton).focus({ preventScroll: true });
  };

  const finishClose = () => {
    stack = [];
    pushed = 0;
    if (!sheet.open) return;
    sheet.classList.remove('is-open');
    closeTimer = setTimeout(() => {
      sheet.close();
      content.replaceChildren();
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
      opener = null;
    }, reduceMotion.matches ? 0 : 220);
  };

  // Close from the sheet itself: unwind the entries we added, or clear the
  // hash of a sheet the page was opened on.
  const requestClose = () => {
    if (pushed > 0) {
      history.go(-pushed);
    } else {
      history.replaceState(history.state, '', location.pathname + location.search);
      finishClose();
    }
  };

  const onRoute = () => {
    const name = route(location.hash);
    if (!name) { finishClose(); return; }
    if (stack.length > 1 && stack[stack.length - 2] === name) {
      stack.pop();                      // Back within the sheet
      pushed = Math.max(0, pushed - 1);
    } else if (stack[stack.length - 1] !== name) {
      stack.push(name);
    }
    open(name);
  };

  doc.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) return;
    const name = route(link.getAttribute('href'));
    if (!name || route(location.hash) === name) return;
    pushed += 1;                        // the browser adds the entry itself
  });
  window.addEventListener('hashchange', onRoute);
  closeButton.addEventListener('click', requestClose);
  backButton.addEventListener('click', () => history.back());
  sheet.addEventListener('cancel', (event) => { event.preventDefault(); requestClose(); });
  // A tap on the backdrop (outside the panel) closes it.
  sheet.addEventListener('click', (event) => {
    if (event.target !== sheet) return;
    const r = sheet.getBoundingClientRect();
    const inside = event.clientX >= r.left && event.clientX <= r.right &&
      event.clientY >= r.top && event.clientY <= r.bottom;
    if (!inside) requestClose();
  });

  if (route(location.hash)) onRoute();
})();
