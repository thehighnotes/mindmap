/**
 * SafeExecutor - Comprehensive error handling and recovery system
 * Provides error boundaries, automatic recovery, and user-friendly error messages
 */

import { Logger } from './Logger';

export class SafeExecutor {
    static #errorHistory = [];
    static #maxErrorHistory = 50;
    static #errorHandlers = new Map();
    static #recoveryStrategies = new Map();
    static #emergencyBackupData = null;

    /**
     * Execute an operation safely with error handling
     */
    static async execute(operation, options = {}) {
        const {
            fallback = null,
            onError = console.error,
            userMessage = 'Er is een fout opgetreden',
            critical = false,
            retry = false,
            retryAttempts = 3,
            retryDelay = 1000,
            silent = false
        } = options;

        let lastError = null;
        let attempts = retry ? retryAttempts : 1;

        while (attempts > 0) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                attempts--;

                // Log error
                this.#logError(error, { userMessage, critical });
                
                // Call custom error handler
                if (onError) {
                    onError(error);
                }

                // Handle based on criticality
                if (critical) {
                    await this.#handleCriticalError(error, userMessage);
                } else if (!silent) {
                    this.#showUserError(userMessage, error);
                }

                // Retry if configured and attempts remain
                if (retry && attempts > 0) {
                    Logger.info(`Retrying operation... Attempts remaining: ${attempts}`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    continue;
                }

                // Try recovery strategy
                const recovered = await this.#tryRecovery(error, options);
                if (recovered !== undefined) {
                    return recovered;
                }

                break;
            }
        }

