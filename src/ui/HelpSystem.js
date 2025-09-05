/**
 * HelpSystem - Contextual help and tooltips
 * Provides interactive help, tooltips, and guided tours
 */

import { notifications } from './NotificationSystem.js';

export class HelpSystem {
    static #instance = null;
    #tooltips = new Map();
    #helpContent = new Map();
    #tourSteps = [];
    #currentTourStep = -1;
    #tooltipElement = null;
    #helpModal = null;
    #enabled = true;
    
    constructor() {
        if (HelpSystem.#instance) {
            return HelpSystem.#instance;
        }
        
        this.#initialize();
        HelpSystem.#instance = this;
    }
    
    #initialize() {
        this.#createTooltipElement();
        this.#createHelpModal();
        this.#setupDefaultHelp();
        this.#setupEventListeners();
        this.#addStyles();
    }
    
    // ==================== Tooltips ====================
    
    /**
     * Register a tooltip for an element
     */
    registerTooltip(selector, content, options = {}) {
        const config = {
            content,
            position: options.position || 'top',
            delay: options.delay || 500,
            showOnFocus: options.showOnFocus !== false,
            showOnHover: options.showOnHover !== false,
            maxWidth: options.maxWidth || 250
        };
        
        this.#tooltips.set(selector, config);
        
        // Apply to existing elements
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => this.#attachTooltip(el, config));
    }
    
    #attachTooltip(element, config) {
        let showTimer = null;
        let hideTimer = null;
        
        const showTooltip = () => {
            if (!this.#enabled) return;
            
            clearTimeout(hideTimer);
            showTimer = setTimeout(() => {
                this.#showTooltip(element, config);
            }, config.delay);
        };
        
        const hideTooltip = () => {
            clearTimeout(showTimer);
            hideTimer = setTimeout(() => {
                this.#hideTooltip();
            }, 100);
        };
        
        if (config.showOnHover) {
            element.addEventListener('mouseenter', showTooltip);
            element.addEventListener('mouseleave', hideTooltip);
        }
        
        if (config.showOnFocus) {
            element.addEventListener('focus', showTooltip);
            element.addEventListener('blur', hideTooltip);
        }
        
        // Store cleanup function
        element._tooltipCleanup = () => {
            element.removeEventListener('mouseenter', showTooltip);
            element.removeEventListener('mouseleave', hideTooltip);
            element.removeEventListener('focus', showTooltip);
            element.removeEventListener('blur', hideTooltip);
        };
    }
    
    #showTooltip(element, config) {
        this.#tooltipElement.innerHTML = config.content;
        this.#tooltipElement.style.maxWidth = `${config.maxWidth}px`;
        this.#tooltipElement.style.display = 'block';
        
        // Position tooltip
        const rect = element.getBoundingClientRect();
        const tooltip = this.#tooltipElement;
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let top = 0;
        let left = 0;
        
        switch (config.position) {
            case 'top':
                top = rect.top - tooltipRect.height - 10;
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                break;
            case 'bottom':
                top = rect.bottom + 10;
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                break;
            case 'left':
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                left = rect.left - tooltipRect.width - 10;
                break;
            case 'right':
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                left = rect.right + 10;
                break;
        }
        
        // Keep within viewport
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        if (left < 10) left = 10;
        if (left + tooltipRect.width > viewportWidth - 10) {
            left = viewportWidth - tooltipRect.width - 10;
        }
        
        if (top < 10) {
            // Show below instead
            top = rect.bottom + 10;
        }
        if (top + tooltipRect.height > viewportHeight - 10) {
            // Show above instead
            top = rect.top - tooltipRect.height - 10;
        }
        
        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
        tooltip.classList.add('show');
    }
    
    #hideTooltip() {
        this.#tooltipElement.classList.remove('show');
        setTimeout(() => {
            if (!this.#tooltipElement.classList.contains('show')) {
                this.#tooltipElement.style.display = 'none';
            }
        }, 200);
    }
    
    // ==================== Help Content ====================
    
    /**
     * Register help content for a topic
     */
    registerHelp(topic, content) {
        this.#helpContent.set(topic, content);
    }
    
    /**
     * Show help for a specific topic
     */
    showHelp(topic = 'general') {
        const content = this.#helpContent.get(topic) || this.#helpContent.get('general');
        if (!content) return;
        
        this.#helpModal.querySelector('.help-content').innerHTML = content;
        this.#helpModal.classList.add('show');
        this.#helpModal.querySelector('.help-close').focus();
    }
    
    /**
     * Show context-sensitive help
     */
    showContextHelp() {
        // Determine context based on current selection/tool
        let topic = 'general';
        
        if (window.currentSelectedNode) {
            topic = 'nodes';
        } else if (window.currentSelectedConnection) {
            topic = 'connections';
        } else if (window.currentTool) {
            topic = `tool-${window.currentTool}`;
        }
        
        this.showHelp(topic);
    }
    
    // ==================== Guided Tour ====================
    
    /**
     * Define a guided tour
     */
    defineTour(steps) {
        this.#tourSteps = steps.map(step => ({
            element: step.element,
            title: step.title,
            content: step.content,
            position: step.position || 'bottom',
            action: step.action || null,
            beforeShow: step.beforeShow || null
        }));
    }
    
    /**
     * Start the guided tour
     */
    async startTour() {
        if (this.#tourSteps.length === 0) {
            notifications.warning('Geen rondleiding beschikbaar');
            return;
        }
        
        this.#currentTourStep = -1;
        this.#nextTourStep();
    }
    
    #nextTourStep() {
        this.#currentTourStep++;
        
        if (this.#currentTourStep >= this.#tourSteps.length) {
            this.#endTour();
            return;
        }
        
        const step = this.#tourSteps[this.#currentTourStep];
        this.#showTourStep(step);
    }
    
    #previousTourStep() {
        if (this.#currentTourStep <= 0) return;
        
        this.#currentTourStep--;
        const step = this.#tourSteps[this.#currentTourStep];
        this.#showTourStep(step);
    }
    
    #showTourStep(step) {
        // Execute before show callback
        if (step.beforeShow) {
            step.beforeShow();
        }
        
        // Find target element
        const element = document.querySelector(step.element);
        if (!element) {
            console.warn(`Tour element not found: ${step.element}`);
            this.#nextTourStep();
            return;
        }
        
        // Highlight element
        this.#highlightElement(element);
        
        // Show tour tooltip
        this.#showTourTooltip(element, step);
        
        // Execute action if provided
        if (step.action) {
            setTimeout(() => step.action(), 500);
        }
    }
    
    #showTourTooltip(element, step) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tour-tooltip';
        tooltip.innerHTML = `
            <div class="tour-header">
                <h3>${step.title}</h3>
                <button class="tour-close" aria-label="Rondleiding beëindigen">×</button>
            </div>
            <div class="tour-content">
                ${step.content}
            </div>
            <div class="tour-footer">
                <div class="tour-progress">
                    Stap ${this.#currentTourStep + 1} van ${this.#tourSteps.length}
                </div>
                <div class="tour-actions">
                    ${this.#currentTourStep > 0 ? '<button class="tour-prev">Vorige</button>' : ''}
                    ${this.#currentTourStep < this.#tourSteps.length - 1 ? 
                        '<button class="tour-next">Volgende</button>' : 
                        '<button class="tour-finish">Voltooien</button>'}
                </div>
            </div>
        `;
        
        // Add event listeners
        tooltip.querySelector('.tour-close').addEventListener('click', () => this.#endTour());
        tooltip.querySelector('.tour-prev')?.addEventListener('click', () => this.#previousTourStep());
        tooltip.querySelector('.tour-next')?.addEventListener('click', () => this.#nextTourStep());
        tooltip.querySelector('.tour-finish')?.addEventListener('click', () => this.#endTour());
        
        // Position and show
        document.body.appendChild(tooltip);
        this.#positionTourTooltip(tooltip, element, step.position);
        
        // Store for cleanup
        this.#currentTourTooltip = tooltip;
    }
    
    #positionTourTooltip(tooltip, element, position) {
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let top = 0;
        let left = 0;
        
        switch (position) {
            case 'top':
                top = rect.top - tooltipRect.height - 20;
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                break;
            case 'bottom':
                top = rect.bottom + 20;
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                break;
            case 'left':
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                left = rect.left - tooltipRect.width - 20;
                break;
            case 'right':
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                left = rect.right + 20;
                break;
        }
        
        // Keep within viewport
        const margin = 20;
        left = Math.max(margin, Math.min(left, window.innerWidth - tooltipRect.width - margin));
        top = Math.max(margin, Math.min(top, window.innerHeight - tooltipRect.height - margin));
        
        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
        
        requestAnimationFrame(() => tooltip.classList.add('show'));
    }
    
    #highlightElement(element) {
        // Remove previous highlight
        this.#removeHighlight();
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'tour-overlay';
        
        // Create highlight
        const highlight = document.createElement('div');
        highlight.className = 'tour-highlight';
        
        const rect = element.getBoundingClientRect();
        highlight.style.top = `${rect.top - 5}px`;
        highlight.style.left = `${rect.left - 5}px`;
        highlight.style.width = `${rect.width + 10}px`;
        highlight.style.height = `${rect.height + 10}px`;
        
        document.body.appendChild(overlay);
        document.body.appendChild(highlight);
        
        this.#currentHighlight = { overlay, highlight };
    }
    
    #removeHighlight() {
        if (this.#currentHighlight) {
            this.#currentHighlight.overlay.remove();
            this.#currentHighlight.highlight.remove();
            this.#currentHighlight = null;
        }
    }
    
    #endTour() {
        this.#removeHighlight();
        
        if (this.#currentTourTooltip) {
            this.#currentTourTooltip.classList.remove('show');
            setTimeout(() => {
                this.#currentTourTooltip?.remove();
                this.#currentTourTooltip = null;
            }, 200);
        }
        
        this.#currentTourStep = -1;
        
        notifications.success('Rondleiding voltooid!');
    }
    
    // ==================== Keyboard Shortcuts Overlay ====================
    
    /**
     * Show keyboard shortcuts overlay
     */
    showShortcuts(shortcuts = []) {
        const modal = document.createElement('div');
        modal.className = 'shortcuts-modal';
        modal.innerHTML = `
            <div class="shortcuts-overlay"></div>
            <div class="shortcuts-content">
                <h2>Toetsenbord Sneltoetsen</h2>
                <button class="shortcuts-close" aria-label="Sluiten">×</button>
                <div class="shortcuts-list">
                    ${this.#formatShortcuts(shortcuts)}
                </div>
            </div>
        `;
        
        // Add close handlers
        modal.querySelector('.shortcuts-close').addEventListener('click', () => modal.remove());
        modal.querySelector('.shortcuts-overlay').addEventListener('click', () => modal.remove());
        
        // ESC to close
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
        
        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add('show'));
    }
    
    #formatShortcuts(shortcuts) {
        const defaultShortcuts = [
            { keys: 'Tab', description: 'Focus volgende element' },
            { keys: 'Shift+Tab', description: 'Focus vorige element' },
            { keys: 'Enter/Spatie', description: 'Activeer element' },
            { keys: 'Escape', description: 'Annuleren' },
            { keys: 'Pijltjestoetsen', description: 'Navigeren' },
            { keys: 'n', description: 'Nieuw knooppunt' },
            { keys: 'c', description: 'Nieuwe verbinding' },
            { keys: 'Delete', description: 'Verwijderen' },
            { keys: 'F2', description: 'Hernoemen' },
            { keys: 'Ctrl+Z', description: 'Ongedaan maken' },
            { keys: 'Ctrl+Y', description: 'Opnieuw' },
            { keys: 'Ctrl+S', description: 'Opslaan' },
            { keys: 'Ctrl+O', description: 'Openen' },
            { keys: '+/-', description: 'Zoom in/uit' },
            { keys: '0', description: 'Zoom resetten' },
            { keys: 'Home', description: 'Centreren' },
            { keys: 'F1', description: 'Help tonen' },
            { keys: '?', description: 'Sneltoetsen tonen' }
        ];
        
        const allShortcuts = [...defaultShortcuts, ...shortcuts];
        
        return allShortcuts.map(s => `
            <div class="shortcut-item">
                <kbd>${s.keys}</kbd>
                <span>${s.description}</span>
            </div>
        `).join('');
    }
    
    // ==================== Private Methods ====================
    
    #createTooltipElement() {
        this.#tooltipElement = document.createElement('div');
        this.#tooltipElement.className = 'help-tooltip';
        this.#tooltipElement.setAttribute('role', 'tooltip');
        document.body.appendChild(this.#tooltipElement);
    }
    
    #createHelpModal() {
        this.#helpModal = document.createElement('div');
        this.#helpModal.className = 'help-modal';
        this.#helpModal.innerHTML = `
            <div class="help-overlay"></div>
            <div class="help-dialog">
                <div class="help-header">
                    <h2>Help</h2>
                    <button class="help-close" aria-label="Sluiten">×</button>
                </div>
                <div class="help-content"></div>
            </div>
        `;
        
        // Close handlers
        this.#helpModal.querySelector('.help-close').addEventListener('click', () => {
            this.#helpModal.classList.remove('show');
        });
        
        this.#helpModal.querySelector('.help-overlay').addEventListener('click', () => {
            this.#helpModal.classList.remove('show');
        });
        
        document.body.appendChild(this.#helpModal);
    }
    
    #setupDefaultHelp() {
        // General help
        this.registerHelp('general', `
            <h3>Mindmap Brainstorm Tool</h3>
            <p>Welkom bij de mindmap tool! Hier kunt u visueel brainstormen en ideeën organiseren.</p>
            
            <h4>Basis Handelingen</h4>
            <ul>
                <li><strong>Knooppunt toevoegen:</strong> Dubbelklik op het canvas</li>
                <li><strong>Verbinding maken:</strong> Klik op de + knop of gebruik CTRL+klik</li>
                <li><strong>Verplaatsen:</strong> Sleep knooppunten naar nieuwe posities</li>
                <li><strong>Bewerken:</strong> Dubbelklik op tekst om te bewerken</li>
                <li><strong>Verwijderen:</strong> Selecteer en druk op Delete</li>
            </ul>
            
            <h4>Navigatie</h4>
            <ul>
                <li><strong>Pannen:</strong> Spatie + slepen of middelste muisknop</li>
                <li><strong>Zoomen:</strong> Scrollwiel of +/- knoppen</li>
                <li><strong>Centreren:</strong> Home toets of Centreer knop</li>
            </ul>
            
            <p>Druk op <kbd>?</kbd> voor een overzicht van alle sneltoetsen.</p>
        `);
        
        // Node help
        this.registerHelp('nodes', `
            <h3>Werken met Knooppunten</h3>
            
            <h4>Knooppunt Maken</h4>
            <ul>
                <li>Dubbelklik op een lege plek</li>
                <li>Klik op de + knop van een bestaand knooppunt</li>
                <li>Gebruik sneltoets <kbd>n</kbd></li>
            </ul>
            
            <h4>Knooppunt Bewerken</h4>
            <ul>
                <li><strong>Titel:</strong> Dubbelklik op de tekst</li>
                <li><strong>Kleur:</strong> Rechtsklik → Kleur wijzigen</li>
                <li><strong>Vorm:</strong> Rechtsklik → Vorm wijzigen</li>
                <li><strong>Grootte:</strong> Sleep de hoeken (indien beschikbaar)</li>
            </ul>
            
            <h4>Knooppunt Types</h4>
            <ul>
                <li><strong>Hoofdknooppunt:</strong> Het centrale startpunt</li>
                <li><strong>Standaard:</strong> Normale knooppunten</li>
                <li><strong>Notitie:</strong> Voor extra informatie</li>
            </ul>
        `);
        
        // Connection help
        this.registerHelp('connections', `
            <h3>Werken met Verbindingen</h3>
            
            <h4>Verbinding Maken</h4>
            <ul>
                <li>Klik op de + knop van een knooppunt</li>
                <li>CTRL + klik van bron naar doel</li>
                <li>Gebruik sneltoets <kbd>c</kbd></li>
            </ul>
            
            <h4>Verbinding Bewerken</h4>
            <ul>
                <li><strong>Curve aanpassen:</strong> Sleep het controlepunt</li>
                <li><strong>Label toevoegen:</strong> Dubbelklik op de verbinding</li>
                <li><strong>Stijl wijzigen:</strong> Rechtsklik → Stijl</li>
            </ul>
            
            <h4>Y-Vertakkingen</h4>
            <p>Maak een vertakking vanaf een bestaande verbinding:</p>
            <ul>
                <li>Rechtsklik op verbinding → Vertakking maken</li>
                <li>Sleep vanaf het vertakkingspunt</li>
            </ul>
        `);
    }
    
    #setupEventListeners() {
        // F1 for help
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F1') {
                e.preventDefault();
                this.showContextHelp();
            }
        });
        
        // Listen for navigation events
        document.addEventListener('navigation:showHelp', () => {
            this.showContextHelp();
        });
        
        document.addEventListener('navigation:showShortcuts', (e) => {
            this.showShortcuts(e.detail?.shortcuts || []);
        });
        
        // Auto-attach tooltips to new elements
        const observer = new MutationObserver((mutations) => {
            for (const [selector, config] of this.#tooltips) {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.matches && node.matches(selector)) {
                            this.#attachTooltip(node, config);
                        }
                        if (node.querySelectorAll) {
                            const elements = node.querySelectorAll(selector);
                            elements.forEach(el => this.#attachTooltip(el, config));
                        }
                    });
                });
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    #addStyles() {
        if (document.getElementById('help-system-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'help-system-styles';
        style.textContent = `
            /* Tooltips */
            .help-tooltip {
                position: fixed;
                background: #333;
                color: white;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 14px;
                z-index: 10001;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.2s;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            }
            
            .help-tooltip.show {
                opacity: 1;
            }
            
            .help-tooltip::after {
                content: '';
                position: absolute;
                border: 5px solid transparent;
            }
            
            /* Help Modal */
            .help-modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 10000;
            }
            
            .help-modal.show {
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .help-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
            }
            
            .help-dialog {
                position: relative;
                background: white;
                border-radius: 8px;
                max-width: 600px;
                max-height: 80vh;
                overflow: auto;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            }
            
            .help-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid #eee;
            }
            
            .help-header h2 {
                margin: 0;
            }
            
            .help-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                opacity: 0.5;
                transition: opacity 0.2s;
            }
            
            .help-close:hover {
                opacity: 1;
            }
            
            .help-content {
                padding: 20px;
            }
            
            .help-content h3 {
                margin-top: 0;
            }
            
            .help-content h4 {
                margin-top: 20px;
                margin-bottom: 10px;
                color: #555;
            }
            
            .help-content ul {
                margin: 10px 0;
                padding-left: 20px;
            }
            
            .help-content kbd {
                display: inline-block;
                padding: 2px 6px;
                font-family: monospace;
                font-size: 12px;
                background: #f0f0f0;
                border: 1px solid #ccc;
                border-radius: 3px;
                box-shadow: 0 1px 0 #ccc;
            }
            
            /* Tour */
            .tour-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 9998;
            }
            
            .tour-highlight {
                position: fixed;
                border: 3px solid #007bff;
                border-radius: 4px;
                box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
                z-index: 9999;
                pointer-events: none;
            }
            
            .tour-tooltip {
                position: fixed;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                max-width: 400px;
                z-index: 10002;
                opacity: 0;
                transform: scale(0.9);
                transition: all 0.3s;
            }
            
            .tour-tooltip.show {
                opacity: 1;
                transform: scale(1);
            }
            
            .tour-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px;
                border-bottom: 1px solid #eee;
            }
            
            .tour-header h3 {
                margin: 0;
                font-size: 18px;
            }
            
            .tour-close {
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                opacity: 0.5;
            }
            
            .tour-close:hover {
                opacity: 1;
            }
            
            .tour-content {
                padding: 15px;
            }
            
            .tour-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px;
                border-top: 1px solid #eee;
            }
            
            .tour-progress {
                font-size: 14px;
                color: #666;
            }
            
            .tour-actions button {
                margin-left: 10px;
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            }
            
            .tour-prev, .tour-next {
                background: #f0f0f0;
            }
            
            .tour-finish {
                background: #007bff;
                color: white;
            }
            
            .tour-actions button:hover {
                opacity: 0.8;
            }
            
            /* Shortcuts Modal */
            .shortcuts-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s;
            }
            
            .shortcuts-modal.show {
                opacity: 1;
            }
            
            .shortcuts-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
            }
            
            .shortcuts-content {
                position: relative;
                background: white;
                border-radius: 8px;
                padding: 30px;
                max-width: 600px;
                max-height: 80vh;
                overflow: auto;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            }
            
            .shortcuts-content h2 {
                margin-top: 0;
                margin-bottom: 20px;
            }
            
            .shortcuts-close {
                position: absolute;
                top: 15px;
                right: 15px;
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                opacity: 0.5;
            }
            
            .shortcuts-close:hover {
                opacity: 1;
            }
            
            .shortcuts-list {
                display: grid;
                gap: 10px;
            }
            
            .shortcut-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px;
                background: #f9f9f9;
                border-radius: 4px;
            }
            
            .shortcut-item kbd {
                display: inline-block;
                padding: 4px 8px;
                font-family: monospace;
                font-size: 13px;
                background: white;
                border: 1px solid #ccc;
                border-radius: 3px;
                box-shadow: 0 2px 0 #ccc;
                min-width: 100px;
            }
            
            .shortcut-item span {
                flex: 1;
                margin-left: 20px;
                color: #555;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Enable/disable help system
     */
    setEnabled(enabled) {
        this.#enabled = enabled;
    }
    
    /**
     * Cleanup
     */
    destroy() {
        // Remove tooltips
        for (const [selector] of this.#tooltips) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (el._tooltipCleanup) {
                    el._tooltipCleanup();
                }
            });
        }
        
        this.#tooltips.clear();
        this.#helpContent.clear();
        this.#tourSteps = [];
        
        // Remove DOM elements
        this.#tooltipElement?.remove();
        this.#helpModal?.remove();
    }
}

// Create global instance
export const helpSystem = new HelpSystem();

// Export default
export default HelpSystem;