// ===== DATA STORE =====
const Store = {
    planItems: [],
    cartItems: [],
    settings: {
        salesTaxRate: 0,
        depositAmount: 0
    },

    save() {
        localStorage.setItem('cartmaster_plan', JSON.stringify(this.planItems));
        localStorage.setItem('cartmaster_cart', JSON.stringify(this.cartItems));
        localStorage.setItem('cartmaster_settings', JSON.stringify(this.settings));
    },

    load() {
        try {
            const plan = localStorage.getItem('cartmaster_plan');
            const cart = localStorage.getItem('cartmaster_cart');
            const settings = localStorage.getItem('cartmaster_settings');
            this.planItems = plan ? JSON.parse(plan) : [];
            this.cartItems = cart ? JSON.parse(cart) : [];
            this.settings = settings ? JSON.parse(settings) : { salesTaxRate: 0, depositAmount: 0 };
        } catch (e) {
            this.planItems = [];
            this.cartItems = [];
            this.settings = { salesTaxRate: 0, depositAmount: 0 };
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
    totalsBreakdown: $('#totalsBreakdown'),

    sortBtn: $('#sortBtn'),
    sortDropdown: $('#sortDropdown'),
    clearAllBtn: $('#clearAllBtn'),
    settingsBtn: $('#settingsBtn'),

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
let planSort = 'unchecked-first';
let cartSort = 'alpha-asc';
let confirmCallback = null;
let modalMode = null;
let editingItemId = null;
let revealedItemId = null;
let skipPlanSearch = false;

// ===== INIT =====
function init() {
    Store.load();
    bindEvents();
    initCategoryDrag();
    buildSortDropdown();
    renderAll();
}

function renderAll() {
    renderPlanList();
    renderCartList();
    updateCounts();
    updateTotals();
}

// ===== RESET SEARCH =====
function resetPlanSearch() {
    DOM.planSearchInput.value = '';
    DOM.planSearchClear.classList.remove('show');
    DOM.planSearchInput.blur();
    activeCategory = 'all';
    DOM.catChips.forEach(c => {
        c.classList.toggle('active', c.dataset.category === 'all');
    });
    skipPlanSearch = true;
}

function resetCartSearch() {
    DOM.cartSearchInput.value = '';
    DOM.cartSearchClear.classList.remove('show');
    DOM.cartSearchInput.blur();
    DOM.searchResultsPanel.classList.remove('show');
}

// ===== REVEAL ITEM ACTIONS =====
function revealItem(itemId, itemEl) {
    if (revealedItemId && revealedItemId !== itemId) closeRevealedItem();
    if (revealedItemId === itemId) { closeRevealedItem(); return; }
    revealedItemId = itemId;
    itemEl.classList.add('actions-revealed');
}

function closeRevealedItem() {
    if (!revealedItemId) return;
    document.querySelectorAll('.list-item.actions-revealed').forEach(el => {
        el.classList.remove('actions-revealed');
    });
    revealedItemId = null;
}

// ===== SORT DROPDOWN =====
function buildSortDropdown() { updateSortDropdown(); }

function updateSortDropdown() {
    DOM.sortDropdown.innerHTML = '';

    if (currentTab === 'planning') {
        const options = [
            { sort: 'unchecked-first', label: 'Unchecked First', icon: 'fa-square' },
            { sort: 'checked-first', label: 'Checked First', icon: 'fa-square-check' }
        ];
        options.forEach(opt => {
            const div = document.createElement('div');
            div.className = 'sort-option' + (planSort === opt.sort ? ' active' : '');
            div.innerHTML = `<i class="fas ${opt.icon}"></i> ${opt.label}`;
            div.addEventListener('click', () => {
                planSort = opt.sort;
                DOM.sortDropdown.classList.remove('show');
                updateSortDropdown();
                renderPlanList();
                showToast('Sorted successfully', 'info');
            });
            DOM.sortDropdown.appendChild(div);
        });
    } else {
        const options = [
            { sort: 'alpha-asc', label: 'Name A–Z', icon: 'fa-arrow-down-a-z' },
            { sort: 'alpha-desc', label: 'Name Z–A', icon: 'fa-arrow-up-z-a' },
            { sort: 'price-desc', label: 'Price High to Low', icon: 'fa-arrow-down-wide-short' },
            { sort: 'price-asc', label: 'Price Low to High', icon: 'fa-arrow-up-short-wide' }
        ];
        options.forEach(opt => {
            const div = document.createElement('div');
            div.className = 'sort-option' + (cartSort === opt.sort ? ' active' : '');
            div.innerHTML = `<i class="fas ${opt.icon}"></i> ${opt.label}`;
            div.addEventListener('click', () => {
                cartSort = opt.sort;
                DOM.sortDropdown.classList.remove('show');
                updateSortDropdown();
                renderCartList();
                showToast('Sorted successfully', 'info');
            });
            DOM.sortDropdown.appendChild(div);
        });
    }
}

// ===== CATEGORY DRAG =====
function initCategoryDrag() {
    const el = DOM.catScroller;
    let isDown = false, startX, scrollLeft, moved = false;

    el.addEventListener('mousedown', (e) => {
        isDown = true; moved = false;
        el.classList.add('dragging');
        startX = e.pageX - el.offsetLeft;
        scrollLeft = el.scrollLeft;
    });
    el.addEventListener('mouseleave', () => { isDown = false; el.classList.remove('dragging'); });
    el.addEventListener('mouseup', () => { isDown = false; el.classList.remove('dragging'); });
    el.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - el.offsetLeft;
        const walk = (x - startX) * 2;
        if (Math.abs(walk) > 5) moved = true;
        el.scrollLeft = scrollLeft - walk;
    });
    el.addEventListener('click', (e) => {
        if (moved) { e.preventDefault(); e.stopPropagation(); }
    }, true);
}

// ===== EVENTS =====
function bindEvents() {
    DOM.tabBtns.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

    DOM.planSearchInput.addEventListener('input', handlePlanSearch);
    DOM.planSearchClear.addEventListener('click', () => { resetPlanSearch(); renderPlanList(); });

    DOM.cartSearchInput.addEventListener('input', handleCartSearch);
    DOM.cartSearchClear.addEventListener('click', () => resetCartSearch());

    DOM.addPlanItemBtn.addEventListener('click', () => openModal('add-plan'));
    DOM.addCartItemBtn.addEventListener('click', () => openModal('add-cart'));

    DOM.catChips.forEach(chip => {
        chip.addEventListener('click', () => {
            DOM.planSearchInput.value = '';
            DOM.planSearchClear.classList.remove('show');
            DOM.planSearchInput.blur();
            DOM.catChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeCategory = chip.dataset.category;
            skipPlanSearch = true;
            renderPlanList();
        });
    });

    DOM.sortBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        updateSortDropdown();
        DOM.sortDropdown.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
        DOM.sortDropdown.classList.remove('show');
        if (!e.target.closest('.list-item')) closeRevealedItem();
    });

    DOM.clearAllBtn.addEventListener('click', () => {
        if (Store.planItems.length === 0 && Store.cartItems.length === 0) {
            showToast('Nothing to clear', 'info');
            return;
        }
        showClearChoiceConfirm();
    });

    if (DOM.settingsBtn) {
        DOM.settingsBtn.addEventListener('click', () => openModal('settings'));
    }

    DOM.modalClose.addEventListener('click', closeModal);
    DOM.modalCancel.addEventListener('click', closeModal);
    DOM.modalOverlay.addEventListener('click', (e) => { if (e.target === DOM.modalOverlay) closeModal(); });

    DOM.confirmNo.addEventListener('click', closeConfirm);
    DOM.confirmOverlay.addEventListener('click', (e) => { if (e.target === DOM.confirmOverlay) closeConfirm(); });

    DOM.planSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = DOM.planSearchInput.value.trim();
            if (!val) return;
            const exists = Store.planItems.find(i => i.name.toLowerCase() === val.toLowerCase());
            if (!exists) openModal('add-plan', val);
        }
    });

    DOM.cartSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = DOM.cartSearchInput.value.trim();
            if (!val) return;
            const planItem = Store.planItems.find(i => i.name.toLowerCase() === val.toLowerCase());
            if (!planItem) {
                openModal('add-cart', val);
            } else if (!isItemInCart(planItem.id)) {
                openModal('send-to-cart', null, planItem.id);
            }
        }
    });
}

