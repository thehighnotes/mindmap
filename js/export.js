/**
 * export.js - Bevat functies voor exporteren en importeren
 */

// Exporteer naar Mermaid syntax
function exportToMermaid() {
    // Als er geen knooppunten zijn, toon een waarschuwing
    if (nodes.length === 0) {
        showToast('Geen knooppunten om te exporteren', true);
        return;
    }
    
    // Begin met flowchart syntax (in plaats van mindmap)
    let mermaidCode = 'flowchart TD\n';
    
    // Wijs alfabetische ID's toe aan knooppunten
    const nodeMap = {};
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    // Functie voor het genereren van ID's (A, B, C, ... AA, AB, ...)
    function generateId(index) {
        if (index < 26) {
            return alphabet[index];
        } else {
            return generateId(Math.floor(index / 26) - 1) + alphabet[index % 26];
        }
    }
    
    // Wijs ID's toe aan alle knooppunten
    nodes.forEach((node, index) => {
        const id = generateId(index);
        nodeMap[node.id] = {
            mermaidId: id,
            node: node
        };
    });
    
    // Genereer knooppunten
    Object.values(nodeMap).forEach(item => {
        const { mermaidId, node } = item;
        // Escape speciale tekens in de titel
        const safeTitle = node.title.replace(/[()[\]{}]/g, "\\$&");
        
        // Voeg de node toe
        let shapeStart = '';
        let shapeEnd = '';
        
        // Kies vorm op basis van node.shape
        switch(node.shape) {
            case 'rounded':
                shapeStart = '(';
                shapeEnd = ')';
                break;
            case 'circle':
                shapeStart = '((';
                shapeEnd = '))';
                break;
            case 'diamond':
                shapeStart = '{';
                shapeEnd = '}';
                break;
            default: // rectangle
                shapeStart = '[';
                shapeEnd = ']';
                break;
        }
        
        // Genereer node definitie
        mermaidCode += `    ${mermaidId}${shapeStart}${safeTitle}${shapeEnd}\n`;
        
        // Voeg kleurstijl toe indien anders dan standaard
        if (node.color && node.color !== '#4CAF50') {
            // Verwerk kleur naar Mermaid-formaat
            const colorStyle = node.color.toLowerCase();
            mermaidCode += `    style ${mermaidId} fill:#${colorStyle.replace('#', '')}\n`;
        }
    });
    
    // Voeg lege regel toe voor betere leesbaarheid
    mermaidCode += '\n';
    
    // Genereer verbindingen
    connections.forEach(conn => {
        const sourceId = nodeMap[conn.source]?.mermaidId;
        const targetId = nodeMap[conn.target]?.mermaidId;
        
        if (sourceId && targetId) {
            // Bepaal lijnstijl
            let lineStyle = '-->';
            if (conn.styleClass && conn.styleClass.includes('dashed')) {
                lineStyle = '-.->';
            }
            
            // Voeg eventueel een label toe
            let label = '';
            if (conn.label) {
                label = `|${conn.label}|`;
            }
            
            // Bepaal lijnkleur op basis van type
            let lineColor = '';
            if (conn.styleClass && conn.styleClass.includes('primary')) {
                lineColor = ',#4CAF50'; // Groen
            } else if (conn.styleClass && conn.styleClass.includes('secondary')) {
                lineColor = ',#FFC107'; // Geel/amber
            }
            
            // Maak de verbinding
            mermaidCode += `    ${sourceId} ${lineStyle}${label} ${targetId}${lineColor}\n`;
        }
    });
    
    // Stel de code in in het exportveld
    exportContent.value = mermaidCode;
    
    // Toon export modal
    exportModal.style.display = 'flex';
}

