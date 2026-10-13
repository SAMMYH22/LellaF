/**
 * LELLA — MAIN SCRIPT
 * Basket management, product rendering, filters, scroll animations, WhatsApp order
 */

// ─────────────────────────────────────────
// BASKET (localStorage)
// ─────────────────────────────────────────

const BASKET_KEY = 'lella_basket';

function getBasket() {
    try { return JSON.parse(localStorage.getItem(BASKET_KEY)) || []; }
    catch { return []; }
}

function saveBasket(basket) {
    localStorage.setItem(BASKET_KEY, JSON.stringify(basket));
}

function addToBasket(productId, variantId, quantity = 1) {
    const basket   = getBasket();
    const product  = getProductById(productId);
    const variant  = getProductVariant(productId, variantId);
    if (!product || !variant) return;

    const idx = basket.findIndex(i => i.productId === productId && i.variantId === variantId);
    if (idx > -1) {
        basket[idx].quantity += quantity;
    } else {
        basket.push({ productId, variantId, quantity, productName: product.name,
            variantWeight: variant.weight, price: variant.price, image: variant.image });
    }
    saveBasket(basket);
    updateBasketCount();
    showNotification('<i class="fa-solid fa-circle-check me-2"></i>Produit ajouté au panier !', 'success');
}

function removeFromBasket(productId, variantId) {
    saveBasket(getBasket().filter(i => !(i.productId === productId && i.variantId === variantId)));
    updateBasketCount();
    if (window.location.pathname.includes('basket.html')) renderBasket();
}

function updateBasketQuantity(productId, variantId, quantity) {
    if (quantity <= 0) { removeFromBasket(productId, variantId); return; }
    const basket = getBasket();
    const item   = basket.find(i => i.productId === productId && i.variantId === variantId);
    if (item) {
        item.quantity = quantity;
        saveBasket(basket);
        updateBasketCount();
        if (window.location.pathname.includes('basket.html')) renderBasket();
    }
}

function clearBasket() {
    localStorage.removeItem(BASKET_KEY);
    updateBasketCount();
}

function getBasketCount() {
    return getBasket().reduce((t, i) => t + i.quantity, 0);
}

function getBasketTotal() {
    return getBasket().reduce((t, i) => t + i.price * i.quantity, 0);
}

function updateBasketCount() {
    const count = getBasketCount();
    document.querySelectorAll('#basketCount').forEach(el => {
        el.textContent = count;
        el.style.display = count > 0 ? 'inline-block' : 'none';
    });
    document.querySelectorAll('#floatingCartCount').forEach(el => {
        el.textContent = count;
        el.style.display = count > 0 ? 'flex' : 'none';
    });
}

// ─────────────────────────────────────────
// PRODUCT RENDERING
// ─────────────────────────────────────────

function renderProducts(filterCategory = 'all') {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    grid.innerHTML = '';
    let count = 0;

    PRODUCTS.forEach(product => {
        if (filterCategory !== 'all' && product.category !== filterCategory) return;
        product.variants.forEach(variant => {
            grid.appendChild(createProductCard(product, variant));
            count++;
        });
    });

    // Update count label
    const countEl = document.getElementById('filterCount');
    if (countEl) countEl.textContent = count + ' produit' + (count !== 1 ? 's' : '');

    // Empty state
    const noResults = document.getElementById('noResults');
    if (noResults) noResults.style.display = count === 0 ? 'block' : 'none';

    // Re-run card animations on the new cards
    observeCards();
}

function createProductCard(product, variant) {
    const col = document.createElement('div');
    col.className = 'col-6 col-md-6 col-lg-4';
    col.dataset.category = product.category;

    col.innerHTML = `
        <div class="product-card card h-100 animate-card">
            <img src="${variant.image}" class="card-img-top product-image"
                 alt="${product.name} ${variant.weight}" loading="lazy">
            <div class="card-body d-flex flex-column">
                <h5 class="card-title">${product.name}</h5>
                <p class="text-muted mb-1" style="font-size:.85rem">
                    <i class="fa-solid fa-weight-hanging me-1"></i>${variant.weight}
                </p>
                <p class="card-text text-muted small mb-3">${product.description}</p>
                <div class="mt-auto">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <span class="h5 text-primary mb-0" style="font-family:'Playfair Display',serif">
                            ${formatPrice(variant.price)}
                        </span>
                        <span class="badge" style="background:var(--green-light);color:var(--green);font-size:.72rem">
                            <i class="fa-solid fa-star-and-crescent me-1"></i>Halal
                        </span>
                    </div>
                    <button class="btn btn-primary w-100 add-to-basket-btn"
                            data-product-id="${product.id}"
                            data-variant-id="${variant.id}">
                        <i class="fa-solid fa-cart-plus me-2"></i>Ajouter au panier
                    </button>
                </div>
            </div>
        </div>`;

    col.querySelector('.add-to-basket-btn').addEventListener('click', () => {
        addToBasket(product.id, variant.id, 1);
    });

    return col;
}

