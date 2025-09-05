/**
 * NotificationSystem - User-friendly notifications and toasts
 * Provides accessible, animated notifications with various types and actions
 */

export class NotificationSystem {
    static #instance = null;
    #container = null;
    #notifications = new Map();
    #queue = [];
    #maxVisible = 3;
    #defaultDuration = 5000;

    constructor() {
        if (NotificationSystem.#instance) {
            return NotificationSystem.#instance;
        }
        
        this.#initialize();
        NotificationSystem.#instance = this;
    }

    #initialize() {
        // Create notification container
        this.#container = document.createElement('div');
        this.#container.id = 'notification-container';
        this.#container.className = 'notification-container';
        this.#container.setAttribute('role', 'region');
        this.#container.setAttribute('aria-label', 'Meldingen');
        this.#container.setAttribute('aria-live', 'polite');
        
        document.body.appendChild(this.#container);
        
        // Add styles
        this.#addStyles();
    }

    // ==================== Public API ====================

    /**
     * Show a success notification
     */
    success(message, options = {}) {
        return this.show({
            ...options,
            type: 'success',
            message,
            icon: options.icon || '✅'
        });
    }

    /**
     * Show an error notification
     */
    error(message, options = {}) {
        return this.show({
            ...options,
            type: 'error',
            message,
            icon: options.icon || '❌',
            duration: options.duration || 8000 // Longer for errors
        });
    }

    /**
     * Show a warning notification
     */
    warning(message, options = {}) {
        return this.show({
            ...options,
            type: 'warning',
            message,
            icon: options.icon || '⚠️',
            duration: options.duration || 6000
        });
    }

    /**
     * Show an info notification
     */
    info(message, options = {}) {
        return this.show({
            ...options,
            type: 'info',
            message,
            icon: options.icon || 'ℹ️'
        });
    }

    /**
     * Show a loading notification
     */
    loading(message, options = {}) {
        return this.show({
            ...options,
            type: 'loading',
            message,
            icon: options.icon || '⏳',
            persistent: true, // Don't auto-dismiss
            showProgress: true
        });
    }

    /**
     * Show a custom notification
     */
    show(options) {
        const notification = this.#createNotification(options);
        
        // Queue if too many visible
        if (this.#notifications.size >= this.#maxVisible) {
            this.#queue.push(notification);
            return notification;
        }
        
        this.#displayNotification(notification);
        return notification;
    }

    /**
     * Update an existing notification
     */
    update(id, updates) {
        const notification = this.#notifications.get(id);
        if (notification) {
            Object.assign(notification, updates);
            this.#updateNotificationElement(notification);
        }
    }

    /**
     * Dismiss a notification
     */
    dismiss(id) {
        const notification = this.#notifications.get(id);
        if (notification) {
            this.#removeNotification(notification);
        }
    }

