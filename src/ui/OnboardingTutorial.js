/**
 * OnboardingTutorial - Interactive onboarding experience for new users
 * Provides step-by-step guidance through key features
 */

import { helpSystem } from './HelpSystem.js';
import { notifications } from './NotificationSystem.js';

export class OnboardingTutorial {
    static #hasSeenTutorial = false;
    static #currentStep = 0;
    static #tutorialSteps = [];
    static #skipCallback = null;
    static #completeCallback = null;
    
    /**
     * Check if user needs onboarding
     */
    static shouldShowOnboarding() {
        // Check localStorage for tutorial completion
        const hasCompleted = localStorage.getItem('mindmap_tutorial_completed');
        const lastVersion = localStorage.getItem('mindmap_tutorial_version');
        const currentVersion = '2.0.0'; // Update when tutorial changes
        
        return !hasCompleted || lastVersion !== currentVersion;
    }
    
    /**
     * Start the onboarding tutorial
     */
    static async start(options = {}) {
        if (this.#hasSeenTutorial && !options.force) {
            return;
        }
        
        this.#skipCallback = options.onSkip || null;
        this.#completeCallback = options.onComplete || null;
        
        // Show welcome message
        const shouldContinue = await this.#showWelcome();
        if (!shouldContinue) {
            this.#skip();
            return;
        }
        
        // Define tutorial steps
        this.#defineTutorialSteps();
        
        // Start guided tour
        helpSystem.defineTour(this.#tutorialSteps);
        helpSystem.startTour();
        
        // Mark as seen
        this.#hasSeenTutorial = true;
    }
    
    /**
     * Show welcome dialog
     */
    static async #showWelcome() {
        return new Promise((resolve) => {
            const dialog = document.createElement('div');
            dialog.className = 'onboarding-welcome';
            dialog.innerHTML = `
                <div class="onboarding-overlay"></div>
                <div class="onboarding-dialog">
                    <div class="onboarding-icon">🎯</div>
                    <h2>Welkom bij Mindmap Brainstorm Tool!</h2>
                    <p>Laten we u snel door de belangrijkste functies leiden.</p>
                    <p class="onboarding-time">⏱️ Dit duurt ongeveer 2 minuten</p>
                    <div class="onboarding-actions">
                        <button class="btn btn-secondary" data-action="skip">
                            Later
                        </button>
                        <button class="btn btn-primary" data-action="start">
                            Start Rondleiding
                        </button>
                    </div>
                    <label class="onboarding-remember">
                        <input type="checkbox" id="dontShowAgain">
                        Niet meer tonen
                    </label>
                </div>
            `;
            
            // Add event listeners
            dialog.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                if (action === 'start') {
                    if (document.getElementById('dontShowAgain').checked) {
                        this.#markCompleted();
                    }
                    dialog.remove();
                    resolve(true);
                } else if (action === 'skip') {
                    if (document.getElementById('dontShowAgain').checked) {
                        this.#markCompleted();
                    }
                    dialog.remove();
                    resolve(false);
                }
            });
            
            document.body.appendChild(dialog);
            requestAnimationFrame(() => dialog.classList.add('show'));
            
            // Focus on start button
            dialog.querySelector('[data-action="start"]').focus();
        });
    }
    
    /**
     * Define tutorial steps
     */
    static #defineTutorialSteps() {
        this.#tutorialSteps = [
            {
                element: '#canvas',
                title: 'Het Canvas',
                content: 'Dit is uw werkruimte. Hier kunt u knooppunten maken en verbindingen leggen.',
                position: 'bottom',
                beforeShow: () => {
                    // Ensure canvas is visible
                    document.getElementById('canvas').scrollIntoView();
                }
            },
            {
                element: '#canvas',
                title: 'Eerste Knooppunt Maken',
                content: 'Dubbelklik ergens op het canvas om uw eerste knooppunt te maken.',
                position: 'bottom',
                action: () => {
                    // Simulate creating a node
                    const event = new MouseEvent('dblclick', {
                        bubbles: true,
                        cancelable: true,
                        clientX: window.innerWidth / 2,
                        clientY: window.innerHeight / 2
                    });
                    document.getElementById('canvas').dispatchEvent(event);
                }
            },
            {
                element: '.node:first-of-type',
                title: 'Knooppunt Bewerken',
                content: 'Dubbelklik op de tekst om deze te bewerken. Probeer het!',
                position: 'right'
            },
            {
                element: '.node:first-of-type .add-button',
                title: 'Verbinding Maken',
                content: 'Klik op de + knop om een nieuw verbonden knooppunt te maken.',
                position: 'right'
            },
            {
                element: '[data-tool="select"]',
                title: 'Selectie Tool',
                content: 'Gebruik dit om knooppunten te selecteren en te verplaatsen.',
                position: 'bottom'
            },
            {
                element: '[data-tool="pan"]',
                title: 'Pan Tool',
                content: 'Hiermee kunt u door het canvas navigeren. U kunt ook Spatie + slepen gebruiken.',
                position: 'bottom'
            },
            {
                element: '.zoom-controls',
                title: 'Zoom Bedieningselementen',
                content: 'Zoom in en uit met deze knoppen of gebruik het scrollwiel.',
                position: 'left'
            },
            {
                element: '[data-action="save"]',
                title: 'Opslaan',
                content: 'Sla uw mindmap op als JSON bestand. U kunt ook Ctrl+S gebruiken.',
                position: 'bottom'
            },
            {
                element: '[data-action="export"]',
                title: 'Exporteren',
                content: 'Exporteer uw mindmap als afbeelding of Mermaid diagram.',
                position: 'bottom'
            },
            {
                element: '#canvas',
                title: 'Sneltoetsen',
                content: 'Druk op <kbd>?</kbd> om alle sneltoetsen te zien. Druk op <kbd>F1</kbd> voor contextuele help.',
                position: 'center'
            }
        ];
    }
    
    /**
     * Create interactive tutorial
     */
    static createInteractiveTutorial() {
        const tasks = [
            {
                id: 'create-node',
                title: 'Maak uw eerste knooppunt',
                description: 'Dubbelklik op het canvas',
                check: () => document.querySelectorAll('.node').length > 0,
                hint: 'Dubbelklik ergens op het lege canvas'
            },
            {
                id: 'edit-node',
                title: 'Bewerk de knooppunt tekst',
                description: 'Dubbelklik op de tekst',
                check: () => {
                    const node = document.querySelector('.node');
                    return node && node.textContent !== 'Nieuw Knooppunt';
                },
                hint: 'Dubbelklik op de tekst in het knooppunt'
            },
            {
                id: 'create-connection',
                title: 'Maak een verbinding',
                description: 'Klik op de + knop',
                check: () => document.querySelectorAll('.connection').length > 0,
                hint: 'Klik op de + knop op een knooppunt'
            },
            {
                id: 'move-node',
                title: 'Verplaats een knooppunt',
                description: 'Sleep een knooppunt',
                check: () => {
                    // Track if node has been moved
                    return window._tutorialNodeMoved || false;
                },
                hint: 'Klik en sleep een knooppunt naar een nieuwe positie'
            },
            {
                id: 'use-zoom',
                title: 'Gebruik zoom',
                description: 'Zoom in of uit',
                check: () => {
                    const zoomLevel = window.zoomLevel || 1;
                    return zoomLevel !== 1;
                },
                hint: 'Gebruik het scrollwiel of de zoom knoppen'
            }
        ];
        
        this.#showTaskList(tasks);
    }
    
    /**
     * Show task list overlay
     */
    static #showTaskList(tasks) {
        const overlay = document.createElement('div');
        overlay.className = 'tutorial-tasks';
        overlay.innerHTML = `
            <div class="tutorial-tasks-header">
                <h3>Leer de Basis</h3>
                <button class="tutorial-tasks-close">×</button>
            </div>
            <div class="tutorial-tasks-list">
                ${tasks.map(task => `
                    <div class="tutorial-task" data-task-id="${task.id}">
                        <div class="tutorial-task-checkbox">
                            <span class="checkmark">✓</span>
                        </div>
                        <div class="tutorial-task-content">
                            <div class="tutorial-task-title">${task.title}</div>
                            <div class="tutorial-task-description">${task.description}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="tutorial-tasks-footer">
                <div class="tutorial-tasks-progress">
                    <div class="tutorial-tasks-progress-bar"></div>
                </div>
                <button class="btn btn-primary tutorial-tasks-complete" disabled>
                    Voltooien
                </button>
            </div>
        `;
        
        // Position in corner
        overlay.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 320px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
        `;
        
        // Track task completion
        const checkTasks = () => {
            let completed = 0;
            
            tasks.forEach(task => {
                if (task.check()) {
                    const taskEl = overlay.querySelector(`[data-task-id="${task.id}"]`);
                    taskEl.classList.add('completed');
                    completed++;
                    
                    // Show success notification
                    if (!taskEl.dataset.notified) {
                        notifications.success(`✅ ${task.title}`);
                        taskEl.dataset.notified = 'true';
                    }
                }
            });
            
            // Update progress
            const progress = (completed / tasks.length) * 100;
            overlay.querySelector('.tutorial-tasks-progress-bar').style.width = `${progress}%`;
            
            // Enable complete button when all done
            if (completed === tasks.length) {
                overlay.querySelector('.tutorial-tasks-complete').disabled = false;
            }
        };
        
        // Check tasks periodically
        const interval = setInterval(checkTasks, 500);
        
        // Close handler
        overlay.querySelector('.tutorial-tasks-close').addEventListener('click', () => {
            clearInterval(interval);
            overlay.remove();
        });
        
        // Complete handler
        overlay.querySelector('.tutorial-tasks-complete').addEventListener('click', () => {
            clearInterval(interval);
            overlay.remove();
            this.#complete();
        });
        
        document.body.appendChild(overlay);
        
        // Initial check
        checkTasks();
        
        // Add styles
        this.#addTaskListStyles();
    }
    
    /**
     * Skip tutorial
     */
    static #skip() {
        notifications.info('U kunt de rondleiding altijd starten via Help → Rondleiding');
        
        if (this.#skipCallback) {
            this.#skipCallback();
        }
    }
    
    /**
     * Complete tutorial
     */
    static #complete() {
        this.#markCompleted();
        
        notifications.success('🎉 Gefeliciteerd! U bent klaar om te beginnen met mindmappen!');
        
        if (this.#completeCallback) {
            this.#completeCallback();
        }
    }
    
    /**
     * Mark tutorial as completed
     */
    static #markCompleted() {
        localStorage.setItem('mindmap_tutorial_completed', 'true');
        localStorage.setItem('mindmap_tutorial_version', '2.0.0');
    }
    
    /**
     * Reset tutorial (for testing)
     */
    static reset() {
        localStorage.removeItem('mindmap_tutorial_completed');
        localStorage.removeItem('mindmap_tutorial_version');
        this.#hasSeenTutorial = false;
    }
    
    /**
     * Add styles for task list
     */
    static #addTaskListStyles() {
        if (document.getElementById('tutorial-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'tutorial-styles';
        style.textContent = `
            /* Welcome Dialog */
            .onboarding-welcome {
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
            
            .onboarding-welcome.show {
                opacity: 1;
            }
            
            .onboarding-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
            }
            
            .onboarding-dialog {
                position: relative;
                background: white;
                border-radius: 12px;
                padding: 40px;
                max-width: 500px;
                text-align: center;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            }
            
            .onboarding-icon {
                font-size: 64px;
                margin-bottom: 20px;
            }
            
            .onboarding-dialog h2 {
                margin: 0 0 15px;
                font-size: 28px;
            }
            
            .onboarding-dialog p {
                margin: 10px 0;
                color: #666;
                font-size: 16px;
            }
            
            .onboarding-time {
                font-size: 14px;
                color: #999;
                margin: 20px 0;
            }
            
            .onboarding-actions {
                display: flex;
                gap: 15px;
                justify-content: center;
                margin: 30px 0 20px;
            }
            
            .onboarding-actions .btn {
                padding: 12px 30px;
                font-size: 16px;
                border-radius: 6px;
                cursor: pointer;
                transition: transform 0.2s;
            }
            
            .onboarding-actions .btn:hover {
                transform: translateY(-2px);
            }
            
            .onboarding-actions .btn-primary {
                background: #007bff;
                color: white;
                border: none;
            }
            
            .onboarding-actions .btn-secondary {
                background: white;
                color: #666;
                border: 1px solid #ddd;
            }
            
            .onboarding-remember {
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                color: #666;
                cursor: pointer;
            }
            
            .onboarding-remember input {
                margin-right: 8px;
            }
            
            /* Task List */
            .tutorial-tasks-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px;
                border-bottom: 1px solid #eee;
            }
            
            .tutorial-tasks-header h3 {
                margin: 0;
                font-size: 18px;
            }
            
            .tutorial-tasks-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                opacity: 0.5;
            }
            
            .tutorial-tasks-close:hover {
                opacity: 1;
            }
            
            .tutorial-tasks-list {
                padding: 10px;
            }
            
            .tutorial-task {
                display: flex;
                align-items: flex-start;
                padding: 10px;
                border-radius: 6px;
                margin-bottom: 8px;
                transition: background 0.2s;
            }
            
            .tutorial-task:hover {
                background: #f9f9f9;
            }
            
            .tutorial-task-checkbox {
                width: 24px;
                height: 24px;
                border: 2px solid #ddd;
                border-radius: 50%;
                margin-right: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s;
            }
            
            .tutorial-task-checkbox .checkmark {
                display: none;
                color: white;
                font-size: 14px;
            }
            
            .tutorial-task.completed .tutorial-task-checkbox {
                background: #28a745;
                border-color: #28a745;
            }
            
            .tutorial-task.completed .tutorial-task-checkbox .checkmark {
                display: block;
            }
            
            .tutorial-task.completed .tutorial-task-content {
                opacity: 0.6;
                text-decoration: line-through;
            }
            
            .tutorial-task-title {
                font-weight: 600;
                margin-bottom: 4px;
            }
            
            .tutorial-task-description {
                font-size: 13px;
                color: #666;
            }
            
            .tutorial-tasks-footer {
                padding: 15px;
                border-top: 1px solid #eee;
            }
            
            .tutorial-tasks-progress {
                height: 6px;
                background: #f0f0f0;
                border-radius: 3px;
                margin-bottom: 15px;
                overflow: hidden;
            }
            
            .tutorial-tasks-progress-bar {
                height: 100%;
                background: #007bff;
                width: 0;
                transition: width 0.3s;
            }
            
            .tutorial-tasks-complete {
                width: 100%;
                padding: 10px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 15px;
                cursor: pointer;
                transition: opacity 0.2s;
            }
            
            .tutorial-tasks-complete:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .tutorial-tasks-complete:not(:disabled):hover {
                opacity: 0.9;
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Export default
export default OnboardingTutorial;