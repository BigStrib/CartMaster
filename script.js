// ===== DATA STORE =====
const Store = {
    planItems: [],
    cartItems: [],

    save() {
        localStorage.setItem('cartmaster_plan', JSON.stringify(this.planItems));
        localStorage.setItem('cartmaster_cart', JSON.stringify(this.cartItems));
    },

    load() {
        try {
            const plan = localStorage.getItem('cartmaster_plan');
            const cart = localStorage.getItem('cartmaster_cart');
            this.planItems = plan ? JSON.parse(plan) : [];
            this.cartItems = cart ? JSON.parse(cart) : [];
        } catch (e) {
            this.planItems = [];
            this.cartItems = [];
        }
    },

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }
};

// ===== CATEGORIES =====
const CATEGORIES = [
    { id: 'produce', label: 'Produce', icon: 'fa-apple-whole' },
    { id: 'dairy', label: 'Dairy', icon: 'fa-cheese' },
    { id: 'meat', label: 'Meat', icon: 'fa-drumstick-bite' },
    { id: 'bakery', label: 'Bakery', icon: 'fa-bread-slice' },
    { id: 'beverages', label: 'Beverages', icon: 'fa-mug-hot' },
    { id: 'frozen', label: 'Frozen', icon: 'fa-snowflake' },
    { id: 'snacks', label: 'Snacks', icon: 'fa-cookie-bite' },
    { id: 'other', label: 'Other', icon: 'fa-ellipsis' }
];

// ===== DOM =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const DOM = {
    tabBtns: $$('.tab-btn'),
    planningTab: $('#planningTab'),
    shoppingTab: $('#shoppingTab'),

    planSearchInput: $('#planSearchInput'),
    planSearchClear: $('#planSearchClear'),
    addPlanItemBtn: $('#addPlanItemBtn'),
    planList: $('#planList'),
    planCount: $('#planCount'),
    catChips: $$('.cat-chip'),
    catScroller: $('#catScroller'),

    cartSearchInput: $('#cartSearchInput'),
    cartSearchClear: $('#cartSearchClear'),
    addCartItemBtn: $('#addCartItemBtn'),
    cartList: $('#cartList'),
    cartCount: $('#cartCount'),
    searchResultsPanel: $('#searchResultsPanel'),
    searchResultsList: $('#searchResultsList'),

    totalItems: $('#totalItems'),
    checkedItems: $('#checkedItems'),
    runningTotal: $('#runningTotal'),
    headerTotal: $('#headerTotal'),

    sortBtn: $('#sortBtn'),
    sortDropdown: $('#sortDropdown'),
    sortOptions: $$('.sort-option'),

    clearAllBtn: $('#clearAllBtn'),

    modalOverlay: $('#modalOverlay'),
    modalTitle: $('#modalTitle'),
    modalBody: $('#modalBody'),
    modalClose: $('#modalClose'),
    modalCancel: $('#modalCancel'),
    modalConfirm: $('#modalConfirm'),

    confirmOverlay: $('#confirmOverlay'),
    confirmTitle: $('#confirmTitle'),
    confirmMessage: $('#confirmMessage'),
    confirmYes: $('#confirmYes'),
    confirmNo: $('#confirmNo'),

    toastContainer: $('#toastContainer')
};

// ===== STATE =====
let currentTab = 'planning';
let activeCategory = 'all';
let currentSort = 'alpha-asc';
let confirmCallback = null;
let modalMode = null;
let editingItemId = null;

// ===== INIT =====
function init() {
    Store.load();
    bindEvents();
    initCategoryDrag();
    renderAll();
}

function renderAll() {
    renderPlanList();
    renderCartList();
    updateCounts();
    updateTotals();
}

