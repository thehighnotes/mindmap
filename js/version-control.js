/**
 * version-control.js - Smart version control and team collaboration system
 */

// Version control state
let currentProjectName = 'Mindmap Project';
let currentVersion = '1.0.0';
let lastSavedState = null;
let currentAuthor = '';
let unsavedChanges = false;
let changesSinceLastSave = [];
let changeDetectionTimeout = null;

// Recursion prevention flags
let isDetectingChanges = false;
let isSavingDraft = false;
let isInitialized = false;
let originalSaveStateForUndo = null;

// Version control utilities
const VersionControl = {
    
    /**
     * Initialize version control system (fail-safe)
     */
    initialize() {
        // Prevent multiple initializations
        if (isInitialized) {
            console.warn('⚠️ Version control already initialized, skipping...');
            return;
        }
        
        console.log('📋 Initializing version control system...');
        
        try {
            // Initialize current author from storage (fail-safe)
            this.initializeAuthor();
            
            // Load project metadata (non-blocking, fail-safe)
            this.initializeProjectMetadata();
            
            // Start change tracking (fail-safe)
            this.initializeChangeTracking();
            
            // Update version indicator (fail-safe)
            this.updateVersionIndicator();
            
            // Set up auto-save (fail-safe)
            this.initializeAutoSave();
            
            // Test storage capabilities (non-blocking)
            this.testStorageCapabilities();
            
            // Mark as initialized
            isInitialized = true;
            
            console.log('✅ Version control system initialized successfully');
        } catch (e) {
            console.error('❌ Version control initialization failed:', e);
            // Create a minimal fallback state so the app doesn't crash
            this.initializeFallbackState();
            // Still mark as initialized to prevent retries
            isInitialized = true;
        }
    },
    
    /**
     * Initialize author with fail-safe storage access
     */
    initializeAuthor() {
        try {
            if (window.StorageUtils) {
                currentAuthor = window.StorageUtils.getItem('mindmap_author') || '';
            } else {
                // NEVER access localStorage directly - always fail-safe
                console.warn('StorageUtils not available, using fallback');
                currentAuthor = 'Anonymous';
            }
        } catch (e) {
            console.warn('Could not load author from storage:', e);
            currentAuthor = 'Anonymous';
        }
        
        if (!currentAuthor) {
            currentAuthor = 'Anonymous';
        }
    },
    
    /**
     * Initialize project metadata with error handling
     */
    initializeProjectMetadata() {
        try {
            this.loadProjectMetadata();
        } catch (e) {
            console.warn('Could not load project metadata, using defaults:', e);
            currentProjectName = 'Mindmap Project';
            currentVersion = '1.0.0';
        }
    },
    
    /**
     * Initialize change tracking with error handling
     */
    initializeChangeTracking() {
        try {
            this.startChangeTracking();
        } catch (e) {
            console.warn('Could not start change tracking:', e);
            // Initialize with safe defaults
            lastSavedState = {
                nodes: [],
                connections: [],
                timestamp: Date.now()
            };
            changesSinceLastSave = [];
            unsavedChanges = false;
        }
    },
    
    /**
     * Initialize auto-save with error handling
     */
    initializeAutoSave() {
        try {
            setInterval(() => {
                try {
                    this.autoSaveDraft();
                } catch (e) {
                    console.warn('Auto-save failed:', e);
                }
            }, 30000); // Auto-save every 30 seconds
        } catch (e) {
            console.warn('Could not set up auto-save:', e);
        }
    },
    
    /**
     * Test storage capabilities (non-blocking)
     */
    testStorageCapabilities() {
        if (!window.StorageUtils) return;
        
        setTimeout(() => {
            try {
                const storageTest = window.StorageUtils.testStorage();
                if (!storageTest.working) {
                    console.warn('Storage issues detected:', storageTest);
                    if (typeof showToast === 'function') {
                        showToast('Warning: Storage may not be reliable', true);
                    }
                } else if (storageTest.fallback) {
                    console.warn('Using fallback storage (data will not persist)');
                    if (typeof showToast === 'function') {
                        showToast('Warning: Using temporary storage', true);
                    }
                }
            } catch (e) {
                console.warn('Storage test failed:', e);
            }
        }, 1000); // Test after 1 second delay
    },
    
    /**
     * Initialize fallback state when everything fails
     */
    initializeFallbackState() {
        console.warn('🛟 Initializing version control fallback state');
        
        // Set safe defaults
        currentProjectName = 'Mindmap Project';
        currentVersion = '1.0.0';
        currentAuthor = 'Anonymous';
        lastSavedState = { nodes: [], connections: [], timestamp: Date.now() };
        changesSinceLastSave = [];
        unsavedChanges = false;
        
        // Try to update UI with basic info
        try {
            const indicator = document.getElementById('version-indicator');
            if (indicator) {
                indicator.innerHTML = 'v1.0.0 • Fallback mode';
                indicator.className = 'version-indicator fallback-mode';
                indicator.title = 'Version control running in fallback mode';
            }
        } catch (e) {
            console.warn('Could not update version indicator in fallback:', e);
        }
    },
    
    /**
     * Track changes in real-time
     */
    startChangeTracking() {
        try {
            // Save initial state
            this.saveCurrentStateSnapshot();
            
            // Set up change detection with debouncing
            if (!originalSaveStateForUndo && typeof window.saveStateForUndo === 'function') {
                // Store the original function only once
                originalSaveStateForUndo = window.saveStateForUndo;
                
                // Create a new wrapped function
                window.saveStateForUndo = (...args) => {
                    // Call the original function
                    const result = originalSaveStateForUndo(...args);
                    
                    // Trigger change detection only if not already in progress
                    if (!isDetectingChanges && !isSavingDraft) {
                        this.debouncedChangeDetection();
                    }
                    
                    return result;
                };
                console.log('🔄 Change tracking hooked into saveStateForUndo');
            } else if (originalSaveStateForUndo) {
                console.log('🔄 Change tracking already hooked');
            } else {
                console.warn('saveStateForUndo not available, change tracking may be limited');
            }
        } catch (e) {
            console.warn('Could not set up change tracking:', e);
        }
    },
    
    /**
     * Debounced change detection to reduce frequency
     */
    debouncedChangeDetection() {
        try {
            // Clear existing timeout
            if (changeDetectionTimeout) {
                clearTimeout(changeDetectionTimeout);
            }
            
            // Set new timeout for 500ms delay
            changeDetectionTimeout = setTimeout(() => {
                try {
                    this.detectAndRecordChange();
                } catch (e) {
                    console.warn('Change detection failed:', e);
                    // Don't let change detection crash the app
                }
            }, 500);
        } catch (e) {
            console.warn('Could not set up debounced change detection:', e);
        }
    },
    
    /**
     * Save current state as baseline for change detection
     */
    saveCurrentStateSnapshot() {
        try {
            // Ensure global variables exist and have safe defaults
            const currentNodes = (typeof nodes !== 'undefined' && Array.isArray(nodes)) ? nodes : [];
            const currentConnections = (typeof connections !== 'undefined' && Array.isArray(connections)) ? connections : [];
            
            lastSavedState = {
                nodes: JSON.parse(JSON.stringify(currentNodes)),
                connections: JSON.parse(JSON.stringify(currentConnections)),
                timestamp: Date.now()
            };
            changesSinceLastSave = [];
            unsavedChanges = false;
            this.updateVersionIndicator();
        } catch (e) {
            console.warn('Could not save current state snapshot:', e);
            // Initialize with empty state to prevent crashes
            lastSavedState = {
                nodes: [],
                connections: [],
                timestamp: Date.now()
            };
            changesSinceLastSave = [];
            unsavedChanges = false;
        }
    },
    
    /**
     * Detect and record a change
     */
    detectAndRecordChange() {
        // Prevent recursive calls
        if (isDetectingChanges) {
            console.warn('⚠️ Change detection already in progress, skipping...');
            return;
        }
        
        if (!lastSavedState) return;
        
        try {
            isDetectingChanges = true;
            
            const currentState = {
                nodes: nodes || [],
                connections: connections || []
            };
            
            const changeInfo = this.analyzeChanges(lastSavedState, currentState);
            
            if (changeInfo.hasChanges) {
                changesSinceLastSave.push({
                    timestamp: Date.now(),
                    type: changeInfo.changeType,
                    description: changeInfo.description,
                    details: changeInfo.details
                });
                
                unsavedChanges = true;
                this.updateVersionIndicator();
                this.saveDraftToLocalStorage();
            }
        } finally {
            isDetectingChanges = false;
        }
    },
    
    /**
     * Analyze changes between two states
     */
    analyzeChanges(previousState, currentState) {
        const nodeChanges = this.countNodeChanges(previousState.nodes, currentState.nodes);
        const connectionChanges = this.countConnectionChanges(previousState.connections, currentState.connections);
        const structuralChanges = this.detectStructuralChanges(previousState, currentState);
        
        if (!nodeChanges.hasChanges && !connectionChanges.hasChanges) {
            return { hasChanges: false };
        }
        
        let changeType = 'patch';
        let description = [];
        let details = {
            nodeChanges,
            connectionChanges,
            structuralChanges
        };
        
        // Determine change type and description
        if (structuralChanges.rootChanged) {
            changeType = 'major';
            description.push('Root node changed');
        } else if (structuralChanges.majorRestructure) {
            changeType = 'major';
            description.push('Major restructure detected');
        } else if (nodeChanges.added >= 4) {
            changeType = 'minor';
            description.push(`${nodeChanges.added} nodes added`);
        } else if (connectionChanges.newBranches > 0) {
            changeType = 'minor';
            description.push(`${connectionChanges.newBranches} new branches created`);
        } else if (structuralChanges.templateApplied) {
            changeType = 'minor';
            description.push('Template applied');
        }
        
        // Add specific change descriptions
        if (nodeChanges.added > 0) description.push(`${nodeChanges.added} nodes added`);
        if (nodeChanges.deleted > 0) description.push(`${nodeChanges.deleted} nodes deleted`);
        if (nodeChanges.modified > 0) description.push(`${nodeChanges.modified} nodes modified`);
        if (connectionChanges.added > 0) description.push(`${connectionChanges.added} connections added`);
        if (connectionChanges.deleted > 0) description.push(`${connectionChanges.deleted} connections deleted`);
        
        return {
            hasChanges: true,
            changeType,
            description: description.join(', '),
            details
        };
    },
    
    /**
     * Count node changes between states
     */
    countNodeChanges(previousNodes, currentNodes) {
        const prevIds = new Set(previousNodes.map(n => n.id));
        const currIds = new Set(currentNodes.map(n => n.id));
        
        const added = [...currIds].filter(id => !prevIds.has(id));
        const deleted = [...prevIds].filter(id => !currIds.has(id));
        
        // Find modified nodes
        const modified = [];
        for (const currentNode of currentNodes) {
            const prevNode = previousNodes.find(n => n.id === currentNode.id);
            if (prevNode && this.nodeHasChanged(prevNode, currentNode)) {
                modified.push(currentNode.id);
            }
        }
        
        return {
            hasChanges: added.length > 0 || deleted.length > 0 || modified.length > 0,
            added,
            deleted,
            modified,
            total: added.length + deleted.length + modified.length
        };
    },
    
    /**
     * Count connection changes between states
     */
    countConnectionChanges(previousConnections, currentConnections) {
        const prevIds = new Set(previousConnections.map(c => c.id));
        const currIds = new Set(currentConnections.map(c => c.id));
        
        const added = [...currIds].filter(id => !prevIds.has(id));
        const deleted = [...prevIds].filter(id => !currIds.has(id));
        
        // Find new Y-branches
        const newBranches = currentConnections.filter(c => 
            c.isYBranch && !previousConnections.find(pc => pc.id === c.id)
        );
        
        return {
            hasChanges: added.length > 0 || deleted.length > 0,
            added,
            deleted,
            newBranches,
            total: added.length + deleted.length
        };
    },
    
    /**
     * Detect structural changes
     */
    detectStructuralChanges(previousState, currentState) {
        const prevRootId = previousState.nodes.find(n => n.isRoot)?.id;
        const currRootId = currentState.nodes.find(n => n.isRoot)?.id;
        
        const rootChanged = prevRootId !== currRootId;
        
        // Detect major restructure (50%+ of nodes changed position significantly)
        let positionChanges = 0;
        for (const currentNode of currentState.nodes) {
            const prevNode = previousState.nodes.find(n => n.id === currentNode.id);
            if (prevNode) {
                const distance = Math.sqrt(
                    Math.pow(currentNode.x - prevNode.x, 2) + 
                    Math.pow(currentNode.y - prevNode.y, 2)
                );
                if (distance > 100) { // Significant position change
                    positionChanges++;
                }
            }
        }
        
        const majorRestructure = positionChanges > (currentState.nodes.length * 0.5);
        
        // Detect template application (multiple nodes added in organized pattern)
        const nodeChanges = this.countNodeChanges(previousState.nodes, currentState.nodes);
        const templateApplied = nodeChanges.added >= 3 && this.detectOrganizedPattern(currentState.nodes);
        
        return {
            rootChanged,
            majorRestructure,
            templateApplied,
            positionChanges
        };
    },
    
    /**
     * Check if a node has changed
     */
    nodeHasChanged(prevNode, currentNode) {
        return prevNode.title !== currentNode.title ||
               prevNode.content !== currentNode.content ||
               prevNode.color !== currentNode.color ||
               prevNode.shape !== currentNode.shape ||
               Math.abs(prevNode.x - currentNode.x) > 5 ||
               Math.abs(prevNode.y - currentNode.y) > 5;
    },
    
    /**
     * Detect organized pattern in node placement (template indication)
     */
    detectOrganizedPattern(nodes) {
        if (nodes.length < 3) return false;
        
        // Simple heuristic: check if nodes are arranged in roughly regular patterns
        const positions = nodes.map(n => ({ x: n.x, y: n.y }));
        
        // Check for grid-like arrangement
        const xPositions = [...new Set(positions.map(p => Math.round(p.x / 50) * 50))];
        const yPositions = [...new Set(positions.map(p => Math.round(p.y / 50) * 50))];
        
        return xPositions.length >= 2 && yPositions.length >= 2;
    },
    
    /**
     * Suggest next version number based on changes
     */
    suggestNextVersion(currentVersion, changeType = null) {
        const [major, minor, patch] = currentVersion.split('.').map(Number);
        
        if (!changeType && changesSinceLastSave.length > 0) {
            // Analyze accumulated changes
            const changeTypes = changesSinceLastSave.map(c => c.type);
            if (changeTypes.includes('major')) {
                changeType = 'major';
            } else if (changeTypes.includes('minor')) {
                changeType = 'minor';
            } else {
                changeType = 'patch';
            }
        }
        
        switch (changeType) {
            case 'major':
                return `${major + 1}.0.0`;
            case 'minor':
                return `${major}.${minor + 1}.0`;
            case 'patch':
            default:
                return `${major}.${minor}.${patch + 1}`;
        }
    },
    
    /**
     * Get change summary for display
     */
    getChangeSummary() {
        if (changesSinceLastSave.length === 0) {
            return 'No changes';
        }
        
        const descriptions = changesSinceLastSave.map(c => c.description);
        const uniqueDescriptions = [...new Set(descriptions)];
        
        if (uniqueDescriptions.length === 1) {
            return uniqueDescriptions[0];
        }
        
        return `${changesSinceLastSave.length} changes: ${uniqueDescriptions.slice(0, 2).join(', ')}${uniqueDescriptions.length > 2 ? '...' : ''}`;
    },
    
    /**
     * Update version indicator in UI
     */
    updateVersionIndicator() {
        const indicator = document.getElementById('version-indicator');
        if (!indicator) return;
        
        const changeSummary = this.getChangeSummary();
        
        if (unsavedChanges) {
            indicator.innerHTML = `v${currentVersion} • Unsaved changes`;
            indicator.className = 'version-indicator has-changes';
        } else {
            indicator.innerHTML = `v${currentVersion} • Opgeslagen`;
            indicator.className = 'version-indicator saved';
        }
        
        indicator.title = changeSummary;
    },
    
    /**
     * Auto-save draft to localStorage
     */
    autoSaveDraft() {
        if (!unsavedChanges) return;
        
        this.saveDraftToLocalStorage();
        
        // Show subtle auto-save indicator
        const indicator = document.getElementById('auto-save-indicator');
        if (indicator) {
            indicator.textContent = 'Auto-saved';
            indicator.classList.add('show');
            setTimeout(() => {
                indicator.classList.remove('show');
            }, 2000);
        }
    },
    
    /**
     * Save draft to localStorage
     */
    saveDraftToLocalStorage() {
        // Prevent recursive saves
        if (isSavingDraft) {
            console.warn('⚠️ Draft save already in progress, skipping...');
            return;
        }
        
        try {
            isSavingDraft = true;
            
            const draft = {
                projectName: currentProjectName,
                lastVersion: currentVersion,
                author: currentAuthor,
                timestamp: Date.now(),
                unsavedChanges: {
                    nodes: JSON.parse(JSON.stringify(nodes || [])),
                    connections: JSON.parse(JSON.stringify(connections || []))
                },
                changesSince: changesSinceLastSave,
                suggestedVersion: this.suggestNextVersion(currentVersion),
                suggestedChangeType: this.getSuggestedChangeType()
            };
            
            if (window.StorageUtils) {
                const success = window.StorageUtils.setItem('mindmap_current_draft', 
                    window.StorageUtils.stringifyJSON(draft));
                if (!success) {
                    console.warn('Draft saved to fallback storage only');
                }
            } else {
                // Fallback to direct localStorage
                try {
                    localStorage.setItem('mindmap_current_draft', JSON.stringify(draft));
                } catch (e) {
                    console.warn('Could not save draft to localStorage:', e);
                }
            }
        } finally {
            isSavingDraft = false;
        }
    },
    
    /**
     * Get suggested change type
     */
    getSuggestedChangeType() {
        if (changesSinceLastSave.length === 0) return 'patch';
        
        const changeTypes = changesSinceLastSave.map(c => c.type);
        if (changeTypes.includes('major')) return 'major';
        if (changeTypes.includes('minor')) return 'minor';
        return 'patch';
    },
    
    /**
     * Load project metadata from localStorage
     */
    loadProjectMetadata() {
        try {
            let projectsData = '[]';
            if (window.StorageUtils) {
                projectsData = window.StorageUtils.getItem('mindmap_projects') || '[]';
                
                const projects = window.StorageUtils.parseJSON(projectsData, []);
                const currentProject = projects.find(p => p.name === currentProjectName);
                
                if (currentProject) {
                    currentVersion = currentProject.lastVersion;
                    currentAuthor = currentProject.lastAuthor || currentAuthor;
                }
            } else {
                // NEVER access localStorage directly - use safe defaults
                console.warn('StorageUtils not available, using default project metadata');
                currentProjectName = 'Mindmap Project';
                currentVersion = '1.0.0';
            }
        } catch (e) {
            console.warn('Could not load project metadata:', e);
        }
    },
    
    /**
     * Update project metadata in localStorage
     */
    updateProjectMetadata(projectData) {
        try {
            if (window.StorageUtils) {
                const projectsData = window.StorageUtils.getItem('mindmap_projects') || '[]';
                const projects = window.StorageUtils.parseJSON(projectsData, []);
                
                const existingIndex = projects.findIndex(p => p.name === projectData.name);
                
                if (existingIndex >= 0) {
                    projects[existingIndex] = { ...projects[existingIndex], ...projectData };
                } else {
                    projects.push(projectData);
                }
                
                // Keep only last 20 projects
                if (projects.length > 20) {
                    projects.splice(0, projects.length - 20);
                }
                
                const projectsJson = window.StorageUtils.stringifyJSON(projects);
                window.StorageUtils.setItem('mindmap_projects', projectsJson);
            } else {
                // NEVER access localStorage directly - fail silently
                console.warn('StorageUtils not available, could not update project metadata');
            }
        } catch (e) {
            console.warn('Could not update project metadata:', e);
        }
    },
    
    /**
     * Check for draft recovery on page load
     */
    checkForDraftRecovery() {
        try {
            if (window.StorageUtils) {
                const draftData = window.StorageUtils.getItem('mindmap_current_draft') || 'null';
                const draft = window.StorageUtils.parseJSON(draftData, null);
                
                if (draft && draft.unsavedChanges && draft.timestamp > Date.now() - 24 * 60 * 60 * 1000) { // Within 24 hours
                    // Show custom recovery dialog instead of browser confirm
                    this.showRecoveryDialog(draft);
                    return true; // Indicate that recovery dialog was shown
                }
            } else {
                // NEVER access localStorage directly - no draft recovery without StorageUtils
                console.warn('StorageUtils not available, draft recovery disabled');
            }
        } catch (e) {
            console.warn('Could not check for draft recovery:', e);
        }
        
        return false;
    },
    
    /**
     * Show beautiful recovery dialog
     */
    showRecoveryDialog(draft) {
        const timeSince = Math.round((Date.now() - draft.timestamp) / 60000); // minutes
        let timeAgoText = '';
        
        if (timeSince < 1) {
            timeAgoText = 'zojuist';
        } else if (timeSince < 60) {
            timeAgoText = `${timeSince} ${timeSince === 1 ? 'minuut' : 'minuten'} geleden`;
        } else if (timeSince < 1440) {
            const hours = Math.floor(timeSince / 60);
            timeAgoText = `${hours} ${hours === 1 ? 'uur' : 'uur'} geleden`;
        } else {
            const days = Math.floor(timeSince / 1440);
            timeAgoText = `${days} ${days === 1 ? 'dag' : 'dagen'} geleden`;
        }
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'recovery-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease-in-out;
        `;
        
        // Count changes
        const nodeCount = draft.unsavedChanges.nodes ? draft.unsavedChanges.nodes.length : 0;
        const connectionCount = draft.unsavedChanges.connections ? draft.unsavedChanges.connections.length : 0;
        const changeCount = draft.changesSince ? draft.changesSince.length : 0;
        
        // Create dialog
        const dialog = document.createElement('div');
        dialog.className = 'recovery-dialog';
        dialog.style.cssText = `
            background: #1a1a1a;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            padding: 0;
            max-width: 450px;
            width: 90%;
            animation: slideUp 0.3s ease-out;
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.1);
        `;
        
        dialog.innerHTML = `
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 28px; color: white;">
                <h2 style="margin: 0 0 8px 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">
                    🔄 Vorige sessie gevonden
                </h2>
                <p style="margin: 0; opacity: 0.85; font-size: 15px;">
                    Er is onopgeslagen werk gevonden van ${timeAgoText}
                </p>
            </div>
            
            <div style="padding: 28px;">
                <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                    <h3 style="margin: 0 0 16px 0; color: #fff; font-size: 18px; font-weight: 600;">
                        📊 ${draft.projectName || 'Naamloos Project'}
                    </h3>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; text-align: center;">
                        <div style="background: rgba(255, 255, 255, 0.08); padding: 16px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1);">
                            <div style="font-size: 28px; font-weight: bold; color: #667eea;">${nodeCount}</div>
                            <div style="font-size: 13px; color: rgba(255, 255, 255, 0.6); margin-top: 4px;">Knooppunten</div>
                        </div>
                        <div style="background: rgba(255, 255, 255, 0.08); padding: 16px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1);">
                            <div style="font-size: 28px; font-weight: bold; color: #764ba2;">${connectionCount}</div>
                            <div style="font-size: 13px; color: rgba(255, 255, 255, 0.6); margin-top: 4px;">Verbindingen</div>
                        </div>
                        <div style="background: rgba(255, 255, 255, 0.08); padding: 16px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1);">
                            <div style="font-size: 28px; font-weight: bold; color: #f093fb;">${changeCount}</div>
                            <div style="font-size: 13px; color: rgba(255, 255, 255, 0.6); margin-top: 4px;">Wijzigingen</div>
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 12px;">
                    <button id="recover-session" style="
                        flex: 1;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border: none;
                        padding: 14px 24px;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: transform 0.2s, box-shadow 0.2s;
                        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(102, 126, 234, 0.4)';" 
                       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.3)';">
                        ✨ Herstel sessie
                    </button>
                    <button id="start-fresh" style="
                        flex: 1;
                        background: #f8f9fa;
                        color: #333;
                        border: 2px solid #e9ecef;
                        padding: 14px 24px;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                    " onmouseover="this.style.background='#e9ecef';" 
                       onmouseout="this.style.background='#f8f9fa';">
                        🆕 Begin opnieuw
                    </button>
                </div>
                
                <p style="text-align: center; color: #666; font-size: 12px; margin-top: 16px; margin-bottom: 0;">
                    💡 Tip: Je kunt altijd later een opgeslagen bestand laden
                </p>
            </div>
        `;
        
        // Add CSS animation keyframes
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // Event handlers
        document.getElementById('recover-session').addEventListener('click', () => {
            overlay.remove();
            style.remove();
            this.recoverFromDraft(draft);
            showToast('✅ Vorige sessie hersteld');
        });
        
        document.getElementById('start-fresh').addEventListener('click', () => {
            overlay.remove();
            style.remove();
            // Clear the draft
            if (window.StorageUtils) {
                window.StorageUtils.removeItem('mindmap_current_draft');
            }
            // Initialize fresh mindmap
            if (typeof initMindmap === 'function') {
                initMindmap();
            }
            showToast('🆕 Nieuwe mindmap gestart');
        });
        
        // Close on overlay click (outside dialog)
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
                style.remove();
                if (typeof initMindmap === 'function') {
                    initMindmap();
                }
            }
        });
    },
    
    /**
     * Recover from draft
     */
    recoverFromDraft(draft) {
        // Clear current mindmap
        clearMindmap();
        
        // Restore project info
        currentProjectName = draft.projectName;
        currentVersion = draft.lastVersion;
        currentAuthor = draft.author;
        
        // Restore nodes and connections
        nodes = draft.unsavedChanges.nodes;
        connections = draft.unsavedChanges.connections;
        changesSinceLastSave = draft.changesSince;
        unsavedChanges = true;
        
        // Recreate UI elements
        nodes.forEach(node => {
            createNodeElement(node);
        });
        
        refreshConnections();
        updateMinimap();
        this.updateVersionIndicator();
        
        showToast('Vorige sessie hersteld');
    },
    
    /**
     * Set current author
     */
    setAuthor(authorName) {
        currentAuthor = authorName;
        
        if (window.StorageUtils) {
            window.StorageUtils.setItem('mindmap_author', authorName);
            this.saveDraftToLocalStorage();
        } else {
            // NEVER access localStorage directly - fail gracefully
            console.warn('StorageUtils not available, could not save author');
        }
    },
    
    /**
     * Get change statistics
     */
    getChangeStatistics() {
        if (!lastSavedState) return {
            nodesAdded: 0,
            nodesModified: 0,
            nodesRemoved: 0,
            connectionsAdded: 0,
            connectionsRemoved: 0
        };
        
        const currentState = {
            nodes: nodes,
            connections: connections
        };
        
        const nodeChanges = this.countNodeChanges(lastSavedState.nodes, currentState.nodes);
        const connectionChanges = this.countConnectionChanges(lastSavedState.connections, currentState.connections);
        
        return {
            nodesAdded: nodeChanges.added ? nodeChanges.added.length : 0,
            nodesModified: nodeChanges.modified ? nodeChanges.modified.length : 0,
            nodesRemoved: nodeChanges.deleted ? nodeChanges.deleted.length : 0,
            connectionsAdded: connectionChanges.added ? connectionChanges.added.length : 0,
            connectionsRemoved: connectionChanges.deleted ? connectionChanges.deleted.length : 0
        };
    },
    
    /**
     * Set project name and version
     */
    setProject(name, version = '1.0.0') {
        currentProjectName = name;
        currentVersion = version;
        this.updateVersionIndicator();
        this.saveDraftToLocalStorage();
    },
    
    /**
     * Get current project info
     */
    getCurrentProject() {
        const mindmapTitle = getMindmapTitle ? getMindmapTitle() : currentProjectName;
        return {
            name: mindmapTitle,
            version: currentVersion,
            author: currentAuthor,
            hasUnsavedChanges: unsavedChanges,
            suggestedVersion: this.suggestNextVersion(currentVersion),
            changeSummary: this.getChangeSummary(),
            changeDetails: changesSinceLastSave
        };
    },
    
    /**
     * Update last modified indicator with project info
     */
    updateLastModifiedIndicator(projectData) {
        const indicator = document.getElementById('last-modified-indicator');
        if (!indicator || !projectData) return;
        
        if (projectData.lastModifiedBy && projectData.lastModified) {
            const modifiedDate = new Date(projectData.lastModified);
            const timeAgo = this.getTimeAgo(modifiedDate);
            
            indicator.innerHTML = `Last modified by ${projectData.lastModifiedBy} • ${timeAgo}`;
            indicator.style.display = 'block';
            indicator.className = 'last-modified-indicator visible';
        } else {
            indicator.style.display = 'none';
        }
    },
    
    /**
     * Get time ago helper
     */
    getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMinutes = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMinutes < 1) return 'just now';
        if (diffMinutes < 60) return `${diffMinutes} min ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        
        return date.toLocaleDateString('nl-NL');
    }
};