// Importeer van Mermaid syntax
function importFromMermaid() {
    // Haal de code op
    const mermaidCode = importContent.value.trim();
    
    if (!mermaidCode) {
        showToast('Geen Mermaid code ingevoerd', true);
        return;
    }
    
    // Controleer of het een flowchart of mindmap is
    if (!mermaidCode.startsWith('flowchart') && !mermaidCode.startsWith('graph') && !mermaidCode.startsWith('mindmap')) {
        showToast('Geen geldige Mermaid flowchart of mindmap code', true);
        return;
    }
    
    // Verwijder alle bestaande knooppunten en verbindingen
    if (confirm('Dit zal de huidige mindmap wissen. Doorgaan?')) {
        clearMindmap(false); // Don't clear version history when loading project
    } else {
        return;
    }
    
    // Parse de mermaid code
    const lines = mermaidCode.split('\n');
    
    // Sla de eerste regel over (diagram type declaratie)
    lines.shift();
    
    // Map om nodeIds bij te houden
    const mermaidNodeMap = {};
    
    // Eerste pas: verzamel alle nodes
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Als de lijn een verbinding bevat (-->), sla deze over voor nu
        if (line.includes('-->') || line.includes('==>') || line.includes('-.->')
            || line.includes('->>') || line.includes('--') || line.includes('--x')) {
            continue;
        }
        
        // Als het een style regel is, sla deze ook over voor nu
        if (line.startsWith('style ') || line.startsWith('classDef ') || line.startsWith('class ')) {
            continue;
        }
        
        // Probeer een node definitie te herkennen: ID[Titel] of ID(Titel) etc.
        const nodeMatch = line.match(/^\s*([A-Za-z0-9_-]+)(\[|\(|\{\{|\{\(|\[\(|\(\(|\{)([^})\]]*)(\]|\)|\}\}|\)\}|\)\]|\)\)|})$/);
        
        if (nodeMatch) {
            const mermaidId = nodeMatch[1];
            const shapeStart = nodeMatch[2];
            const title = nodeMatch[3].trim();
            
            // Bepaal de vorm op basis van de gebruikte symbolen
            let shape = 'rectangle';
            if (shapeStart === '(') {
                shape = 'rounded';
            } else if (shapeStart === '((') {
                shape = 'circle';
            } else if (shapeStart === '{') {
                shape = 'diamond';
            }
            
            // Bereken een willekeurige positie
            const x = 100 + Math.random() * 500;
            const y = 100 + Math.random() * 300;
            
            // Maak het knooppunt
            const node = createNode(title, '', '#4CAF50', x, y, shape, null, Object.keys(mermaidNodeMap).length === 0);
            
            // Houd de mapping bij
            mermaidNodeMap[mermaidId] = node.id;
        }
    }
    
    // Tweede pas: zoek naar stijlen
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || !line.startsWith('style ')) continue;
        
        // Parse style: style A fill:#f9f,stroke:#333,stroke-width:4px
        const styleMatch = line.match(/style\s+([A-Za-z0-9_-]+)\s+([^,]*)/);
        if (styleMatch) {
            const mermaidId = styleMatch[1];
            const styleStr = styleMatch[2];
            
            // Als de node bestaat in onze map, update de kleur
            const nodeId = mermaidNodeMap[mermaidId];
            if (nodeId) {
                const node = nodes.find(n => n.id === nodeId);
                if (node) {
                    // Zoek naar fill:#color
                    const fillMatch = styleStr.match(/fill:([^,;]+)/);
                    if (fillMatch) {
                        let color = fillMatch[1].trim();
                        // Voeg # toe als het ontbreekt
                        if (!color.startsWith('#')) {
                            color = '#' + color;
                        }
                        node.color = color;
                        
                        // Update DOM
                        const nodeEl = document.getElementById(node.id);
                        if (nodeEl) {
                            nodeEl.style.borderColor = color;
                        }
                    }
                }
            }
        }
    }
    
    // Derde pas: maak verbindingen
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Zoek naar verbindingen: A --> B of A -- "text" --> B
        const connMatch = line.match(/([A-Za-z0-9_-]+)(?:\s*--(?:-|>|\.-|\.>|\|(?:[^|]*)\|))\s*([A-Za-z0-9_-]+)/);
        
        if (connMatch) {
            const sourceMermaidId = connMatch[1];
            const targetMermaidId = connMatch[2];
            
            // Controleer of beide nodes bestaan
            const sourceId = mermaidNodeMap[sourceMermaidId];
            const targetId = mermaidNodeMap[targetMermaidId];
            
            if (sourceId && targetId) {
                // Maak verbinding
                const conn = createConnection(sourceId, targetId);
                
                // Zoek naar label: A -- "text" --> B
                const labelMatch = line.match(/--\|([^|]*)\|->/);
                if (labelMatch && conn) {
                    conn.label = labelMatch[1].trim();
                    refreshConnections();
                }
                
                // Zoek naar lijnstijl: A -.-> B
                if (line.includes('-.->') && conn) {
                    conn.styleClass += ' dashed';
                    refreshConnections();
                }
                
                // Zoek naar kleur: A --> B,#color
                const colorMatch = line.match(/-->[^,]*,([^,\s]+)/);
                if (colorMatch && conn) {
                    const color = colorMatch[1].trim();
                    if (color === '#4CAF50' || color === 'green') {
                        conn.styleClass += ' primary';
                    } else if (color === '#FFC107' || color === 'yellow') {
                        conn.styleClass += ' secondary';
                    }
                    refreshConnections();
                }
            }
        }
    }
    
    // Centreer de mindmap en update de UI
    centerOnNode(rootNodeId || nodes[0]?.id);
    updateMinimap();
    
    // Sluit de modal
    importModal.style.display = 'none';
    
    showToast('Mermaid diagram geïmporteerd');
}