// ===== CATEGORY DRAG SCROLL =====
function initCategoryDrag() {
    const el = DOM.catScroller;
    let isDown = false;
    let startX;
    let scrollLeft;
    let moved = false;

    el.addEventListener('mousedown', (e) => {
        isDown = true;
        moved = false;
        el.classList.add('dragging');
        startX = e.pageX - el.offsetLeft;
        scrollLeft = el.scrollLeft;
    });

    el.addEventListener('mouseleave', () => {
        isDown = false;
        el.classList.remove('dragging');
    });

    el.addEventListener('mouseup', () => {
        isDown = false;
        el.classList.remove('dragging');
    });

    el.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - el.offsetLeft;
        const walk = (x - startX) * 2;
        if (Math.abs(walk) > 5) moved = true;
        el.scrollLeft = scrollLeft - walk;
    });

    el.addEventListener('click', (e) => {
        if (moved) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);
}

// ===== EVENTS =====
function bindEvents() {
    // Tabs
    DOM.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Plan search
    DOM.planSearchInput.addEventListener('input', handlePlanSearch);
    DOM.planSearchClear.addEventListener('click', () => {
        DOM.planSearchInput.value = '';
        DOM.planSearchClear.classList.remove('show');
        renderPlanList();
    });

    // Cart search
    DOM.cartSearchInput.addEventListener('input', handleCartSearch);
    DOM.cartSearchClear.addEventListener('click', () => {
        DOM.cartSearchInput.value = '';
        DOM.cartSearchClear.classList.remove('show');
        DOM.searchResultsPanel.classList.remove('show');
    });

    // Add buttons
    DOM.addPlanItemBtn.addEventListener('click', () => openModal('add-plan'));
    DOM.addCartItemBtn.addEventListener('click', () => openModal('add-cart'));

    // Category chips
    DOM.catChips.forEach(chip => {
        chip.addEventListener('click', () => {
            DOM.catChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeCategory = chip.dataset.category;
            renderPlanList();
        });
    });

    // Sort
    DOM.sortBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        DOM.sortDropdown.classList.toggle('show');
    });

    DOM.sortOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            currentSort = opt.dataset.sort;
            DOM.sortDropdown.classList.remove('show');
            renderPlanList();
            renderCartList();
            showToast('Sorted successfully', 'info');
        });
    });

    document.addEventListener('click', () => {
        DOM.sortDropdown.classList.remove('show');
    });

    // Clear all
    DOM.clearAllBtn.addEventListener('click', () => {
        if (Store.planItems.length === 0 && Store.cartItems.length === 0) {
            showToast('Nothing to clear', 'info');
            return;
        }
        showConfirm(
            'Clear Everything?',
            'This will remove all items from both your plan and cart lists.',
            () => {
                Store.planItems = [];
                Store.cartItems = [];
                Store.save();
                renderAll();
                showToast('All items cleared', 'success');
            }
        );
    });

    // Modal
    DOM.modalClose.addEventListener('click', closeModal);
    DOM.modalCancel.addEventListener('click', closeModal);
    DOM.modalOverlay.addEventListener('click', (e) => {
        if (e.target === DOM.modalOverlay) closeModal();
    });

    // Confirm
    DOM.confirmNo.addEventListener('click', closeConfirm);
    DOM.confirmOverlay.addEventListener('click', (e) => {
        if (e.target === DOM.confirmOverlay) closeConfirm();
    });

    // Enter on plan search
    DOM.planSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && DOM.planSearchInput.value.trim()) {
            openModal('add-plan', DOM.planSearchInput.value.trim());
        }
    });

    // Enter on cart search
    DOM.cartSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && DOM.cartSearchInput.value.trim()) {
            openModal('add-cart', DOM.cartSearchInput.value.trim());
        }
    });
}

// ===== TAB SWITCHING =====
function switchTab(tab) {
    currentTab = tab;
    DOM.tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    DOM.planningTab.classList.toggle('active', tab === 'planning');
    DOM.shoppingTab.classList.toggle('active', tab === 'shopping');
}

// ===== HELPERS =====
function isItemInCart(planId) {
    return Store.cartItems.some(c => c.planId === planId);
}

