/**
 * app.js - Het hoofdbestand dat de applicatie initialiseert
 */

// Wacht tot het DOM volledig is geladen
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded fired in app.js');
    
    // Initialiseer connection modules als we de loader hebben
    if (typeof ConnectionModules !== 'undefined') {
        console.log('ConnectionModules found, initializing...');
        ConnectionModules.initModules();
    }
    
    // Controleer of initializeReferences bestaat
    if (typeof initializeReferences === 'function') {
        // Initialiseer alle DOM referenties
        initializeReferences();
    } else {
        console.error('initializeReferences is not defined!');
    }
    
    // Initialiseer het canvas
    if (typeof initCanvas === 'function') {
        initCanvas();
    }
    
    // Stel alle event listeners in
    if (typeof setupEventListeners === 'function') {
        setupEventListeners();
    }
    
    // Initialiseer de mindmap met een centraal knooppunt
    if (typeof initMindmap === 'function') {
        initMindmap();
    }
    
    // Update initial tool states
    if (typeof updateToolStates === 'function') {
        updateToolStates();
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
    
    // Toon welkomstbericht
    if (typeof showToast === 'function') {
        showToast('Welkom bij de Mindmap Brainstorm Tool');
    }
    
    // Toon eerste-gebruik overlay
    showFirstTimeOverlay();
});

/**
 * Toont een overlay met tips voor eerste keer gebruikers
 */
function showFirstTimeOverlay(forceShow = false) {
    // Check of gebruiker de overlay al heeft gezien (tenzij forceShow true is)
    if (!forceShow && localStorage.getItem('mindmap-overlay-gezien')) return;
    
    // Detect if on mobile device
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Maak overlay element
    const overlay = document.createElement('div');
    overlay.className = 'first-time-overlay';
    
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
    
    // Voeg overlay toe aan body
    document.body.appendChild(overlay);
    
    // Event handlers voor sluiten
    const closeBtn = overlay.querySelector('.overlay-close');
    const startBtn = overlay.querySelector('.start-btn');
    const dontShowCheckbox = overlay.querySelector('#dont-show-overlay');
    
    function closeOverlay() {
        // Check of gebruiker niet meer wil zien
        if (dontShowCheckbox.checked) {
            localStorage.setItem('mindmap-overlay-gezien', 'true');
        }
        
        // Fade out animatie
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.remove();
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
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            closeOverlay();
            document.removeEventListener('keydown', escHandler);
        }
    });
}