// Exporteer als JSON (legacy format for backward compatibility)
function exportToJson() {
    // Get current project info for metadata
    const projectInfo = window.VersionControl ? window.VersionControl.getCurrentProject() : {
        name: getMindmapTitle ? getMindmapTitle() : 'Mindmap Project',
        version: '1.0.0',
        author: 'Anonymous'
    };
    
    // Get current author from storage
    let currentAuthor = 'Anonymous';
    try {
        if (window.StorageUtils) {
            currentAuthor = window.StorageUtils.getItem('mindmap_author') || 'Anonymous';
        } else {
            currentAuthor = localStorage.getItem('mindmap_author') || 'Anonymous';
        }
    } catch (e) {
        console.warn('Could not get author for export:', e);
    }
    
    const now = new Date().toISOString();
    
    const data = {
        // Core mindmap data
        title: getMindmapTitle ? getMindmapTitle() : 'Mindmap Project',
        nodes: nodes,
        connections: connections,
        nextNodeId: nextNodeId,
        rootNodeId: rootNodeId,
        
        // Enhanced metadata
        metadata: {
            version: projectInfo.version || '1.0.0',
            author: currentAuthor,
            created: now,
            lastModified: now,
            nodeCount: nodes.length,
            connectionCount: connections.length,
            formatVersion: '2.0' // New enhanced format
        },
        
        // Version history (will be populated by version control system)
        versionHistory: [
            {
                version: projectInfo.version || '1.0.0',
                timestamp: now,
                author: currentAuthor,
                changes: 'Initial export',
                nodeCount: nodes.length,
                connectionCount: connections.length
            }
        ]
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
}

// Enhanced export with version control
function exportWithVersionControl(versionInfo) {
    // Get current project info
    const projectInfo = window.VersionControl ? window.VersionControl.getCurrentProject() : {
        name: 'Mindmap Project',
        version: '1.0.0',
        author: 'Anonymous'
    };
    
    // Create version entry
    const versionEntry = {
        version: versionInfo.version || projectInfo.suggestedVersion || '1.0.0',
        author: versionInfo.author || projectInfo.author || 'Anonymous',
        timestamp: new Date().toISOString(),
        summary: versionInfo.summary || projectInfo.changeSummary || 'Initial version',
        parentVersion: versionInfo.parentVersion || projectInfo.version,
        data: {
            title: getMindmapTitle ? getMindmapTitle() : 'Mindmap Project',
            nodes: JSON.parse(JSON.stringify(nodes)),
            connections: JSON.parse(JSON.stringify(connections)),
            nextNodeId: nextNodeId,
            rootNodeId: rootNodeId
        }
    };
    
    // Try to load existing project file structure
    let projectData;
    
    try {
        // Check if we have existing project data in localStorage
        let existingProject = null;
        if (window.StorageUtils) {
            existingProject = window.StorageUtils.getItem('mindmap_current_project_data');
        } else {
            existingProject = localStorage.getItem('mindmap_current_project_data');
        }
        
        if (existingProject) {
            projectData = window.StorageUtils ? 
                window.StorageUtils.parseJSON(existingProject, null) : 
                JSON.parse(existingProject);
        }
    } catch (e) {
        console.warn('Could not load existing project data:', e);
    }
    
    // Create or update project structure
    if (!projectData || projectData.projectName !== projectInfo.name) {
        projectData = {
            formatVersion: '2.0',
            projectName: projectInfo.name,
            currentVersion: versionEntry.version,
            created: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            lastModifiedBy: versionEntry.author,
            versions: []
        };
    }
    
    // Add new version
    projectData.versions.push(versionEntry);
    projectData.currentVersion = versionEntry.version;
    projectData.lastModified = new Date().toISOString();
    projectData.lastModifiedBy = versionEntry.author;
    
    // Keep only last 20 versions to manage file size
    if (projectData.versions.length > 20) {
        projectData.versions = projectData.versions.slice(-20);
    }
    
    // Compress older versions (keep only essential data for versions older than 10)
    if (projectData.versions.length > 10) {
        for (let i = 0; i < projectData.versions.length - 10; i++) {
            const version = projectData.versions[i];
            if (version.data && !version.compressed) {
                // Keep only basic info for old versions
                version.compressed = true;
                version.nodeCount = version.data.nodes.length;
                version.connectionCount = version.data.connections.length;
                // Remove detailed data to save space
                delete version.data;
            }
        }
    }
    
    // Save to localStorage for next time
    try {
        const projectDataJson = window.StorageUtils ? 
            window.StorageUtils.stringifyJSON(projectData) : 
            JSON.stringify(projectData);
            
        if (window.StorageUtils) {
            window.StorageUtils.setItem('mindmap_current_project_data', projectDataJson);
        } else {
            localStorage.setItem('mindmap_current_project_data', projectDataJson);
        }
    } catch (e) {
        console.warn('Could not save project data to localStorage:', e);
    }
    
    return projectData;
}

// Generate smart filename
function generateSmartFilename(projectName, version, author, summary) {
    // Clean project name
    const cleanProjectName = projectName.replace(/[^a-zA-Z0-9]/g, '_');
    
    // Extract keyword from summary
    const keyword = extractKeywordFromSummary(summary);
    
    // Generate timestamp
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Build filename
    let filename = `${cleanProjectName}_v${version}`;
    
    if (author && author !== 'Anonymous') {
        const cleanAuthor = author.replace(/[^a-zA-Z0-9]/g, '_');
        filename += `_${cleanAuthor}`;
    }
    
    if (keyword) {
        filename += `_${keyword}`;
    }
    
    filename += '.mindmap';
    
    return filename;
}

// Extract keyword from change summary
function extractKeywordFromSummary(summary) {
    if (!summary || summary === 'Initial version') return null;
    
    // Common keywords to extract
    const keywords = {
        'added': 'Added',
        'created': 'New',
        'updated': 'Updated',
        'modified': 'Modified',
        'deleted': 'Removed',
        'fixed': 'Fixed',
        'improved': 'Improved',
        'refactored': 'Refactor',
        'analysis': 'Analysis',
        'planning': 'Planning',
        'meeting': 'Meeting',
        'brainstorm': 'Brainstorm',
        'template': 'Template'
    };
    
    const lowerSummary = summary.toLowerCase();
    
    for (const [key, label] of Object.entries(keywords)) {
        if (lowerSummary.includes(key)) {
            return label;
        }
    }
    
    // Try to extract first meaningful word
    const words = summary.split(' ').filter(w => w.length > 3);
    if (words.length > 0) {
        return words[0].replace(/[^a-zA-Z0-9]/g, '');
    }
    
    return null;
}

// Save with file picker (enhanced)
function saveWithFilePicker(projectData, suggestedFilename) {
    // Check if the File System Access API is supported
    if ('showSaveFilePicker' in window) {
        savWithFileSystemAPI(projectData, suggestedFilename);
    } else {
        // Fallback to traditional download
        saveWithTraditionalDownload(projectData, suggestedFilename);
    }
}

// Save using File System Access API
async function savWithFileSystemAPI(projectData, suggestedFilename) {
    try {
        const fileHandle = await window.showSaveFilePicker({
            suggestedName: suggestedFilename,
            types: [
                {
                    description: 'Mindmap project files',
                    accept: {
                        'application/json': ['.mindmap', '.json']
                    }
                }
            ]
        });
        
        const writable = await fileHandle.createWritable();
        const dataStr = JSON.stringify(projectData, null, 2);
        await writable.write(dataStr);
        await writable.close();
        
        // Remember the file handle for future saves
        if (window.VersionControl) {
            try {
                if (window.StorageUtils) {
                    window.StorageUtils.setItem('mindmap_last_file_handle', fileHandle.name);
                } else {
                    localStorage.setItem('mindmap_last_file_handle', fileHandle.name);
                }
            } catch (e) {
                console.warn('Could not save file handle preference:', e);
                // Don't block the save operation if this fails
            }
        }
        
        showToast(`Project opgeslagen als ${fileHandle.name}`);
        
        // Update version control state
        if (window.VersionControl) {
            window.VersionControl.saveCurrentStateSnapshot();
        }
        
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Error saving file:', err);
            showToast('Fout bij het opslaan van het bestand', true);
        }
    }
}

