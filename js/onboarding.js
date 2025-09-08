/**
 * onboarding.js - Interactive onboarding experience for new users
 */

(function() {
    'use strict';
    
    // Check if user has seen onboarding
    const ONBOARDING_KEY = 'mindmap_onboarding_completed';
    const ONBOARDING_VERSION = '0.940';
    
    // Tutorial steps (not including welcome)
    const tutorialSteps = [
        {
            title: 'Welkom bij je mindmap! 🗺️',
            content: 'Elk project begint met een hoofdknooppunt in het midden. Dit is het startpunt van je mindmap. Laten we deze aanpassen!',
            position: 'top-left',
            highlight: '.root-node',
            waitFor: null
        },
        {
            title: 'Bewerk het hoofdknooppunt ✏️',
            content: 'Dubbelklik op het hoofdknooppunt om de tekst aan te passen. Geef het een titel voor je project!',
            position: 'top-left',
            highlight: '.root-node',
            waitFor: 'node-edited',
            skipButton: true
        },
        {
            title: 'Geweldig! 🎯',
            content: 'Perfect! Nu gaan we child knooppunten toevoegen om je ideeën te organiseren.',
            position: 'top-left',
            waitFor: null
        },
        {
            title: 'Child knooppunten toevoegen ➕',
            content: 'Hover over het hoofdknooppunt. Je ziet 4 groene + knoppen verschijnen. Klik op één ervan om een child knooppunt toe te voegen.',
            position: 'top-left',
            highlight: '.add-node-btn',
            waitFor: 'child-added',
            skipButton: true
        },
        {
            title: 'Navigatie 🧭',
            content: 'Houd de <strong>spatiebalk</strong> ingedrukt en sleep om het canvas te verplaatsen. Scroll met je muis om in en uit te zoomen. Probeer het nu!',
            position: 'top-left',
            highlight: null,
            demo: 'navigation'
        },
        {
            title: 'Verbindingen aftakken 🔗',
            content: 'Zie je de oranje bolletjes op de verbindingslijnen? Sleep vanaf zo\'n bolletje naar een ander knooppunt om een aftakking te maken.',
            position: 'top-left',
            highlight: '.branch-point',
            demo: 'connections'
        },
        {
            title: 'Opslaan en laden 💾',
            content: 'Gebruik <strong>Ctrl+S</strong> om op te slaan, of klik op de Opslaan knop rechtsboven. Je werk wordt ook automatisch elke 30 seconden bewaard.',
            position: 'top-left',
            highlight: '#save-btn'
        },
        {
            title: 'Touch support 📱',
            content: 'Op tablets: gebruik twee vingers om te pannen, knijp om te zoomen, en tik twee keer voor nieuwe knooppunten.',
            position: 'center',
            skipIf: !('ontouchstart' in window)
        },
        {
            title: 'Klaar om te beginnen! 🚀',
            content: 'Je kent nu de basis! Druk op <strong>Help</strong> voor meer functies of begin direct met je mindmap.',
            position: 'center',
            highlight: '#help-btn',
            finalStep: true
        }
    ];
    
    let currentStep = 0;
    let tutorialActive = false;
    let demoMindmap = null;
    
    // Initialize onboarding
    function initOnboarding() {
        const completed = localStorage.getItem(ONBOARDING_KEY);
        const completedVersion = localStorage.getItem(ONBOARDING_KEY + '_version');
        
        // Always add tutorial option in help menu
        addTutorialMenuItem();
        
        // Show welcome for new users or major version updates
        if (!completed || completedVersion !== ONBOARDING_VERSION) {
            // Show welcome immediately when ready
            if (document.readyState === 'complete') {
                showWelcomeMessage();
            } else {
                window.addEventListener('load', showWelcomeMessage);
            }
        }
    }
    
    // Show welcome message (blocking until dismissed)
    function showWelcomeMessage() {
        // Create welcome overlay
        const welcomeOverlay = document.createElement('div');
        welcomeOverlay.id = 'welcome-overlay';
        welcomeOverlay.className = 'onboarding-overlay';
        welcomeOverlay.style.pointerEvents = 'auto'; // Welcome should block interaction
        welcomeOverlay.innerHTML = `
            <div class="onboarding-backdrop"></div>
            <div class="onboarding-tooltip" style="top: 50%; left: 50%; transform: translate(-50%, -50%);">
                <div class="onboarding-content">
                    <h3 class="onboarding-title">Welkom bij Mindmap! 🎉</h3>
                    <p class="onboarding-text">
                        Maak visuele mindmaps om je ideeën te organiseren.<br><br>
                        <strong>Nieuw hier?</strong> Klik op "Start Tutorial" voor een interactieve rondleiding.<br>
                        <strong>Ervaren gebruiker?</strong> Klik op "Begin Direct" om te starten.
                    </p>
                </div>
                <div class="onboarding-actions">
                    <button class="onboarding-btn onboarding-skip" id="welcome-skip">Begin Direct</button>
                    <button class="onboarding-btn onboarding-next" id="welcome-tutorial">Start Tutorial</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(welcomeOverlay);
        
        // Add event handlers
        document.getElementById('welcome-skip').addEventListener('click', () => {
            closeWelcome(false);
        });
        
        document.getElementById('welcome-tutorial').addEventListener('click', () => {
            closeWelcome(true);
        });
    }
    
    // Close welcome and optionally start tutorial
    function closeWelcome(startTutorialAfter) {
        const welcomeOverlay = document.getElementById('welcome-overlay');
        if (welcomeOverlay) {
            welcomeOverlay.classList.add('fade-out');
            setTimeout(() => {
                welcomeOverlay.remove();
                
                if (startTutorialAfter) {
                    // Give the user a moment to see the canvas before starting tutorial
                    setTimeout(() => {
                        startInteractiveTutorial();
                    }, 500);
                } else {
                    // Mark as completed without tutorial
                    localStorage.setItem(ONBOARDING_KEY, 'true');
                    localStorage.setItem(ONBOARDING_KEY + '_version', ONBOARDING_VERSION);
                    
                    if (typeof showToast === 'function') {
                        showToast('Veel plezier met mindmappen! Klik Help → Start Tutorial voor een rondleiding.');
                    }
                }
            }, 300);
        }
    }
    
    // Start interactive tutorial
    function startInteractiveTutorial() {
        // Ensure we have a clean canvas with just a root node
        if (nodes.length > 1 || connections.length > 0) {
            if (confirm('De tutorial werkt het beste met een nieuw project. Wil je een nieuw project starten voor de tutorial?')) {
                // Start fresh with just root node
                if (typeof initMindmap === 'function') {
                    initMindmap(true); // true = clear canvas, creates default root node
                }
            } else {
                // User declined, show message
                if (typeof showToast === 'function') {
                    showToast('Tutorial geannuleerd. Start een nieuw project voor de beste ervaring.');
                }
                return;
            }
        } else if (nodes.length === 0) {
            // Create a root node if none exists
            if (typeof initMindmap === 'function') {
                initMindmap(true);
            }
        }
        
        tutorialActive = true;
        currentStep = 0;
        
        // Create tutorial overlay
        createTutorialOverlay();
        
        // Show first step
        showStep(currentStep);
        
        // Add event listeners for interactive steps
        setupStepListeners();
    }
    
    // Create tutorial UI overlay
    function createTutorialOverlay() {
        // Remove existing overlay if any
        const existing = document.getElementById('tutorial-overlay');
        if (existing) existing.remove();
        
        const overlay = document.createElement('div');
        overlay.id = 'tutorial-overlay';
        overlay.className = 'onboarding-overlay';
        overlay.innerHTML = `
            <div class="onboarding-backdrop"></div>
            <div class="onboarding-tooltip" id="tutorial-tooltip">
                <div class="onboarding-progress">
                    <div class="onboarding-progress-bar" id="tutorial-progress"></div>
                </div>
                <div class="onboarding-content">
                    <h3 class="onboarding-title" id="tutorial-title"></h3>
                    <p class="onboarding-text" id="tutorial-text"></p>
                    <div class="onboarding-demo" id="tutorial-demo"></div>
                </div>
                <div class="onboarding-actions">
                    <button class="onboarding-btn onboarding-skip" id="tutorial-skip">Overslaan</button>
                    <button class="onboarding-btn onboarding-back" id="tutorial-back">Vorige</button>
                    <button class="onboarding-btn onboarding-next" id="tutorial-next">Volgende</button>
                </div>
            </div>
            <div class="onboarding-spotlight" id="tutorial-spotlight"></div>
        `;
        
        document.body.appendChild(overlay);
        
        // Add event handlers for buttons
        document.getElementById('tutorial-skip').addEventListener('click', skipTutorial);
        document.getElementById('tutorial-back').addEventListener('click', previousStep);
        document.getElementById('tutorial-next').addEventListener('click', nextStep);
    }
    
    // Show specific step
    function showStep(stepIndex) {
        if (stepIndex >= tutorialSteps.length) {
            completeTutorial();
            return;
        }
        
        const step = tutorialSteps[stepIndex];
        currentStep = stepIndex;
        
        // Skip step if condition not met
        if (step.skipIf) {
            nextStep();
            return;
        }
        
        // Update progress bar
        const progress = ((stepIndex + 1) / tutorialSteps.length) * 100;
        document.getElementById('tutorial-progress').style.width = progress + '%';
        
        // Update content
        document.getElementById('tutorial-title').textContent = step.title;
        document.getElementById('tutorial-text').innerHTML = step.content;
        
        // Position tooltip
        positionTooltip(step.position, step.highlight);
        
        // Highlight element if specified
        if (step.highlight) {
            highlightElement(step.highlight);
        } else {
            clearHighlight();
        }
        
        // Show demo if specified
        if (step.demo) {
            showDemo(step.demo);
        } else {
            hideDemo();
        }
        
        // Update button visibility
        const backBtn = document.getElementById('tutorial-back');
        const nextBtn = document.getElementById('tutorial-next');
        const skipBtn = document.getElementById('tutorial-skip');
        
        backBtn.style.display = stepIndex > 0 ? 'inline-block' : 'none';
        nextBtn.textContent = step.finalStep ? 'Klaar!' : 'Volgende';
        
        if (step.waitFor) {
            nextBtn.style.display = 'none';
            skipBtn.textContent = 'Deze stap overslaan';
        } else {
            nextBtn.style.display = 'inline-block';
            skipBtn.textContent = 'Tutorial overslaan';
        }
        
        if (step.skipButton === false) {
            skipBtn.style.display = 'none';
        }
        
        // Set up waiting condition if specified
        if (step.waitFor) {
            waitForAction(step.waitFor);
        }
    }
    
    // Position tooltip based on step configuration
    function positionTooltip(position, targetSelector) {
        const tooltip = document.getElementById('tutorial-tooltip');
        
        // For tutorial, always use top-left to avoid blocking canvas interaction
        if (position === 'top-left' || tutorialActive) {
            tooltip.style.top = '20px';
            tooltip.style.left = '20px';
            tooltip.style.right = 'auto';
            tooltip.style.bottom = 'auto';
            tooltip.style.transform = 'none';
        } else if (position === 'center') {
            // Only for welcome screen
            tooltip.style.top = '50%';
            tooltip.style.left = '50%';
            tooltip.style.transform = 'translate(-50%, -50%)';
        }
    }
    
    // Highlight element with spotlight
    function highlightElement(selector) {
        const spotlight = document.getElementById('tutorial-spotlight');
        const element = document.querySelector(selector);
        
        if (element) {
            const rect = element.getBoundingClientRect();
            spotlight.style.display = 'block';
            spotlight.style.top = (rect.top - 10) + 'px';
            spotlight.style.left = (rect.left - 10) + 'px';
            spotlight.style.width = (rect.width + 20) + 'px';
            spotlight.style.height = (rect.height + 20) + 'px';
        }
    }
    
    // Clear highlight
    function clearHighlight() {
        const spotlight = document.getElementById('tutorial-spotlight');
        if (spotlight) spotlight.style.display = 'none';
    }
    
    // Show interactive demo
    function showDemo(demoType) {
        const demoContainer = document.getElementById('tutorial-demo');
        
        if (demoType === 'navigation') {
            demoContainer.innerHTML = `
                <div class="demo-animation">
                    <div class="demo-hand">👆</div>
                    <div class="demo-text">Houd spatiebalk + sleep</div>
                </div>
            `;
            demoContainer.style.display = 'block';
        } else if (demoType === 'connections') {
            // Create small demo mindmap
            createDemoMindmap();
        }
    }
    
    // Hide demo
    function hideDemo() {
        const demoContainer = document.getElementById('tutorial-demo');
        if (demoContainer) demoContainer.style.display = 'none';
        
        if (demoMindmap) {
            // Clean up demo mindmap
            demoMindmap = null;
        }
    }
    
    // Wait for user action
    function waitForAction(action) {
        // Store initial state to detect NEW actions only
        const initialNodeCount = nodes.length;
        const initialConnectionCount = connections.length;
        const initialNodeTitles = nodes.map(n => n.title);
        
        const checkInterval = setInterval(() => {
            let actionCompleted = false;
            
            switch(action) {
                case 'node-created':
                    // Check if NEW nodes were added
                    actionCompleted = nodes.length > initialNodeCount;
                    break;
                case 'node-edited':
                    // Check if the root node (first node) has been edited
                    if (nodes.length > 0) {
                        const rootNode = nodes.find(n => n.isRoot) || nodes[0];
                        actionCompleted = rootNode.title !== 'Nieuw Project' && 
                                        rootNode.title !== 'Nieuw knooppunt' &&
                                        rootNode.title !== initialNodeTitles[0];
                    }
                    break;
                case 'child-added':
                    // Check if NEW connections were added
                    actionCompleted = connections.length > initialConnectionCount;
                    break;
            }
            
            if (actionCompleted) {
                clearInterval(checkInterval);
                // Auto advance to next step
                setTimeout(() => nextStep(), 500);
            }
        }, 500);
        
        // Store interval for cleanup
        window.tutorialActionCheck = checkInterval;
    }
    
    // Navigation functions
    function nextStep() {
        if (currentStep < tutorialSteps.length - 1) {
            showStep(currentStep + 1);
        } else {
            completeTutorial();
        }
    }
    
    function previousStep() {
        if (currentStep > 0) {
            showStep(currentStep - 1);
        }
    }
    
    function skipTutorial() {
        if (confirm('Weet je zeker dat je de tutorial wilt overslaan?')) {
            completeTutorial();
        }
    }
    
    // Complete tutorial
    function completeTutorial() {
        // Clean up
        if (window.tutorialActionCheck) {
            clearInterval(window.tutorialActionCheck);
        }
        
        // Remove overlay
        const overlay = document.getElementById('tutorial-overlay');
        if (overlay) {
            overlay.classList.add('fade-out');
            setTimeout(() => overlay.remove(), 300);
        }
        
        // Mark as completed
        localStorage.setItem(ONBOARDING_KEY, 'true');
        localStorage.setItem(ONBOARDING_KEY + '_version', ONBOARDING_VERSION);
        
        tutorialActive = false;
        
        // Show completion message
        if (typeof showToast === 'function') {
            showToast('🎉 Je bent klaar om te beginnen! Veel plezier met mindmappen!');
        }
    }
    
    // Add menu item to restart tutorial
    function addTutorialMenuItem() {
        // Add event listener to the tutorial button in help modal
        const startTutorialBtn = document.getElementById('start-tutorial-btn');
        if (startTutorialBtn) {
            startTutorialBtn.addEventListener('click', () => {
                // Close help modal
                const helpModal = document.getElementById('help-modal');
                if (helpModal) helpModal.style.display = 'none';
                
                // Start tutorial directly (not welcome)
                setTimeout(() => startInteractiveTutorial(), 300);
            });
        }
    }
    
    // Setup event listeners for interactive steps
    function setupStepListeners() {
        // Listen for node creation
        document.addEventListener('nodeCreated', () => {
            if (tutorialActive) {
                // Trigger step completion check
            }
        });
    }
    
    // Create demo mindmap for connection demonstration
    function createDemoMindmap() {
        // This would create a small animated demo
        // For now, just show an image or animation
        const demoContainer = document.getElementById('tutorial-demo');
        if (demoContainer) {
            demoContainer.innerHTML = `
                <div class="demo-mindmap">
                    <svg width="300" height="150">
                        <line x1="50" y1="75" x2="150" y2="75" stroke="#666" stroke-width="2"/>
                        <line x1="150" y1="75" x2="250" y2="50" stroke="#666" stroke-width="2"/>
                        <line x1="150" y1="75" x2="250" y2="100" stroke="#666" stroke-width="2"/>
                        <circle cx="150" cy="75" r="4" fill="orange" class="demo-branch-point"/>
                        <rect x="20" y="60" width="60" height="30" fill="#4CAF50" rx="5"/>
                        <rect x="220" y="35" width="60" height="30" fill="#2196F3" rx="5"/>
                        <rect x="220" y="85" width="60" height="30" fill="#FF9800" rx="5"/>
                        <text x="50" y="80" text-anchor="middle" fill="white">Start</text>
                        <text x="250" y="55" text-anchor="middle" fill="white">Optie 1</text>
                        <text x="250" y="105" text-anchor="middle" fill="white">Optie 2</text>
                    </svg>
                </div>
            `;
            demoContainer.style.display = 'block';
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initOnboarding);
    } else {
        initOnboarding();
    }
    
    // Export for external access
    window.startTutorial = startInteractiveTutorial;
    window.tutorialActive = () => tutorialActive;
})();