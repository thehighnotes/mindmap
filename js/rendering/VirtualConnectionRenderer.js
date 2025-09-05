/**
 * VirtualConnectionRenderer - Virtual DOM implementation for efficient connection rendering
 * Minimizes DOM manipulation by calculating diffs and applying only necessary changes
 */

class VirtualConnectionRenderer {
    #virtualDOM = new Map(); // id -> virtual node representation
    #realDOM = new Map();    // id -> actual DOM element reference
    #container = null;
    #renderQueue = null;
    #stats = {
        totalRenders: 0,
        patchesApplied: 0,
        domOperations: 0
    };

    constructor(container, renderQueue = null) {
        this.#container = container || document.getElementById('canvas');
        this.#renderQueue = renderQueue;
        this.#initializeContainer();
    }

    // ==================== Public API ====================

    /**
     * Render connections using virtual DOM diffing
     * @param {Array} connections - Array of connection objects
     */
    render(connections) {
        const startTime = performance.now();
        
        // Create new virtual DOM from connections
        const newVirtualDOM = this.#createVirtualDOM(connections);
        
        // Calculate diff between old and new virtual DOM
        const patches = this.#diff(this.#virtualDOM, newVirtualDOM);
        
        // Apply patches to real DOM
        if (patches.length > 0) {
            if (this.#renderQueue) {
                // Use render queue for batched updates
                this.#schedulePatchesWithQueue(patches);
            } else {
                // Apply immediately
                this.#applyPatches(patches);
            }
        }
        
        // Update virtual DOM reference
        this.#virtualDOM = newVirtualDOM;
        
        // Update stats
        this.#stats.totalRenders++;
        
        const renderTime = performance.now() - startTime;
        if (window.Logger && renderTime > 16) {
            window.Logger.debug(`Virtual render took ${renderTime.toFixed(2)}ms for ${connections.length} connections`);
        }
    }

    /**
     * Force full re-render (clears cache)
     */
    forceRender(connections) {
        this.clear();
        this.render(connections);
    }

    /**
     * Clear all rendered connections
     */
    clear() {
        // Remove all real DOM elements
        for (const [id, element] of this.#realDOM) {
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }
        
        this.#virtualDOM.clear();
        this.#realDOM.clear();
    }

    /**
     * Get rendering statistics
     */
    getStats() {
        return {
            ...this.#stats,
            virtualDOMSize: this.#virtualDOM.size,
            realDOMSize: this.#realDOM.size
        };
    }

    // ==================== Virtual DOM Creation ====================

    #createVirtualDOM(connections) {
        const virtualDOM = new Map();
        
        connections.forEach(connection => {
            const vNode = this.#createVirtualNode(connection);
            virtualDOM.set(connection.id, vNode);
        });
        
        return virtualDOM;
    }

    #createVirtualNode(connection) {
        // Create lightweight virtual representation
        return {
            id: connection.id,
            type: 'connection',
            attributes: {
                from: connection.from,
                to: connection.to,
                path: this.#calculatePath(connection),
                stroke: connection.color || '#666',
                strokeWidth: connection.selected ? 3 : 2,
                strokeDasharray: connection.style === 'dashed' ? '5,5' : '',
                opacity: connection.opacity || 1,
                className: this.#getConnectionClasses(connection)
            },
            children: this.#createConnectionChildren(connection),
            data: connection
        };
    }

    #createConnectionChildren(connection) {
        const children = [];
        
        // Add label if present
        if (connection.label) {
            children.push({
                type: 'text',
                id: `${connection.id}-label`,
                attributes: {
                    x: connection.labelX || 0,
                    y: connection.labelY || 0,
                    text: connection.label,
                    className: 'connection-label'
                }
            });
        }
        
        // Add control point if editable
        if (connection.showControlPoint) {
            children.push({
                type: 'circle',
                id: `${connection.id}-control`,
                attributes: {
                    cx: connection.controlX,
                    cy: connection.controlY,
                    r: 5,
                    className: 'control-point'
                }
            });
        }
        
        return children;
    }

    #calculatePath(connection) {
        // This would integrate with existing geometry calculations
        // Simplified for demonstration
        const { from, to, controlPoint } = connection;
        
        if (controlPoint) {
            // Quadratic bezier curve
            return `M ${from.x} ${from.y} Q ${controlPoint.x} ${controlPoint.y} ${to.x} ${to.y}`;
        } else {
            // Straight line
            return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
        }
    }

    #getConnectionClasses(connection) {
        const classes = ['connection'];
        
        if (connection.selected) classes.push('selected');
        if (connection.highlighted) classes.push('highlighted');
        if (connection.type) classes.push(`connection-${connection.type}`);
        if (connection.animated) classes.push('animated');
        
        return classes.join(' ');
    }

    // ==================== Diffing Algorithm ====================

    #diff(oldDOM, newDOM) {
        const patches = [];
        
        // Find additions and updates
        for (const [id, newNode] of newDOM) {
            const oldNode = oldDOM.get(id);
            
            if (!oldNode) {
                // New connection - add it
                patches.push({
                    type: 'add',
                    id,
                    node: newNode
                });
            } else if (!this.#isEqual(oldNode, newNode)) {
                // Existing connection changed - update it
                const updatePatch = this.#createUpdatePatch(oldNode, newNode);
                if (updatePatch) {
                    patches.push(updatePatch);
                }
            }
        }
        
        // Find deletions
        for (const id of oldDOM.keys()) {
            if (!newDOM.has(id)) {
                patches.push({
                    type: 'delete',
                    id
                });
            }
        }
        
        return patches;
    }

    #isEqual(node1, node2) {
        // Quick equality check for virtual nodes
        if (node1.type !== node2.type) return false;
        
        // Check attributes
        const attrs1 = node1.attributes;
        const attrs2 = node2.attributes;
        
        // Check critical attributes that would require re-render
        if (attrs1.path !== attrs2.path) return false;
        if (attrs1.from !== attrs2.from) return false;
        if (attrs1.to !== attrs2.to) return false;
        
        // Check style attributes
        if (attrs1.stroke !== attrs2.stroke) return false;
        if (attrs1.strokeWidth !== attrs2.strokeWidth) return false;
        if (attrs1.strokeDasharray !== attrs2.strokeDasharray) return false;
        if (attrs1.opacity !== attrs2.opacity) return false;
        if (attrs1.className !== attrs2.className) return false;
        
        // Check children
        if (node1.children.length !== node2.children.length) return false;
        
        return true;
    }

    #createUpdatePatch(oldNode, newNode) {
        const patch = {
            type: 'update',
            id: newNode.id,
            updates: []
        };
        
        // Compare attributes and collect changes
        const oldAttrs = oldNode.attributes;
        const newAttrs = newNode.attributes;
        
        for (const key in newAttrs) {
            if (oldAttrs[key] !== newAttrs[key]) {
                patch.updates.push({
                    attribute: key,
                    oldValue: oldAttrs[key],
                    newValue: newAttrs[key]
                });
            }
        }
        
        // Check children updates
        if (!this.#areChildrenEqual(oldNode.children, newNode.children)) {
            patch.updates.push({
                attribute: 'children',
                oldValue: oldNode.children,
                newValue: newNode.children
            });
        }
        
        return patch.updates.length > 0 ? patch : null;
    }

    #areChildrenEqual(children1, children2) {
        if (children1.length !== children2.length) return false;
        
        for (let i = 0; i < children1.length; i++) {
            const child1 = children1[i];
            const child2 = children2[i];
            
            if (child1.type !== child2.type) return false;
            if (child1.id !== child2.id) return false;
            
            // Check child attributes
            for (const key in child1.attributes) {
                if (child1.attributes[key] !== child2.attributes[key]) {
                    return false;
                }
            }
        }
        
        return true;
    }

    // ==================== Patch Application ====================

    #schedulePatchesWithQueue(patches) {
        patches.forEach(patch => {
            switch (patch.type) {
                case 'add':
                case 'delete':
                    this.#renderQueue.markDirty(patch.id, 'full', patch);
                    break;
                case 'update':
                    // Determine update type based on what changed
                    const updateType = this.#getUpdateType(patch);
                    this.#renderQueue.markDirty(patch.id, updateType, patch);
                    break;
            }
        });
    }

    #getUpdateType(patch) {
        // Analyze patch to determine if it's position, style, or full update
        const hasPathChange = patch.updates.some(u => u.attribute === 'path');
        const hasStructuralChange = patch.updates.some(u => 
            u.attribute === 'from' || u.attribute === 'to' || u.attribute === 'children'
        );
        
        if (hasStructuralChange || hasPathChange) {
            return 'full';
        }
        
        const hasStyleChange = patch.updates.some(u => 
            u.attribute === 'stroke' || u.attribute === 'strokeWidth' || 
            u.attribute === 'opacity' || u.attribute === 'className'
        );
        
        if (hasStyleChange) {
            return 'style';
        }
        
        return 'position';
    }

    #applyPatches(patches) {
        patches.forEach(patch => {
            this.#stats.patchesApplied++;
            
            switch (patch.type) {
                case 'add':
                    this.#addConnection(patch.node);
                    break;
                case 'update':
                    this.#updateConnection(patch);
                    break;
                case 'delete':
                    this.#deleteConnection(patch.id);
                    break;
            }
        });
    }

    #addConnection(vNode) {
        // Create SVG element for connection
        const svg = this.#getSVGContainer();
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        
        // Set attributes
        path.id = vNode.id;
        path.setAttribute('d', vNode.attributes.path);
        path.setAttribute('stroke', vNode.attributes.stroke);
        path.setAttribute('stroke-width', vNode.attributes.strokeWidth);
        path.setAttribute('fill', 'none');
        
        if (vNode.attributes.strokeDasharray) {
            path.setAttribute('stroke-dasharray', vNode.attributes.strokeDasharray);
        }
        
        if (vNode.attributes.opacity < 1) {
            path.setAttribute('opacity', vNode.attributes.opacity);
        }
        
        if (vNode.attributes.className) {
            path.setAttribute('class', vNode.attributes.className);
        }
        
        // Add to DOM
        svg.appendChild(path);
        this.#realDOM.set(vNode.id, path);
        
        // Add children (labels, control points)
        this.#addConnectionChildren(vNode);
        
        this.#stats.domOperations++;
    }

    #updateConnection(patch) {
        const element = this.#realDOM.get(patch.id);
        if (!element) return;
        
        patch.updates.forEach(update => {
            if (update.attribute === 'children') {
                // Re-render children
                this.#updateConnectionChildren(patch.id, update.newValue);
            } else if (update.attribute === 'className') {
                element.setAttribute('class', update.newValue);
            } else {
                // Update attribute
                element.setAttribute(update.attribute, update.newValue);
            }
            this.#stats.domOperations++;
        });
    }

    #deleteConnection(id) {
        const element = this.#realDOM.get(id);
        if (element && element.parentNode) {
            // Remove children first
            this.#removeConnectionChildren(id);
            
            // Remove main element
            element.parentNode.removeChild(element);
            this.#realDOM.delete(id);
            this.#stats.domOperations++;
        }
    }

    #addConnectionChildren(vNode) {
        if (!vNode.children || vNode.children.length === 0) return;
        
        const svg = this.#getSVGContainer();
        
        vNode.children.forEach(child => {
            let element;
            
            if (child.type === 'text') {
                element = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                element.textContent = child.attributes.text;
                element.setAttribute('x', child.attributes.x);
                element.setAttribute('y', child.attributes.y);
            } else if (child.type === 'circle') {
                element = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                element.setAttribute('cx', child.attributes.cx);
                element.setAttribute('cy', child.attributes.cy);
                element.setAttribute('r', child.attributes.r);
            }
            
            if (element) {
                element.id = child.id;
                if (child.attributes.className) {
                    element.setAttribute('class', child.attributes.className);
                }
                svg.appendChild(element);
                this.#realDOM.set(child.id, element);
            }
        });
    }

    #updateConnectionChildren(connectionId, newChildren) {
        // Remove old children
        this.#removeConnectionChildren(connectionId);
        
        // Add new children
        if (newChildren && newChildren.length > 0) {
            const vNode = this.#virtualDOM.get(connectionId);
            if (vNode) {
                vNode.children = newChildren;
                this.#addConnectionChildren(vNode);
            }
        }
    }

    #removeConnectionChildren(connectionId) {
        // Remove label
        const labelId = `${connectionId}-label`;
        const label = this.#realDOM.get(labelId);
        if (label && label.parentNode) {
            label.parentNode.removeChild(label);
            this.#realDOM.delete(labelId);
        }
        
        // Remove control point
        const controlId = `${connectionId}-control`;
        const control = this.#realDOM.get(controlId);
        if (control && control.parentNode) {
            control.parentNode.removeChild(control);
            this.#realDOM.delete(controlId);
        }
    }

    // ==================== Container Management ====================

    #initializeContainer() {
        if (!this.#container) {
            this.#container = document.getElementById('canvas');
        }
        
        // Ensure SVG container exists
        let svg = this.#container.querySelector('svg.connection-layer');
        if (!svg) {
            svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('class', 'connection-layer');
            svg.style.position = 'absolute';
            svg.style.top = '0';
            svg.style.left = '0';
            svg.style.width = '100%';
            svg.style.height = '100%';
            svg.style.pointerEvents = 'none';
            svg.style.zIndex = '1';
            this.#container.appendChild(svg);
        }
    }

    #getSVGContainer() {
        let svg = this.#container.querySelector('svg.connection-layer');
        if (!svg) {
            this.#initializeContainer();
            svg = this.#container.querySelector('svg.connection-layer');
        }
        return svg;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VirtualConnectionRenderer;
} else {
    window.VirtualConnectionRenderer = VirtualConnectionRenderer;
}