// Save using traditional download
function saveWithTraditionalDownload(projectData, suggestedFilename) {
    const dataStr = JSON.stringify(projectData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = suggestedFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast(`Project opgeslagen als ${suggestedFilename}`);
    
    // Update version control state
    if (window.VersionControl) {
        window.VersionControl.saveCurrentStateSnapshot();
    }
}

// Enhanced import with version support
function importFromJson(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // Check if this is an enhanced project file or legacy format
            if (data.metadata && data.metadata.formatVersion === '2.0' && data.versionHistory) {
                // New enhanced format with embedded version history
                importEnhancedProject(data);
            } else if (data.formatVersion && data.versions) {
                // Old enhanced format (legacy)
                importLegacyEnhancedProject(data);
            } else {
                // Legacy format - import directly
                importLegacyFormat(data);
            }
            
        } catch (error) {
            console.error('Fout bij het laden van mindmap:', error);
            showToast('Fout bij het laden van de mindmap', true);
        }
    };
    
    reader.readAsText(file);
}

// Import enhanced project with version selection (new format)
function importEnhancedProject(projectData) {
    // Clear current mindmap with confirmation
    if (nodes.length > 0 && !confirm('Dit zal de huidige mindmap wissen. Doorgaan?')) {
        return;
    }
    
    // Load the current version from the enhanced format
    loadMindmapData({
        title: projectData.title,
        nodes: projectData.nodes,
        connections: projectData.connections,
        nextNodeId: projectData.nextNodeId,
        rootNodeId: projectData.rootNodeId
    });
    
    // Update version control with metadata
    if (window.VersionControl && projectData.metadata) {
        window.VersionControl.setProject(
            projectData.title || 'Imported Project', 
            projectData.metadata.version || '1.0.0'
        );
        
        // Set author if available
        if (projectData.metadata.author) {
            window.VersionControl.setAuthor(projectData.metadata.author);
        }
        
        window.VersionControl.saveCurrentStateSnapshot();
    }
    
    // Store project data temporarily (for version browser if needed)
    try {
        const projectDataJson = window.StorageUtils ? 
            window.StorageUtils.stringifyJSON(projectData) : 
            JSON.stringify(projectData);
            
        if (window.StorageUtils) {
            window.StorageUtils.setItem('mindmap_current_project_data', projectDataJson);
        } else {
            localStorage.setItem('mindmap_current_project_data', projectDataJson);
        }
    } catch (e) {
        console.warn('Could not save project data to localStorage:', e);
        // Don't block import if localStorage fails
    }
    
    // Show success message with version info
    const versionInfo = projectData.metadata ? 
        ` (v${projectData.metadata.version} by ${projectData.metadata.author})` : '';
    showToast(`Enhanced mindmap geladen${versionInfo}`);
    
    // Show version history summary if available
    if (projectData.versionHistory && projectData.versionHistory.length > 1) {
        console.log(`Project has ${projectData.versionHistory.length} versions in history`);
        showToast(`Project bevat ${projectData.versionHistory.length} versies in geschiedenis`, false, 3000);
    }
}

// Import legacy enhanced project (old format compatibility)
function importLegacyEnhancedProject(projectData) {
    console.log('Loading legacy enhanced format...');
    
    // Convert old format to new format handling
    if (projectData.formatVersion && projectData.versions) {
        // Load the latest version from old format
        const latestVersion = projectData.versions[projectData.versions.length - 1];
        
        if (latestVersion && latestVersion.data) {
            loadMindmapData(latestVersion.data);
            
            // Update version control
            if (window.VersionControl) {
                const projectName = latestVersion.data.title || 'Legacy Project';
                window.VersionControl.setProject(projectName, latestVersion.version || '1.0.0');
                window.VersionControl.saveCurrentStateSnapshot();
            }
            
            // Store project data with all versions in localStorage (missing from original implementation)
            try {
                const projectDataJson = window.StorageUtils ? 
                    window.StorageUtils.stringifyJSON(projectData) : 
                    JSON.stringify(projectData);
                    
                if (window.StorageUtils) {
                    window.StorageUtils.setItem('mindmap_current_project_data', projectDataJson);
                } else {
                    localStorage.setItem('mindmap_current_project_data', projectDataJson);
                }
            } catch (e) {
                console.warn('Could not save legacy project data to localStorage:', e);
                // Don't block import if localStorage fails
            }
            
            showToast(`Legacy mindmap geladen (${projectData.versions.length} versies beschikbaar)`);
        } else {
            showToast('Fout bij het laden van legacy project', true);
        }
    }
}

// Check for version conflicts
function checkForVersionConflicts(projectData) {
    if (!window.VersionControl) return false;
    
    const currentProject = window.VersionControl.getCurrentProject();
    
    // Check if this is the same project
    if (projectData.projectName !== currentProject.name) {
        return false; // Different project, no conflict
    }
    
    // Check if there are unsaved changes
    if (currentProject.hasUnsavedChanges) {
        return true; // User has unsaved changes
    }
    
    // Check if file was modified after our last save
    try {
        let lastSavedData = 'null';
        if (window.StorageUtils) {
            lastSavedData = window.StorageUtils.getItem('mindmap_current_project_data') || 'null';
        } else {
            lastSavedData = localStorage.getItem('mindmap_current_project_data') || 'null';
        }
        
        const lastSavedProject = window.StorageUtils ? 
            window.StorageUtils.parseJSON(lastSavedData, null) : 
            JSON.parse(lastSavedData);
            
        if (lastSavedProject && projectData.lastModified > lastSavedProject.lastModified) {
            return true; // File has newer changes
        }
    } catch (e) {
        console.warn('Could not check for conflicts:', e);
    }
    
    return false;
}