// ─────────────────────────────────────────
// FILTER BUTTONS
// ─────────────────────────────────────────

function initFilterButtons() {
    const btns = document.querySelectorAll('.filter-btn');
    if (!btns.length) return;

    btns.forEach(btn => {
        btn.addEventListener('click', function () {
            btns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            renderProducts(this.dataset.filter);
        });
    });

    // Initial count
    renderProducts('all');
}

// ─────────────────────────────────────────
// BASKET RENDERING
// ─────────────────────────────────────────

function renderBasket() {
    const itemsEl   = document.getElementById('basketItems');
    const emptyEl   = document.getElementById('emptyBasket');
    const contentEl = document.getElementById('basketContent');
    const orderBtn  = document.getElementById('orderWhatsAppBtn');

    if (!itemsEl) return;
    const basket = getBasket();

    if (basket.length === 0) {
        if (emptyEl)   emptyEl.style.display   = 'block';
        if (contentEl) contentEl.style.display = 'none';
        if (orderBtn)  orderBtn.disabled = true;
        return;
    }

    if (emptyEl)   emptyEl.style.display   = 'none';
    if (contentEl) contentEl.style.display = 'block';
    if (orderBtn)  orderBtn.disabled = false;

    itemsEl.innerHTML = '';
    basket.forEach(item => itemsEl.appendChild(createBasketItem(item)));
    updateBasketTotals();
}

function createBasketItem(item) {
    const div = document.createElement('div');
    div.className = 'basket-item card mb-3';
    const itemTotal = item.price * item.quantity;

    div.innerHTML = `
        <div class="card-body">
            <div class="row align-items-center g-2">
                <div class="col-3 col-md-2">
                    ${item.image ? `<img src="${item.image}" class="img-fluid rounded" alt="${item.productName}">` : `<div class="basket-ph"><i class="fa-solid fa-drumstick-bite"></i></div>`}
                </div>
                <div class="col-9 col-md-4">
                    <h6 class="mb-1" style="font-size:.95rem">${item.productName}</h6>
                    <p class="text-muted mb-0" style="font-size:.82rem">
                        ${item.variantWeight ? `<i class="fa-solid fa-weight-hanging me-1"></i>${item.variantWeight}` : ""}
                    </p>
                    <p class="text-primary mb-0" style="font-size:.9rem;font-weight:600">
                        ${formatPrice(item.price)}
                    </p>
                </div>
                <div class="col-6 col-md-3">
                    <div class="input-group input-group-sm">
                        <button class="btn btn-outline-secondary quantity-btn" data-action="decrease">
                            <i class="fa-solid fa-minus"></i>
                        </button>
                        <input type="number" class="form-control text-center quantity-input"
                               value="${item.quantity}" min="1">
                        <button class="btn btn-outline-secondary quantity-btn" data-action="increase">
                            <i class="fa-solid fa-plus"></i>
                        </button>
                    </div>
                </div>
                <div class="col-4 col-md-2 text-end">
                    <strong class="text-primary" style="font-size:.95rem">${formatPrice(itemTotal)}</strong>
                </div>
                <div class="col-2 col-md-1 text-end">
                    <button class="btn btn-sm btn-outline-danger remove-item-btn" aria-label="Supprimer">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>
        </div>`;

    div.querySelector('.remove-item-btn').addEventListener('click', () =>
        removeFromBasket(item.productId, item.variantId));

    const input = div.querySelector('.quantity-input');
    input.addEventListener('change', () => {
        updateBasketQuantity(item.productId, item.variantId, parseInt(input.value) || 1);
    });

    div.querySelectorAll('.quantity-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const cur = parseInt(input.value) || 1;
            const next = btn.dataset.action === 'increase' ? cur + 1 : Math.max(1, cur - 1);
            input.value = next;
            updateBasketQuantity(item.productId, item.variantId, next);
        });
    });

    return div;
}

function updateBasketTotals() {
    const el = document.getElementById('total');
    if (el) el.textContent = formatPrice(getBasketTotal());
}

// ─────────────────────────────────────────
// WHATSAPP ORDER
// ─────────────────────────────────────────