        return fallback;
    }

    /**
     * Wrap a function with error handling
     */
    static wrap(fn, options = {}) {
        return async (...args) => {
            return this.execute(() => fn(...args), options);
        };
    }

    /**
     * Create a protected class method decorator
     */
    static protect(target, propertyName, descriptor) {
        const originalMethod = descriptor.value;
        
        descriptor.value = async function(...args) {
            return SafeExecutor.execute(
                () => originalMethod.apply(this, args),
                {
                    userMessage: `Fout in ${propertyName}`,
                    fallback: null
                }
            );
        };
        
        return descriptor;
    }

    /**
     * Register a global error handler
     */
    static registerErrorHandler(errorType, handler) {
        this.#errorHandlers.set(errorType, handler);
    }

    /**
     * Register a recovery strategy
     */
    static registerRecoveryStrategy(errorType, strategy) {
        this.#recoveryStrategies.set(errorType, strategy);
    }

    /**
     * Get error history
     */
    static getErrorHistory(filter = {}) {
        let history = [...this.#errorHistory];
        
        if (filter.critical !== undefined) {
            history = history.filter(e => e.critical === filter.critical);
        }
        
        if (filter.since) {
            const sinceTime = new Date(filter.since).getTime();
            history = history.filter(e => e.timestamp >= sinceTime);
        }
        
        return history;
    }

    /**
     * Clear error history
     */
    static clearErrorHistory() {
        this.#errorHistory = [];
    }

    /**
     * Create emergency backup
     */
    static async createEmergencyBackup(data) {
        try {
            this.#emergencyBackupData = JSON.parse(JSON.stringify(data));
            
            // Also save to localStorage
            localStorage.setItem('emergency_backup', JSON.stringify({
                data: this.#emergencyBackupData,
                timestamp: Date.now()
            }));
            
            Logger.info('Emergency backup created');
            return true;
        } catch (error) {
            Logger.error('Failed to create emergency backup', error);
            return false;
        }
    }

    /**
     * Restore from emergency backup
     */
    static async restoreEmergencyBackup() {
        try {
            // Try memory first
            if (this.#emergencyBackupData) {
                return this.#emergencyBackupData;
            }
            
            // Try localStorage
            const stored = localStorage.getItem('emergency_backup');
            if (stored) {
                const { data, timestamp } = JSON.parse(stored);
                
                // Check if backup is recent (within 24 hours)
                const age = Date.now() - timestamp;
                if (age < 24 * 60 * 60 * 1000) {
                    return data;
                }
            }
            
            return null;
        } catch (error) {
            Logger.error('Failed to restore emergency backup', error);
            return null;
        }
    }

    // ==================== Private Methods ====================

    static #logError(error, context) {
        const errorEntry = {
            timestamp: Date.now(),
            message: error.message,
            stack: error.stack,
            context,
            critical: context.critical || false,
            type: error.constructor.name
        };

        // Add to history
        this.#errorHistory.push(errorEntry);
        
        // Limit history size
        if (this.#errorHistory.length > this.#maxErrorHistory) {
            this.#errorHistory.shift();
        }

        // Log to console
        Logger.error('Error caught', errorEntry);
    }

    static async #handleCriticalError(error, userMessage) {
        // Save emergency backup
        if (window.appState) {
            await this.createEmergencyBackup(window.appState.getState());
        }

        // Show critical error modal
        this.#showCriticalError(error, userMessage);

        // Emit critical error event
        if (window.EventBus) {
            window.EventBus.emit('error:critical', { error, userMessage });
        }

        // Check if we should reload
        const shouldReload = await this.#askUserToReload();
        if (shouldReload) {
            window.location.reload();
        }
    }

    static #showUserError(userMessage, error) {
        // Create notification
        const notification = this.#createErrorNotification(userMessage, error);
        
        // Show notification
        document.body.appendChild(notification);
        
        // Auto-remove after delay
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 5000);

        // Emit error event
        if (window.EventBus) {
            window.EventBus.emit('error:user', { error, userMessage });
        }
    }

    static #showCriticalError(error, userMessage) {
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'error-modal critical';
        modal.innerHTML = `
            <div class="error-modal-overlay"></div>
            <div class="error-modal-content">
                <h2>⚠️ Kritieke Fout</h2>
                <p class="error-message">${this.#escapeHtml(userMessage)}</p>
                <details class="error-details">
                    <summary>Technische Details</summary>
                    <pre>${this.#escapeHtml(error.stack || error.message)}</pre>
                </details>
                <div class="error-actions">
                    <button class="btn btn-primary" onclick="location.reload()">
                        Applicatie Herladen
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.error-modal').remove()">
                        Doorgaan (Riskant)
                    </button>
                </div>
                <p class="error-note">
                    Een noodbackup is automatisch gemaakt. Uw werk is veilig.
                </p>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    static #createErrorNotification(message, error) {
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.setAttribute('role', 'alert');
        notification.innerHTML = `
            <div class="error-notification-content">
                <span class="error-icon">⚠️</span>
                <div class="error-text">
                    <p class="error-message">${this.#escapeHtml(message)}</p>
                    ${error ? `<p class="error-detail">${this.#escapeHtml(error.message)}</p>` : ''}
                </div>
                <button class="error-close" aria-label="Sluiten">×</button>
            </div>
        `;
        
        // Add close functionality
        notification.querySelector('.error-close').addEventListener('click', () => {
            notification.remove();
        });
        
        return notification;
    }

    static async #tryRecovery(error, options) {
        const errorType = error.constructor.name;
        
        // Check for registered recovery strategy
        const strategy = this.#recoveryStrategies.get(errorType);
        if (strategy) {
            try {
                Logger.info(`Attempting recovery for ${errorType}`);
                return await strategy(error, options);
            } catch (recoveryError) {
                Logger.error('Recovery failed', recoveryError);
            }
        }
        
        // Default recovery strategies
        if (error.name === 'NetworkError') {
            return this.#recoverFromNetworkError(error, options);
        }
        
        if (error.name === 'QuotaExceededError') {
            return this.#recoverFromQuotaError(error, options);
        }
        
        return undefined;
    }

    static async #recoverFromNetworkError(error, options) {
        Logger.info('Attempting network error recovery');
        
        // Wait for network to return
        const isOnline = await this.#waitForNetwork(5000);
        if (isOnline && options.retry) {
            // Will be retried by main execute loop
            return undefined;
        }
        
        // Use cached/offline mode
        if (options.offlineFallback) {
            return options.offlineFallback();
        }
        
        return undefined;
    }

    static async #recoverFromQuotaError(error, options) {
        Logger.info('Attempting quota exceeded recovery');
        
        // Clear old data
        try {
            // Clear old localStorage items
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.includes('backup') && !key.includes('emergency')) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            // Retry operation
            if (options.retry) {
                return undefined; // Will be retried
            }
        } catch (cleanupError) {
            Logger.error('Cleanup failed', cleanupError);
        }
        
        return undefined;
    }

    static async #waitForNetwork(timeout = 5000) {
        return new Promise((resolve) => {
            if (navigator.onLine) {
                resolve(true);
                return;
            }
            
            const handleOnline = () => {
                clearTimeout(timer);
                window.removeEventListener('online', handleOnline);
                resolve(true);
            };
            
            window.addEventListener('online', handleOnline);
            
            const timer = setTimeout(() => {
                window.removeEventListener('online', handleOnline);
                resolve(false);
            }, timeout);
        });
    }

    static async #askUserToReload() {
        return new Promise((resolve) => {
            // Create confirmation dialog
            const dialog = document.createElement('div');
            dialog.className = 'reload-dialog';
            dialog.innerHTML = `
                <div class="dialog-content">
                    <p>De applicatie moet opnieuw worden geladen om te herstellen van deze fout.</p>
                    <p>Wilt u nu herladen?</p>
                    <div class="dialog-actions">
                        <button class="btn btn-primary" data-action="reload">Ja, Herladen</button>
                        <button class="btn btn-secondary" data-action="continue">Nee, Doorgaan</button>
                    </div>
                </div>
            `;
            
            dialog.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                if (action === 'reload') {
                    resolve(true);
                } else if (action === 'continue') {
                    resolve(false);
                }
                dialog.remove();
            });
            
            document.body.appendChild(dialog);
        });
    }

    static #escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Register default recovery strategies
SafeExecutor.registerRecoveryStrategy('TypeError', async (error) => {
    Logger.warn('TypeError caught, attempting recovery');
    // Return safe default value
    return null;
});

SafeExecutor.registerRecoveryStrategy('ReferenceError', async (error) => {
    Logger.warn('ReferenceError caught, attempting recovery');
    // Return undefined for missing references
    return undefined;
});

// Install global error handlers
window.addEventListener('error', (event) => {
    SafeExecutor.execute(
        () => { throw event.error; },
        {
            userMessage: 'Een onverwachte fout is opgetreden',
            critical: false,
            silent: true
        }
    );
});

window.addEventListener('unhandledrejection', (event) => {
    SafeExecutor.execute(
        () => { throw event.reason; },
        {
            userMessage: 'Een onverwerkte promise fout is opgetreden',
            critical: false,
            silent: true
        }
    );
    
    event.preventDefault();
});

export default SafeExecutor;