// Show conflict warning dialog
function showConflictWarning(projectData) {
    const modal = document.createElement('div');
    modal.className = 'modal conflict-warning-modal';
    modal.style.display = 'flex';
    
    const currentProject = window.VersionControl ? window.VersionControl.getCurrentProject() : {};
    const lastVersion = projectData.versions[projectData.versions.length - 1];
    const conflictType = currentProject.hasUnsavedChanges ? 'unsaved_changes' : 'newer_version';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-title">⚠️ Conflict Detected</div>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                ${conflictType === 'unsaved_changes' ? `
                    <p><strong>You have unsaved changes that will be lost!</strong></p>
                    <p>Project: <strong>${currentProject.name}</strong></p>
                    <p>Your changes: ${currentProject.changeSummary}</p>
                    <p>Suggested version: ${currentProject.suggestedVersion}</p>
                ` : `
                    <p><strong>This file has newer changes than your current version!</strong></p>
                    <p>File version: <strong>${projectData.currentVersion}</strong></p>
                    <p>Last modified by: <strong>${lastVersion.author}</strong></p>
                    <p>Modified: ${new Date(projectData.lastModified).toLocaleDateString('nl-NL')}</p>
                `}
                <hr>
                <p>What would you like to do?</p>
            </div>
            <div class="modal-footer">
                <button class="btn" id="conflict-cancel">Cancel</button>
                ${conflictType === 'unsaved_changes' ? 
                    '<button class="btn btn-save" id="conflict-save-first">Save My Changes First</button>' : ''
                }
                <button class="btn btn-warning" id="conflict-proceed">Load Anyway</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Set up event listeners
    modal.querySelector('.close-modal').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.querySelector('#conflict-cancel').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    const saveFirstBtn = modal.querySelector('#conflict-save-first');
    if (saveFirstBtn) {
        saveFirstBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
            // Open save dialog first
            if (typeof showSmartSaveDialog === 'function') {
                showSmartSaveDialog();
            }
        });
    }
    
    modal.querySelector('#conflict-proceed').addEventListener('click', () => {
        document.body.removeChild(modal);
        // Proceed with version selection
        showVersionSelectionDialog(projectData);
    });
}

// Import legacy format
function importLegacyFormat(data) {
    // Clear current mindmap with confirmation
    if (nodes.length > 0 && !confirm('Dit zal de huidige mindmap wissen. Doorgaan?')) {
        return;
    }
    
    loadMindmapData(data);
    
    // Update version control
    if (window.VersionControl) {
        const projectName = data.title || (rootNodeId && nodes.find(n => n.id === rootNodeId)?.title) || 'Imported Project';
        window.VersionControl.setProject(projectName, '1.0.0');
        window.VersionControl.saveCurrentStateSnapshot();
    }
    
    showToast('Mindmap geladen');
}

// Load specific version from project data
function loadVersionFromProject(projectData, versionIndex = -1) {
    if (!projectData.versions || projectData.versions.length === 0) {
        showToast('Geen versies gevonden in project', true);
        return;
    }
    
    // Default to latest version
    if (versionIndex < 0) {
        versionIndex = projectData.versions.length - 1;
    }
    
    const version = projectData.versions[versionIndex];
    
    if (!version.data) {
        showToast('Versie data niet beschikbaar (mogelijk gecomprimeerd)', true);
        return;
    }
    
    // Clear current mindmap
    clearMindmap(false); // Don't clear version history when loading project
    
    // Load the version data
    loadMindmapData(version.data);
    
    // Update version control
    if (window.VersionControl) {
        window.VersionControl.setProject(projectData.projectName, version.version);
        window.VersionControl.setAuthor(version.author);
        window.VersionControl.saveCurrentStateSnapshot();
        
        // Update last modified indicator
        window.VersionControl.updateLastModifiedIndicator(projectData);
    }
    
    // Update the project data's currentVersion to reflect the loaded version
    projectData.currentVersion = version.version;
    
    // Update localStorage with new current version
    try {
        const projectDataJson = window.StorageUtils ? 
            window.StorageUtils.stringifyJSON(projectData) : 
            JSON.stringify(projectData);
            
        if (window.StorageUtils) {
            window.StorageUtils.setItem('mindmap_current_project_data', projectDataJson);
        } else {
            localStorage.setItem('mindmap_current_project_data', projectDataJson);
        }
    } catch (e) {
        console.warn('Could not update project data in localStorage:', e);
    }
    
    showToast(`Versie ${version.version} geladen door ${version.author}`);
}

// Load mindmap data into current state
function loadMindmapData(data) {
    try {
        // Verwijder huidige mindmap
        clearMindmap(false); // Don't clear version history when loading project
        
        // Maak de container voor verbindingen opnieuw aan
        const connectionsContainer = document.createElement('div');
            connectionsContainer.id = 'connections-container';
        connectionsContainer.style.position = 'absolute';
        connectionsContainer.style.top = '0';
        connectionsContainer.style.left = '0';
        connectionsContainer.style.width = '100%';
        connectionsContainer.style.height = '100%';
        connectionsContainer.style.pointerEvents = 'none';
        connectionsContainer.style.zIndex = '1';
        canvas.appendChild(connectionsContainer);
        
        // Laad de gegevens
        console.log(`[loadMindmapData] Setting nextNodeId from ${nextNodeId} to ${data.nextNodeId || 1}`);
        nextNodeId = data.nextNodeId || 1;
        rootNodeId = data.rootNodeId || null;
        console.log(`[loadMindmapData] nextNodeId is now ${nextNodeId}, rootNodeId: ${rootNodeId}`);
        
        // CRITICAL FIX: Calculate proper nextNodeId based on actual nodes
        let maxNodeId = 0;
        data.nodes.forEach(nodeData => {
            const nodeNum = parseInt(nodeData.id.replace('node-', ''));
            if (!isNaN(nodeNum) && nodeNum > maxNodeId) {
                maxNodeId = nodeNum;
            }
        });
        
        // Set nextNodeId to be one more than the highest existing node ID
        const calculatedNextNodeId = maxNodeId + 1;
        if (calculatedNextNodeId > nextNodeId) {
            console.log(`[loadMindmapData] FIXING nextNodeId: was ${nextNodeId}, should be ${calculatedNextNodeId}`);
            nextNodeId = calculatedNextNodeId;
        }
        
        // Load title if available
        if (data.title && setMindmapTitle) {
            setMindmapTitle(data.title);
        }
        
        // Maak eerst alle knooppunten - gebruik createNodeElement voor consistentie
        data.nodes.forEach(nodeData => {
            // Creëer een nieuwe node met de juiste ID
            const node = {
                id: nodeData.id,
                title: nodeData.title || 'Nieuw knooppunt',
                content: nodeData.content || '',
                color: nodeData.color || '#4CAF50',
                x: nodeData.x,
                y: nodeData.y,
                shape: nodeData.shape || 'rectangle',
                isRoot: nodeData.isRoot || false
            };
            
            // Voeg node toe aan de nodes array
            nodes.push(node);
            
            // nextNodeId is now calculated correctly upfront, no need to update per node
            
            // Gebruik de bestaande createNodeElement functie voor consistente event handling
            createNodeElement(node);
        });
            
            // Maak alle verbindingen
            data.connections.forEach(conn => {
                connections.push(conn);
                drawConnection(conn);
            });
            
            // Post-load initialization to ensure all managers are updated
            initializeAfterLoad();
            
            // Centreer op hoofdknooppunt
            if (rootNodeId) {
                centerOnNode(rootNodeId);
            }
            
            // Update minimap
            updateMinimap();
            
            showToast('Mindmap geladen');
        } catch (error) {
            console.error('Fout bij het laden van mindmap:', error);
            showToast('Fout bij het laden van de mindmap', true);
        }
}

// Exporteer als afbeelding
function exportAsImage() {
    // Maak een canvas element voor de afbeelding
    const exportCanvas = document.createElement('canvas');
    const ctx = exportCanvas.getContext('2d');
    
    // Bereken de grenzen van de mindmap
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    nodes.forEach(node => {
        const nodeEl = document.getElementById(node.id);
        if (nodeEl) {
            const rect = nodeEl.getBoundingClientRect();
            const x = node.x;
            const y = node.y;
            const width = rect.width;
            const height = rect.height;
            
            minX = Math.min(minX, x - 20);
            minY = Math.min(minY, y - 20);
            maxX = Math.max(maxX, x + width + 20);
            maxY = Math.max(maxY, y + height + 20);
        }
    });
    
    // Als er geen nodes zijn, toon foutmelding
    if (minX === Infinity || nodes.length === 0) {
        showToast('Geen knooppunten om te exporteren', true);
        return;
    }
    
    // Canvas grootte instellen
    const canvasWidth = maxX - minX;
    const canvasHeight = maxY - minY;
    
    exportCanvas.width = canvasWidth;
    exportCanvas.height = canvasHeight;
    
    // Achtergrond tekenen
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Teken grid als het is ingeschakeld
    if (showGrid) {
        ctx.fillStyle = '#333';
        
        for (let x = 0; x < canvasWidth; x += gridSize) {
            for (let y = 0; y < canvasHeight; y += gridSize) {
                ctx.beginPath();
                ctx.arc(x, y, 1, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    // Eerst alle verbindingen tekenen
    connections.forEach(conn => {
        const sourceNode = nodes.find(n => n.id === conn.source);
        const targetNode = nodes.find(n => n.id === conn.target);
        
        if (sourceNode && targetNode) {
            // Bereken middenpunten
            const getNodeCenter = (node) => {
                let width = 120;
                let height = 60;
                
                if (node.shape === 'circle') {
                    width = height = 120;
                } else if (node.shape === 'diamond') {
                    width = height = 100;
                }
                
                return {
                    x: node.x + width / 2 - minX,
                    y: node.y + height / 2 - minY
                };
            };
            
            const sourceCenter = getNodeCenter(sourceNode);
            const targetCenter = getNodeCenter(targetNode);
            
            // Bereken de hoek van de lijn
            const dx = targetCenter.x - sourceCenter.x;
            const dy = targetCenter.y - sourceCenter.y;
            const angle = Math.atan2(dy, dx);
            
            // Bereken de afstand tussen de knooppunten
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Vind de randpunten om de lijn te verbinden met de randen
            const getNodeEdgePoint = (node, angle, isSource) => {
                const center = getNodeCenter(node);
                let radius;
                
                if (node.shape === 'circle') {
                    radius = 60;
                } else if (node.shape === 'diamond') {
                    const normalizedAngle = (angle + Math.PI * 2) % (Math.PI * 2);
                    const rotatedAngle = normalizedAngle - Math.PI / 4;
                    radius = 50 / Math.max(Math.abs(Math.cos(rotatedAngle)), Math.abs(Math.sin(rotatedAngle)));
                } else {
                    const width = 120;
                    const height = 60;
                    
                    const halfWidth = width / 2;
                    const halfHeight = height / 2;
                    
                    // Bepaal het snijpunt met de rechthoek
                    const abs_cos = Math.abs(Math.cos(angle));
                    const abs_sin = Math.abs(Math.sin(angle));
                    
                    if (abs_cos * halfHeight <= abs_sin * halfWidth) {
                        // Snijpunt met horizontale lijn
                        // Bepaal of het boven of onder is
                        const sign = Math.sin(angle) >= 0 ? 1 : -1;
                        const y = sign * halfHeight;
                        const x = y / Math.tan(angle) || 0;  // Voorkomt deling door nul
                        
                        // Bereken de afstand tot het centrum
                        radius = Math.sqrt(x*x + y*y);
                    } else {
                        // Snijpunt met verticale lijn
                        // Bepaal of het links of rechts is
                        const sign = Math.cos(angle) >= 0 ? 1 : -1;
                        const x = sign * halfWidth;
                        const y = x * Math.tan(angle);
                        
                        // Bereken de afstand tot het centrum
                        radius = Math.sqrt(x*x + y*y);
                    }
                    
                    // Kleine correctie
                    radius -= 1;
                }
                
                const dir = isSource ? 1 : -1;
                
                return {
                    x: center.x + Math.cos(angle) * radius * dir,
                    y: center.y + Math.sin(angle) * radius * dir
                };
            };
            
            const startPoint = getNodeEdgePoint(sourceNode, angle, true);
            const endPoint = getNodeEdgePoint(targetNode, angle, false);
            
            // Bereken controlepunt voor gebogen lijn
            let controlPoint;
            if (conn.controlPoint) {
                controlPoint = {
                    x: conn.controlPoint.x - minX,
                    y: conn.controlPoint.y - minY
                };
            } else {
                const bendFactor = Math.min(0.5, distance / 400);
                
                if (conn.isYBranch) {
                    const midX = (startPoint.x + endPoint.x) / 2;
                    const midY = (startPoint.y + endPoint.y) / 2;
                    const perpAngle = angle + Math.PI / 2;
                    const perpDistance = distance * 0.4;
                    
                    controlPoint = {
                        x: midX + Math.cos(perpAngle) * perpDistance,
                        y: midY + Math.sin(perpAngle) * perpDistance
                    };
                } else {
                    const midX = (startPoint.x + endPoint.x) / 2;
                    const midY = (startPoint.y + endPoint.y) / 2;
                    const perpAngle = angle + Math.PI / 2;
                    const perpDistance = distance * bendFactor;
                    
                    controlPoint = {
                        x: midX + Math.cos(perpAngle) * perpDistance,
                        y: midY + Math.sin(perpAngle) * perpDistance
                    };
                }
            }
            
            // Teken de verbinding als een gebogen lijn
            ctx.save();
            
            // Stel de lijnstijl in op basis van verbinding stijl
            if (conn.styleClass) {
                if (conn.styleClass.includes('primary')) {
                    ctx.strokeStyle = '#4CAF50';
                    ctx.lineWidth = 3;
                } else if (conn.styleClass.includes('secondary')) {
                    ctx.strokeStyle = '#FFC107';
                    ctx.lineWidth = 2;
                } else {
                    ctx.strokeStyle = '#aaa';
                    ctx.lineWidth = 2;
                }
                
                if (conn.styleClass.includes('dashed')) {
                    ctx.setLineDash([5, 5]);
                }
            } else {
                ctx.strokeStyle = '#aaa';
                ctx.lineWidth = 2;
            }
            
            // Teken de curve
            ctx.beginPath();
            ctx.moveTo(startPoint.x, startPoint.y);
            ctx.quadraticCurveTo(controlPoint.x, controlPoint.y, endPoint.x, endPoint.y);
            ctx.stroke();
            
            // Reset lineDash voor andere verbindingen
            ctx.setLineDash([]);
            
            // Teken label indien aanwezig
            if (conn.label) {
                ctx.font = '12px "Segoe UI", sans-serif';
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                
                // Voeg achtergrond toe aan label
                const textWidth = ctx.measureText(conn.label).width + 10;
                const textHeight = 16;
                
                ctx.fillStyle = 'rgba(40, 40, 40, 0.8)';
                ctx.fillRect(
                    controlPoint.x - textWidth / 2,
                    controlPoint.y - textHeight - 5,
                    textWidth,
                    textHeight
                );
                
                // Teken de tekst
                ctx.fillStyle = '#fff';
                ctx.fillText(conn.label, controlPoint.x, controlPoint.y - 5);
            }
            
            ctx.restore();
        }
    });
    
    // Teken alle knooppunten
    nodes.forEach(node => {
        // Bereken positie relatief aan de exportcanvas
        const x = node.x - minX;
        const y = node.y - minY;
        
        // Teken de node op basis van vorm
        ctx.save();
        ctx.fillStyle = '#3a3a3a';
        ctx.strokeStyle = node.color;
        ctx.lineWidth = node.isRoot ? 3 : 2;
        
        switch(node.shape) {
            case 'rounded':
                ctx.beginPath();
                ctx.roundRect(x, y, 120, 60, 10);
                ctx.fill();
                ctx.stroke();
                break;
            case 'circle':
                ctx.beginPath();
                ctx.arc(x + 60, y + 60, 60, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                break;
            case 'diamond':
                ctx.translate(x + 50, y + 50);
                ctx.rotate(Math.PI / 4);
                ctx.beginPath();
                ctx.rect(-50, -50, 100, 100);
                ctx.fill();
                ctx.stroke();
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                break;
            default: // rectangle
                ctx.beginPath();
                ctx.rect(x, y, 120, 60);
                ctx.fill();
                ctx.stroke();
                break;
        }
        
        // Teken tekst
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (node.shape === 'diamond') {
            // Voor diamond moet de tekst gedraaid worden
            ctx.translate(x + 50, y + 50);
            ctx.rotate(-Math.PI / 4);
            ctx.fillText(node.title, 0, 0, 80);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        } else {
            // Voor andere vormen
            const centerY = node.shape === 'circle' ? y + 60 : y + 30;
            ctx.fillText(node.title, x + 60, centerY, 110);
        }
        
        ctx.restore();
    });
    
    // Exporteer als PNG
    try {
        exportCanvas.toBlob(function(blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'mindmap.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showToast('Mindmap opgeslagen als afbeelding');
        });
    } catch (error) {
        console.error('Fout bij het exporteren als afbeelding:', error);
        showToast('Fout bij het exporteren als afbeelding', true);
    }
}

// Show version selection dialog
function showVersionSelectionDialog(projectData) {
    // Create modal HTML
    const modal = document.createElement('div');
    modal.className = 'modal version-selection-modal';
    modal.style.display = 'flex';
    
    const versions = projectData.versions.slice().reverse(); // Latest first
    
    let versionListHTML = '';
    versions.forEach((version, index) => {
        const realIndex = projectData.versions.length - 1 - index; // Convert back to original index
        const isLatest = index === 0;
        const isCompressed = version.compressed;
        const nodeInfo = version.data ? `${version.data.nodes.length} nodes, ${version.data.connections.length} connections` :
                        `${version.nodeCount || 0} nodes, ${version.connectionCount || 0} connections (compressed)`;
        
        const timeAgo = getTimeAgo(new Date(version.timestamp));
        
        versionListHTML += `
            <div class="version-item ${isLatest ? 'latest' : ''} ${isCompressed ? 'compressed' : ''}" 
                 data-version-index="${realIndex}" 
                 ${isCompressed ? 'title="Deze versie is gecomprimeerd en kan niet geladen worden"' : ''}>
                <div class="version-header">
                    <span class="version-number">v${version.version}</span>
                    ${isLatest ? '<span class="latest-badge">Nieuwste</span>' : ''}
                    ${isCompressed ? '<span class="compressed-badge">Gecomprimeerd</span>' : ''}
                </div>
                <div class="version-info">
                    <div class="version-author">👤 ${version.author}</div>
                    <div class="version-time">🕒 ${timeAgo}</div>
                    <div class="version-stats">📊 ${nodeInfo}</div>
                </div>
                <div class="version-summary">${version.summary}</div>
                ${!isCompressed ? '<button class="btn btn-small load-version-btn">Laden</button>' : ''}
            </div>
        `;
    });
    
    modal.innerHTML = `
        <div class="modal-content version-selection-content">
            <div class="modal-header">
                <div class="modal-title">📁 ${projectData.projectName} - Versie Selecteren</div>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="project-info">
                    <p><strong>Project:</strong> ${projectData.projectName}</p>
                    <p><strong>Huidige versie:</strong> v${projectData.currentVersion}</p>
                    <p><strong>Totaal versies:</strong> ${projectData.versions.length}</p>
                    <p><strong>Laatst gewijzigd:</strong> ${new Date(projectData.lastModified).toLocaleString('nl-NL')}</p>
                </div>
                <div class="version-list">
                    ${versionListHTML}
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn" id="cancel-version-selection">Annuleren</button>
                <button class="btn btn-save" id="load-latest-version">Nieuwste Versie Laden</button>
            </div>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(modal);
    
    // Event listeners
    modal.querySelector('.close-modal').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.querySelector('#cancel-version-selection').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.querySelector('#load-latest-version').addEventListener('click', () => {
        document.body.removeChild(modal);
        loadVersionFromProject(projectData, -1); // Load latest
    });
    
    // Load version buttons
    modal.querySelectorAll('.load-version-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const versionIndex = parseInt(e.target.closest('.version-item').dataset.versionIndex);
            document.body.removeChild(modal);
            loadVersionFromProject(projectData, versionIndex);
        });
    });
    
    // Click on version item (except compressed ones)
    modal.querySelectorAll('.version-item:not(.compressed)').forEach(item => {
        item.addEventListener('click', () => {
            const versionIndex = parseInt(item.dataset.versionIndex);
            document.body.removeChild(modal);
            loadVersionFromProject(projectData, versionIndex);
        });
    });
}

