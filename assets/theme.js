/* ============================================================
   COBALT BLUE — THEME JS
   ============================================================ */

(function () {
  'use strict';

  /* ---- UTILS ---- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  function formatMoney(cents) {
    if (typeof cents === 'string') cents = cents.replace(/[^0-9]/g, '');
    cents = parseInt(cents, 10);
    const fmt = window.moneyFormat || '${{amount}}';
    const amount = (cents / 100).toFixed(2);
    return fmt.replace('{{amount}}', amount).replace('{{amount_no_decimals}}', Math.round(cents / 100));
  }

  /* ---- TOAST ---- */
  const toast = $('#toast');
  const toastMsg = $('#toastMsg');
  let toastTimer;
  function showToast(msg) {
    if (!toast || !toastMsg) return;
    toastMsg.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  /* ---- SEARCH MODAL ---- */
  function initSearch() {
    const modal = $('#searchModal');
    const openBtns = $$('[data-open-search]');
    const closeBtn = $('#searchModalClose');
    const input = $('#searchModalInput');
    const results = $('#searchModalResults');
    if (!modal) return;

    function openModal() {
      modal.classList.add('open');
      modal.removeAttribute('aria-hidden');
      setTimeout(() => input && input.focus(), 80);
      document.body.style.overflow = 'hidden';
    }
    function closeModal() {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    openBtns.forEach(b => b.addEventListener('click', openModal));
    closeBtn && closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

    /* Predictive Search */
    if (!input || !results) return;
    let searchTimer;
    input.addEventListener('input', () => {
      clearTimeout(searchTimer);
      const q = input.value.trim();
      if (q.length < 2) {
        results.innerHTML = '';
        return;
      }
      searchTimer = setTimeout(() => fetchPredictive(q), 280);
    });

    function fetchPredictive(q) {
      const url = `${window.routes.predictive_search_url}?q=${encodeURIComponent(q)}&resources[type]=product,page&resources[limit]=5&section_id=predictive-search`;
      fetch(url)
        .then(r => r.text())
        .then(html => {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const section = doc.querySelector('#shopify-section-predictive-search');
          if (section) {
            results.innerHTML = section.innerHTML;
          }
        })
        .catch(() => {});
    }
  }

  /* ---- ANNOUNCEMENT MARQUEE DUPLICATE ---- */
  function initAnnounce() {
    const track = $('#announceTrack');
    if (!track || track.children.length === 0) return;
    const originalContent = track.innerHTML;
    track.innerHTML = originalContent + originalContent;
  }

  /* ---- CART DRAWER ---- */
  const cartOverlay = $('#cartOverlay');
  const cartDrawer = $('#cartDrawer');
  const cartClose = $('#cartClose');
  const cartItemsEl = $('#cartItems');
  const cartFooter = $('#cartFooter');
  const cartSubtotalEl = $('#cartSubtotal');
  const cartGrandtotalEl = $('#cartGrandtotal');

  function openCart() {
    if (!cartDrawer) return;
    cartDrawer.classList.add('show');
    cartOverlay && cartOverlay.classList.add('show');
    cartDrawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    cartClose && cartClose.focus();
  }
  function closeCart() {
    if (!cartDrawer) return;
    cartDrawer.classList.remove('show');
    cartOverlay && cartOverlay.classList.remove('show');
    cartDrawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  const cartBtns = $$('[data-open-cart]');
  cartBtns.forEach(b => b.addEventListener('click', openCart));
  cartClose && cartClose.addEventListener('click', closeCart);
  cartOverlay && cartOverlay.addEventListener('click', closeCart);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && cartDrawer && cartDrawer.classList.contains('show')) closeCart();
  });

  /* Fetch and render cart */
  function fetchCart() {
    fetch('/cart.js')
      .then(r => r.json())
      .then(cart => renderCartDrawer(cart))
      .catch(() => {});
  }

  function renderCartDrawer(cart) {
    if (!cartItemsEl) return;
    const countEl = $('#cartCount');
    if (countEl) {
      countEl.textContent = cart.item_count;
      countEl.classList.add('bump');
      setTimeout(() => countEl.classList.remove('bump'), 320);
    }

    if (cart.items.length === 0) {
      cartItemsEl.innerHTML = '<p class="cart-empty">Your cart is empty.<br>Time to shield your ride.</p>';
    } else {
      cartItemsEl.innerHTML = cart.items.map(item => `
        <div class="cart-item">
          <div class="thumb">
            ${item.image
              ? `<img src="${item.image}" alt="${item.product_title}" loading="lazy">`
              : `<span>${item.product_title.charAt(0)}</span>`}
          </div>
          <div class="info">
            <div class="name">${item.product_title}${item.variant_title && item.variant_title !== 'Default Title' ? ` — ${item.variant_title}` : ''}</div>
            <div class="price">${formatMoney(item.final_price)}</div>
            ${item.selling_plan_allocation ? `<div class="cart-item__plan">${item.selling_plan_allocation.selling_plan.name}</div>` : ''}
            <div class="qty">
              <button data-action="dec" data-key="${item.key}" aria-label="Decrease quantity">−</button>
              <span>${item.quantity}</span>
              <button data-action="inc" data-key="${item.key}" aria-label="Increase quantity">+</button>
            </div>
          </div>
          <button data-action="rm" data-key="${item.key}" style="background:transparent;border:0;color:var(--text-3);cursor:pointer;font-size:18px;padding:4px;" aria-label="Remove item">×</button>
        </div>
      `).join('');
    }

    if (cartSubtotalEl) cartSubtotalEl.textContent = formatMoney(cart.total_price);
    if (cartGrandtotalEl) cartGrandtotalEl.textContent = formatMoney(cart.total_price);
  }

  /* Cart item actions */
  cartItemsEl && cartItemsEl.addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const key = btn.dataset.key;
    const action = btn.dataset.action;
    const item = cartItemsEl.querySelector(`[data-key="${key}"]`);
    const qtySpan = item && item.closest('.cart-item').querySelector('.qty span');
    const currentQty = qtySpan ? parseInt(qtySpan.textContent) : 1;

    let newQty = action === 'inc' ? currentQty + 1 : action === 'dec' ? currentQty - 1 : 0;
    updateCartItem(key, newQty);
  });

  function updateCartItem(key, qty) {
    fetch(window.routes.cart_change_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ id: key, quantity: qty })
    })
      .then(r => r.json())
      .then(cart => renderCartDrawer(cart))
      .catch(() => {});
  }

  /* Add to cart */
  function addToCart(formData) {
    return fetch(window.routes.cart_add_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify(formData)
    }).then(r => r.json());
  }

  /* Buy Now / Add to Cart buttons (non-product-page) */
  $$('[data-add-to-cart]').forEach(btn => {
    btn.addEventListener('click', () => {
      const variantId = btn.dataset.variantId;
      const qty = parseInt(btn.dataset.qty || 1);
      if (!variantId) return;
      addToCart({ id: variantId, quantity: qty })
        .then(item => {
          fetchCart();
          showToast(`Added ${item.product_title} to cart`);
          openCart();
        })
        .catch(() => showToast('Error adding to cart'));
    });
  });

  /* ---- PRODUCT PAGE ---- */
  function initProductPage() {
    const form = $('#product-form');
    if (!form) return;

    /* Variant selection */
    const variantData = JSON.parse($('#variant-data')?.textContent || '[]');
    const optionSelectors = $$('.product-options__values');
    const priceEl = $('.product-price');
    const priceCompareEl = $('.product-price-compare');
    const addBtn = $('#addToCartBtn');
    const unitPriceEl = $('.product-unit-price');
    const mediaMain = $('.product-media-main img');

    let selectedOptions = [];

    // Init selected options from active buttons
    $$('[data-option-position]').forEach(btn => {
      if (btn.classList.contains('active')) {
        const pos = parseInt(btn.dataset.optionPosition) - 1;
        selectedOptions[pos] = btn.dataset.optionValue;
      }
    });

    function findVariant() {
      return variantData.find(v =>
        v.options.every((opt, i) => opt === selectedOptions[i])
      );
    }

    function updateUI(variant) {
      if (!variant) {
        if (addBtn) { addBtn.disabled = true; addBtn.textContent = 'Unavailable'; }
        return;
      }
      // Update price
      if (priceEl) priceEl.textContent = formatMoney(variant.price);
      if (priceCompareEl) {
        if (variant.compare_at_price > variant.price) {
          priceCompareEl.textContent = formatMoney(variant.compare_at_price);
          priceCompareEl.style.display = '';
        } else {
          priceCompareEl.style.display = 'none';
        }
      }
      // Update add button
      if (addBtn) {
        addBtn.disabled = !variant.available;
        const formVariantInput = form.querySelector('[name="id"]');
        if (formVariantInput) formVariantInput.value = variant.id;
        if (!variant.available) {
          addBtn.textContent = 'Sold Out';
        } else {
          addBtn.innerHTML = 'Add to Cart <span class="arrow" aria-hidden="true">↗</span>';
        }
      }
      // Unit price
      if (unitPriceEl && variant.unit_price) {
        unitPriceEl.textContent = `${formatMoney(variant.unit_price)} / ${variant.unit_price_measurement?.reference_value || 1} ${variant.unit_price_measurement?.reference_unit || ''}`;
        unitPriceEl.style.display = '';
      } else if (unitPriceEl) {
        unitPriceEl.style.display = 'none';
      }
      // Variant image
      if (variant.featured_image && mediaMain) {
        const src = variant.featured_image.src;
        mediaMain.src = src + '&width=800';
        mediaMain.srcset = `${src}&width=400 400w, ${src}&width=800 800w, ${src}&width=1200 1200w`;
      }
      // Update URL
      if (window.history.replaceState) {
        const url = new URL(window.location.href);
        url.searchParams.set('variant', variant.id);
        window.history.replaceState({}, '', url.toString());
      }
    }

    $$('[data-option-position]').forEach(btn => {
      btn.addEventListener('click', () => {
        const pos = parseInt(btn.dataset.optionPosition) - 1;
        const val = btn.dataset.optionValue;
        // Deselect siblings
        const siblings = $$(`[data-option-position="${pos + 1}"]`);
        siblings.forEach(s => s.classList.remove('active'));
        btn.classList.add('active');
        selectedOptions[pos] = val;
        updateUI(findVariant());
      });
    });

    // Quantity
    const qtyInput = $('#productQty');
    const qtyDec = $('#qtyDec');
    const qtyInc = $('#qtyInc');
    if (qtyInput && qtyDec && qtyInc) {
      qtyDec.addEventListener('click', () => {
        const v = Math.max(1, parseInt(qtyInput.value) - 1);
        qtyInput.value = v;
      });
      qtyInc.addEventListener('click', () => {
        qtyInput.value = parseInt(qtyInput.value) + 1;
      });
    }

    // Add to Cart submit
    form.addEventListener('submit', e => {
      e.preventDefault();
      const variantId = form.querySelector('[name="id"]')?.value;
      const qty = parseInt(qtyInput?.value || 1);
      if (!variantId) return;
      const btn = addBtn;
      if (btn) { btn.disabled = true; btn.textContent = 'Adding…'; }
      addToCart({ id: variantId, quantity: qty })
        .then(item => {
          fetchCart();
          showToast(`Added ${item.product_title} to cart`);
          openCart();
        })
        .catch(() => showToast('Error adding to cart'))
        .finally(() => {
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'Add to Cart <span class="arrow" aria-hidden="true">↗</span>';
          }
        });
    });

    // Thumbnail switching
    $$('.product-thumb').forEach(thumb => {
      thumb.addEventListener('click', () => {
        $$('.product-thumb').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
        const imgSrc = thumb.dataset.src;
        if (mediaMain && imgSrc) {
          mediaMain.src = imgSrc + '&width=800';
        }
      });
    });
  }

  /* ---- FAQ ACCORDION ---- */
  function initFaq() {
    $$('.faq-item').forEach(item => {
      const btn = item.querySelector('.faq-q');
      if (!btn) return;
      btn.addEventListener('click', () => {
        const wasOpen = item.classList.contains('open');
        $$('.faq-item').forEach(i => i.classList.remove('open'));
        if (!wasOpen) item.classList.add('open');
      });
    });
  }

  /* ---- COUNT UP ---- */
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function countUp(el) {
    const target = parseInt(el.dataset.count, 10);
    if (!target) return;
    const dur = 1800;
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / dur);
      const v = Math.floor(target * easeOutCubic(t));
      el.textContent = v.toLocaleString() + '+';
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = target.toLocaleString() + '+';
    }
    requestAnimationFrame(tick);
  }

  /* ---- SCROLL REVEAL & ANIMATIONS ---- */
  function initReveal() {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          // Animate rating bars
          if (e.target.id === 'rsBars' || e.target.closest('#rsBars')) {
            $$('#rsBars .fill').forEach(f => { f.style.width = f.dataset.w + '%'; });
          }
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });

    $$('.reveal').forEach(el => io.observe(el));

    // Count up for proof bar
    const proof = $('.proof');
    if (proof) {
      const ioCount = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.querySelectorAll('[data-count]').forEach(countUp);
            ioCount.unobserve(e.target);
          }
        });
      }, { threshold: 0.4 });
      ioCount.observe(proof);
    }

    // Fade-in car image in Why Choose section
    const carImg = $('.why-center__img');
    if (carImg) {
      const ioImg = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('fade-in');
            ioImg.unobserve(e.target);
          }
        });
      }, { threshold: 0.2 });
      ioImg.observe(carImg);
    }
  }

  /* ---- SMOOTH SCROLL ---- */
  function initSmoothScroll() {
    $$('[data-scroll]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        const target = document.querySelector(el.getAttribute('data-scroll'));
        if (target) {
          const top = target.getBoundingClientRect().top + window.scrollY - 100;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      });
    });
  }

  /* ---- MOBILE NAV ---- */
  function initMobileNav() {
    const toggle = $('#mobileNavToggle');
    const drawer = $('#mobileNavDrawer');
    const close = $('#mobileNavClose');
    if (!toggle || !drawer) return;

    toggle.addEventListener('click', () => {
      drawer.classList.add('open');
      drawer.removeAttribute('aria-hidden');
      document.body.style.overflow = 'hidden';
    });
    close && close.addEventListener('click', closeMobileNav);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMobileNav(); });

    function closeMobileNav() {
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }

  /* ---- NEWSLETTER FORM ---- */
  function initNewsletter() {
    $$('.newsletter-form').forEach(form => {
      form.addEventListener('submit', e => {
        e.preventDefault();
        const input = form.querySelector('input[type="email"]');
        if (!input || !input.value) return;
        form.innerHTML = '<p class="form-success">Thank you! You\'re now subscribed.</p>';
      });
    });
  }

  /* ---- COLLECTION SORT ---- */
  function initCollectionSort() {
    const sortSelect = $('.sort-select');
    if (!sortSelect) return;
    sortSelect.addEventListener('change', () => {
      const url = new URL(window.location.href);
      url.searchParams.set('sort_by', sortSelect.value);
      window.location.href = url.toString();
    });
  }

  /* ---- LOCALE FORM ---- */
  function initLocaleForm() {
    $$('.locale-form select').forEach(sel => {
      sel.addEventListener('change', () => {
        sel.closest('form') && sel.closest('form').submit();
      });
    });
  }

  /* ---- INIT ---- */
  document.addEventListener('DOMContentLoaded', () => {
    initAnnounce();
    initSearch();
    initFaq();
    initReveal();
    initSmoothScroll();
    initMobileNav();
    initNewsletter();
    initCollectionSort();
    initLocaleForm();
    initProductPage();
    fetchCart();
  });

  /* ---- SHOPIFY SECTION EVENTS (design mode) ---- */
  document.addEventListener('shopify:section:load', () => {
    initFaq();
    initReveal();
    initMobileNav();
  });

})();
