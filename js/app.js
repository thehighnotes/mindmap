/**
 * app.js - Het hoofdbestand dat de applicatie initialiseert
 */

// Wacht tot het DOM volledig is geladen
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Starting mindmap application...');
    
    try {
        // Core initialization (fail-safe)
        console.log('📦 Initializing core components...');
        
        // Initialiseer connection modules als we de loader hebben
        if (typeof ConnectionModules !== 'undefined') {
            console.log('🔗 ConnectionModules found, initializing...');
            ConnectionModules.initModules();
        }
        
        // Controleer of initializeReferences bestaat
        if (typeof initializeReferences === 'function') {
            console.log('🔧 Initializing DOM references...');
            initializeReferences();
        } else {
            console.error('❌ initializeReferences is not defined!');
        }
        
        // Initialiseer het canvas
        if (typeof initCanvas === 'function') {
            console.log('🎨 Initializing canvas...');
            initCanvas();
        }
        
        // Stel alle event listeners in
        if (typeof setupEventListeners === 'function') {
            console.log('👆 Setting up event listeners...');
            setupEventListeners();
        }
        
        // Check for draft recovery before initializing new mindmap
        let draftRecovered = false;
        if (window.VersionControl && typeof window.VersionControl.checkForDraftRecovery === 'function') {
            console.log('🔍 Checking for draft recovery...');
            try {
                draftRecovered = window.VersionControl.checkForDraftRecovery();
                if (draftRecovered) {
                    console.log('✅ Previous session recovered');
                }
            } catch (e) {
                console.warn('Draft recovery failed:', e);
            }
        }
        
        // Only initialize new mindmap if no draft was recovered
        if (!draftRecovered && typeof initMindmap === 'function') {
            console.log('🧠 Initializing new mindmap...');
            initMindmap();
        }
        
        // Update initial tool states
        if (typeof updateToolStates === 'function') {
            console.log('🛠️ Updating tool states...');
            updateToolStates();
        }
        
        console.log('✅ Core application initialized successfully');
        
    } catch (error) {
        console.error('❌ Critical error during core initialization:', error);
        // Try to show an error message to the user
        try {
            if (typeof showToast === 'function') {
                showToast('Application initialization error. Some features may not work.', true);
            }
        } catch (e) {
            console.error('Could not show error toast:', e);
        }
    }
    
    // Optimaliseer connection rendering na initialisatie
    setTimeout(() => {
        if (typeof optimizeConnectionRendering === 'function') {
            optimizeConnectionRendering();
        }
    }, 100);
    // Verifieer na een korte vertraging dat alle benodigde functies beschikbaar zijn
    setTimeout(() => {
        // Test een paar cruciale functies om te zorgen dat ze werken
        if (typeof createConnection === 'function' && 
            typeof drawConnection === 'function' && 
            typeof updateConnectionPath === 'function' &&
            typeof startConnectionDrag === 'function') {
            
            console.log('Alle kritieke connections-functies zijn beschikbaar en klaar voor gebruik.');
        } else {
            console.error('Kritieke connections-functies ontbreken. Controleer de module-initialisatie.');
            
            // Toon een waarschuwing aan de gebruiker
            showToast('Er is een probleem opgetreden bij het laden van de verbindingsfuncties. Probeer de pagina te vernieuwen.', true);
        }
    }, 500);
    
    // Coordinated initialization sequence
    console.log('🚦 Starting coordinated initialization...');
    
    // Step 1: Initialize storage first
    setTimeout(() => {
        try {
            if (window.initializeStorageDefaults) {
                console.log('💾 Initializing storage defaults...');
                window.initializeStorageDefaults();
            }
        } catch (e) {
            console.error('Failed to initialize storage defaults:', e);
        }
        
        // Step 2: Initialize version control after storage
        setTimeout(() => {
            try {
                if (window.VersionControl) {
                    console.log('📋 Initializing version control...');
                    window.VersionControl.initialize();
                }
            } catch (e) {
                console.error('Failed to initialize version control:', e);
            }
            
            // Step 3: Show UI elements after all systems are ready
            setTimeout(() => {
                try {
                    // Show welcome message
                    if (typeof showToast === 'function') {
                        showToast('Welkom bij de Mindmap Brainstorm Tool');
                    }
                    
                    // Show first-time overlay
                    console.log('🎯 Showing first-time user overlay...');
                    showFirstTimeOverlay();
                    
                } catch (error) {
                    console.warn('⚠️ Error showing welcome features:', error);
                }
            }, 50);
        }, 50);
    }, 50);
});