// Get time ago string
function getTimeAgo(date) {
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

// Version comparison utility
function compareVersions(versionA, versionB) {
    if (!versionA.data || !versionB.data) return null;
    
    const differences = {
        nodes: {
            added: [],
            removed: [],
            modified: []
        },
        connections: {
            added: [],
            removed: [],
            modified: []
        }
    };
    
    // Compare nodes
    const aNodeIds = new Set(versionA.data.nodes.map(n => n.id));
    const bNodeIds = new Set(versionB.data.nodes.map(n => n.id));
    
    // Find added nodes
    versionB.data.nodes.forEach(node => {
        if (!aNodeIds.has(node.id)) {
            differences.nodes.added.push(node);
        }
    });
    
    // Find removed nodes
    versionA.data.nodes.forEach(node => {
        if (!bNodeIds.has(node.id)) {
            differences.nodes.removed.push(node);
        }
    });
    
    // Find modified nodes
    versionB.data.nodes.forEach(bNode => {
        if (aNodeIds.has(bNode.id)) {
            const aNode = versionA.data.nodes.find(n => n.id === bNode.id);
            if (aNode && (aNode.title !== bNode.title || 
                         aNode.content !== bNode.content || 
                         aNode.color !== bNode.color ||
                         Math.abs(aNode.x - bNode.x) > 5 ||
                         Math.abs(aNode.y - bNode.y) > 5)) {
                differences.nodes.modified.push({
                    old: aNode,
                    new: bNode
                });
            }
        }
    });
    
    // Similar comparison for connections
    const aConnIds = new Set(versionA.data.connections.map(c => c.id));
    const bConnIds = new Set(versionB.data.connections.map(c => c.id));
    
    versionB.data.connections.forEach(conn => {
        if (!aConnIds.has(conn.id)) {
            differences.connections.added.push(conn);
        }
    });
    
    versionA.data.connections.forEach(conn => {
        if (!bConnIds.has(conn.id)) {
            differences.connections.removed.push(conn);
        }
    });
    
    return differences;
}

// Post-load initialization function to ensure all managers are properly updated
function initializeAfterLoad() {
    console.log('🔄 Initializing after mindmap load...');
    
    try {
        // Reset connection cache for all nodes
        if (typeof resetConnectionCache === 'function') {
            resetConnectionCache(); // Reset entire cache
        }
        
        // Re-initialize mobile touch manager if it exists
        if (window.mobileTouchManager) {
            console.log('📱 Re-initializing mobile touch manager...');
            
            // Clear any stale references
            if (typeof window.mobileTouchManager.reset === 'function') {
                window.mobileTouchManager.reset();
            }
            
            // Re-setup touch properties for all nodes
            document.querySelectorAll('.node').forEach(nodeEl => {
                // Ensure touch-action is set correctly for mobile
                nodeEl.style.touchAction = 'none';
                
                // Mark for mobile touch manager tracking
                if (window.mobileTouchManager.addNode) {
                    window.mobileTouchManager.addNode(nodeEl);
                }
            });
        }
        
        // Re-initialize mobile navigation manager if it exists
        if (window.mobileNavigationManager) {
            console.log('🧭 Re-initializing mobile navigation manager...');
            if (typeof window.mobileNavigationManager.reset === 'function') {
                window.mobileNavigationManager.reset();
            }
        }
        
        // Ensure all event listeners are properly attached
        // Note: createNodeElement should handle this, but ensure UI events are working
        if (typeof updateToolStates === 'function') {
            updateToolStates();
        }
        
        console.log('✅ Post-load initialization completed');
        
    } catch (error) {
        console.error('⚠️ Error during post-load initialization:', error);
        // Don't throw - we want the load to succeed even if some initialization fails
    }
}

// Expose functions to global scope for use in other modules
window.exportToJson = exportToJson;
window.importFromJson = importFromJson;
window.exportToMermaid = exportToMermaid;
window.importFromMermaid = importFromMermaid;
window.exportAsImage = exportAsImage;
window.loadMindmapData = loadMindmapData;
window.initializeAfterLoad = initializeAfterLoad;