/**
 * collaboration.js - Soft lock system for team collaboration
 * Only active in Electron environment
 */

(function() {
    // Only run in Electron
    if (!window.electronAPI || !window.electronAPI.isElectron) {
        return;
    }

    const Collaboration = {
        initialized: false,
        userName: null,
        sessionId: null,
        currentFilePath: null,
        lockFilePath: null,
        heartbeatInterval: null,
        checkInterval: null,
        activeLocks: [],
        
        // Timing constants
        HEARTBEAT_INTERVAL: 30000,  // 30 seconds
        CHECK_INTERVAL: 60000,       // 60 seconds
        LOCK_EXPIRY: 300000,         // 5 minutes
        IDLE_THRESHOLD: 120000,      // 2 minutes
        
        // Initialize collaboration system
        initialize: async function(userName) {
            if (this.initialized) return;
            
            this.userName = userName || localStorage.getItem('mindmap_user_name');
            if (!this.userName) {
                console.warn('Collaboration: No user name set');
                return;
            }
            
            this.sessionId = this.generateSessionId();
            this.initialized = true;
            
            console.log('Collaboration initialized for', this.userName);
            
            // Setup activity tracking
            this.setupActivityTracking();
        },
        
        // Generate unique session ID
        generateSessionId: function() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2);
        },
        
        // Start collaboration for a file
        startCollaboration: async function(filePath) {
            if (!this.initialized || !filePath) return;
            
            this.currentFilePath = filePath;
            this.lockFilePath = filePath + '.lock';
            
            // Create/update our lock
            await this.updateLock();
            
            // Start heartbeat
            this.startHeartbeat();
            
            // Start checking for other locks
            this.startLockChecking();
            
            // Initial check for other users
            await this.checkOtherLocks();
        },
        
        // Stop collaboration
        stopCollaboration: async function() {
            // Stop intervals
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
                this.heartbeatInterval = null;
            }
            
            if (this.checkInterval) {
                clearInterval(this.checkInterval);
                this.checkInterval = null;
            }
            
            // Remove our lock
            if (this.currentFilePath) {
                await this.removeLock();
            }
            
            this.currentFilePath = null;
            this.lockFilePath = null;
            this.activeLocks = [];
            
            // Hide collaboration banner
            this.hideBanner();
        },
        
        // Update our lock
        updateLock: async function() {
            if (!this.lockFilePath) return;
            
            try {
                // Read existing locks
                let locks = await this.readLocks();
                
                // Remove expired locks
                locks = this.removeExpiredLocks(locks);
                
                // Remove our old lock if exists
                locks = locks.filter(lock => lock.sessionId !== this.sessionId);
                
                // Add our new lock
                locks.push({
                    user: this.userName,
                    timestamp: new Date().toISOString(),
                    heartbeat: new Date().toISOString(),
                    sessionId: this.sessionId
                });
                
                // Write back
                await window.electronAPI.writeLockFile(this.lockFilePath, JSON.stringify({ locks }, null, 2));
                
            } catch (error) {
                console.error('Error updating lock:', error);
            }
        },
        
        // Remove our lock
        removeLock: async function() {
            if (!this.lockFilePath) return;
            
            try {
                let locks = await this.readLocks();
                locks = locks.filter(lock => lock.sessionId !== this.sessionId);
                
                if (locks.length > 0) {
                    // Write remaining locks
                    await window.electronAPI.writeLockFile(this.lockFilePath, JSON.stringify({ locks }, null, 2));
                } else {
                    // Delete lock file if no locks remain
                    await window.electronAPI.deleteLockFile(this.lockFilePath);
                }
            } catch (error) {
                console.error('Error removing lock:', error);
            }
        },
        
        // Read locks from file
        readLocks: async function() {
            if (!this.lockFilePath) return [];
            
            try {
                const data = await window.electronAPI.readLockFile(this.lockFilePath);
                if (data) {
                    const parsed = JSON.parse(data);
                    return parsed.locks || [];
                }
            } catch (error) {
                // File doesn't exist or is invalid
                return [];
            }
            
            return [];
        },
        
        // Remove expired locks
        removeExpiredLocks: function(locks) {
            const now = Date.now();
            return locks.filter(lock => {
                const heartbeatTime = new Date(lock.heartbeat).getTime();
                return (now - heartbeatTime) < this.LOCK_EXPIRY;
            });
        },
        
        // Check for other users' locks
        checkOtherLocks: async function() {
            const locks = await this.readLocks();
            const validLocks = this.removeExpiredLocks(locks);
            
            // Filter out our own lock
            this.activeLocks = validLocks.filter(lock => lock.sessionId !== this.sessionId);
            
            // Update UI
            this.updateCollaborationBanner();
        },
        
        // Start heartbeat
        startHeartbeat: function() {
            if (this.heartbeatInterval) return;
            
            this.heartbeatInterval = setInterval(() => {
                this.updateLock();
            }, this.HEARTBEAT_INTERVAL);
        },
        
        // Start checking for other locks
        startLockChecking: function() {
            if (this.checkInterval) return;
            
            this.checkInterval = setInterval(() => {
                this.checkOtherLocks();
            }, this.CHECK_INTERVAL);
        },
        
        // Setup activity tracking
        setupActivityTracking: function() {
            let lastActivity = Date.now();
            let isActive = true;
            
            const updateActivity = () => {
                lastActivity = Date.now();
                if (!isActive) {
                    isActive = true;
                    this.updateLock(); // Update immediately when becoming active
                }
            };
            
            // Track various activities
            document.addEventListener('mousemove', updateActivity);
            document.addEventListener('keypress', updateActivity);
            document.addEventListener('click', updateActivity);
            
            // Check for idle state
            setInterval(() => {
                if (Date.now() - lastActivity > this.IDLE_THRESHOLD) {
                    isActive = false;
                }
            }, 10000);
        },
        
        // Update collaboration banner
        updateCollaborationBanner: function() {
            if (this.activeLocks.length === 0) {
                this.hideBanner();
                return;
            }
            
            // Create or update banner
            let banner = document.getElementById('collaboration-banner');
            if (!banner) {
                banner = this.createBanner();
            }
            
            // Build message
            const messages = this.activeLocks.map(lock => {
                const status = this.getLockStatus(lock);
                return `${status.icon} ${lock.user} ${status.message}`;
            });
            
            banner.querySelector('.collab-message').innerHTML = messages.join(' • ');
            banner.style.display = 'flex';
        },
        
        // Get lock status
        getLockStatus: function(lock) {
            const now = Date.now();
            const heartbeatTime = new Date(lock.heartbeat).getTime();
            const age = now - heartbeatTime;
            
            if (age < 60000) {
                return { icon: '🟢', message: 'is aan het bewerken', status: 'active' };
            } else if (age < 120000) {
                return { icon: '🟡', message: 'is inactief', status: 'idle' };
            } else if (age < 300000) {
                return { icon: '🔴', message: 'is mogelijk weg', status: 'away' };
            }
            
            return { icon: '❌', message: null, status: 'expired' };
        },
        
        // Create collaboration banner
        createBanner: function() {
            const banner = document.createElement('div');
            banner.id = 'collaboration-banner';
            banner.className = 'collaboration-banner';
            banner.innerHTML = `
                <div class="collab-content">
                    <span class="collab-icon">👥</span>
                    <span class="collab-message"></span>
                </div>
                <button class="collab-close" title="Verberg">×</button>
            `;
            
            // Add click handler for close button
            banner.querySelector('.collab-close').addEventListener('click', () => {
                banner.style.display = 'none';
            });
            
            // Insert at top of body
            document.body.insertBefore(banner, document.body.firstChild);
            
            return banner;
        },
        
        // Hide collaboration banner
        hideBanner: function() {
            const banner = document.getElementById('collaboration-banner');
            if (banner) {
                banner.style.display = 'none';
            }
        },
        
        // Handle file opened
        onFileOpened: function(filePath) {
            // Stop previous collaboration if any
            this.stopCollaboration().then(() => {
                // Start new collaboration
                this.startCollaboration(filePath);
            });
        },
        
        // Handle file closed
        onFileClosed: function() {
            this.stopCollaboration();
        },
        
        // Handle external file change
        onExternalChange: function(message) {
            // Check if it's from another user
            if (this.activeLocks.length > 0) {
                const users = this.activeLocks.map(l => l.user).join(', ');
                return `${message}\nGewijzigd door: ${users}`;
            }
            return message;
        }
    };
    
    // Make globally available
    window.Collaboration = Collaboration;
    
    // Auto-initialize when user name is available
    const checkAndInit = async () => {
        const userName = localStorage.getItem('mindmap_user_name');
        if (userName && !Collaboration.initialized) {
            await Collaboration.initialize(userName);
        }
    };
    
    // Check periodically until initialized
    const initInterval = setInterval(() => {
        checkAndInit();
        if (Collaboration.initialized) {
            clearInterval(initInterval);
        }
    }, 1000);
    
    // Cleanup on window close
    window.addEventListener('beforeunload', () => {
        Collaboration.stopCollaboration();
    });
    
})();