    /**
     * Dismiss all notifications
     */
    dismissAll() {
        this.#notifications.forEach(notification => {
            this.#removeNotification(notification);
        });
        this.#queue = [];
    }

    /**
     * Show a confirmation dialog
     */
    async confirm(message, options = {}) {
        return new Promise((resolve) => {
            const notification = this.show({
                type: 'confirm',
                message,
                icon: '❓',
                persistent: true,
                actions: [
                    {
                        label: options.confirmText || 'Bevestigen',
                        primary: true,
                        callback: () => {
                            this.dismiss(notification.id);
                            resolve(true);
                        }
                    },
                    {
                        label: options.cancelText || 'Annuleren',
                        callback: () => {
                            this.dismiss(notification.id);
                            resolve(false);
                        }
                    }
                ]
            });
        });
    }

    /**
     * Show a prompt dialog
     */
    async prompt(message, options = {}) {
        return new Promise((resolve) => {
            let inputValue = options.defaultValue || '';
            
            const notification = this.show({
                type: 'prompt',
                message,
                icon: '✏️',
                persistent: true,
                content: `
                    <input type="text" 
                           class="notification-input" 
                           value="${this.#escapeHtml(inputValue)}"
                           placeholder="${this.#escapeHtml(options.placeholder || '')}"
                           />
                `,
                onShow: (element) => {
                    const input = element.querySelector('.notification-input');
                    input.focus();
                    input.select();
                    input.addEventListener('input', (e) => {
                        inputValue = e.target.value;
                    });
                    input.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            this.dismiss(notification.id);
                            resolve(inputValue);
                        }
                    });
                },
                actions: [
                    {
                        label: options.submitText || 'OK',
                        primary: true,
                        callback: () => {
                            this.dismiss(notification.id);
                            resolve(inputValue);
                        }
                    },
                    {
                        label: options.cancelText || 'Annuleren',
                        callback: () => {
                            this.dismiss(notification.id);
                            resolve(null);
                        }
                    }
                ]
            });
        });
    }

    // ==================== Private Methods ====================

    #createNotification(options) {
        const notification = {
            id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: options.type || 'info',
            message: options.message || '',
            title: options.title,
            icon: options.icon,
            content: options.content,
            actions: options.actions || [],
            duration: options.persistent ? 0 : (options.duration || this.#defaultDuration),
            showProgress: options.showProgress || false,
            persistent: options.persistent || false,
            onShow: options.onShow,
            onDismiss: options.onDismiss,
            timestamp: Date.now()
        };
        
        return notification;
    }

    #displayNotification(notification) {
        // Create element
        const element = this.#createNotificationElement(notification);
        
        // Add to container
        this.#container.appendChild(element);
        
        // Store reference
        this.#notifications.set(notification.id, notification);
        notification.element = element;
        
        // Animate in
        requestAnimationFrame(() => {
            element.classList.add('show');
        });
        
        // Call onShow callback
        if (notification.onShow) {
            notification.onShow(element);
        }
        
        // Set auto-dismiss timer
        if (!notification.persistent && notification.duration > 0) {
            notification.timer = setTimeout(() => {
                this.#removeNotification(notification);
            }, notification.duration);
            
            // Add progress bar if needed
            if (notification.showProgress) {
                this.#addProgressBar(element, notification.duration);
            }
        }
        
        // Announce to screen reader
        this.#announceNotification(notification);
    }

    #createNotificationElement(notification) {
        const element = document.createElement('div');
        element.id = notification.id;
        element.className = `notification notification-${notification.type}`;
        element.setAttribute('role', 'alert');
        element.setAttribute('aria-live', notification.type === 'error' ? 'assertive' : 'polite');
        
        // Build content
        let html = '<div class="notification-content">';
        
        // Icon
        if (notification.icon) {
            html += `<span class="notification-icon">${notification.icon}</span>`;
        }
        
        // Text content
        html += '<div class="notification-text">';
        if (notification.title) {
            html += `<h4 class="notification-title">${this.#escapeHtml(notification.title)}</h4>`;
        }
        if (notification.message) {
            html += `<p class="notification-message">${this.#escapeHtml(notification.message)}</p>`;
        }
        if (notification.content) {
            html += `<div class="notification-custom">${notification.content}</div>`;
        }
        html += '</div>';
        
        // Close button
        if (!notification.persistent) {
            html += '<button class="notification-close" aria-label="Sluiten">×</button>';
        }
        
        html += '</div>';
        
        // Actions
        if (notification.actions.length > 0) {
            html += '<div class="notification-actions">';
            notification.actions.forEach((action, index) => {
                const btnClass = action.primary ? 'btn-primary' : 'btn-secondary';
                html += `<button class="notification-action ${btnClass}" data-index="${index}">
                    ${this.#escapeHtml(action.label)}
                </button>`;
            });
            html += '</div>';
        }
        
        // Progress bar container
        if (notification.showProgress) {
            html += '<div class="notification-progress"></div>';
        }
        
        element.innerHTML = html;
        
        // Add event listeners
        this.#addEventListeners(element, notification);
        
        return element;
    }

    #updateNotificationElement(notification) {
        const element = notification.element;
        if (!element) return;
        
        // Update message
        const messageEl = element.querySelector('.notification-message');
        if (messageEl && notification.message) {
            messageEl.textContent = notification.message;
        }
        
        // Update title
        const titleEl = element.querySelector('.notification-title');
        if (titleEl && notification.title) {
            titleEl.textContent = notification.title;
        }
        
        // Update type
        element.className = `notification notification-${notification.type} show`;
    }

    #addEventListeners(element, notification) {
        // Close button
        const closeBtn = element.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.#removeNotification(notification);
            });
        }
        
        // Action buttons
        const actionBtns = element.querySelectorAll('.notification-action');
        actionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                const action = notification.actions[index];
                if (action && action.callback) {
                    action.callback();
                }
                if (!action.keepOpen) {
                    this.#removeNotification(notification);
                }
            });
        });
        
        // Pause timer on hover
        if (notification.timer) {
            element.addEventListener('mouseenter', () => {
                clearTimeout(notification.timer);
                // Pause progress bar
                const progress = element.querySelector('.notification-progress-bar');
                if (progress) {
                    progress.style.animationPlayState = 'paused';
                }
            });
            
            element.addEventListener('mouseleave', () => {
                // Resume timer
                const remaining = notification.duration - (Date.now() - notification.timestamp);
                if (remaining > 0) {
                    notification.timer = setTimeout(() => {
                        this.#removeNotification(notification);
                    }, remaining);
                    
                    // Resume progress bar
                    const progress = element.querySelector('.notification-progress-bar');
                    if (progress) {
                        progress.style.animationPlayState = 'running';
                    }
                }
            });
        }
    }

    #removeNotification(notification) {
        const element = notification.element;
        if (!element) return;
        
        // Clear timer
        if (notification.timer) {
            clearTimeout(notification.timer);
        }
        
        // Animate out
        element.classList.remove('show');
        element.classList.add('hide');
        
        // Remove after animation
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            
            this.#notifications.delete(notification.id);
            
            // Call onDismiss callback
            if (notification.onDismiss) {
                notification.onDismiss();
            }
            
            // Process queue
            this.#processQueue();
        }, 300);
    }

    #processQueue() {
        if (this.#queue.length > 0 && this.#notifications.size < this.#maxVisible) {
            const next = this.#queue.shift();
            this.#displayNotification(next);
        }
    }

    #addProgressBar(element, duration) {
        const progressContainer = element.querySelector('.notification-progress');
        if (progressContainer) {
            progressContainer.innerHTML = '<div class="notification-progress-bar"></div>';
            const progressBar = progressContainer.querySelector('.notification-progress-bar');
            progressBar.style.animationDuration = `${duration}ms`;
        }
    }

    #announceNotification(notification) {
        // Create screen reader announcement
        const announcement = document.createElement('div');
        announcement.className = 'sr-only';
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', notification.type === 'error' ? 'assertive' : 'polite');
        announcement.textContent = `${notification.type}: ${notification.message}`;
        
        document.body.appendChild(announcement);
        
        // Remove after announcement
        setTimeout(() => {
            announcement.remove();
        }, 100);
    }

    #escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    #addStyles() {
        if (document.getElementById('notification-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
            }
            
            .notification {
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                margin-bottom: 12px;
                max-width: 400px;
                opacity: 0;
                pointer-events: auto;
                transform: translateX(400px);
                transition: all 0.3s ease;
            }
            
            .notification.show {
                opacity: 1;
                transform: translateX(0);
            }
            
            .notification.hide {
                opacity: 0;
                transform: translateX(400px);
            }
            
            .notification-content {
                display: flex;
                padding: 16px;
                align-items: flex-start;
            }
            
            .notification-icon {
                font-size: 24px;
                margin-right: 12px;
                flex-shrink: 0;
            }
            
            .notification-text {
                flex: 1;
            }
            
            .notification-title {
                margin: 0 0 4px 0;
                font-weight: 600;
            }
            
            .notification-message {
                margin: 0;
                color: #666;
            }
            
            .notification-close {
                background: none;
                border: none;
                cursor: pointer;
                font-size: 24px;
                opacity: 0.5;
                padding: 0;
                margin-left: 12px;
            }
            
            .notification-close:hover {
                opacity: 1;
            }
            
            .notification-actions {
                padding: 0 16px 16px;
                display: flex;
                gap: 8px;
                justify-content: flex-end;
            }
            
            .notification-action {
                padding: 6px 12px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            }
            
            .notification-action.btn-primary {
                background: #007bff;
                color: white;
            }
            
            .notification-action.btn-secondary {
                background: #f0f0f0;
                color: #333;
            }
            
            .notification-progress {
                height: 3px;
                background: rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            
            .notification-progress-bar {
                height: 100%;
                background: #007bff;
                animation: progress-countdown linear;
                transform-origin: left;
            }
            
            @keyframes progress-countdown {
                from { transform: scaleX(1); }
                to { transform: scaleX(0); }
            }
            
            .notification-success { border-left: 4px solid #28a745; }
            .notification-error { border-left: 4px solid #dc3545; }
            .notification-warning { border-left: 4px solid #ffc107; }
            .notification-info { border-left: 4px solid #17a2b8; }
            .notification-loading { border-left: 4px solid #6c757d; }
            
            .notification-input {
                width: 100%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                margin-top: 8px;
            }
            
            @media (max-width: 768px) {
                .notification-container {
                    left: 10px;
                    right: 10px;
                }
                
                .notification {
                    max-width: 100%;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Create global instance
export const notifications = new NotificationSystem();

// Export as default
export default NotificationSystem;