/**
 * Toont een overlay met tips voor eerste keer gebruikers
 */
function showFirstTimeOverlay(forceShow = false) {
    console.log('🎯 showFirstTimeOverlay called, forceShow:', forceShow);
    
    // Only check preference if not forcing show
    if (!forceShow) {
        try {
            // Wait for StorageUtils to be available if it's not ready yet
            if (window.StorageUtils) {
                const hasSeenOverlay = window.StorageUtils.getItem('mindmap-overlay-gezien');
                console.log('Overlay seen status:', hasSeenOverlay);
                if (hasSeenOverlay === 'true') {
                    console.log('User has seen overlay before, skipping');
                    return;
                }
            } else {
                console.log('StorageUtils not available, showing overlay as safe default');
            }
        } catch (e) {
            console.warn('Error checking overlay preference, showing overlay as safe default:', e);
        }
    }
    
    console.log('Showing first-time overlay...');
    
    try {
        // Detect if on mobile device
        console.log('🔍 Detecting mobile device...');
        const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        console.log('📱 Mobile detected:', isMobile);
        
        // Maak overlay element
        console.log('🏗️ Creating overlay element...');
        const overlay = document.createElement('div');
        overlay.className = 'first-time-overlay';
        console.log('✅ Overlay element created');
    
    // Different content for mobile vs desktop
    const tipCards = isMobile ? `
        <div class="tip-cards">
            <div class="tip-card">
                <div class="tip-icon">👆</div>
                <h3>Nieuwe knooppunten</h3>
                <p><strong>Dubbeltik</strong> op een lege plek om een nieuw knooppunt te maken</p>
            </div>
            
            <div class="tip-card">
                <div class="tip-icon">✏️</div>
                <h3>Tekst bewerken</h3>
                <p>Tik op een knooppunt en tik op het <strong>✏️ icoon</strong> om de tekst te bewerken</p>
            </div>
            
            <div class="tip-card">
                <div class="tip-icon">📱</div>
                <h3>Lang indrukken</h3>
                <p><strong>Houd lang ingedrukt</strong> op knooppunten voor opties menu</p>
            </div>
            
            <div class="tip-card">
                <div class="tip-icon">🔗</div>
                <h3>Verbindingen maken</h3>
                <p><strong>Dubbeltik</strong> op een knooppunt om automatisch een verbonden knooppunt te maken</p>
            </div>
            
            <div class="tip-card">
                <div class="tip-icon">🤏</div>
                <h3>Navigatie</h3>
                <p><strong>Knijp</strong> om te zoomen, <strong>sleep</strong> met één vinger om rond te bewegen</p>
            </div>
        </div>
    ` : `
        <div class="tip-cards">
            <div class="tip-card">
                <div class="tip-icon">🖱️</div>
                <h3>Nieuwe knooppunten</h3>
                <p><strong>Dubbelklik</strong> op een lege plek om een nieuw knooppunt te maken</p>
            </div>
            
            <div class="tip-card">
                <div class="tip-icon">➕</div>
                <h3>Snel toevoegen</h3>
                <p>Beweeg over een knooppunt om <strong>+ knoppen</strong> te zien voor snelle toevoegingen</p>
            </div>
            
            <div class="tip-card">
                <div class="tip-icon">🔗</div>
                <h3>Verbindingen maken</h3>
                <p>Houd <strong>Ctrl</strong> ingedrukt en klik op twee knooppunten om ze te verbinden</p>
            </div>
            
            <div class="tip-card">
                <div class="tip-icon">🎨</div>
                <h3>Aanpassen</h3>
                <p><strong>Rechtsklik</strong> op elementen voor kleuren, vormen en meer opties</p>
            </div>
        </div>
    `;
    
    console.log('🎨 Setting overlay innerHTML...');
    overlay.innerHTML = `
        <div class="overlay-content">
            <button class="overlay-close" aria-label="Sluit tips">×</button>
            <h2>Welkom bij de Mindmap Tool! 👋</h2>
            <p class="overlay-subtitle">${isMobile ? 'Hier zijn tips voor touch-bediening:' : 'Hier zijn een paar tips om je op weg te helpen:'}</p>
            
            ${tipCards}
            
            <div class="overlay-footer">
                <label class="dont-show-label">
                    <input type="checkbox" id="dont-show-overlay"> 
                    Deze tips niet meer tonen
                </label>
                <button class="start-btn">Begin met brainstormen!</button>
            </div>
        </div>
    `;
    
    console.log('✅ Overlay innerHTML set successfully');
    
    // Voeg overlay toe aan body
    console.log('📎 Adding overlay to DOM...');
    document.body.appendChild(overlay);
    console.log('✅ Overlay added to DOM');
    
    // Event handlers voor sluiten
    console.log('🎛️ Setting up event handlers...');
    const closeBtn = overlay.querySelector('.overlay-close');
    const startBtn = overlay.querySelector('.start-btn');
    const dontShowCheckbox = overlay.querySelector('#dont-show-overlay');
    
    function closeOverlay() {
        console.log('🔒 Closing overlay, checkbox checked:', dontShowCheckbox.checked);
        
        // Save preference if user checked "don't show again"
        if (dontShowCheckbox.checked) {
            try {
                if (window.StorageUtils) {
                    window.StorageUtils.setItem('mindmap-overlay-gezien', 'true');
                    console.log('✅ Saved overlay preference: do not show again');
                } else {
                    console.warn('⚠️ StorageUtils not available, could not save overlay preference');
                }
            } catch (e) {
                console.warn('❌ Failed to save overlay preference:', e);
                // Don't block closing the overlay if storage fails - user experience comes first
            }
        }
        
        // Fade out animatie
        overlay.style.opacity = '0';
        setTimeout(() => {
            console.log('🔒 About to remove overlay...');
            overlay.remove();
            console.log('✅ Overlay removed successfully');
            
            // Debug: Check if any loops are running
            setTimeout(() => {
                console.log('🔍 Post-overlay check - App still responsive');
                console.log('   - isDragging:', typeof isDragging !== 'undefined' ? isDragging : 'undefined');
                console.log('   - isProcessingConnectionQueue:', typeof isProcessingConnectionQueue !== 'undefined' ? isProcessingConnectionQueue : 'undefined');
                console.log('   - connections count:', typeof connections !== 'undefined' ? connections.length : 'undefined');
                console.log('   - nodes count:', typeof nodes !== 'undefined' ? nodes.length : 'undefined');
            }, 100);
        }, 300);
    }
    
    // Sluit bij klik op X knop
    closeBtn.addEventListener('click', closeOverlay);
    
    // Sluit bij klik op start knop
    startBtn.addEventListener('click', closeOverlay);
    
    // Sluit bij klik buiten content (op overlay achtergrond)
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeOverlay();
        }
    });
    
    // ESC toets om te sluiten
    console.log('⌨️ Setting up ESC key handler...');
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            closeOverlay();
            document.removeEventListener('keydown', escHandler);
        }
    });
    
    console.log('✅ First-time overlay setup completed successfully');
    
    } catch (overlayError) {
        console.error('❌ Failed to create first-time overlay:', overlayError);
        // Don't let overlay creation crash the entire app
        try {
            if (typeof showToast === 'function') {
                showToast('Welcome overlay could not be displayed', true);
            }
        } catch (toastError) {
            console.error('Could not even show error toast:', toastError);
        }
    }
}