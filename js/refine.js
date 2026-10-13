/* LELLA refinement: preloader + one-card-per-product with weight picker (overrides script.js renderers) */
(function () {
    var pre = document.getElementById('preloader');
    if (pre) setTimeout(function () {
        pre.classList.add('done');
        document.documentElement.classList.remove('pre');
        try { sessionStorage.lellaSeen = 1; } catch (e) {}
    }, 1100);
})();

/* Photo by file name with icon fallback: tries .webp, .jpg, .jpeg, .png; if none exists the icon stays */
function loadPhoto(tile, p, base) {
    var ext = ['webp', 'jpg', 'jpeg', 'png'], i = 0, im = new Image();
    im.alt = p.name;
    im.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .35s';
    im.onload = function () {
        tile.appendChild(im);
        requestAnimationFrame(function () { im.style.opacity = 1; });
        p.variants.forEach(function (v) { v.image = im.getAttribute('src'); });
    };
    im.onerror = function () { if (++i < ext.length) im.src = base + '.' + ext[i]; };
    im.src = base + '.' + ext[0];
}

function createProductCard(p) {
    var col = document.createElement('div');
    col.className = 'col-6 col-md-4 col-lg-3';
    var v = p.variants[0], cur = v;
    var media = '<div class="pc-img pc-icon" aria-hidden="true"><i class="fa-solid ' + (p.icon || 'fa-drumstick-bite') + '"></i></div>';
    var chips = p.variants.length > 1 ? '<div class="weights">' + p.variants.map(function (x, i) {
        return '<button type="button" class="weight-chip" data-v="' + x.id + '" aria-pressed="' + (i === 0) + '">' + x.weight + '</button>';
    }).join('') + '</div>' : '';
    col.innerHTML = '<div class="product-card card h-100 animate-card">' + media +
        '<div class="card-body"><h5 class="card-title">' + p.name + '</h5>' + chips +
        '<span class="price" aria-live="polite">' + formatPrice(v.price) + '</span>' +
        '<button class="btn btn-primary add-to-basket-btn"><i class="fa-solid fa-plus"></i><span>Ajouter</span></button></div></div>';
    loadPhoto(col.querySelector('.pc-icon'), p, p.image);
    var price = col.querySelector('.price'), add = col.querySelector('.add-to-basket-btn');
    col.querySelectorAll('.weight-chip').forEach(function (chip) {
        chip.addEventListener('click', function () {
            col.querySelectorAll('.weight-chip').forEach(function (c) { c.setAttribute('aria-pressed', c === chip); });
            cur = p.variants.find(function (x) { return x.id === +chip.dataset.v; });
            price.textContent = formatPrice(cur.price);
        });
    });
    add.addEventListener('click', function () {
        addToBasket(p.id, cur.id, 1);
        add.classList.add('added'); add.lastChild.textContent = 'Ajouté';
        setTimeout(function () { add.classList.remove('added'); add.lastChild.textContent = 'Ajouter'; }, 1300);
    });
    return col;
}

function renderProducts(filter) {
    var grid = document.getElementById('productsGrid');
    if (!grid) return;
    grid.innerHTML = '';
    var n = 0;
    PRODUCTS.forEach(function (p) {
        if (filter && filter !== 'all' && p.category !== filter) return;
        grid.appendChild(createProductCard(p)); n++;
    });
    var c = document.getElementById('filterCount');
    if (c) c.textContent = n + ' produit' + (n > 1 ? 's' : '');
    var nr = document.getElementById('noResults');
    if (nr) nr.style.display = n ? 'none' : 'block';
    observeCards();
}

function renderFeaturedProducts() {
    var box = document.getElementById('featuredProducts');
    if (!box) return;
    box.innerHTML = '';
    PRODUCTS.slice(0, 4).forEach(function (p) { box.appendChild(createProductCard(p)); });
    observeCards();
}

/* floating cart bumps when something is added; hidden on the basket page itself */
(function () {
    var base = updateBasketCount, last = getBasketCount();
    updateBasketCount = function () {
        base();
        var n = getBasketCount(), b = document.getElementById('floatingCartBtn');
        if (b && n > last) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
        last = n;
    };
    if (/basket\.html/.test(location.pathname)) { var b = document.getElementById('floatingCartBtn'); if (b) b.style.display = 'none'; }
})();
