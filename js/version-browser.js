/**
 * version-browser.js - In-app version browser functionality
 */

// Version browser state
let selectedVersionIndex = null;
let currentProjectData = null;

// Version Browser functionality
const VersionBrowser = {
    
    /**
     * Show the version browser modal
     */
    show() {
        const modal = document.getElementById('version-browser-modal');
        if (!modal) {
            console.error('Version browser modal not found');
            return;
        }
        
        modal.style.display = 'flex';
        this.loadProjectData();
        this.setupEventListeners();
    },
    
    /**
     * Hide the version browser modal
     */
    hide() {
        const modal = document.getElementById('version-browser-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        selectedVersionIndex = null;
    },
    
    /**
     * Load project data from localStorage with fallbacks
     */
    loadProjectData() {
        try {
            const storedData = this.safeLocalStorageGet('mindmap_current_project_data');
            if (storedData) {
                if (window.StorageUtils) {
                    currentProjectData = window.StorageUtils.parseJSON(storedData, null);
                } else {
                    currentProjectData = JSON.parse(storedData);
                }
                
                if (currentProjectData) {
                    this.displayProjectInfo();
                    this.displayVersionList();
                } else {
                    this.displayNoVersionHistory('Current Project');
                }
            } else {
                // Try to get current project info from VersionControl
                if (window.VersionControl) {
                    const currentProject = window.VersionControl.getCurrentProject();
                    this.displayNoVersionHistory(currentProject.name);
                } else {
                    this.displayNoVersionHistory('Current Project');
                }
            }
        } catch (e) {
            console.warn('Could not load project data:', e);
            this.displayNoVersionHistory('Current Project');
        }
    },
    
    /**
     * Safe localStorage getter with error handling
     */
    safeLocalStorageGet(key) {
        if (window.StorageUtils) {
            return window.StorageUtils.getItem(key);
        }
        
        // Fallback to direct localStorage
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.warn(`Could not access localStorage key ${key}:`, e);
            return null;
        }
    },
    
    /**
     * Safe localStorage setter with error handling
     */
    safeLocalStorageSet(key, value) {
        if (window.StorageUtils) {
            return window.StorageUtils.setItem(key, value);
        }
        
        // Fallback to direct localStorage
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            console.warn(`Could not save to localStorage key ${key}:`, e);
            return false;
        }
    },
    
    /**
     * Display project information
     */
    displayProjectInfo() {
        const projectNameEl = document.getElementById('current-project-name');
        const projectStatsEl = document.getElementById('project-stats');
        
        if (!currentProjectData) {
            if (projectNameEl) projectNameEl.textContent = 'Geen Project Geladen';
            if (projectStatsEl) projectStatsEl.textContent = 'Geen versiegeschiedenis beschikbaar';
            return;
        }
        
        if (projectNameEl) {
            projectNameEl.textContent = currentProjectData.projectName || 'Naamloos Project';
        }
        
        if (projectStatsEl) {
            const versionCount = currentProjectData.versions ? currentProjectData.versions.length : 0;
            const lastModified = currentProjectData.lastModified ? 
                new Date(currentProjectData.lastModified).toLocaleDateString('nl-NL') : 'Onbekend';
            const lastAuthor = currentProjectData.lastModifiedBy || 'Onbekend';
            
            projectStatsEl.innerHTML = `
                ${versionCount} version${versionCount !== 1 ? 's' : ''} • 
                Laatst gewijzigd: ${lastModified} door ${lastAuthor}
            `;
        }
    },
    
    /**
     * Display version list
     */
    displayVersionList() {
        const versionListEl = document.getElementById('version-list');
        if (!versionListEl) return;
        
        if (!currentProjectData || !currentProjectData.versions || currentProjectData.versions.length === 0) {
            versionListEl.innerHTML = `
                <div class="no-versions-message">
                    <p>Geen versiegeschiedenis gevonden.</p>
                    <p>Sla je mindmap op om versiegeschiedenis te maken.</p>
                </div>
            `;
            return;
        }
        
        const versions = [...currentProjectData.versions].reverse(); // Latest first
        let versionListHTML = '';
        
        versions.forEach((version, index) => {
            const realIndex = currentProjectData.versions.length - 1 - index;
            const isLatest = index === 0;
            const isCurrent = version.version === currentProjectData.currentVersion;
            const date = new Date(version.timestamp).toLocaleDateString('nl-NL');
            const time = new Date(version.timestamp).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
            
            versionListHTML += `
                <div class="version-item ${isCurrent ? 'current' : ''}" data-version-index="${realIndex}">
                    <div class="version-header">
                        <span class="version-number">
                            ${isCurrent ? '★ ' : ''}v${version.version}${isLatest ? ' (Nieuwste)' : ''}
                            ${isCurrent ? ' <span style="color: #4CAF50; font-size: 12px;">(Momenteel Geladen)</span>' : ''}
                        </span>
                        <span class="version-date">${date} ${time}</span>
                    </div>
                    <div class="version-author">Door ${version.author}</div>
                    <div class="version-summary">${version.summary || 'Geen beschrijving'}</div>
                </div>
            `;
        });
        
        versionListEl.innerHTML = versionListHTML;
        this.attachVersionClickHandlers();
    },
    
    /**
     * Display message when no version history is available
     */
    displayNoVersionHistory(projectName) {
        const projectNameEl = document.getElementById('current-project-name');
        const projectStatsEl = document.getElementById('project-stats');
        const versionListEl = document.getElementById('version-list');
        
        if (projectNameEl) projectNameEl.textContent = projectName;
        if (projectStatsEl) projectStatsEl.textContent = 'Geen versiegeschiedenis beschikbaar';
        if (versionListEl) {
            versionListEl.innerHTML = `
                <div class="no-versions-message">
                    <p>Geen versiegeschiedenis gevonden.</p>
                    <p>Sla je mindmap op om versiegeschiedenis te maken.</p>
                </div>
            `;
        }
    },
    
    /**
     * Attach click and hover handlers to version items
     */
    attachVersionClickHandlers() {
        const versionItems = document.querySelectorAll('.version-item');
        versionItems.forEach(item => {
            // Click handler
            item.addEventListener('click', (e) => {
                const versionIndex = parseInt(e.currentTarget.dataset.versionIndex);
                this.selectVersion(versionIndex);
            });
            
            // Mouse hover handlers for visual feedback
            item.addEventListener('mouseenter', (e) => {
                // Don't override current version highlighting
                if (!e.currentTarget.classList.contains('current')) {
                    e.currentTarget.classList.add('browser-selected');
                }
            });
            
            item.addEventListener('mouseleave', (e) => {
                // Only remove browser-selected if it's not the actually selected version
                const versionIndex = parseInt(e.currentTarget.dataset.versionIndex);
                if (selectedVersionIndex !== versionIndex) {
                    e.currentTarget.classList.remove('browser-selected');
                }
            });
        });
    },
    
    /**
     * Select a version and show preview
     */
    selectVersion(versionIndex) {
        if (!currentProjectData || !currentProjectData.versions[versionIndex]) return;
        
        selectedVersionIndex = versionIndex;
        
        // Update UI selection - clear previous selections
        document.querySelectorAll('.version-item').forEach(item => {
            item.classList.remove('browser-selected');
        });
        
        // Add browser-selected class to clicked version
        const selectedItem = document.querySelector(`[data-version-index="${versionIndex}"]`);
        if (selectedItem) {
            selectedItem.classList.add('browser-selected');
        }
        
        // Show version preview
        this.displayVersionPreview(currentProjectData.versions[versionIndex]);
        
        // Enable load button
        const loadBtn = document.getElementById('load-selected-version');
        if (loadBtn) {
            loadBtn.disabled = false;
        }
    },
    
    /**
     * Display version preview details
     */
    displayVersionPreview(version) {
        const previewContent = document.querySelector('#version-preview .preview-content');
        if (!previewContent) return;
        
        const date = new Date(version.timestamp);
        const nodeCount = version.data ? version.data.nodes.length : (version.nodeCount || 0);
        const connectionCount = version.data ? version.data.connections.length : (version.connectionCount || 0);
        const isCompressed = version.compressed;
        
        previewContent.innerHTML = `
            <div class="preview-detail">
                <strong>Versie:</strong>
                v${version.version}
            </div>
            
            <div class="preview-detail">
                <strong>Auteur:</strong>
                ${version.author}
            </div>
            
            <div class="preview-detail">
                <strong>Datum:</strong>
                ${date.toLocaleDateString('nl-NL')} ${date.toLocaleTimeString('nl-NL')}
            </div>
            
            <div class="preview-detail">
                <strong>Samenvatting:</strong>
                ${version.summary || 'Geen beschrijving beschikbaar'}
            </div>
            
            <div class="preview-detail">
                <strong>Inhoud:</strong>
                <div class="preview-changes">
                    <div class="change-badge added">${nodeCount} knooppunten</div>
                    <div class="change-badge modified">${connectionCount} verbindingen</div>
                    ${isCompressed ? '<div class="change-badge removed">Gecomprimeerd</div>' : ''}
                </div>
                ${isCompressed ? '<p style="color: #888; font-size: 12px; margin-top: 10px;">Deze versie is gecomprimeerd om ruimte te besparen. Alleen basisinformatie is beschikbaar.</p>' : ''}
            </div>
            
            ${version.parentVersion ? `
                <div class="preview-detail">
                    <strong>Hoofdversie:</strong>
                    v${version.parentVersion}
                </div>
            ` : ''}
        `;
    },
    
    /**
     * Load the selected version
     */
    loadSelectedVersion() {
        if (selectedVersionIndex === null || !currentProjectData) {
            showToast('Geen versie geselecteerd', true);
            return;
        }
        
        const version = currentProjectData.versions[selectedVersionIndex];
        if (!version) {
            showToast('Geselecteerde versie niet gevonden', true);
            return;
        }
        
        if (version.compressed || !version.data) {
            showToast('Deze versie is gecomprimeerd en kan niet worden geladen', true);
            return;
        }
        
        // Check if user has unsaved changes
        if (window.VersionControl) {
            const currentProject = window.VersionControl.getCurrentProject();
            if (currentProject.hasUnsavedChanges) {
                if (!confirm('Je hebt niet-opgeslagen wijzigingen die verloren gaan. Doorgaan?')) {
                    return;
                }
            }
        }
        
        try {
            // Use existing loadVersionFromProject function from export.js
            if (typeof loadVersionFromProject === 'function') {
                loadVersionFromProject(currentProjectData, selectedVersionIndex);
            } else {
                // Fallback implementation
                this.loadVersionData(version, currentProjectData);
            }
            
            this.hide();
            showToast(`Versie ${version.version} geladen door ${version.author}`);
        } catch (e) {
            console.error('Error loading version:', e);
            showToast('Fout bij laden van versie', true);
        }
    },
    
    /**
     * Fallback function to load version data
     */
    loadVersionData(version, projectData) {
        // Clear current mindmap
        if (typeof clearMindmap === 'function') {
            clearMindmap(false); // Don't clear version history when loading project
        }
        
        // Load the version data
        if (typeof loadMindmapData === 'function') {
            loadMindmapData(version.data);
        }
        
        // Update version control
        if (window.VersionControl) {
            window.VersionControl.setProject(projectData.projectName, version.version);
            window.VersionControl.setAuthor(version.author);
            window.VersionControl.saveCurrentStateSnapshot();
            window.VersionControl.updateLastModifiedIndicator(projectData);
        }
        
        // Update the project data's currentVersion to reflect the loaded version
        projectData.currentVersion = version.version;
        
        // Refresh the version list to update highlighting
        this.displayVersionHistory(projectData);
    },
    
    /**
     * Refresh the version list
     */
    refresh() {
        this.loadProjectData();
        selectedVersionIndex = null;
        
        // Clear preview
        const previewContent = document.querySelector('#version-preview .preview-content');
        if (previewContent) {
            previewContent.innerHTML = '<p>Selecteer een versie om details te zien</p>';
        }
        
        // Disable load button
        const loadBtn = document.getElementById('load-selected-version');
        if (loadBtn) {
            loadBtn.disabled = true;
        }
        
        showToast('Versielijst vernieuwd');
    },
    
    /**
     * Set up event listeners for the modal
     */
    setupEventListeners() {
        const modal = document.getElementById('version-browser-modal');
        if (!modal) return;
        
        // Close modal handlers
        const closeBtn = modal.querySelector('.close-modal');
        const closeBrowserBtn = modal.querySelector('#close-version-browser');
        
        if (closeBtn) {
            closeBtn.onclick = () => this.hide();
        }
        
        if (closeBrowserBtn) {
            closeBrowserBtn.onclick = () => this.hide();
        }
        
        // Refresh button
        const refreshBtn = modal.querySelector('#refresh-versions');
        if (refreshBtn) {
            refreshBtn.onclick = () => this.refresh();
        }
        
        // Load selected version button
        const loadBtn = modal.querySelector('#load-selected-version');
        if (loadBtn) {
            loadBtn.onclick = () => this.loadSelectedVersion();
        }
        
        // Close on outside click
        modal.onclick = (e) => {
            if (e.target === modal) {
                this.hide();
            }
        };
    }
};

// Export to global scope
window.VersionBrowser = VersionBrowser;