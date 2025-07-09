// Quick fixes voor muisklik probleem

// Fix 1: Force sluit alle modals
function forceCloseModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
    });
    console.log('Alle modals geforceerd gesloten');
}

// Fix 2: Reset z-index van alle elementen
function resetZIndexes() {
    const elements = document.querySelectorAll('*');
    elements.forEach(el => {
        const style = window.getComputedStyle(el);
        const zIndex = parseInt(style.zIndex);
        if (zIndex > 1000) {
            el.style.zIndex = 'auto';
        }
    });
    console.log('Z-indexes gereset');
}

// Fix 3: Herstel pointer events
function enablePointerEvents() {
    const elements = document.querySelectorAll('*');
    elements.forEach(el => {
        if (el.style.pointerEvents === 'none') {
            el.style.pointerEvents = 'auto';
        }
    });
    console.log('Pointer events hersteld');
}

// Fix 4: Verwijder overlays
function removeOverlays() {
    const overlays = document.querySelectorAll('.overlay, .modal-overlay');
    overlays.forEach(overlay => overlay.remove());
    console.log('Overlays verwijderd');
}

// Fix 5: Reset event listeners
function resetEventListeners() {
    // Clone en replace elementen om event listeners te resetten
    const toolbar = document.querySelector('.toolbar');
    if (toolbar) {
        const newToolbar = toolbar.cloneNode(true);
        toolbar.parentNode.replaceChild(newToolbar, toolbar);
        console.log('Toolbar event listeners gereset');
    }
}

// Voer alle fixes uit
console.log('=== APPLYING QUICK FIXES ===');
forceCloseModals();
resetZIndexes();
enablePointerEvents();
removeOverlays();

// Test na fixes
setTimeout(() => {
    console.log('=== TESTING AFTER FIXES ===');
    const deleteBtn = document.getElementById('delete-tool');
    if (deleteBtn) {
        console.log('Delete button gevonden, style:', window.getComputedStyle(deleteBtn));
        console.log('Delete button position:', deleteBtn.getBoundingClientRect());
    }
}, 500);