// ===== TAB SWITCHING =====
function switchTab(tab) {
    closeRevealedItem();
    currentTab = tab;
    DOM.tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
    DOM.planningTab.classList.toggle('active', tab === 'planning');
    DOM.shoppingTab.classList.toggle('active', tab === 'shopping');
    updateSortDropdown();
}

// ===== HELPERS =====
function isItemInCart(planId) { return Store.cartItems.some(c => c.planId === planId); }

function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

function capitalizeFirst(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

function getCategoryInfo(id) { return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1]; }

function isMobile() { return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth <= 768; }

function sortPlanItems(items) {
    const s = [...items];
    switch (planSort) {
        case 'unchecked-first':
            return s.sort((a, b) => {
                const d = (isItemInCart(a.id) ? 1 : 0) - (isItemInCart(b.id) ? 1 : 0);
                return d !== 0 ? d : a.name.localeCompare(b.name);
            });
        case 'checked-first':
            return s.sort((a, b) => {
                const d = (isItemInCart(a.id) ? 0 : 1) - (isItemInCart(b.id) ? 0 : 1);
                return d !== 0 ? d : a.name.localeCompare(b.name);
            });
        default: return s;
    }
}

function sortCartItems(items) {
    const s = [...items];
    switch (cartSort) {
        case 'alpha-asc': return s.sort((a, b) => a.name.localeCompare(b.name));
        case 'alpha-desc': return s.sort((a, b) => b.name.localeCompare(a.name));
        case 'price-asc': return s.sort((a, b) => getItemTotal(a) - getItemTotal(b));
        case 'price-desc': return s.sort((a, b) => getItemTotal(b) - getItemTotal(a));
        default: return s;
    }
}

// ===== ITEM CALCULATIONS =====
function getItemSubtotal(item) {
    return (item.price || 0) * (item.quantity || 1);
}

function getItemTax(item) {
    if (!item.hasTax || Store.settings.salesTaxRate <= 0) return 0;
    return getItemSubtotal(item) * (Store.settings.salesTaxRate / 100);
}

function getItemDeposit(item) {
    if (!item.hasDeposit || !item.depositCount || Store.settings.depositAmount <= 0) return 0;
    return item.depositCount * Store.settings.depositAmount;
}

function getItemTotal(item) {
    return getItemSubtotal(item) + getItemTax(item) + getItemDeposit(item);
}