function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getCategoryInfo(id) {
    return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}

function sortItems(items) {
    const s = [...items];
    switch (currentSort) {
        case 'alpha-asc':
            return s.sort((a, b) => a.name.localeCompare(b.name));
        case 'alpha-desc':
            return s.sort((a, b) => b.name.localeCompare(a.name));
        case 'price-asc':
            return s.sort((a, b) => (a.price || 0) - (b.price || 0));
        case 'price-desc':
            return s.sort((a, b) => (b.price || 0) - (a.price || 0));
        default:
            return s;
    }
}

// ===== PLAN LIST =====
function handlePlanSearch() {
    const val = DOM.planSearchInput.value.trim();
    DOM.planSearchClear.classList.toggle('show', val.length > 0);
    renderPlanList();
}

function renderPlanList() {
    const searchTerm = DOM.planSearchInput.value.trim().toLowerCase();
    let items = [...Store.planItems];

    if (activeCategory !== 'all') {
        items = items.filter(item => item.category === activeCategory);
    }

    if (searchTerm) {
        items = items.filter(item => item.name.toLowerCase().includes(searchTerm));
    }

    items = sortItems(items);

    DOM.planList.innerHTML = '';

    if (items.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        if (Store.planItems.length === 0) {
            empty.innerHTML = `
                <i class="fas fa-clipboard-list"></i>
                <h3>Start Your Shopping List</h3>
                <p>Add items you need to buy before heading to the store</p>
            `;
        } else {
            empty.innerHTML = `
                <i class="fas fa-magnifying-glass"></i>
                <h3>No Items Found</h3>
                <p>Try a different search or category filter</p>
            `;
        }
        DOM.planList.appendChild(empty);
        return;
    }

    items.forEach((item, idx) => {
        DOM.planList.appendChild(createPlanItem(item, idx));
    });
}

function createPlanItem(item, idx) {
    const div = document.createElement('div');
    const inCart = isItemInCart(item.id);

    div.className = 'list-item';
    if (inCart) div.classList.add('checked', 'checked-locked');
    div.style.animationDelay = `${idx * 0.03}s`;

    const cat = getCategoryInfo(item.category);

    div.innerHTML = `
        <div class="item-check${inCart ? ' checked locked' : ''}">
            <i class="fas fa-check"></i>
        </div>
        <div class="item-info">
            <div class="item-name">${escapeHtml(item.name)}</div>
            <div class="item-meta">
                <span class="item-category">${escapeHtml(cat.label)}</span>
                ${item.quantity > 1 ? `<span class="item-qty">×${item.quantity}</span>` : ''}
                ${inCart ? '<span class="item-in-cart-badge"><i class="fas fa-cart-shopping"></i> In cart</span>' : ''}
            </div>
        </div>
        <div class="item-actions">
            ${!inCart ? `
                <button class="item-action-btn send" title="Send to Cart" data-action="send">
                    <i class="fas fa-cart-plus"></i>
                </button>
            ` : ''}
            <button class="item-action-btn edit" title="Edit" data-action="edit-plan">
                <i class="fas fa-pen"></i>
            </button>
            <button class="item-action-btn delete" title="Delete" data-action="delete-plan">
                <i class="fas fa-trash-can"></i>
            </button>
        </div>
    `;

    const sendBtn = div.querySelector('[data-action="send"]');
    if (sendBtn) {
        sendBtn.addEventListener('click', () => openModal('send-to-cart', null, item.id));
    }

    div.querySelector('[data-action="edit-plan"]').addEventListener('click', () => {
        openModal('edit-plan', null, item.id);
    });

    div.querySelector('[data-action="delete-plan"]').addEventListener('click', () => {
        const linked = Store.cartItems.find(c => c.planId === item.id);
        const extra = linked ? ' This will also remove it from your shopping cart.' : '';
        showConfirm(
            'Remove Item?',
            `Remove "${item.name}" from your planning list?${extra}`,
            () => deletePlanItem(item.id)
        );
    });

    return div;
}

