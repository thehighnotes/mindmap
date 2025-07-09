// Debug script om muisklik problemen te diagnosticeren
console.log('=== MUISKLIK DIAGNOSTICS ===');

// 1. Controleer Z-index van alle elementen
function checkZIndexes() {
    const elements = document.querySelectorAll('*');
    const highZIndex = [];
    
    elements.forEach(el => {
        const style = window.getComputedStyle(el);
        const zIndex = parseInt(style.zIndex);
        if (zIndex > 100) {
            highZIndex.push({
                element: el,
                tagName: el.tagName,
                id: el.id,
                className: el.className,
                zIndex: zIndex
            });
        }
    });
    
    console.log('Elementen met hoge z-index:', highZIndex);
    return highZIndex;
}

// 2. Controleer pointer-events
function checkPointerEvents() {
    const elements = document.querySelectorAll('*');
    const blockedElements = [];
    
    elements.forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.pointerEvents === 'none') {
            blockedElements.push({
                element: el,
                tagName: el.tagName,
                id: el.id,
                className: el.className
            });
        }
    });
    
    console.log('Elementen met pointer-events: none:', blockedElements);
    return blockedElements;
}

// 3. Controleer modals
function checkModals() {
    const modals = document.querySelectorAll('.modal');
    const visibleModals = [];
    
    modals.forEach(modal => {
        const style = window.getComputedStyle(modal);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
            visibleModals.push({
                element: modal,
                id: modal.id,
                display: style.display,
                visibility: style.visibility
            });
        }
    });
    
    console.log('Zichtbare modals:', visibleModals);
    return visibleModals;
}

// 4. Test klik op specifieke coördinaten
function testClick(x, y) {
    const element = document.elementFromPoint(x, y);
    console.log(`Element op positie (${x}, ${y}):`, {
        element: element,
        tagName: element?.tagName,
        id: element?.id,
        className: element?.className
    });
    
    // Simuleer klik
    const event = new MouseEvent('click', {
        clientX: x,
        clientY: y,
        bubbles: true,
        cancelable: true
    });
    
    element?.dispatchEvent(event);
    console.log('Klik gesimuleerd op element:', element);
}

// 5. Event listener overzicht
function checkEventListeners() {
    console.log('Event listeners controleren...');
    
    // Controleer of er event listeners zijn op canvas
    const canvas = document.getElementById('mindmap-canvas');
    if (canvas) {
        console.log('Canvas element gevonden:', canvas);
        console.log('Canvas style:', window.getComputedStyle(canvas));
    }
    
    // Controleer toolbar buttons
    const toolbarButtons = document.querySelectorAll('.tool-btn');
    console.log('Toolbar buttons gevonden:', toolbarButtons.length);
    
    toolbarButtons.forEach(btn => {
        console.log('Button:', btn.id, 'disabled:', btn.disabled);
    });
}

// Voer alle checks uit
checkZIndexes();
checkPointerEvents();
checkModals();
checkEventListeners();

// Test klik op toolbar button
setTimeout(() => {
    console.log('=== TESTING TOOLBAR CLICK ===');
    testClick(100, 100); // Ongeveer toolbar positie
}, 1000);