// ===== PLAN LIST =====
function handlePlanSearch() {
    const val = DOM.planSearchInput.value.trim();
    DOM.planSearchClear.classList.toggle('show', val.length > 0);
    renderPlanList();
}

function renderPlanList() {
    let items = [...Store.planItems];
    let searchTerm = '';

    if (skipPlanSearch) {
        skipPlanSearch = false;
    } else {
        searchTerm = DOM.planSearchInput.value.trim().toLowerCase();
    }

    if (activeCategory !== 'all') {
        items = items.filter(item => item.category === activeCategory);
    }

    if (searchTerm) {
        items = items.filter(item => item.name.toLowerCase().includes(searchTerm));
    }

    items = sortPlanItems(items);
    DOM.planList.innerHTML = '';

    if (items.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        const enterText = isMobile() ? 'return' : 'Enter';

        if (searchTerm) {
            empty.innerHTML = `
                <i class="fas fa-magnifying-glass"></i>
                <h3>No Items Found</h3>
                <p>No results for "<strong>${escapeHtml(searchTerm)}</strong>"</p>
                <p class="empty-hint">Press <kbd>${enterText}</kbd> to add "<strong>${escapeHtml(searchTerm)}</strong>" as a new item</p>
            `;
        } else if (Store.planItems.length === 0) {
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

    if (searchTerm) {
        const exactMatch = Store.planItems.find(i => i.name.toLowerCase() === searchTerm);
        if (!exactMatch) {
            const enterText = isMobile() ? 'return' : 'Enter';
            const hint = document.createElement('div');
            hint.className = 'search-add-hint';
            hint.innerHTML = `<i class="fas fa-plus-circle"></i> Press <kbd>${enterText}</kbd> to add "<strong>${escapeHtml(searchTerm)}</strong>"`;
            hint.addEventListener('click', () => openModal('add-plan', DOM.planSearchInput.value.trim()));
            DOM.planList.appendChild(hint);
        }
    }

    items.forEach((item, idx) => DOM.planList.appendChild(createPlanItem(item, idx)));
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
        ${!inCart ? `<button class="item-action-btn send" title="Send to Cart" data-action="send"><i class="fas fa-cart-plus"></i></button>` : ''}
        <div class="item-actions">
            <button class="item-action-btn edit" title="Edit" data-action="edit-plan"><i class="fas fa-pen"></i></button>
            <button class="item-action-btn delete" title="Delete" data-action="delete-plan"><i class="fas fa-trash-can"></i></button>
        </div>
    `;

    div.addEventListener('click', (e) => {
        if (e.target.closest('[data-action]')) return;
        e.stopPropagation();
        revealItem(item.id, div);
    });

    const sendBtn = div.querySelector('[data-action="send"]');
    if (sendBtn) {
        sendBtn.addEventListener('click', (e) => {
            e.stopPropagation(); closeRevealedItem();
            openModal('send-to-cart', null, item.id);
        });
    }

    div.querySelector('[data-action="edit-plan"]').addEventListener('click', (e) => {
        e.stopPropagation(); closeRevealedItem();
        openModal('edit-plan', null, item.id);
    });

    div.querySelector('[data-action="delete-plan"]').addEventListener('click', (e) => {
        e.stopPropagation(); closeRevealedItem();
        const linked = Store.cartItems.find(c => c.planId === item.id);

        if (linked) {
            showDeleteChoiceConfirm('Remove Item', `"${item.name}" is also in your shopping cart. What would you like to do?`, {
                planOnly: {
                    label: 'Remove from Plan Only', icon: 'fa-clipboard-list',
                    callback: () => {
                        Store.planItems = Store.planItems.filter(i => i.id !== item.id);
                        const ci = Store.cartItems.find(c => c.planId === item.id);
                        if (ci) ci.planId = null;
                        Store.save(); renderAll();
                        showToast(`"${item.name}" removed from plan`, 'success');
                    }
                },
                both: {
                    label: 'Remove from Both', icon: 'fa-trash-can',
                    callback: () => {
                        Store.cartItems = Store.cartItems.filter(c => c.planId !== item.id);
                        Store.planItems = Store.planItems.filter(i => i.id !== item.id);
                        Store.save(); renderAll();
                        showToast(`"${item.name}" removed from plan and cart`, 'success');
                    }
                }
            });
        } else {
            showConfirm('Remove Item?', `Remove "${item.name}" from your planning list?`, () => {
                Store.planItems = Store.planItems.filter(i => i.id !== item.id);
                Store.save(); renderAll();
                showToast(`"${item.name}" removed`, 'success');
            });
        }
    });

    return div;
}

// ===== CART LIST =====
function handleCartSearch() {
    const val = DOM.cartSearchInput.value.trim().toLowerCase();
    DOM.cartSearchClear.classList.toggle('show', val.length > 0);

    if (val.length > 0) {
        const results = Store.planItems.filter(item => item.name.toLowerCase().includes(val));
        if (results.length > 0) {
            renderSearchResults(results);
            DOM.searchResultsPanel.classList.add('show');
        } else {
            renderSearchResultsEmpty(val);
            DOM.searchResultsPanel.classList.add('show');
        }
    } else {
        DOM.searchResultsPanel.classList.remove('show');
    }
}

function renderSearchResultsEmpty(searchTerm) {
    DOM.searchResultsList.innerHTML = '';
    const enterText = isMobile() ? 'return' : 'Enter';
    const div = document.createElement('div');
    div.className = 'search-empty-hint';
    div.innerHTML = `
        <div class="empty-hint-icon"><i class="fas fa-magnifying-glass"></i></div>
        <p>No items found for "<strong>${escapeHtml(searchTerm)}</strong>"</p>
        <p class="empty-hint-action">Press <kbd>${enterText}</kbd> to add it as a new item</p>
    `;
    div.addEventListener('click', () => openModal('add-cart', DOM.cartSearchInput.value.trim()));
    DOM.searchResultsList.appendChild(div);
}

function renderSearchResults(results) {
    DOM.searchResultsList.innerHTML = '';
    const searchTerm = DOM.cartSearchInput.value.trim().toLowerCase();
    const exactMatch = Store.planItems.find(i => i.name.toLowerCase() === searchTerm);

    if (!exactMatch && searchTerm) {
        const enterText = isMobile() ? 'return' : 'Enter';
        const hintDiv = document.createElement('div');
        hintDiv.className = 'search-add-hint';
        hintDiv.innerHTML = `<i class="fas fa-plus-circle"></i> Press <kbd>${enterText}</kbd> to add "<strong>${escapeHtml(searchTerm)}</strong>" as new`;
        hintDiv.addEventListener('click', () => openModal('add-cart', DOM.cartSearchInput.value.trim()));
        DOM.searchResultsList.appendChild(hintDiv);
    }

    results.forEach(item => {
        const inCart = isItemInCart(item.id);
        const div = document.createElement('div');
        div.className = `search-result-item${inCart ? ' already-added' : ''}`;
        const cat = getCategoryInfo(item.category);

        div.innerHTML = `
            <div class="result-icon"><i class="fas ${cat.icon}"></i></div>
            <div style="flex:1;min-width:0;">
                <div class="result-name">${escapeHtml(item.name)}</div>
                <div class="result-category">${escapeHtml(cat.label)}${item.quantity > 1 ? ` × ${item.quantity}` : ''}</div>
            </div>
            <div class="result-add">${inCart ? '<i class="fas fa-circle-check"></i>' : '<i class="fas fa-plus-circle"></i>'}</div>
        `;

        if (!inCart) {
            div.addEventListener('click', () => {
                openModal('send-to-cart', null, item.id);
                resetCartSearch();
            });
        }
        DOM.searchResultsList.appendChild(div);
    });
}

function renderCartList() {
    let items = sortCartItems([...Store.cartItems]);
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

    items.forEach((item, idx) => DOM.cartList.appendChild(createCartItem(item, idx)));
}

function createCartItem(item, idx) {
    const div = document.createElement('div');
    div.className = 'list-item';
    div.style.animationDelay = `${idx * 0.03}s`;

    const cat = getCategoryInfo(item.category);
    const subtotal = getItemSubtotal(item);
    const tax = getItemTax(item);
    const deposit = getItemDeposit(item);
    const total = getItemTotal(item);

    let metaTags = `<span class="item-category">${escapeHtml(cat.label)}</span>`;
    if (item.quantity > 1) metaTags += `<span class="item-qty">×${item.quantity}</span>`;
    if (item.hasTax && Store.settings.salesTaxRate > 0) metaTags += `<span class="item-tag tax-tag"><i class="fas fa-percent"></i> Tax</span>`;
    if (item.hasDeposit && item.depositCount > 0) metaTags += `<span class="item-tag deposit-tag"><i class="fas fa-recycle"></i> ${item.depositCount}×dep</span>`;

    let priceBreakdown = '';
    if (tax > 0 || deposit > 0) {
        let parts = [];
        if (tax > 0) parts.push(`+$${tax.toFixed(2)} tax`);
        if (deposit > 0) parts.push(`+$${deposit.toFixed(2)} dep`);
        priceBreakdown = `<div class="item-price-breakdown">${parts.join(' ')}</div>`;
    }

    div.innerHTML = `
        <div class="item-info">
            <div class="item-name">${escapeHtml(item.name)}</div>
            <div class="item-meta">${metaTags}</div>
        </div>
        <div class="item-price-wrap">
            <div class="item-price">$${total.toFixed(2)}</div>
            ${priceBreakdown}
        </div>
        <div class="item-actions">
            <button class="item-action-btn edit" title="Edit" data-action="edit-cart"><i class="fas fa-pen"></i></button>
            <button class="item-action-btn delete" title="Remove" data-action="delete-cart"><i class="fas fa-trash-can"></i></button>
        </div>
    `;

    div.addEventListener('click', (e) => {
        if (e.target.closest('[data-action]')) return;
        e.stopPropagation();
        revealItem(item.id, div);
    });

    div.querySelector('[data-action="edit-cart"]').addEventListener('click', (e) => {
        e.stopPropagation(); closeRevealedItem();
        openModal('edit-cart', null, item.id);
    });

    div.querySelector('[data-action="delete-cart"]').addEventListener('click', (e) => {
        e.stopPropagation(); closeRevealedItem();
        const linkedPlan = item.planId ? Store.planItems.find(p => p.id === item.planId) : null;

        if (linkedPlan) {
            showDeleteChoiceConfirm('Remove Item', `"${item.name}" is also in your plan list. What would you like to do?`, {
                planOnly: {
                    label: 'Remove from Cart Only', icon: 'fa-cart-shopping',
                    callback: () => {
                        Store.cartItems = Store.cartItems.filter(i => i.id !== item.id);
                        Store.save(); renderAll();
                        showToast(`"${item.name}" removed from cart`, 'success');
                    }
                },
                both: {
                    label: 'Remove from Both', icon: 'fa-trash-can',
                    callback: () => {
                        Store.planItems = Store.planItems.filter(p => p.id !== linkedPlan.id);
                        Store.cartItems = Store.cartItems.filter(i => i.id !== item.id);
                        Store.save(); renderAll();
                        showToast(`"${item.name}" removed from cart and plan`, 'success');
                    }
                }
            });
        } else {
            showConfirm('Remove from Cart?', `Remove "${item.name}" from your shopping cart?`, () => {
                Store.cartItems = Store.cartItems.filter(i => i.id !== item.id);
                Store.save(); renderAll();
                showToast(`"${item.name}" removed from cart`, 'success');
            });
        }
    });

    return div;
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
    const subtotal = Store.cartItems.reduce((sum, item) => sum + getItemSubtotal(item), 0);
    const totalTax = Store.cartItems.reduce((sum, item) => sum + getItemTax(item), 0);
    const totalDeposit = Store.cartItems.reduce((sum, item) => sum + getItemDeposit(item), 0);
    const grandTotal = subtotal + totalTax + totalDeposit;

    DOM.runningTotal.textContent = '$' + grandTotal.toFixed(2);
    DOM.headerTotal.querySelector('span').textContent = '$' + grandTotal.toFixed(2);

    // Breakdown
    if (totalTax > 0 || totalDeposit > 0) {
        let html = `<div class="breakdown-item subtotal-breakdown"><span class="breakdown-label">Subtotal:</span> <span class="breakdown-value">$${subtotal.toFixed(2)}</span></div>`;
        if (totalTax > 0) {
            html += `<div class="breakdown-item tax-breakdown"><span class="breakdown-label">Tax:</span> <span class="breakdown-value">$${totalTax.toFixed(2)}</span></div>`;
        }
        if (totalDeposit > 0) {
            html += `<div class="breakdown-item deposit-breakdown"><span class="breakdown-label">Deposit:</span> <span class="breakdown-value">$${totalDeposit.toFixed(2)}</span></div>`;
        }
        DOM.totalsBreakdown.innerHTML = html;
        DOM.totalsBreakdown.classList.add('show');
    } else {
        DOM.totalsBreakdown.innerHTML = '';
        DOM.totalsBreakdown.classList.remove('show');
    }
}

// ===== MODAL =====
function openModal(mode, prefillName, itemId) {
    closeRevealedItem();
    prefillName = prefillName || null;
    itemId = itemId || null;
    modalMode = mode;
    editingItemId = itemId;

    let title = '';
    let bodyHTML = '';

    const categoryOptions = CATEGORIES.map(c => `<option value="${c.id}">${c.label}</option>`).join('');
    const hasTaxRate = Store.settings.salesTaxRate > 0;
    const hasDepositAmt = Store.settings.depositAmount > 0;

    switch (mode) {
        case 'settings': {
            title = 'Settings';
            bodyHTML = `
                <div class="settings-section">
                    <div class="settings-section-title"><i class="fas fa-percent"></i> Sales Tax</div>
                    <div class="form-group">
                        <label class="form-label">Tax Rate (%)</label>
                        <input type="number" class="form-input" id="inputTaxRate" placeholder="e.g. 6.25" step="0.01" min="0" max="25" value="${Store.settings.salesTaxRate || ''}">
                        <div class="form-hint">Enter your state/local sales tax percentage</div>
                    </div>
                </div>
                <div class="settings-section">
                    <div class="settings-section-title"><i class="fas fa-recycle"></i> Bottle/Can Deposit</div>
                    <div class="form-group">
                        <label class="form-label">Deposit Per Container ($)</label>
                        <input type="number" class="form-input" id="inputDepositAmount" placeholder="e.g. 0.05 or 0.10" step="0.01" min="0" max="1" value="${Store.settings.depositAmount || ''}">
                        <div class="form-hint">Enter your state's bottle/can deposit amount</div>
                    </div>
                </div>
            `;
            break;
        }
        case 'add-plan': {
            title = 'Add to Plan';
            bodyHTML = `
                <div class="form-group">
                    <label class="form-label">Item Name</label>
                    <input type="text" class="form-input" id="inputName" placeholder="e.g. Organic Milk" value="${prefillName ? escapeHtml(prefillName) : ''}">
                </div>
                <div class="form-row">
                    <div class="form-group"><label class="form-label">Category</label><select class="form-select" id="inputCategory">${categoryOptions}</select></div>
                    <div class="form-group"><label class="form-label">Quantity</label><input type="number" class="form-input" id="inputQuantity" value="1" min="1" max="99"></div>
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
                    <div class="form-group"><label class="form-label">Category</label>
                        <select class="form-select" id="inputCategory">${CATEGORIES.map(c => `<option value="${c.id}"${c.id === item.category ? ' selected' : ''}>${c.label}</option>`).join('')}</select>
                    </div>
                    <div class="form-group"><label class="form-label">Quantity</label><input type="number" class="form-input" id="inputQuantity" value="${item.quantity || 1}" min="1" max="99"></div>
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
                    <div class="form-group"><label class="form-label">Price ($)</label><input type="number" class="form-input price-input" id="inputPrice" placeholder="0.00" step="0.01" min="0"></div>
                    <div class="form-group"><label class="form-label">Quantity</label><input type="number" class="form-input" id="inputQuantity" value="${item.quantity || 1}" min="1" max="99"></div>
                </div>
                ${buildExtrasHTML(hasTaxRate, hasDepositAmt, false, false, 0)}
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
                    <div class="form-group"><label class="form-label">Price ($)</label><input type="number" class="form-input price-input" id="inputPrice" placeholder="0.00" step="0.01" min="0"></div>
                    <div class="form-group"><label class="form-label">Quantity</label><input type="number" class="form-input" id="inputQuantity" value="1" min="1" max="99"></div>
                </div>
                <div class="form-group"><label class="form-label">Category</label><select class="form-select" id="inputCategory">${categoryOptions}</select></div>
                ${buildExtrasHTML(hasTaxRate, hasDepositAmt, false, false, 0)}
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
                    <div class="form-group"><label class="form-label">Price ($)</label><input type="number" class="form-input price-input" id="inputPrice" value="${item.price.toFixed(2)}" step="0.01" min="0"></div>
                    <div class="form-group"><label class="form-label">Quantity</label><input type="number" class="form-input" id="inputQuantity" value="${item.quantity || 1}" min="1" max="99"></div>
                </div>
                <div class="form-group"><label class="form-label">Category</label>
                    <select class="form-select" id="inputCategory">${CATEGORIES.map(c => `<option value="${c.id}"${c.id === item.category ? ' selected' : ''}>${c.label}</option>`).join('')}</select>
                </div>
                ${buildExtrasHTML(hasTaxRate, hasDepositAmt, item.hasTax, item.hasDeposit, item.depositCount)}
            `;
            break;
        }
    }

    DOM.modalTitle.textContent = title;
    DOM.modalBody.innerHTML = bodyHTML;
    DOM.modalConfirm.onclick = handleModalConfirm;

    setupDepositToggle();

    DOM.modalBody.querySelectorAll('input').forEach(input => {
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleModalConfirm(); });
    });

    DOM.modalOverlay.classList.add('show');
    setTimeout(() => {
        const first = DOM.modalBody.querySelector('input:not([readonly])');
        if (first) first.focus();
    }, 350);
}

function buildExtrasHTML(hasTaxRate, hasDepositAmt, taxChecked, depositChecked, depositCount) {
    if (!hasTaxRate && !hasDepositAmt) return '';

    let html = '<div class="form-extras">';

    if (hasTaxRate) {
        html += `
            <label class="custom-checkbox">
                <input type="checkbox" id="inputHasTax" ${taxChecked ? 'checked' : ''}>
                <span class="checkbox-mark"></span>
                <span class="checkbox-label"><i class="fas fa-percent"></i> Taxable (${Store.settings.salesTaxRate}%)</span>
            </label>
        `;
    }

    if (hasDepositAmt) {
        html += `
            <label class="custom-checkbox">
                <input type="checkbox" id="inputHasDeposit" ${depositChecked ? 'checked' : ''}>
                <span class="checkbox-mark"></span>
                <span class="checkbox-label"><i class="fas fa-recycle"></i> Bottle/Can Deposit ($${Store.settings.depositAmount.toFixed(2)}/ea)</span>
            </label>
            <div class="deposit-count-wrap" id="depositCountWrap" style="display:${depositChecked ? 'block' : 'none'};">
                <label class="form-label">How many containers?</label>
                <input type="number" class="form-input" id="inputDepositCount" placeholder="e.g. 24" min="1" max="999" value="${depositCount || ''}">
                <div class="form-hint deposit-calc" id="depositCalc"></div>
            </div>
        `;
    }

    html += '</div>';
    return html;
}

function setupDepositToggle() {
    const cb = DOM.modalBody.querySelector('#inputHasDeposit');
    const wrap = DOM.modalBody.querySelector('#depositCountWrap');
    const countInput = DOM.modalBody.querySelector('#inputDepositCount');
    const calc = DOM.modalBody.querySelector('#depositCalc');

    if (!cb || !wrap) return;

    cb.addEventListener('change', () => {
        wrap.style.display = cb.checked ? 'block' : 'none';
        if (cb.checked && countInput) setTimeout(() => countInput.focus(), 100);
        updateCalc();
    });

    if (countInput) countInput.addEventListener('input', updateCalc);
    updateCalc();

    function updateCalc() {
        if (!calc || !countInput) return;
        const count = parseInt(countInput.value) || 0;
        if (count > 0 && cb.checked) {
            const total = count * Store.settings.depositAmount;
            calc.textContent = `${count} × $${Store.settings.depositAmount.toFixed(2)} = $${total.toFixed(2)} deposit`;
            calc.style.display = 'block';
        } else {
            calc.style.display = 'none';
        }
    }
}

function closeModal() {
    DOM.modalOverlay.classList.remove('show');
    modalMode = null;
    editingItemId = null;
}

function handleModalConfirm() {
    if (modalMode === 'settings') {
        const taxRateEl = DOM.modalBody.querySelector('#inputTaxRate');
        const depositAmtEl = DOM.modalBody.querySelector('#inputDepositAmount');
        const taxRate = taxRateEl ? parseFloat(taxRateEl.value) || 0 : 0;
        const depositAmt = depositAmtEl ? parseFloat(depositAmtEl.value) || 0 : 0;

        if (taxRate < 0 || taxRate > 25) { showToast('Tax rate must be 0–25%', 'error'); return; }
        if (depositAmt < 0 || depositAmt > 1) { showToast('Deposit must be $0.00–$1.00', 'error'); return; }

        Store.settings.salesTaxRate = taxRate;
        Store.settings.depositAmount = depositAmt;
        Store.save();
        closeModal();
        renderAll();
        showToast('Settings saved', 'success');
        return;
    }

    const nameEl = DOM.modalBody.querySelector('#inputName');
    const priceEl = DOM.modalBody.querySelector('#inputPrice');
    const qtyEl = DOM.modalBody.querySelector('#inputQuantity');
    const catEl = DOM.modalBody.querySelector('#inputCategory');
    const hasTaxEl = DOM.modalBody.querySelector('#inputHasTax');
    const hasDepositEl = DOM.modalBody.querySelector('#inputHasDeposit');
    const depositCountEl = DOM.modalBody.querySelector('#inputDepositCount');

    const name = nameEl ? nameEl.value.trim() : '';
    const price = priceEl ? parseFloat(priceEl.value) || 0 : 0;
    const quantity = qtyEl ? Math.max(1, parseInt(qtyEl.value) || 1) : 1;
    const category = catEl ? catEl.value : 'other';
    const hasTax = hasTaxEl ? hasTaxEl.checked : false;
    const hasDeposit = hasDepositEl ? hasDepositEl.checked : false;
    const depositCount = depositCountEl ? Math.max(0, parseInt(depositCountEl.value) || 0) : 0;

    if (!name) { showToast('Please enter an item name', 'error'); if (nameEl) nameEl.focus(); return; }

    let toastMsg = '';

    switch (modalMode) {
        case 'add-plan': {
            if (Store.planItems.find(i => i.name.toLowerCase() === name.toLowerCase())) {
                showToast(`"${name}" is already on your list`, 'error'); return;
            }
            Store.planItems.push({ id: Store.generateId(), name: capitalizeFirst(name), category, quantity, createdAt: Date.now() });
            Store.save();
            toastMsg = `"${capitalizeFirst(name)}" added to plan`;
            break;
        }
        case 'edit-plan': {
            const item = Store.planItems.find(i => i.id === editingItemId);
            if (item) {
                const oldQty = item.quantity;
                item.name = capitalizeFirst(name); item.category = category; item.quantity = quantity;
                const linked = Store.cartItems.find(c => c.planId === item.id);
                if (linked) { linked.name = item.name; linked.category = item.category; if (oldQty !== quantity) linked.quantity = quantity; }
                Store.save();
                toastMsg = `"${item.name}" updated`;
            }
            break;
        }
        case 'send-to-cart': {
            const planItem = Store.planItems.find(i => i.id === editingItemId);
            if (!planItem) break;
            if (isItemInCart(planItem.id)) { showToast(`"${planItem.name}" is already in your cart`, 'info'); closeModal(); return; }
            if (price <= 0) { showToast('Please enter a valid price', 'error'); if (priceEl) priceEl.focus(); return; }
            if (hasDeposit && depositCount <= 0) { showToast('Please enter number of containers', 'error'); if (depositCountEl) depositCountEl.focus(); return; }

            planItem.quantity = quantity;
            const cartItem = {
                id: Store.generateId(), planId: planItem.id, name: planItem.name, category: planItem.category,
                price, quantity, hasTax, hasDeposit, depositCount: hasDeposit ? depositCount : 0, createdAt: Date.now()
            };
            Store.cartItems.push(cartItem);
            Store.save();
            toastMsg = `"${planItem.name}" added — $${getItemTotal(cartItem).toFixed(2)}`;
            break;
        }
        case 'add-cart': {
            if (price <= 0) { showToast('Please enter a valid price', 'error'); if (priceEl) priceEl.focus(); return; }
            if (hasDeposit && depositCount <= 0) { showToast('Please enter number of containers', 'error'); if (depositCountEl) depositCountEl.focus(); return; }

            let planItem = Store.planItems.find(i => i.name.toLowerCase() === name.toLowerCase());
            if (!planItem) {
                planItem = { id: Store.generateId(), name: capitalizeFirst(name), category, quantity, createdAt: Date.now() };
                Store.planItems.push(planItem);
            } else { planItem.quantity = quantity; }

            if (isItemInCart(planItem.id)) { showToast(`"${planItem.name}" is already in your cart`, 'info'); closeModal(); return; }

            const cartItem = {
                id: Store.generateId(), planId: planItem.id, name: capitalizeFirst(name), category,
                price, quantity, hasTax, hasDeposit, depositCount: hasDeposit ? depositCount : 0, createdAt: Date.now()
            };
            Store.cartItems.push(cartItem);
            Store.save();
            toastMsg = `"${capitalizeFirst(name)}" added — $${getItemTotal(cartItem).toFixed(2)}`;
            break;
        }
        case 'edit-cart': {
            const item = Store.cartItems.find(i => i.id === editingItemId);
            if (item) {
                if (price <= 0) { showToast('Please enter a valid price', 'error'); if (priceEl) priceEl.focus(); return; }
                if (hasDeposit && depositCount <= 0) { showToast('Please enter number of containers', 'error'); if (depositCountEl) depositCountEl.focus(); return; }

                const oldQty = item.quantity;
                item.name = capitalizeFirst(name); item.price = price; item.quantity = quantity;
                item.category = category; item.hasTax = hasTax; item.hasDeposit = hasDeposit;
                item.depositCount = hasDeposit ? depositCount : 0;

                if (item.planId) {
                    const linked = Store.planItems.find(p => p.id === item.planId);
                    if (linked) { linked.name = item.name; linked.category = item.category; if (oldQty !== quantity) linked.quantity = quantity; }
                }
                Store.save();
                toastMsg = `"${item.name}" updated`;
            }
            break;
        }
    }

    closeModal();
    resetPlanSearch();
    resetCartSearch();

    setTimeout(() => {
        renderAll();
        if (toastMsg) showToast(toastMsg, 'success');
    }, 50);
}

// ===== CONFIRM =====
function showConfirm(title, message, callback) {
    DOM.confirmTitle.textContent = title;
    DOM.confirmMessage.textContent = message;
    confirmCallback = callback;

    const actions = DOM.confirmOverlay.querySelector('.confirm-actions');
    actions.innerHTML = `
        <button class="confirm-btn no" id="confirmNo">Cancel</button>
        <button class="confirm-btn yes" id="confirmYes">Delete</button>
    `;
    actions.querySelector('#confirmNo').addEventListener('click', closeConfirm);
    actions.querySelector('#confirmYes').addEventListener('click', () => { if (confirmCallback) confirmCallback(); closeConfirm(); });
    DOM.confirmOverlay.classList.add('show');
}

function showDeleteChoiceConfirm(title, message, options) {
    DOM.confirmTitle.textContent = title;
    DOM.confirmMessage.textContent = message;

    const actions = DOM.confirmOverlay.querySelector('.confirm-actions');
    actions.innerHTML = `
        <button class="confirm-btn no" id="confirmCancel">Cancel</button>
        <button class="confirm-btn choice-single" id="confirmSingle"><i class="fas ${options.planOnly.icon}"></i> ${escapeHtml(options.planOnly.label)}</button>
        <button class="confirm-btn choice-both" id="confirmBoth"><i class="fas ${options.both.icon}"></i> ${escapeHtml(options.both.label)}</button>
    `;
    actions.querySelector('#confirmCancel').addEventListener('click', closeConfirm);
    actions.querySelector('#confirmSingle').addEventListener('click', () => { options.planOnly.callback(); closeConfirm(); });
    actions.querySelector('#confirmBoth').addEventListener('click', () => { options.both.callback(); closeConfirm(); });
    DOM.confirmOverlay.classList.add('show');
}

function showClearChoiceConfirm() {
    DOM.confirmTitle.textContent = 'Clear Items';
    DOM.confirmMessage.textContent = 'What would you like to clear?';

    const actions = DOM.confirmOverlay.querySelector('.confirm-actions');
    const hasPlan = Store.planItems.length > 0;
    const hasCart = Store.cartItems.length > 0;

    actions.innerHTML = `
        <button class="confirm-btn no" id="confirmCancel">Cancel</button>
        ${hasPlan ? '<button class="confirm-btn choice-single" id="confirmClearPlan"><i class="fas fa-clipboard-list"></i> Clear Plan List</button>' : ''}
        ${hasCart ? '<button class="confirm-btn choice-single" id="confirmClearCart"><i class="fas fa-cart-shopping"></i> Clear Shopping Cart</button>' : ''}
        ${hasPlan && hasCart ? '<button class="confirm-btn choice-both" id="confirmClearBoth"><i class="fas fa-trash-can"></i> Clear Both</button>' : ''}
    `;

    actions.querySelector('#confirmCancel').addEventListener('click', closeConfirm);

    const cp = actions.querySelector('#confirmClearPlan');
    if (cp) cp.addEventListener('click', () => {
        closeConfirm();
        showConfirm('Clear Plan List?', 'Remove all items from your plan list? Cart items will be unlinked but kept.', () => {
            Store.cartItems.forEach(c => { if (c.planId) c.planId = null; });
            Store.planItems = []; Store.save(); renderAll();
            showToast('Plan list cleared', 'success');
        });
    });

    const cc = actions.querySelector('#confirmClearCart');
    if (cc) cc.addEventListener('click', () => {
        closeConfirm();
        showConfirm('Clear Shopping Cart?', 'Remove all items from your shopping cart? Plan items will be kept.', () => {
            Store.cartItems = []; Store.save(); renderAll();
            showToast('Shopping cart cleared', 'success');
        });
    });

    const cb = actions.querySelector('#confirmClearBoth');
    if (cb) cb.addEventListener('click', () => {
        closeConfirm();
        showConfirm('Clear Everything?', 'Remove ALL items from both your plan and cart? This cannot be undone.', () => {
            Store.planItems = []; Store.cartItems = []; Store.save(); renderAll();
            showToast('All items cleared', 'success');
        });
    });

    DOM.confirmOverlay.classList.add('show');
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
    const icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' };

    toast.innerHTML = `
        <div class="toast-icon"><i class="fas ${icons[type] || icons.info}"></i></div>
        <div class="toast-message">${escapeHtml(message)}</div>
        <button class="toast-close"><i class="fas fa-xmark"></i></button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => removeToast(toast));
    DOM.toastContainer.appendChild(toast);
    setTimeout(() => removeToast(toast), 900);
}

function removeToast(toast) {
    if (!toast.parentNode) return;
    toast.classList.add('removing');
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
}

// ===== START =====
document.addEventListener('DOMContentLoaded', init);