// Dependency-aware, fail-safe initialization function
function initializeVersionControl() {
    let attempts = 0;
    const maxAttempts = 30; // Maximum 3 seconds of retries
    
    function tryInitialize() {
        attempts++;
        
        try {
            // Check if ALL critical dependencies are ready
            const dependenciesReady = 
                // DOM is ready
                document.getElementById && 
                document.getElementById('version-indicator') &&
                // StorageUtils is available and functional
                window.StorageUtils &&
                typeof window.StorageUtils.getItem === 'function' &&
                typeof window.StorageUtils.setItem === 'function' &&
                // Core mindmap globals exist (even if empty)
                (typeof window.nodes !== 'undefined' || typeof nodes !== 'undefined') &&
                (typeof window.connections !== 'undefined' || typeof connections !== 'undefined');
            
            if (dependenciesReady) {
                console.log('📋 All dependencies ready, initializing version control...');
                VersionControl.initialize();
                console.log('✅ Version control initialized successfully');
                return; // Success!
            } else {
                // Log what's missing for debugging
                const missing = [];
                if (!document.getElementById || !document.getElementById('version-indicator')) missing.push('DOM');
                if (!window.StorageUtils) missing.push('StorageUtils');
                if (typeof window.nodes === 'undefined' && typeof nodes === 'undefined') missing.push('nodes');
                if (typeof window.connections === 'undefined' && typeof connections === 'undefined') missing.push('connections');
                
                console.log(`Version control waiting for: ${missing.join(', ')} (attempt ${attempts})`);
            }
        } catch (e) {
            console.warn(`Version control initialization failed (attempt ${attempts}):`, e);
        }
        
        // If we reach here, initialization failed or dependencies not ready
        if (attempts < maxAttempts) {
            setTimeout(tryInitialize, 100);
        } else {
            console.warn('⚠️ Version control initialization gave up after maximum attempts');
            console.warn('App will continue without version control features');
            
            // Ensure the app doesn't crash - create minimal version indicator
            try {
                const indicator = document.getElementById('version-indicator');
                if (indicator) {
                    indicator.innerHTML = 'v1.0.0 • Basic mode';
                    indicator.className = 'version-indicator basic-mode';
                    indicator.title = 'Version control unavailable - some dependencies missing';
                }
            } catch (e) {
                console.warn('Could not create basic version indicator:', e);
            }
        }
    }
    
    // Start the dependency-aware initialization attempt
    tryInitialize();
}

// Version control initialization is now handled by app.js in a coordinated sequence
// This prevents race conditions and circular dependencies
// DO NOT call initialization automatically - app.js will handle it

// Export for global access
window.VersionControl = VersionControl;