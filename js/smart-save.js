/**
 * smart-save.js - Smart save dialog with version control
 */

// Smart save dialog functionality
function showSmartSaveDialog() {
    // Get current title from mindmap
    const currentTitle = getMindmapTitle ? getMindmapTitle() : 'Mindmap Project';
    
    // Get current project info
    const projectInfo = window.VersionControl ? window.VersionControl.getCurrentProject() : {
        name: currentTitle,
        version: '1.0.0',
        author: 'Anonymous',
        suggestedVersion: '1.0.1',
        changeSummary: 'No changes detected'
    };
    
    // Override name with current title
    projectInfo.name = currentTitle;
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal smart-save-modal';
    modal.style.display = 'flex';
    
    // Get saved author name (fail-safe)
    let savedAuthor = '';
    try {
        if (window.StorageUtils) {
            savedAuthor = window.StorageUtils.getItem('mindmap_author') || '';
        } else {
            savedAuthor = localStorage.getItem('mindmap_author') || '';
        }
    } catch (e) {
        console.warn('Could not load saved author name:', e);
        savedAuthor = '';
    }
    
    // Detect change type
    const changeType = window.VersionControl ? window.VersionControl.getSuggestedChangeType() : 'patch';
    
    // Get change statistics
    const changeStats = window.VersionControl ? window.VersionControl.getChangeStatistics() : {
        nodesAdded: 0,
        nodesModified: 0,
        nodesRemoved: 0,
        connectionsAdded: 0,
        connectionsRemoved: 0
    };
    
    const hasChanges = changeStats.nodesAdded + changeStats.nodesModified + changeStats.nodesRemoved + 
                      changeStats.connectionsAdded + changeStats.connectionsRemoved > 0;
    
    modal.innerHTML = `
        <div class="modal-content smart-save-content simplified">
            <div class="modal-header">
                <div class="modal-title">
                    💾 "${currentTitle}" Opslaan
                </div>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="version-section">
                    <div class="version-info compact">
                        <span class="current">v${projectInfo.version}</span>
                        <span class="arrow">→</span>
                        <span class="suggested" id="suggested-version-display">v${projectInfo.suggestedVersion}</span>
                    </div>
                    ${hasChanges ? `
                    <div class="change-summary-inline">
                        ${changeStats.nodesAdded > 0 ? `<span class="stat added">+${changeStats.nodesAdded} nodes</span>` : ''}
                        ${changeStats.nodesModified > 0 ? `<span class="stat modified">~${changeStats.nodesModified} wijzigingen</span>` : ''}
                        ${changeStats.nodesRemoved > 0 ? `<span class="stat removed">-${changeStats.nodesRemoved} verwijderd</span>` : ''}
                        ${changeStats.connectionsAdded > 0 ? `<span class="stat added">+${changeStats.connectionsAdded} verbindingen</span>` : ''}
                    </div>
                    ` : '<div class="no-changes-message">Geen wijzigingen gedetecteerd</div>'}
                </div>
                
                <div class="form-section">
                    <div class="form-group compact">
                        <label for="author-name">👤 Auteur:</label>
                        <input type="text" id="author-name" value="${savedAuthor}" placeholder="Uw naam" required>
                    </div>
                    
                    <div class="form-group compact">
                        <label for="change-summary">Wijzigingen:</label>
                        <input type="text" id="change-summary" placeholder="Korte beschrijving (optioneel)" value="${projectInfo.changeSummary === 'No changes detected' ? '' : projectInfo.changeSummary}">
                    </div>
                </div>
                
                <div class="filename-section">
                    <label>Bestandsnaam:</label>
                    <div class="filename-preview" id="filename-preview">
                        ${getSmartFilename(currentTitle, projectInfo.suggestedVersion, savedAuthor, '')}
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn" id="cancel-save">Annuleren</button>
                <button class="btn btn-save primary" id="save-version">💾 Opslaan</button>
            </div>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(modal);
    
    // Set up event listeners
    setupSmartSaveEventListeners(modal, projectInfo);
}

// Set up event listeners for smart save dialog
function setupSmartSaveEventListeners(modal, projectInfo) {
    const authorNameInput = modal.querySelector('#author-name');
    const changeSummaryInput = modal.querySelector('#change-summary');
    const filenamePreview = modal.querySelector('#filename-preview');
    const currentTitle = getMindmapTitle ? getMindmapTitle() : 'Mindmap Project';
    
    // Close modal
    modal.querySelector('.close-modal').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.querySelector('#cancel-save').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    // Update preview when inputs change
    [authorNameInput, changeSummaryInput].forEach(input => {
        if (input) {
            input.addEventListener('input', updateFilenamePreview);
        }
    });
    
    function updateFilenamePreview() {
        const author = authorNameInput.value || 'Anonymous';
        const summary = changeSummaryInput.value || '';
        
        // Auto-suggest next version without user complexity
        const version = window.VersionControl ? 
            window.VersionControl.suggestNextVersion(projectInfo.version) :
            '1.0.0';
        
        const filename = getSmartFilename(currentTitle, version, author, summary);
        filenamePreview.textContent = filename;
    }
    
    // Quick save button removed - only one save button now
    
    // Save with version control
    modal.querySelector('#save-version').addEventListener('click', () => {
        const author = authorNameInput.value.trim();
        const summary = changeSummaryInput.value.trim();
        
        if (!author) {
            showToast('Auteur naam is verplicht', true);
            authorNameInput.focus();
            return;
        }
        
        // Auto-suggest next version without user complexity
        const version = window.VersionControl ? 
            window.VersionControl.suggestNextVersion(projectInfo.version) :
            '1.0.0';
        
        // Save author for future use (fail-safe)
        try {
            if (window.StorageUtils) {
                window.StorageUtils.setItem('mindmap_author', author);
            } else {
                localStorage.setItem('mindmap_author', author);
            }
        } catch (e) {
            console.warn('Could not save author name:', e);
            // Don't block the save operation if this fails
        }
        
        // Update version control
        if (window.VersionControl) {
            window.VersionControl.setProject(currentTitle, version);
            window.VersionControl.setAuthor(author);
        }
        
        // Create version info
        const versionInfo = {
            version: version,
            author: author,
            summary: summary || 'Geen beschrijving',
            parentVersion: projectInfo.version
        };
        
        // Export with version control
        const projectData = safeExportWithVersionControl(versionInfo);
        const filename = getSmartFilename(currentTitle, version, author, summary);
        
        // Save file
        safeSaveWithFilePicker(projectData, filename);
        
        // Update last modified indicator
        if (window.VersionControl) {
            window.VersionControl.updateLastModifiedIndicator(projectData);
        }
        
        document.body.removeChild(modal);
    });
}

// Get changes HTML for display
function getChangesHTML(projectInfo) {
    if (!projectInfo.changeDetails || projectInfo.changeDetails.length === 0) {
        return '<div class="no-changes">Geen wijzigingen gedetecteerd</div>';
    }
    
    let html = '<ul class="changes-list">';
    projectInfo.changeDetails.forEach(change => {
        const timeAgo = getTimeAgo(new Date(change.timestamp));
        html += `<li class="change-item change-${change.type}">
            <span class="change-type">${change.type}</span>
            <span class="change-description">${change.description}</span>
            <span class="change-time">${timeAgo}</span>
        </li>`;
    });
    html += '</ul>';
    
    return html;
}

// Quick save function (replaces direct exportToJson calls)
function quickSave() {
    if (window.VersionControl && window.VersionControl.getCurrentProject().hasUnsavedChanges) {
        // Show smart save dialog if there are unsaved changes
        showSmartSaveDialog();
    } else {
        // Direct export for quick save
        exportToJson();
    }
}

// Helper function to get smart filename (with fallback)
function getSmartFilename(projectName, version, author, summary) {
    if (typeof generateSmartFilename === 'function') {
        return generateSmartFilename(projectName, version, author, summary);
    }
    
    // Fallback implementation
    const cleanProjectName = (projectName || 'Mindmap_Project').replace(/[^a-zA-Z0-9]/g, '_');
    const cleanAuthor = (author || 'Anonymous').replace(/[^a-zA-Z0-9]/g, '_');
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    return `${cleanProjectName}_v${version || '1.0.0'}_${cleanAuthor}_${date}.mindmap2`;
}

// Helper function to get time ago (with fallback)
function getTimeAgo(date) {
    if (typeof window.getTimeAgo === 'function') {
        return window.getTimeAgo(date);
    }
    
    // Fallback implementation
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMinutes < 1) return 'Net nu';
    if (diffMinutes < 60) return `${diffMinutes} min geleden`;
    if (diffHours < 24) return `${diffHours} uur geleden`;
    if (diffDays < 7) return `${diffDays} dag${diffDays > 1 ? 'en' : ''} geleden`;
    
    return date.toLocaleDateString('nl-NL');
}

// Safe function calls with fallbacks
function safeExportWithVersionControl(versionInfo) {
    if (typeof exportWithVersionControl === 'function') {
        return exportWithVersionControl(versionInfo);
    }
    
    console.warn('exportWithVersionControl not available, using basic export');
    return {
        formatVersion: '2.0',
        projectName: versionInfo.project || 'Mindmap Project',
        currentVersion: versionInfo.version || '1.0.0',
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        versions: [{
            version: versionInfo.version || '1.0.0',
            author: versionInfo.author || 'Anonymous',
            timestamp: new Date().toISOString(),
            summary: versionInfo.summary || 'Initial version',
            data: {
                nodes: nodes,
                connections: connections,
                nextNodeId: nextNodeId,
                rootNodeId: rootNodeId
            }
        }]
    };
}

function safeSaveWithFilePicker(projectData, filename) {
    if (typeof saveWithFilePicker === 'function') {
        return saveWithFilePicker(projectData, filename);
    }
    
    console.warn('saveWithFilePicker not available, using traditional download');
    const dataStr = JSON.stringify(projectData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast(`Project opgeslagen als ${filename}`);
}

// Legacy support - ensure exportToJson is available
if (typeof exportToJson === 'undefined') {
    window.exportToJson = function() {
        console.warn('exportToJson called but not defined. Using legacy export.');
        const data = {
            nodes: nodes,
            connections: connections,
            nextNodeId: nextNodeId,
            rootNodeId: rootNodeId
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mindmap.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('Mindmap opgeslagen');
    };
}