function deletePlanItem(id) {
    const item = Store.planItems.find(i => i.id === id);
    Store.cartItems = Store.cartItems.filter(c => c.planId !== id);
    Store.planItems = Store.planItems.filter(i => i.id !== id);
    Store.save();
    renderAll();
    if (item) showToast(`"${item.name}" removed`, 'success');
}

// ===== CART LIST =====
function handleCartSearch() {
    const val = DOM.cartSearchInput.value.trim().toLowerCase();
    DOM.cartSearchClear.classList.toggle('show', val.length > 0);

    if (val.length > 0) {
        const results = Store.planItems.filter(item =>
            item.name.toLowerCase().includes(val)
        );
        if (results.length > 0) {
            renderSearchResults(results);
            DOM.searchResultsPanel.classList.add('show');
        } else {
            DOM.searchResultsPanel.classList.remove('show');
        }
    } else {
        DOM.searchResultsPanel.classList.remove('show');
    }
}

function renderSearchResults(results) {
    DOM.searchResultsList.innerHTML = '';

    results.forEach(item => {
        const inCart = isItemInCart(item.id);
        const div = document.createElement('div');
        div.className = `search-result-item${inCart ? ' already-added' : ''}`;

        const cat = getCategoryInfo(item.category);

        div.innerHTML = `
            <div class="result-icon">
                <i class="fas ${cat.icon}"></i>
            </div>
            <div style="flex:1;min-width:0;">
                <div class="result-name">${escapeHtml(item.name)}</div>
                <div class="result-category">${escapeHtml(cat.label)}${item.quantity > 1 ? ` × ${item.quantity}` : ''}</div>
            </div>
            <div class="result-add">
                ${inCart ? '<i class="fas fa-circle-check"></i>' : '<i class="fas fa-plus-circle"></i>'}
            </div>
        `;

        if (!inCart) {
            div.addEventListener('click', () => {
                openModal('send-to-cart', null, item.id);
                DOM.cartSearchInput.value = '';
                DOM.cartSearchClear.classList.remove('show');
                DOM.searchResultsPanel.classList.remove('show');
            });
        }

        DOM.searchResultsList.appendChild(div);
    });
}

function renderCartList() {
    let items = [...Store.cartItems];
    items = sortItems(items);

    DOM.cartList.innerHTML = '';

    if (items.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.innerHTML = `
            <i class="fas fa-basket-shopping"></i>
            <h3>Your Cart is Empty</h3>
            <p>Search your planned items above or add new items directly</p>
        `;
        DOM.cartList.appendChild(empty);
        return;
    }

    items.forEach((item, idx) => {
        DOM.cartList.appendChild(createCartItem(item, idx));
    });
}

function createCartItem(item, idx) {
    const div = document.createElement('div');
    div.className = 'list-item';
    div.style.animationDelay = `${idx * 0.03}s`;

    const cat = getCategoryInfo(item.category);
    const lineTotal = item.price * (item.quantity || 1);

    div.innerHTML = `
        <div class="item-info">
            <div class="item-name">${escapeHtml(item.name)}</div>
            <div class="item-meta">
                <span class="item-category">${escapeHtml(cat.label)}</span>
                ${item.quantity > 1 ? `<span class="item-qty">×${item.quantity}</span>` : ''}
            </div>
        </div>
        <div class="item-price">$${lineTotal.toFixed(2)}</div>
        <div class="item-actions">
            <button class="item-action-btn edit" title="Edit" data-action="edit-cart">
                <i class="fas fa-pen"></i>
            </button>
            <button class="item-action-btn delete" title="Remove" data-action="delete-cart">
                <i class="fas fa-trash-can"></i>
            </button>
        </div>
    `;

    div.querySelector('[data-action="edit-cart"]').addEventListener('click', () => {
        openModal('edit-cart', null, item.id);
    });

    div.querySelector('[data-action="delete-cart"]').addEventListener('click', () => {
        showConfirm(
            'Remove from Cart?',
            `Remove "${item.name}" from your shopping cart?`,
            () => deleteCartItem(item.id)
        );
    });

    return div;
}