function generateWhatsAppOrder() {
    const basket = getBasket();
    if (!basket.length) { showNotification('Votre panier est vide', 'warning'); return; }

    let msg = "🍗 *Commande LELLA*\n\n";
    msg += "Bonjour, je souhaite passer la commande suivante :\n\n";

    let total = 0;
    basket.forEach((item, i) => {
        const sub = item.price * item.quantity;
        total += sub;
        msg += `${i + 1}. *${item.productName}*${item.variantWeight ? ' (' + item.variantWeight + ')' : ''}\n`;
        msg += `   Qté : ${item.quantity}  ×  ${formatPrice(item.price)} = ${formatPrice(sub)}\n\n`;
    });

    msg += `*Total : ${formatPrice(total)}*\n\nMerci ! 🙏`;

    window.open(`https://wa.me/224629853624?text=${encodeURIComponent(msg)}`, '_blank');

    setTimeout(() => {
        clearBasket();
        renderBasket();
        showNotification('<i class="fa-brands fa-whatsapp me-2"></i>Commande envoyée ! Panier vidé.', 'success');
    }, 1500);
}

// ─────────────────────────────────────────
// FEATURED PRODUCTS
// ─────────────────────────────────────────

function renderFeaturedProducts() {
    const container = document.getElementById('featuredProducts');
    if (!container) return;
    container.innerHTML = '';

    PRODUCTS.slice(0, 3).forEach(product => {
        const variant = product.variants[0];
        const col = document.createElement('div');
        col.className = 'col-6 col-md-6 col-lg-4';

        col.innerHTML = `
            <div class="featured-product-card card h-100 animate-card">
                <img src="${variant.image}" class="card-img-top featured-product-image"
                     alt="${product.name}" loading="lazy">
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${product.name}</h5>
                    <p class="text-muted mb-1" style="font-size:.85rem">
                        <i class="fa-solid fa-weight-hanging me-1"></i>${variant.weight}
                    </p>
                    <p class="card-text text-muted small mb-3">${product.description}</p>
                    <div class="mt-auto">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <span class="h5 text-primary mb-0" style="font-family:'Playfair Display',serif">
                                ${formatPrice(variant.price)}
                            </span>
                            <span class="badge" style="background:var(--green-light);color:var(--green);font-size:.72rem">
                                <i class="fa-solid fa-star-and-crescent me-1"></i>Halal
                            </span>
                        </div>
                        <a href="products.html" class="btn btn-primary w-100">
                            <i class="fa-solid fa-eye me-2"></i>Voir les options
                        </a>
                    </div>
                </div>
            </div>`;

        container.appendChild(col);
    });

    // Observe the newly added cards
    observeCards();
}

// ─────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────

function formatPrice(price) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency', currency: 'GNF', minimumFractionDigits: 0
    }).format(price);
}

function showNotification(html, type = 'info') {
    const n = document.createElement('div');
    n.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show
                   position-fixed top-0 start-50 translate-middle-x mt-3`;
    n.style.cssText = 'z-index:9999;min-width:300px;max-width:90vw';
    n.innerHTML = `${html}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fermer"></button>`;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3500);
}

// ─────────────────────────────────────────
// SCROLL ANIMATIONS
// ─────────────────────────────────────────

let cardObserver = null;

/**
 * Observe elements with class `.reveal` — slide-up on scroll.
 * Observe elements with class `.animate-card` — staggered fade-up.
 * Call this once on DOMContentLoaded, and again after dynamic renders.
 */
function initScrollAnimations() {
    // ── Section / block reveal ──
    const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.reveal').forEach(el => {
        if (!el.classList.contains('visible')) revealObserver.observe(el);
    });

    // ── Card stagger ──
    observeCards();
}

/**
 * Separate function so it can be called after dynamic renders
 * without re-creating the section observer.
 */
function observeCards() {
    if (cardObserver) cardObserver.disconnect();

    cardObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const row = entry.target.closest('.row');
            const cards = row
                ? row.querySelectorAll('.animate-card:not(.card-visible)')
                : [entry.target];

            cards.forEach((card, i) => {
                setTimeout(() => card.classList.add('card-visible'), i * 100);
            });

            if (row) {
                row.querySelectorAll('.animate-card').forEach(c => cardObserver.unobserve(c));
            } else {
                cardObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

    document.querySelectorAll('.animate-card:not(.card-visible)').forEach(card => {
        cardObserver.observe(card);
    });
}

// ─────────────────────────────────────────
// NAVBAR SCROLL EFFECT
// ─────────────────────────────────────────

function initNavbarScroll() {
    const nav = document.getElementById('mainNav');
    if (!nav) return;
    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            nav.style.boxShadow = '0 2px 20px rgba(0,0,0,.12)';
        } else {
            nav.style.boxShadow = '';
        }
    }, { passive: true });
}

// ─────────────────────────────────────────
// INIT
// ─────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    updateBasketCount();
    initNavbarScroll();

    if (document.getElementById('featuredProducts')) {
        renderFeaturedProducts();
    }

    initScrollAnimations();
});
