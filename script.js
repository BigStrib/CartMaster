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
var $ = function(sel) { return document.querySelector(sel); };
var $$ = function(sel) { return document.querySelectorAll(sel); };

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
    confirmActions: $('#confirmActions'),

    toastContainer: $('#toastContainer')
};

// ===== STATE =====
var currentTab = 'planning';
var activeCategory = 'all';
var planSort = 'unchecked-first';
var cartSort = 'alpha-asc';
var confirmCallback = null;
var modalMode = null;
var editingItemId = null;
var revealedItemId = null;
var skipPlanSearch = false;
var catDragged = false;

// ===== TAP HELPER =====
function onTap(el, callback) {
    if (!el) return;
    el.addEventListener('click', function(e) {
        e.stopPropagation();
        callback(e);
    });
}

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
    DOM.catChips.forEach(function(c) {
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
    document.querySelectorAll('.list-item.actions-revealed').forEach(function(el) {
        el.classList.remove('actions-revealed');
    });
    revealedItemId = null;
}

// ===== SORT DROPDOWN =====
function buildSortDropdown() { updateSortDropdown(); }

function updateSortDropdown() {
    DOM.sortDropdown.innerHTML = '';

    if (currentTab === 'planning') {
        var options = [
            { sort: 'unchecked-first', label: 'Unchecked First', icon: 'fa-square' },
            { sort: 'checked-first', label: 'Checked First', icon: 'fa-square-check' }
        ];
        options.forEach(function(opt) {
            var div = document.createElement('div');
            div.className = 'sort-option' + (planSort === opt.sort ? ' active' : '');
            div.innerHTML = '<i class="fas ' + opt.icon + '"></i> ' + opt.label;
            onTap(div, function() {
                planSort = opt.sort;
                DOM.sortDropdown.classList.remove('show');
                updateSortDropdown();
                renderPlanList();
                showToast('Sorted successfully', 'info');
            });
            DOM.sortDropdown.appendChild(div);
        });
    } else {
        var options = [
            { sort: 'alpha-asc', label: 'Name A–Z', icon: 'fa-arrow-down-a-z' },
            { sort: 'alpha-desc', label: 'Name Z–A', icon: 'fa-arrow-up-z-a' },
            { sort: 'price-desc', label: 'Price High to Low', icon: 'fa-arrow-down-wide-short' },
            { sort: 'price-asc', label: 'Price Low to High', icon: 'fa-arrow-up-short-wide' }
        ];
        options.forEach(function(opt) {
            var div = document.createElement('div');
            div.className = 'sort-option' + (cartSort === opt.sort ? ' active' : '');
            div.innerHTML = '<i class="fas ' + opt.icon + '"></i> ' + opt.label;
            onTap(div, function() {
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

// ===== CATEGORY DRAG (MOUSE + TOUCH) =====
function initCategoryDrag() {
    var el = DOM.catScroller;
    var isDown = false;
    var startX = 0;
    var scrollLeft = 0;
    catDragged = false;

    // Mouse events for desktop drag
    el.addEventListener('mousedown', function(e) {
        isDown = true;
        catDragged = false;
        el.style.cursor = 'grabbing';
        startX = e.pageX - el.offsetLeft;
        scrollLeft = el.scrollLeft;
    });

    el.addEventListener('mouseleave', function() {
        isDown = false;
        el.style.cursor = 'grab';
    });

    el.addEventListener('mouseup', function() {
        isDown = false;
        el.style.cursor = 'grab';
    });

    el.addEventListener('mousemove', function(e) {
        if (!isDown) return;
        e.preventDefault();
        var x = e.pageX - el.offsetLeft;
        var walk = (x - startX) * 2;
        if (Math.abs(walk) > 5) catDragged = true;
        el.scrollLeft = scrollLeft - walk;
    });

    // Touch events for mobile drag
    var touchStartX = 0;
    var touchScrollLeft = 0;
    var touchMoved = false;

    el.addEventListener('touchstart', function(e) {
        touchMoved = false;
        catDragged = false;
        touchStartX = e.touches[0].pageX;
        touchScrollLeft = el.scrollLeft;
    }, { passive: true });

    el.addEventListener('touchmove', function(e) {
        var x = e.touches[0].pageX;
        var diff = touchStartX - x;
        if (Math.abs(diff) > 5) {
            touchMoved = true;
            catDragged = true;
        }
        el.scrollLeft = touchScrollLeft + diff;
    }, { passive: true });

    el.addEventListener('touchend', function() {
        // catDragged stays true if we moved, used by chip click handler
    }, { passive: true });
}

// ===== EVENTS =====
function bindEvents() {
    // Tabs
    DOM.tabBtns.forEach(function(btn) {
        onTap(btn, function() { switchTab(btn.dataset.tab); });
    });

    // Plan search
    DOM.planSearchInput.addEventListener('input', handlePlanSearch);
    onTap(DOM.planSearchClear, function() { resetPlanSearch(); renderPlanList(); });

    // Cart search
    DOM.cartSearchInput.addEventListener('input', handleCartSearch);
    onTap(DOM.cartSearchClear, function() { resetCartSearch(); });

    // Add buttons
    onTap(DOM.addPlanItemBtn, function() { openModal('add-plan'); });
    onTap(DOM.addCartItemBtn, function() { openModal('add-cart'); });

    // Category chips - handle both click and touch with drag detection
    DOM.catChips.forEach(function(chip) {
        chip.addEventListener('click', function(e) {
            e.stopPropagation();
            if (catDragged) {
                catDragged = false;
                return;
            }
            handleCategorySelect(chip);
        });

        chip.addEventListener('touchend', function(e) {
            if (catDragged) {
                catDragged = false;
                return;
            }
            e.preventDefault();
            handleCategorySelect(chip);
        });
    });

    // Sort button
    onTap(DOM.sortBtn, function() {
        updateSortDropdown();
        DOM.sortDropdown.classList.toggle('show');
    });

    // Close sort dropdown and revealed items on outside tap
    document.addEventListener('click', function(e) {
        if (!e.target.closest('#sortBtn') && !e.target.closest('#sortDropdown')) {
            DOM.sortDropdown.classList.remove('show');
        }
        if (!e.target.closest('.list-item')) {
            closeRevealedItem();
        }
    });

    document.addEventListener('touchstart', function(e) {
        if (!e.target.closest('#sortBtn') && !e.target.closest('#sortDropdown')) {
            DOM.sortDropdown.classList.remove('show');
        }
    }, { passive: true });

    // Clear all
    onTap(DOM.clearAllBtn, function() {
        if (Store.planItems.length === 0 && Store.cartItems.length === 0) {
            showToast('Nothing to clear', 'info');
            return;
        }
        showClearChoiceConfirm();
    });

    // Settings
    onTap(DOM.settingsBtn, function() { openModal('settings'); });

    // Modal close
    onTap(DOM.modalClose, closeModal);
    onTap(DOM.modalCancel, closeModal);
    DOM.modalOverlay.addEventListener('click', function(e) {
        if (e.target === DOM.modalOverlay) closeModal();
    });

    // Confirm close
    DOM.confirmOverlay.addEventListener('click', function(e) {
        if (e.target === DOM.confirmOverlay) closeConfirm();
    });

    // Plan search enter key
    DOM.planSearchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            var val = DOM.planSearchInput.value.trim();
            if (!val) return;
            var exists = Store.planItems.find(function(i) { return i.name.toLowerCase() === val.toLowerCase(); });
            if (!exists) openModal('add-plan', val);
        }
    });

    // Cart search enter key
    DOM.cartSearchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            var val = DOM.cartSearchInput.value.trim();
            if (!val) return;
            var planItem = Store.planItems.find(function(i) { return i.name.toLowerCase() === val.toLowerCase(); });
            if (!planItem) {
                openModal('add-cart', val);
            } else if (!isItemInCart(planItem.id)) {
                openModal('send-to-cart', null, planItem.id);
            }
        }
    });
}

function handleCategorySelect(chip) {
    DOM.planSearchInput.value = '';
    DOM.planSearchClear.classList.remove('show');
    DOM.planSearchInput.blur();
    DOM.catChips.forEach(function(c) { c.classList.remove('active'); });
    chip.classList.add('active');
    activeCategory = chip.dataset.category;
    skipPlanSearch = true;
    renderPlanList();
}

// ===== TAB SWITCHING =====
function switchTab(tab) {
    closeRevealedItem();
    currentTab = tab;
    DOM.tabBtns.forEach(function(btn) { btn.classList.toggle('active', btn.dataset.tab === tab); });
    DOM.planningTab.classList.toggle('active', tab === 'planning');
    DOM.shoppingTab.classList.toggle('active', tab === 'shopping');
    updateSortDropdown();
}

// ===== HELPERS =====
function isItemInCart(planId) {
    return Store.cartItems.some(function(c) { return c.planId === planId; });
}

function escapeHtml(text) {
    var d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getCategoryInfo(id) {
    return CATEGORIES.find(function(c) { return c.id === id; }) || CATEGORIES[CATEGORIES.length - 1];
}

function isMobile() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth <= 768;
}

function sortPlanItems(items) {
    var s = items.slice();
    switch (planSort) {
        case 'unchecked-first':
            return s.sort(function(a, b) {
                var d = (isItemInCart(a.id) ? 1 : 0) - (isItemInCart(b.id) ? 1 : 0);
                return d !== 0 ? d : a.name.localeCompare(b.name);
            });
        case 'checked-first':
            return s.sort(function(a, b) {
                var d = (isItemInCart(a.id) ? 0 : 1) - (isItemInCart(b.id) ? 0 : 1);
                return d !== 0 ? d : a.name.localeCompare(b.name);
            });
        default: return s;
    }
}

function sortCartItems(items) {
    var s = items.slice();
    switch (cartSort) {
        case 'alpha-asc': return s.sort(function(a, b) { return a.name.localeCompare(b.name); });
        case 'alpha-desc': return s.sort(function(a, b) { return b.name.localeCompare(a.name); });
        case 'price-asc': return s.sort(function(a, b) { return getItemTotal(a) - getItemTotal(b); });
        case 'price-desc': return s.sort(function(a, b) { return getItemTotal(b) - getItemTotal(a); });
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
    var val = DOM.planSearchInput.value.trim();
    DOM.planSearchClear.classList.toggle('show', val.length > 0);
    renderPlanList();
}

function renderPlanList() {
    var items = Store.planItems.slice();
    var searchTerm = '';

    if (skipPlanSearch) {
        skipPlanSearch = false;
    } else {
        searchTerm = DOM.planSearchInput.value.trim().toLowerCase();
    }

    if (activeCategory !== 'all') {
        items = items.filter(function(item) { return item.category === activeCategory; });
    }

    if (searchTerm) {
        items = items.filter(function(item) { return item.name.toLowerCase().includes(searchTerm); });
    }

    items = sortPlanItems(items);
    DOM.planList.innerHTML = '';

    if (items.length === 0) {
        var empty = document.createElement('div');
        empty.className = 'empty-state';
        var enterText = isMobile() ? 'return' : 'Enter';

        if (searchTerm) {
            empty.innerHTML =
                '<i class="fas fa-magnifying-glass"></i>' +
                '<h3>No Items Found</h3>' +
                '<p>No results for "<strong>' + escapeHtml(searchTerm) + '</strong>"</p>' +
                '<p class="empty-hint">Press <kbd>' + enterText + '</kbd> to add "<strong>' + escapeHtml(searchTerm) + '</strong>" as a new item</p>';
        } else if (Store.planItems.length === 0) {
            empty.innerHTML =
                '<i class="fas fa-clipboard-list"></i>' +
                '<h3>Start Your Shopping List</h3>' +
                '<p>Add items you need to buy before heading to the store</p>';
        } else {
            empty.innerHTML =
                '<i class="fas fa-magnifying-glass"></i>' +
                '<h3>No Items Found</h3>' +
                '<p>Try a different search or category filter</p>';
        }
        DOM.planList.appendChild(empty);
        return;
    }

    if (searchTerm) {
        var exactMatch = Store.planItems.find(function(i) { return i.name.toLowerCase() === searchTerm; });
        if (!exactMatch) {
            var enterText2 = isMobile() ? 'return' : 'Enter';
            var hint = document.createElement('div');
            hint.className = 'search-add-hint';
            hint.innerHTML = '<i class="fas fa-plus-circle"></i> Press <kbd>' + enterText2 + '</kbd> to add "<strong>' + escapeHtml(searchTerm) + '</strong>"';
            onTap(hint, function() { openModal('add-plan', DOM.planSearchInput.value.trim()); });
            DOM.planList.appendChild(hint);
        }
    }

    items.forEach(function(item, idx) { DOM.planList.appendChild(createPlanItem(item, idx)); });
}

function createPlanItem(item, idx) {
    var div = document.createElement('div');
    var inCart = isItemInCart(item.id);
    div.className = 'list-item';
    if (inCart) div.classList.add('checked', 'checked-locked');
    div.style.animationDelay = (idx * 0.03) + 's';

    var cat = getCategoryInfo(item.category);

    var html =
        '<div class="item-check' + (inCart ? ' checked locked' : '') + '">' +
            '<i class="fas fa-check"></i>' +
        '</div>' +
        '<div class="item-info">' +
            '<div class="item-name">' + escapeHtml(item.name) + '</div>' +
            '<div class="item-meta">' +
                '<span class="item-category">' + escapeHtml(cat.label) + '</span>' +
                (item.quantity > 1 ? '<span class="item-qty">×' + item.quantity + '</span>' : '') +
                (inCart ? '<span class="item-in-cart-badge"><i class="fas fa-cart-shopping"></i> In cart</span>' : '') +
            '</div>' +
        '</div>';

    if (!inCart) {
        html += '<button class="item-action-btn send" title="Send to Cart" data-action="send" type="button"><i class="fas fa-cart-plus"></i></button>';
    }

    html +=
        '<div class="item-actions">' +
            '<button class="item-action-btn edit" title="Edit" data-action="edit-plan" type="button"><i class="fas fa-pen"></i></button>' +
            '<button class="item-action-btn delete" title="Delete" data-action="delete-plan" type="button"><i class="fas fa-trash-can"></i></button>' +
        '</div>';

    div.innerHTML = html;

    // Item body tap to reveal actions
    div.addEventListener('click', function(e) {
        if (e.target.closest('[data-action]')) return;
        e.stopPropagation();
        revealItem(item.id, div);
    });

    // Send button
    var sendBtn = div.querySelector('[data-action="send"]');
    if (sendBtn) {
        onTap(sendBtn, function() {
            closeRevealedItem();
            openModal('send-to-cart', null, item.id);
        });
    }

    // Edit button
    var editBtn = div.querySelector('[data-action="edit-plan"]');
    onTap(editBtn, function() {
        closeRevealedItem();
        openModal('edit-plan', null, item.id);
    });

    // Delete button
    var deleteBtn = div.querySelector('[data-action="delete-plan"]');
    onTap(deleteBtn, function() {
        closeRevealedItem();
        var linked = Store.cartItems.find(function(c) { return c.planId === item.id; });

        if (linked) {
            showDeleteChoiceConfirm('Remove Item', '"' + item.name + '" is also in your shopping cart. What would you like to do?', {
                planOnly: {
                    label: 'Remove from Plan Only', icon: 'fa-clipboard-list',
                    callback: function() {
                        Store.planItems = Store.planItems.filter(function(i) { return i.id !== item.id; });
                        var ci = Store.cartItems.find(function(c) { return c.planId === item.id; });
                        if (ci) ci.planId = null;
                        Store.save(); renderAll();
                        showToast('"' + item.name + '" removed from plan', 'success');
                    }
                },
                both: {
                    label: 'Remove from Both', icon: 'fa-trash-can',
                    callback: function() {
                        Store.cartItems = Store.cartItems.filter(function(c) { return c.planId !== item.id; });
                        Store.planItems = Store.planItems.filter(function(i) { return i.id !== item.id; });
                        Store.save(); renderAll();
                        showToast('"' + item.name + '" removed from plan and cart', 'success');
                    }
                }
            });
        } else {
            showConfirm('Remove Item?', 'Remove "' + item.name + '" from your planning list?', function() {
                Store.planItems = Store.planItems.filter(function(i) { return i.id !== item.id; });
                Store.save(); renderAll();
                showToast('"' + item.name + '" removed', 'success');
            });
        }
    });

    return div;
}

// ===== CART LIST =====
function handleCartSearch() {
    var val = DOM.cartSearchInput.value.trim().toLowerCase();
    DOM.cartSearchClear.classList.toggle('show', val.length > 0);

    if (val.length > 0) {
        var results = Store.planItems.filter(function(item) { return item.name.toLowerCase().includes(val); });
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
    var enterText = isMobile() ? 'return' : 'Enter';
    var div = document.createElement('div');
    div.className = 'search-empty-hint';
    div.innerHTML =
        '<div class="empty-hint-icon"><i class="fas fa-magnifying-glass"></i></div>' +
        '<p>No items found for "<strong>' + escapeHtml(searchTerm) + '</strong>"</p>' +
        '<p class="empty-hint-action">Press <kbd>' + enterText + '</kbd> to add it as a new item</p>';
    onTap(div, function() { openModal('add-cart', DOM.cartSearchInput.value.trim()); });
    DOM.searchResultsList.appendChild(div);
}

function renderSearchResults(results) {
    DOM.searchResultsList.innerHTML = '';
    var searchTerm = DOM.cartSearchInput.value.trim().toLowerCase();
    var exactMatch = Store.planItems.find(function(i) { return i.name.toLowerCase() === searchTerm; });

    if (!exactMatch && searchTerm) {
        var enterText = isMobile() ? 'return' : 'Enter';
        var hintDiv = document.createElement('div');
        hintDiv.className = 'search-add-hint';
        hintDiv.innerHTML = '<i class="fas fa-plus-circle"></i> Press <kbd>' + enterText + '</kbd> to add "<strong>' + escapeHtml(searchTerm) + '</strong>" as new';
        onTap(hintDiv, function() { openModal('add-cart', DOM.cartSearchInput.value.trim()); });
        DOM.searchResultsList.appendChild(hintDiv);
    }

    results.forEach(function(item) {
        var inCart = isItemInCart(item.id);
        var div = document.createElement('div');
        div.className = 'search-result-item' + (inCart ? ' already-added' : '');
        var cat = getCategoryInfo(item.category);

        div.innerHTML =
            '<div class="result-icon"><i class="fas ' + cat.icon + '"></i></div>' +
            '<div style="flex:1;min-width:0;">' +
                '<div class="result-name">' + escapeHtml(item.name) + '</div>' +
                '<div class="result-category">' + escapeHtml(cat.label) + (item.quantity > 1 ? ' × ' + item.quantity : '') + '</div>' +
            '</div>' +
            '<div class="result-add">' + (inCart ? '<i class="fas fa-circle-check"></i>' : '<i class="fas fa-plus-circle"></i>') + '</div>';

        if (!inCart) {
            onTap(div, function() {
                openModal('send-to-cart', null, item.id);
                resetCartSearch();
            });
        }
        DOM.searchResultsList.appendChild(div);
    });
}

function renderCartList() {
    var items = sortCartItems(Store.cartItems.slice());
    DOM.cartList.innerHTML = '';

    if (items.length === 0) {
        var empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.innerHTML =
            '<i class="fas fa-basket-shopping"></i>' +
            '<h3>Your Cart is Empty</h3>' +
            '<p>Search your planned items above or add new items directly</p>';
        DOM.cartList.appendChild(empty);
        return;
    }

    items.forEach(function(item, idx) { DOM.cartList.appendChild(createCartItem(item, idx)); });
}

function createCartItem(item, idx) {
    var div = document.createElement('div');
    div.className = 'list-item';
    div.style.animationDelay = (idx * 0.03) + 's';

    var cat = getCategoryInfo(item.category);
    var tax = getItemTax(item);
    var deposit = getItemDeposit(item);
    var total = getItemTotal(item);

    var metaTags = '<span class="item-category">' + escapeHtml(cat.label) + '</span>';
    if (item.quantity > 1) metaTags += '<span class="item-qty">×' + item.quantity + '</span>';
    if (item.hasTax && Store.settings.salesTaxRate > 0) metaTags += '<span class="item-tag tax-tag"><i class="fas fa-percent"></i> Tax</span>';
    if (item.hasDeposit && item.depositCount > 0) metaTags += '<span class="item-tag deposit-tag"><i class="fas fa-recycle"></i> ' + item.depositCount + '×dep</span>';

    var priceBreakdown = '';
    if (tax > 0 || deposit > 0) {
        var parts = [];
        if (tax > 0) parts.push('+$' + tax.toFixed(2) + ' tax');
        if (deposit > 0) parts.push('+$' + deposit.toFixed(2) + ' dep');
        priceBreakdown = '<div class="item-price-breakdown">' + parts.join(' ') + '</div>';
    }

    div.innerHTML =
        '<div class="item-info">' +
            '<div class="item-name">' + escapeHtml(item.name) + '</div>' +
            '<div class="item-meta">' + metaTags + '</div>' +
        '</div>' +
        '<div class="item-price-wrap">' +
            '<div class="item-price">$' + total.toFixed(2) + '</div>' +
            priceBreakdown +
        '</div>' +
        '<div class="item-actions">' +
            '<button class="item-action-btn edit" title="Edit" data-action="edit-cart" type="button"><i class="fas fa-pen"></i></button>' +
            '<button class="item-action-btn delete" title="Remove" data-action="delete-cart" type="button"><i class="fas fa-trash-can"></i></button>' +
        '</div>';

    div.addEventListener('click', function(e) {
        if (e.target.closest('[data-action]')) return;
        e.stopPropagation();
        revealItem(item.id, div);
    });

    var editBtn = div.querySelector('[data-action="edit-cart"]');
    onTap(editBtn, function() {
        closeRevealedItem();
        openModal('edit-cart', null, item.id);
    });

    var deleteBtn = div.querySelector('[data-action="delete-cart"]');
    onTap(deleteBtn, function() {
        closeRevealedItem();
        var linkedPlan = item.planId ? Store.planItems.find(function(p) { return p.id === item.planId; }) : null;

        if (linkedPlan) {
            showDeleteChoiceConfirm('Remove Item', '"' + item.name + '" is also in your plan list. What would you like to do?', {
                planOnly: {
                    label: 'Remove from Cart Only', icon: 'fa-cart-shopping',
                    callback: function() {
                        Store.cartItems = Store.cartItems.filter(function(i) { return i.id !== item.id; });
                        Store.save(); renderAll();
                        showToast('"' + item.name + '" removed from cart', 'success');
                    }
                },
                both: {
                    label: 'Remove from Both', icon: 'fa-trash-can',
                    callback: function() {
                        Store.planItems = Store.planItems.filter(function(p) { return p.id !== linkedPlan.id; });
                        Store.cartItems = Store.cartItems.filter(function(i) { return i.id !== item.id; });
                        Store.save(); renderAll();
                        showToast('"' + item.name + '" removed from cart and plan', 'success');
                    }
                }
            });
        } else {
            showConfirm('Remove from Cart?', 'Remove "' + item.name + '" from your shopping cart?', function() {
                Store.cartItems = Store.cartItems.filter(function(i) { return i.id !== item.id; });
                Store.save(); renderAll();
                showToast('"' + item.name + '" removed from cart', 'success');
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
    var inCartCount = Store.planItems.filter(function(p) { return isItemInCart(p.id); }).length;
    DOM.checkedItems.textContent = inCartCount + '/' + Store.planItems.length;
}

function updateTotals() {
    var subtotal = Store.cartItems.reduce(function(sum, item) { return sum + getItemSubtotal(item); }, 0);
    var totalTax = Store.cartItems.reduce(function(sum, item) { return sum + getItemTax(item); }, 0);
    var totalDeposit = Store.cartItems.reduce(function(sum, item) { return sum + getItemDeposit(item); }, 0);
    var grandTotal = subtotal + totalTax + totalDeposit;

    DOM.runningTotal.textContent = '$' + grandTotal.toFixed(2);
    DOM.headerTotal.querySelector('span').textContent = '$' + grandTotal.toFixed(2);

    if (totalTax > 0 || totalDeposit > 0) {
        var html = '<div class="breakdown-item subtotal-breakdown"><span class="breakdown-label">Subtotal:</span> <span class="breakdown-value">$' + subtotal.toFixed(2) + '</span></div>';
        if (totalTax > 0) {
            html += '<div class="breakdown-item tax-breakdown"><span class="breakdown-label">Tax:</span> <span class="breakdown-value">$' + totalTax.toFixed(2) + '</span></div>';
        }
        if (totalDeposit > 0) {
            html += '<div class="breakdown-item deposit-breakdown"><span class="breakdown-label">Deposit:</span> <span class="breakdown-value">$' + totalDeposit.toFixed(2) + '</span></div>';
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

    var title = '';
    var bodyHTML = '';

    var categoryOptions = CATEGORIES.map(function(c) { return '<option value="' + c.id + '">' + c.label + '</option>'; }).join('');
    var hasTaxRate = Store.settings.salesTaxRate > 0;
    var hasDepositAmt = Store.settings.depositAmount > 0;

    switch (mode) {
        case 'settings': {
            title = 'Settings';
            bodyHTML =
                '<div class="settings-section">' +
                    '<div class="settings-section-title"><i class="fas fa-percent"></i> Sales Tax</div>' +
                    '<div class="form-group">' +
                        '<label class="form-label">Tax Rate (%)</label>' +
                        '<input type="number" class="form-input" id="inputTaxRate" placeholder="e.g. 6.25" step="0.01" min="0" max="25" value="' + (Store.settings.salesTaxRate || '') + '">' +
                        '<div class="form-hint">Enter your state/local sales tax percentage</div>' +
                    '</div>' +
                '</div>' +
                '<div class="settings-section">' +
                    '<div class="settings-section-title"><i class="fas fa-recycle"></i> Bottle/Can Deposit</div>' +
                    '<div class="form-group">' +
                        '<label class="form-label">Deposit Per Container ($)</label>' +
                        '<input type="number" class="form-input" id="inputDepositAmount" placeholder="e.g. 0.05 or 0.10" step="0.01" min="0" max="1" value="' + (Store.settings.depositAmount || '') + '">' +
                        '<div class="form-hint">Enter your state\'s bottle/can deposit amount</div>' +
                    '</div>' +
                '</div>' +
                '<div class="settings-section">' +
                    '<div class="settings-section-title"><i class="fas fa-file-code"></i> Data Backup</div>' +
                    '<div style="display:flex;gap:10px;flex-direction:column;">' +
                        '<button class="btn btn-secondary" id="copyJsonBtn" type="button" style="justify-content:center;gap:10px;">' +
                            '<i class="fas fa-copy"></i> Copy JSON' +
                        '</button>' +
                        '<button class="btn btn-secondary" id="pasteJsonBtn" type="button" style="justify-content:center;gap:10px;">' +
                            '<i class="fas fa-paste"></i> Paste JSON' +
                        '</button>' +
                        '<div id="pasteJsonArea" style="display:none;flex-direction:column;gap:8px;">' +
                            '<textarea id="jsonTextarea" class="form-input" style="height:140px;resize:none;padding:10px;font-size:0.78rem;font-family:monospace;line-height:1.5;" placeholder="Paste your CartMaster JSON here..."></textarea>' +
                            '<button class="btn btn-primary" id="applyJsonBtn" type="button" style="justify-content:center;">' +
                                '<i class="fas fa-check"></i> Apply & Restore' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                '</div>';
            break;
        }
        case 'add-plan': {
            title = 'Add to Plan';
            bodyHTML =
                '<div class="form-group">' +
                    '<label class="form-label">Item Name</label>' +
                    '<input type="text" class="form-input" id="inputName" placeholder="e.g. Organic Milk" value="' + (prefillName ? escapeHtml(prefillName) : '') + '">' +
                '</div>' +
                '<div class="form-row">' +
                    '<div class="form-group"><label class="form-label">Category</label><select class="form-select" id="inputCategory">' + categoryOptions + '</select></div>' +
                    '<div class="form-group"><label class="form-label">Quantity</label><input type="number" class="form-input" id="inputQuantity" value="1" min="1" max="99"></div>' +
                '</div>';
            break;
        }
        case 'edit-plan': {
            var eItem = Store.planItems.find(function(i) { return i.id === itemId; });
            if (!eItem) return;
            title = 'Edit Plan Item';
            bodyHTML =
                '<div class="form-group">' +
                    '<label class="form-label">Item Name</label>' +
                    '<input type="text" class="form-input" id="inputName" value="' + escapeHtml(eItem.name) + '">' +
                '</div>' +
                '<div class="form-row">' +
                    '<div class="form-group"><label class="form-label">Category</label>' +
                        '<select class="form-select" id="inputCategory">' + CATEGORIES.map(function(c) { return '<option value="' + c.id + '"' + (c.id === eItem.category ? ' selected' : '') + '>' + c.label + '</option>'; }).join('') + '</select>' +
                    '</div>' +
                    '<div class="form-group"><label class="form-label">Quantity</label><input type="number" class="form-input" id="inputQuantity" value="' + (eItem.quantity || 1) + '" min="1" max="99"></div>' +
                '</div>';
            break;
        }
        case 'send-to-cart': {
            var sItem = Store.planItems.find(function(i) { return i.id === itemId; });
            if (!sItem) return;
            title = 'Add to Cart';
            bodyHTML =
                '<div class="form-group">' +
                    '<label class="form-label">Item</label>' +
                    '<input type="text" class="form-input" id="inputName" value="' + escapeHtml(sItem.name) + '" readonly style="opacity:0.7">' +
                '</div>' +
                '<div class="form-row">' +
                    '<div class="form-group"><label class="form-label">Price ($)</label><input type="number" class="form-input price-input" id="inputPrice" placeholder="0.00" step="0.01" min="0"></div>' +
                    '<div class="form-group"><label class="form-label">Quantity</label><input type="number" class="form-input" id="inputQuantity" value="' + (sItem.quantity || 1) + '" min="1" max="99"></div>' +
                '</div>' +
                buildExtrasHTML(hasTaxRate, hasDepositAmt, false, false, 0);
            break;
        }
        case 'add-cart': {
            title = 'Add New Cart Item';
            bodyHTML =
                '<div class="form-group">' +
                    '<label class="form-label">Item Name</label>' +
                    '<input type="text" class="form-input" id="inputName" placeholder="e.g. Avocados" value="' + (prefillName ? escapeHtml(prefillName) : '') + '">' +
                '</div>' +
                '<div class="form-row">' +
                    '<div class="form-group"><label class="form-label">Price ($)</label><input type="number" class="form-input price-input" id="inputPrice" placeholder="0.00" step="0.01" min="0"></div>' +
                    '<div class="form-group"><label class="form-label">Quantity</label><input type="number" class="form-input" id="inputQuantity" value="1" min="1" max="99"></div>' +
                '</div>' +
                '<div class="form-group"><label class="form-label">Category</label><select class="form-select" id="inputCategory">' + categoryOptions + '</select></div>' +
                buildExtrasHTML(hasTaxRate, hasDepositAmt, false, false, 0);
            break;
        }
        case 'edit-cart': {
            var cItem = Store.cartItems.find(function(i) { return i.id === itemId; });
            if (!cItem) return;
            title = 'Edit Cart Item';
            bodyHTML =
                '<div class="form-group">' +
                    '<label class="form-label">Item Name</label>' +
                    '<input type="text" class="form-input" id="inputName" value="' + escapeHtml(cItem.name) + '">' +
                '</div>' +
                '<div class="form-row">' +
                    '<div class="form-group"><label class="form-label">Price ($)</label><input type="number" class="form-input price-input" id="inputPrice" value="' + cItem.price.toFixed(2) + '" step="0.01" min="0"></div>' +
                    '<div class="form-group"><label class="form-label">Quantity</label><input type="number" class="form-input" id="inputQuantity" value="' + (cItem.quantity || 1) + '" min="1" max="99"></div>' +
                '</div>' +
                '<div class="form-group"><label class="form-label">Category</label>' +
                    '<select class="form-select" id="inputCategory">' + CATEGORIES.map(function(c) { return '<option value="' + c.id + '"' + (c.id === cItem.category ? ' selected' : '') + '>' + c.label + '</option>'; }).join('') + '</select>' +
                '</div>' +
                buildExtrasHTML(hasTaxRate, hasDepositAmt, cItem.hasTax, cItem.hasDeposit, cItem.depositCount);
            break;
        }
    }

    DOM.modalTitle.textContent = title;
    DOM.modalBody.innerHTML = bodyHTML;

    DOM.modalConfirm.onclick = function(e) {
        e.preventDefault();
        handleModalConfirm();
    };

    setupDepositToggle();
    setupJsonControls();

    DOM.modalBody.querySelectorAll('input:not([type="checkbox"])').forEach(function(input) {
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleModalConfirm();
            }
        });
    });

    DOM.modalOverlay.classList.add('show');
    setTimeout(function() {
        var first = DOM.modalBody.querySelector('input:not([readonly])');
        if (first) first.focus();
    }, 350);
}

// ===== JSON BACKUP CONTROLS =====
function setupJsonControls() {
    var copyJsonBtn = DOM.modalBody.querySelector('#copyJsonBtn');
    var pasteJsonBtn = DOM.modalBody.querySelector('#pasteJsonBtn');
    var pasteJsonArea = DOM.modalBody.querySelector('#pasteJsonArea');
    var applyJsonBtn = DOM.modalBody.querySelector('#applyJsonBtn');
    var jsonTextarea = DOM.modalBody.querySelector('#jsonTextarea');

    if (!copyJsonBtn) return;

    onTap(copyJsonBtn, function() {
        var data = {
            planItems: Store.planItems,
            cartItems: Store.cartItems,
            settings: Store.settings,
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };
        var json = JSON.stringify(data, null, 2);

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(json).then(function() {
                showCopySuccess(copyJsonBtn);
            }).catch(function() {
                fallbackCopy(json, copyJsonBtn);
            });
        } else {
            fallbackCopy(json, copyJsonBtn);
        }
    });

    onTap(pasteJsonBtn, function() {
        var isVisible = pasteJsonArea.style.display === 'flex';
        pasteJsonArea.style.display = isVisible ? 'none' : 'flex';
        pasteJsonBtn.innerHTML = isVisible
            ? '<i class="fas fa-paste"></i> Paste JSON'
            : '<i class="fas fa-xmark"></i> Cancel Paste';
        if (!isVisible && jsonTextarea) {
            setTimeout(function() { jsonTextarea.focus(); }, 100);
        }
    });

    onTap(applyJsonBtn, function() {
        var raw = jsonTextarea ? jsonTextarea.value.trim() : '';
        if (!raw) { showToast('Please paste JSON data first', 'error'); return; }

        var parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (e) {
            showToast('Invalid JSON — check your data and try again', 'error');
            return;
        }

        if (!Array.isArray(parsed.planItems) || !Array.isArray(parsed.cartItems)) {
            showToast('Invalid CartMaster data format', 'error');
            return;
        }

        showConfirm(
            'Restore Data?',
            'This will replace ALL current data with the pasted JSON. This cannot be undone.',
            function() {
                Store.planItems = parsed.planItems || [];
                Store.cartItems = parsed.cartItems || [];
                Store.settings = parsed.settings || { salesTaxRate: 0, depositAmount: 0 };
                Store.save();
                closeModal();
                renderAll();
                showToast('Data restored successfully', 'success');
            }
        );
    });
}

function showCopySuccess(btn) {
    btn.innerHTML = '<i class="fas fa-circle-check"></i> Copied!';
    btn.style.color = 'var(--success)';
    btn.style.borderColor = 'var(--success)';
    setTimeout(function() {
        btn.innerHTML = '<i class="fas fa-copy"></i> Copy JSON';
        btn.style.color = '';
        btn.style.borderColor = '';
    }, 2000);
}

function fallbackCopy(text, btn) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    try {
        document.execCommand('copy');
        showCopySuccess(btn);
    } catch (e) {
        showToast('Failed to copy — try manually', 'error');
    }
    document.body.removeChild(ta);
}

function buildExtrasHTML(hasTaxRate, hasDepositAmt, taxChecked, depositChecked, depositCount) {
    if (!hasTaxRate && !hasDepositAmt) return '';

    var html = '<div class="form-extras">';

    if (hasTaxRate) {
        html +=
            '<label class="custom-checkbox">' +
                '<input type="checkbox" id="inputHasTax" ' + (taxChecked ? 'checked' : '') + '>' +
                '<span class="checkbox-mark"></span>' +
                '<span class="checkbox-label"><i class="fas fa-percent"></i> Taxable (' + Store.settings.salesTaxRate + '%)</span>' +
            '</label>';
    }

    if (hasDepositAmt) {
        html +=
            '<label class="custom-checkbox">' +
                '<input type="checkbox" id="inputHasDeposit" ' + (depositChecked ? 'checked' : '') + '>' +
                '<span class="checkbox-mark"></span>' +
                '<span class="checkbox-label"><i class="fas fa-recycle"></i> Bottle/Can Deposit ($' + Store.settings.depositAmount.toFixed(2) + '/ea)</span>' +
            '</label>' +
            '<div class="deposit-count-wrap" id="depositCountWrap" style="display:' + (depositChecked ? 'block' : 'none') + ';">' +
                '<label class="form-label">How many containers?</label>' +
                '<input type="number" class="form-input" id="inputDepositCount" placeholder="e.g. 24" min="1" max="999" value="' + (depositCount || '') + '">' +
                '<div class="form-hint deposit-calc" id="depositCalc"></div>' +
            '</div>';
    }

    html += '</div>';
    return html;
}

function setupDepositToggle() {
    var cb = DOM.modalBody.querySelector('#inputHasDeposit');
    var wrap = DOM.modalBody.querySelector('#depositCountWrap');
    var countInput = DOM.modalBody.querySelector('#inputDepositCount');
    var calc = DOM.modalBody.querySelector('#depositCalc');

    if (!cb || !wrap) return;

    cb.addEventListener('change', function() {
        wrap.style.display = cb.checked ? 'block' : 'none';
        if (cb.checked && countInput) setTimeout(function() { countInput.focus(); }, 100);
        doCalc();
    });

    if (countInput) countInput.addEventListener('input', doCalc);
    doCalc();

    function doCalc() {
        if (!calc || !countInput) return;
        var count = parseInt(countInput.value) || 0;
        if (count > 0 && cb.checked) {
            var total = count * Store.settings.depositAmount;
            calc.textContent = count + ' × $' + Store.settings.depositAmount.toFixed(2) + ' = $' + total.toFixed(2) + ' deposit';
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
        var taxRateEl = DOM.modalBody.querySelector('#inputTaxRate');
        var depositAmtEl = DOM.modalBody.querySelector('#inputDepositAmount');
        var taxRate = taxRateEl ? parseFloat(taxRateEl.value) || 0 : 0;
        var depositAmt = depositAmtEl ? parseFloat(depositAmtEl.value) || 0 : 0;

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

    var nameEl = DOM.modalBody.querySelector('#inputName');
    var priceEl = DOM.modalBody.querySelector('#inputPrice');
    var qtyEl = DOM.modalBody.querySelector('#inputQuantity');
    var catEl = DOM.modalBody.querySelector('#inputCategory');
    var hasTaxEl = DOM.modalBody.querySelector('#inputHasTax');
    var hasDepositEl = DOM.modalBody.querySelector('#inputHasDeposit');
    var depositCountEl = DOM.modalBody.querySelector('#inputDepositCount');

    var name = nameEl ? nameEl.value.trim() : '';
    var price = priceEl ? parseFloat(priceEl.value) || 0 : 0;
    var quantity = qtyEl ? Math.max(1, parseInt(qtyEl.value) || 1) : 1;
    var category = catEl ? catEl.value : 'other';
    var hasTax = hasTaxEl ? hasTaxEl.checked : false;
    var hasDeposit = hasDepositEl ? hasDepositEl.checked : false;
    var depositCount = depositCountEl ? Math.max(0, parseInt(depositCountEl.value) || 0) : 0;

    if (!name) { showToast('Please enter an item name', 'error'); if (nameEl) nameEl.focus(); return; }

    var toastMsg = '';

    switch (modalMode) {
        case 'add-plan': {
            if (Store.planItems.find(function(i) { return i.name.toLowerCase() === name.toLowerCase(); })) {
                showToast('"' + name + '" is already on your list', 'error'); return;
            }
            Store.planItems.push({ id: Store.generateId(), name: capitalizeFirst(name), category: category, quantity: quantity, createdAt: Date.now() });
            Store.save();
            toastMsg = '"' + capitalizeFirst(name) + '" added to plan';
            break;
        }
        case 'edit-plan': {
            var item = Store.planItems.find(function(i) { return i.id === editingItemId; });
            if (item) {
                var oldQty = item.quantity;
                item.name = capitalizeFirst(name); item.category = category; item.quantity = quantity;
                var linked = Store.cartItems.find(function(c) { return c.planId === item.id; });
                if (linked) { linked.name = item.name; linked.category = item.category; if (oldQty !== quantity) linked.quantity = quantity; }
                Store.save();
                toastMsg = '"' + item.name + '" updated';
            }
            break;
        }
        case 'send-to-cart': {
            var planItem = Store.planItems.find(function(i) { return i.id === editingItemId; });
            if (!planItem) break;
            if (isItemInCart(planItem.id)) { showToast('"' + planItem.name + '" is already in your cart', 'info'); closeModal(); return; }
            if (price <= 0) { showToast('Please enter a valid price', 'error'); if (priceEl) priceEl.focus(); return; }
            if (hasDeposit && depositCount <= 0) { showToast('Please enter number of containers', 'error'); if (depositCountEl) depositCountEl.focus(); return; }

            planItem.quantity = quantity;
            var cartItem = {
                id: Store.generateId(), planId: planItem.id, name: planItem.name, category: planItem.category,
                price: price, quantity: quantity, hasTax: hasTax, hasDeposit: hasDeposit, depositCount: hasDeposit ? depositCount : 0, createdAt: Date.now()
            };
            Store.cartItems.push(cartItem);
            Store.save();
            toastMsg = '"' + planItem.name + '" added — $' + getItemTotal(cartItem).toFixed(2);
            break;
        }
        case 'add-cart': {
            if (price <= 0) { showToast('Please enter a valid price', 'error'); if (priceEl) priceEl.focus(); return; }
            if (hasDeposit && depositCount <= 0) { showToast('Please enter number of containers', 'error'); if (depositCountEl) depositCountEl.focus(); return; }

            var planItem2 = Store.planItems.find(function(i) { return i.name.toLowerCase() === name.toLowerCase(); });
            if (!planItem2) {
                planItem2 = { id: Store.generateId(), name: capitalizeFirst(name), category: category, quantity: quantity, createdAt: Date.now() };
                Store.planItems.push(planItem2);
            } else { planItem2.quantity = quantity; }

            if (isItemInCart(planItem2.id)) { showToast('"' + planItem2.name + '" is already in your cart', 'info'); closeModal(); return; }

            var cartItem2 = {
                id: Store.generateId(), planId: planItem2.id, name: capitalizeFirst(name), category: category,
                price: price, quantity: quantity, hasTax: hasTax, hasDeposit: hasDeposit, depositCount: hasDeposit ? depositCount : 0, createdAt: Date.now()
            };
            Store.cartItems.push(cartItem2);
            Store.save();
            toastMsg = '"' + capitalizeFirst(name) + '" added — $' + getItemTotal(cartItem2).toFixed(2);
            break;
        }
        case 'edit-cart': {
            var item2 = Store.cartItems.find(function(i) { return i.id === editingItemId; });
            if (item2) {
                if (price <= 0) { showToast('Please enter a valid price', 'error'); if (priceEl) priceEl.focus(); return; }
                if (hasDeposit && depositCount <= 0) { showToast('Please enter number of containers', 'error'); if (depositCountEl) depositCountEl.focus(); return; }

                var oldQty2 = item2.quantity;
                item2.name = capitalizeFirst(name); item2.price = price; item2.quantity = quantity;
                item2.category = category; item2.hasTax = hasTax; item2.hasDeposit = hasDeposit;
                item2.depositCount = hasDeposit ? depositCount : 0;

                if (item2.planId) {
                    var linked2 = Store.planItems.find(function(p) { return p.id === item2.planId; });
                    if (linked2) { linked2.name = item2.name; linked2.category = item2.category; if (oldQty2 !== quantity) linked2.quantity = quantity; }
                }
                Store.save();
                toastMsg = '"' + item2.name + '" updated';
            }
            break;
        }
    }

    closeModal();
    resetPlanSearch();
    resetCartSearch();

    setTimeout(function() {
        renderAll();
        if (toastMsg) showToast(toastMsg, 'success');
    }, 50);
}

// ===== CONFIRM =====
function showConfirm(title, message, callback) {
    DOM.confirmTitle.textContent = title;
    DOM.confirmMessage.textContent = message;
    confirmCallback = callback;

    DOM.confirmActions.className = 'confirm-actions';
    DOM.confirmActions.innerHTML =
        '<button class="confirm-btn no" id="confirmNo" type="button">Cancel</button>' +
        '<button class="confirm-btn yes" id="confirmYes" type="button">Delete</button>';

    onTap(DOM.confirmActions.querySelector('#confirmNo'), closeConfirm);
    onTap(DOM.confirmActions.querySelector('#confirmYes'), function() {
        if (confirmCallback) confirmCallback();
        closeConfirm();
    });

    DOM.confirmOverlay.classList.add('show');
}

function showDeleteChoiceConfirm(title, message, options) {
    DOM.confirmTitle.textContent = title;
    DOM.confirmMessage.textContent = message;

    DOM.confirmActions.className = 'confirm-actions stacked';
    DOM.confirmActions.innerHTML =
        '<button class="confirm-btn no" id="confirmCancel" type="button">Cancel</button>' +
        '<button class="confirm-btn choice-single" id="confirmSingle" type="button"><i class="fas ' + options.planOnly.icon + '"></i> ' + escapeHtml(options.planOnly.label) + '</button>' +
        '<button class="confirm-btn choice-both" id="confirmBoth" type="button"><i class="fas ' + options.both.icon + '"></i> ' + escapeHtml(options.both.label) + '</button>';

    onTap(DOM.confirmActions.querySelector('#confirmCancel'), closeConfirm);
    onTap(DOM.confirmActions.querySelector('#confirmSingle'), function() { options.planOnly.callback(); closeConfirm(); });
    onTap(DOM.confirmActions.querySelector('#confirmBoth'), function() { options.both.callback(); closeConfirm(); });

    DOM.confirmOverlay.classList.add('show');
}

function showClearChoiceConfirm() {
    DOM.confirmTitle.textContent = 'Clear Items';
    DOM.confirmMessage.textContent = 'What would you like to clear?';

    var hasPlan = Store.planItems.length > 0;
    var hasCart = Store.cartItems.length > 0;

    var html = '<button class="confirm-btn no" id="confirmCancel" type="button">Cancel</button>';
    if (hasPlan) html += '<button class="confirm-btn choice-single" id="confirmClearPlan" type="button"><i class="fas fa-clipboard-list"></i> Clear Plan List</button>';
    if (hasCart) html += '<button class="confirm-btn choice-single" id="confirmClearCart" type="button"><i class="fas fa-cart-shopping"></i> Clear Shopping Cart</button>';
    if (hasPlan && hasCart) html += '<button class="confirm-btn choice-both" id="confirmClearBoth" type="button"><i class="fas fa-trash-can"></i> Clear Both</button>';

    DOM.confirmActions.className = 'confirm-actions stacked';
    DOM.confirmActions.innerHTML = html;

    onTap(DOM.confirmActions.querySelector('#confirmCancel'), closeConfirm);

    var cp = DOM.confirmActions.querySelector('#confirmClearPlan');
    if (cp) onTap(cp, function() {
        closeConfirm();
        showConfirm('Clear Plan List?', 'Remove all items from your plan list? Cart items will be unlinked but kept.', function() {
            Store.cartItems.forEach(function(c) { if (c.planId) c.planId = null; });
            Store.planItems = []; Store.save(); renderAll();
            showToast('Plan list cleared', 'success');
        });
    });

    var cc = DOM.confirmActions.querySelector('#confirmClearCart');
    if (cc) onTap(cc, function() {
        closeConfirm();
        showConfirm('Clear Shopping Cart?', 'Remove all items from your shopping cart? Plan items will be kept.', function() {
            Store.cartItems = []; Store.save(); renderAll();
            showToast('Shopping cart cleared', 'success');
        });
    });

    var cb = DOM.confirmActions.querySelector('#confirmClearBoth');
    if (cb) onTap(cb, function() {
        closeConfirm();
        showConfirm('Clear Everything?', 'Remove ALL items from both your plan and cart? This cannot be undone.', function() {
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
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;
    var icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' };

    toast.innerHTML =
        '<div class="toast-icon"><i class="fas ' + (icons[type] || icons.info) + '"></i></div>' +
        '<div class="toast-message">' + escapeHtml(message) + '</div>' +
        '<button class="toast-close" type="button"><i class="fas fa-xmark"></i></button>';

    onTap(toast.querySelector('.toast-close'), function() { removeToast(toast); });
    DOM.toastContainer.appendChild(toast);
    setTimeout(function() { removeToast(toast); }, 1500);
}

function removeToast(toast) {
    if (!toast.parentNode) return;
    toast.classList.add('removing');
    setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
}

// ===== START =====
document.addEventListener('DOMContentLoaded', init);