function deleteCartItem(id) {
    const item = Store.cartItems.find(i => i.id === id);
    Store.cartItems = Store.cartItems.filter(i => i.id !== id);
    Store.save();
    renderAll();
    if (item) showToast(`"${item.name}" removed from cart`, 'success');
}

// ===== COUNTS & TOTALS =====
function updateCounts() {
    DOM.planCount.textContent = Store.planItems.length;
    DOM.cartCount.textContent = Store.cartItems.length;
    DOM.totalItems.textContent = Store.cartItems.length;

    const inCartCount = Store.planItems.filter(p => isItemInCart(p.id)).length;
    DOM.checkedItems.textContent = `${inCartCount}/${Store.planItems.length}`;
}

function updateTotals() {
    const total = Store.cartItems.reduce((sum, item) => {
        return sum + (item.price * (item.quantity || 1));
    }, 0);
    const formatted = '$' + total.toFixed(2);

    DOM.runningTotal.textContent = formatted;
    DOM.headerTotal.querySelector('span').textContent = formatted;
}

// ===== MODAL =====
function openModal(mode, prefillName, itemId) {
    prefillName = prefillName || null;
    itemId = itemId || null;
    modalMode = mode;
    editingItemId = itemId;

    let title = '';
    let bodyHTML = '';

    const categoryOptions = CATEGORIES.map(c =>
        `<option value="${c.id}">${c.label}</option>`
    ).join('');

    switch (mode) {
        case 'add-plan': {
            title = 'Add to Plan';
            bodyHTML = `
                <div class="form-group">
                    <label class="form-label">Item Name</label>
                    <input type="text" class="form-input" id="inputName" placeholder="e.g. Organic Milk" value="${prefillName ? escapeHtml(prefillName) : ''}">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Category</label>
                        <select class="form-select" id="inputCategory">${categoryOptions}</select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Quantity</label>
                        <input type="number" class="form-input" id="inputQuantity" value="1" min="1" max="99">
                    </div>
                </div>
            `;
            break;
        }
        case 'edit-plan': {
            const item = Store.planItems.find(i => i.id === itemId);
            if (!item) return;
            title = 'Edit Plan Item';
            bodyHTML = `
                <div class="form-group">
                    <label class="form-label">Item Name</label>
                    <input type="text" class="form-input" id="inputName" value="${escapeHtml(item.name)}">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Category</label>
                        <select class="form-select" id="inputCategory">
                            ${CATEGORIES.map(c =>
                                `<option value="${c.id}"${c.id === item.category ? ' selected' : ''}>${c.label}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Quantity</label>
                        <input type="number" class="form-input" id="inputQuantity" value="${item.quantity || 1}" min="1" max="99">
                    </div>
                </div>
            `;
            break;
        }
        case 'send-to-cart': {
            const item = Store.planItems.find(i => i.id === itemId);
            if (!item) return;
            title = 'Add to Cart';
            bodyHTML = `
                <div class="form-group">
                    <label class="form-label">Item</label>
                    <input type="text" class="form-input" id="inputName" value="${escapeHtml(item.name)}" readonly style="opacity:0.7">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Price ($)</label>
                        <input type="number" class="form-input price-input" id="inputPrice" placeholder="0.00" step="0.01" min="0">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Quantity</label>
                        <input type="number" class="form-input" id="inputQuantity" value="${item.quantity || 1}" min="1" max="99">
                    </div>
                </div>
            `;
            break;
        }
        case 'add-cart': {
            title = 'Add New Cart Item';
            bodyHTML = `
                <div class="form-group">
                    <label class="form-label">Item Name</label>
                    <input type="text" class="form-input" id="inputName" placeholder="e.g. Avocados" value="${prefillName ? escapeHtml(prefillName) : ''}">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Price ($)</label>
                        <input type="number" class="form-input price-input" id="inputPrice" placeholder="0.00" step="0.01" min="0">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Quantity</label>
                        <input type="number" class="form-input" id="inputQuantity" value="1" min="1" max="99">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Category</label>
                    <select class="form-select" id="inputCategory">${categoryOptions}</select>
                </div>
            `;
            break;
        }
        case 'edit-cart': {
            const item = Store.cartItems.find(i => i.id === itemId);
            if (!item) return;
            title = 'Edit Cart Item';
            bodyHTML = `
                <div class="form-group">
                    <label class="form-label">Item Name</label>
                    <input type="text" class="form-input" id="inputName" value="${escapeHtml(item.name)}">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Price ($)</label>
                        <input type="number" class="form-input price-input" id="inputPrice" value="${item.price.toFixed(2)}" step="0.01" min="0">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Quantity</label>
                        <input type="number" class="form-input" id="inputQuantity" value="${item.quantity || 1}" min="1" max="99">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Category</label>
                    <select class="form-select" id="inputCategory">
                        ${CATEGORIES.map(c =>
                            `<option value="${c.id}"${c.id === item.category ? ' selected' : ''}>${c.label}</option>`
                        ).join('')}
                    </select>
                </div>
            `;
            break;
        }
    }

    DOM.modalTitle.textContent = title;
    DOM.modalBody.innerHTML = bodyHTML;
    DOM.modalConfirm.onclick = handleModalConfirm;

    DOM.modalBody.querySelectorAll('input').forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleModalConfirm();
        });
    });

    DOM.modalOverlay.classList.add('show');

    setTimeout(() => {
        const first = DOM.modalBody.querySelector('input:not([readonly])');
        if (first) first.focus();
    }, 350);
}

function closeModal() {
    DOM.modalOverlay.classList.remove('show');
    modalMode = null;
    editingItemId = null;
}

function handleModalConfirm() {
    const nameEl = DOM.modalBody.querySelector('#inputName');
    const priceEl = DOM.modalBody.querySelector('#inputPrice');
    const qtyEl = DOM.modalBody.querySelector('#inputQuantity');
    const catEl = DOM.modalBody.querySelector('#inputCategory');

    const name = nameEl ? nameEl.value.trim() : '';
    const price = priceEl ? parseFloat(priceEl.value) || 0 : 0;
    const quantity = qtyEl ? Math.max(1, parseInt(qtyEl.value) || 1) : 1;
    const category = catEl ? catEl.value : 'other';

    if (!name) {
        showToast('Please enter an item name', 'error');
        if (nameEl) nameEl.focus();
        return;
    }

    switch (modalMode) {
        case 'add-plan': {
            const exists = Store.planItems.find(i =>
                i.name.toLowerCase() === name.toLowerCase()
            );
            if (exists) {
                showToast(`"${name}" is already on your list`, 'error');
                return;
            }
            Store.planItems.push({
                id: Store.generateId(),
                name: capitalizeFirst(name),
                category,
                quantity,
                createdAt: Date.now()
            });
            Store.save();
            renderAll();
            DOM.planSearchInput.value = '';
            DOM.planSearchClear.classList.remove('show');
            showToast(`"${capitalizeFirst(name)}" added to plan`, 'success');
            break;
        }

        case 'edit-plan': {
            const item = Store.planItems.find(i => i.id === editingItemId);
            if (item) {
                item.name = capitalizeFirst(name);
                item.category = category;
                item.quantity = quantity;

                const linked = Store.cartItems.find(c => c.planId === item.id);
                if (linked) {
                    linked.name = item.name;
                    linked.category = item.category;
                }
                Store.save();
                renderAll();
                showToast(`"${item.name}" updated`, 'success');
            }
            break;
        }

        case 'send-to-cart': {
            const planItem = Store.planItems.find(i => i.id === editingItemId);
            if (!planItem) break;

            if (isItemInCart(planItem.id)) {
                showToast(`"${planItem.name}" is already in your cart`, 'info');
                closeModal();
                return;
            }

            if (price <= 0) {
                showToast('Please enter a valid price', 'error');
                if (priceEl) priceEl.focus();
                return;
            }

            Store.cartItems.push({
                id: Store.generateId(),
                planId: planItem.id,
                name: planItem.name,
                category: planItem.category,
                price,
                quantity,
                createdAt: Date.now()
            });
            Store.save();
            renderAll();
            showToast(`"${planItem.name}" added — $${(price * quantity).toFixed(2)}`, 'success');
            break;
        }

        case 'add-cart': {
            if (price <= 0) {
                showToast('Please enter a valid price', 'error');
                if (priceEl) priceEl.focus();
                return;
            }

            let planItem = Store.planItems.find(i =>
                i.name.toLowerCase() === name.toLowerCase()
            );

            if (!planItem) {
                planItem = {
                    id: Store.generateId(),
                    name: capitalizeFirst(name),
                    category,
                    quantity,
                    createdAt: Date.now()
                };
                Store.planItems.push(planItem);
            }

            if (isItemInCart(planItem.id)) {
                showToast(`"${planItem.name}" is already in your cart`, 'info');
                closeModal();
                return;
            }

            Store.cartItems.push({
                id: Store.generateId(),
                planId: planItem.id,
                name: capitalizeFirst(name),
                category,
                price,
                quantity,
                createdAt: Date.now()
            });
            Store.save();
            renderAll();
            DOM.cartSearchInput.value = '';
            DOM.cartSearchClear.classList.remove('show');
            DOM.searchResultsPanel.classList.remove('show');
            showToast(`"${capitalizeFirst(name)}" added — $${(price * quantity).toFixed(2)}`, 'success');
            break;
        }

        case 'edit-cart': {
            const item = Store.cartItems.find(i => i.id === editingItemId);
            if (item) {
                if (price <= 0) {
                    showToast('Please enter a valid price', 'error');
                    if (priceEl) priceEl.focus();
                    return;
                }
                item.name = capitalizeFirst(name);
                item.price = price;
                item.quantity = quantity;
                item.category = category;

                if (item.planId) {
                    const linked = Store.planItems.find(p => p.id === item.planId);
                    if (linked) {
                        linked.name = item.name;
                        linked.category = item.category;
                    }
                }
                Store.save();
                renderAll();
                showToast(`"${item.name}" updated`, 'success');
            }
            break;
        }
    }

    closeModal();
}

// ===== CONFIRM =====
function showConfirm(title, message, callback) {
    DOM.confirmTitle.textContent = title;
    DOM.confirmMessage.textContent = message;
    confirmCallback = callback;
    DOM.confirmOverlay.classList.add('show');

    DOM.confirmYes.onclick = () => {
        if (confirmCallback) confirmCallback();
        closeConfirm();
    };
}

function closeConfirm() {
    DOM.confirmOverlay.classList.remove('show');
    confirmCallback = null;
}

// ===== TOAST =====
function showToast(message, type) {
    type = type || 'info';
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;

    const icons = {
        success: 'fa-circle-check',
        error: 'fa-circle-exclamation',
        info: 'fa-circle-info'
    };

    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${icons[type] || icons.info}"></i>
        </div>
        <div class="toast-message">${escapeHtml(message)}</div>
        <button class="toast-close">
            <i class="fas fa-xmark"></i>
        </button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => removeToast(toast));
    DOM.toastContainer.appendChild(toast);
    setTimeout(() => removeToast(toast), 3000);
}

function removeToast(toast) {
    if (!toast.parentNode) return;
    toast.classList.add('removing');
    setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
}

// ===== START =====
document.addEventListener('DOMContentLoaded', init);