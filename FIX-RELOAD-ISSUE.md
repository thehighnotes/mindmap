# Fix for Mindmap Reload Issues

## Problem Description
When loading a previous session from a saved .mindmap file, users experienced:
1. Inability to reliably select nodes (clicking one node might select another)
2. Dragging nodes didn't work correctly
3. Creating new connections failed
4. **NEW: Creating new nodes via + buttons rendered connections to wrong nodes**
5. **NEW: New node positioning was unpredictable**
6. **NEW: Selecting newly created nodes selected different existing nodes**
7. The issue only occurred when loading saved projects, not when creating new ones

## Root Cause Analysis

### Initial Root Cause (Fixed in v1)
The problem was caused by inconsistent node object references between:
- `createNode()` in nodes.js - used for new projects
- `createNodeElement()` in core.js - used when loading saved projects

When loading a saved project:
1. Node data was pushed to the `nodes` array
2. `createNodeElement()` was called with this node data
3. Event listeners were attached to the parameter `node` instead of the actual node from the `nodes` array
4. This created a mismatch where event handlers were using stale/incorrect node references

### Additional Root Cause (Fixed in v2 - January 2025)
**CRITICAL ID CONFLICT ISSUE**: The core issue was that `nextNodeId` was not being set correctly when loading saved projects, causing newly created nodes to get duplicate IDs with existing nodes.

**The Problem Flow:**
1. Project saved with nodes: `node-1, node-2, node-3, node-4` and `nextNodeId: 5`
2. When loading, `nextNodeId` was incorrectly set to a low value (like `2`)
3. Creating new nodes via + buttons tried to create `node-1`, `node-2`, etc.
4. These IDs already existed, causing:
   - **DOM conflicts**: Multiple elements with same ID
   - **Wrong connections**: Connections drawn to existing nodes instead of new ones
   - **Selection issues**: Clicking new node selected existing node with same ID
   - **Positioning conflicts**: New node coordinates applied to existing DOM element

## Solution Applied

### v1 Fixes (Initial Event Handler Issues)

#### 1. Modified `createNodeElement()` in core.js
- Added code to find the actual node from the `nodes` array:
```javascript
const actualNode = nodes.find(n => n.id === node.id);
```
- Updated all references from `node` to `actualNode` throughout the function
- This ensures event handlers always use the correct node reference

#### 2. Modified `loadMindmapData()` in export.js
- Changed to create fresh node objects when loading
- Ensures proper ID tracking with `nextNodeId`
- Maintains consistency with how new nodes are created

#### 3. Modified `recoverFromDraft()` in version-control.js
- Similar fix to ensure fresh node objects are created
- Maintains proper references for draft recovery

### v2 Fixes (ID Conflict Issues - January 2025)

#### 4. Fixed `nextNodeId` calculation in `loadMindmapData()` - export.js
```javascript
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
    nextNodeId = calculatedNextNodeId;
}
```

#### 5. Added robust ID conflict prevention in `createNode()` - nodes.js
```javascript
// CRITICAL FIX: Ensure nextNodeId is correct before creating new node
let maxNodeId = 0;
nodes.forEach(node => {
    const nodeNum = parseInt(node.id.replace('node-', ''));
    if (!isNaN(nodeNum) && nodeNum > maxNodeId) {
        maxNodeId = nodeNum;
    }
});

// If nextNodeId would create a conflict, fix it
if (nextNodeId <= maxNodeId) {
    const oldNextNodeId = nextNodeId;
    nextNodeId = maxNodeId + 1;
    console.warn(`[createNode] CORRECTING nextNodeId from ${oldNextNodeId} to ${nextNodeId} to avoid conflicts`);
}
```

#### 6. Added error handling for failed node creation - core.js
- Added null check when `createNode` returns null due to ID conflicts
- Prevents crashes when node creation fails
- Provides clear error logging

#### 7. Enhanced connection creation with synchronization - nodes.js
- Added `requestAnimationFrame` to ensure DOM is ready before creating connections
- Added validation to check both source and target nodes exist
- Added extensive debugging logs to trace connection creation

## Files Modified
1. `/js/core.js` - Fixed `createNodeElement()` to use actualNode references, added error handling
2. `/js/export.js` - Fixed `loadMindmapData()` to create fresh node objects and correct nextNodeId
3. `/js/version-control.js` - Fixed `recoverFromDraft()` to create fresh node objects
4. `/js/nodes.js` - Added robust nextNodeId correction and synchronization fixes
5. `/js/connections/core.js` - Enhanced connection creation with better validation
6. `/js/connections/rendering.js` - Added retry logic for connection rendering

## Testing

### v1 Testing (Event Handler Issues)
To verify the initial fix:
1. Create a new mindmap with multiple nodes and connections
2. Save it as a .mindmap file
3. Reload the page or clear the mindmap
4. Load the saved file
5. Verify that:
   - Clicking nodes selects the correct node
   - Dragging nodes works properly
   - CTRL+click to create connections works
   - The + buttons on nodes create new connected nodes correctly

### v2 Testing (ID Conflict Issues)
To verify the ID conflict fix:
1. Create a mindmap with 3-4 nodes and save it
2. Reload the page and load the saved file
3. Click the + button on any loaded node
4. Verify that:
   - Console shows `[createNode] CORRECTING nextNodeId from X to Y to avoid conflicts`
   - No ID conflict errors appear in console
   - New node gets a unique ID (like `node-5`, `node-6`, etc.)
   - New node appears at correct position relative to parent
   - Connection is drawn to the NEW node, not an existing one
   - Clicking/dragging the new node works correctly
   - New node can be selected and edited independently

### Expected Console Output (Success)
```
[loadMindmapData] FIXING nextNodeId: was 2, should be 5
[createNode] CORRECTING nextNodeId from 2 to 6 to avoid conflicts
[createConnection] Connection created successfully: {id: 'conn-node-3-node-6', sourceId: 'node-3', targetId: 'node-6', totalConnections: X}
```

### Error Indicators (If Still Broken)
```
[createNode] ID CONFLICT! Node node-1 already exists!
Cannot read properties of null (reading 'id')
```

## Technical Details

### v1 Technical Details
The fix ensures that all event listeners (mousedown, dblclick, contextmenu, mouseover, mouseout) are attached with references to the actual node objects in the global `nodes` array, not to temporary objects passed as parameters. This maintains the integrity of the node selection and manipulation system.

### v2 Technical Details
The critical issue was **DOM ID conflicts** caused by incorrect `nextNodeId` management:

1. **The Problem**: When loading saved projects, `nextNodeId` wasn't properly synchronized with the highest existing node ID, causing new nodes to get duplicate IDs
2. **The Symptoms**: DOM conflicts led to wrong positioning, connections, and selection behavior
3. **The Solution**: 
   - **Dual-layer protection**: Fix `nextNodeId` both during project loading AND before each node creation
   - **Fail-safe design**: Even if project loading fails to set `nextNodeId` correctly, `createNode` will auto-correct it
   - **Robust ID generation**: Always ensure new nodes get truly unique IDs by scanning existing nodes

This ensures that newly created nodes after loading saved projects will always have unique IDs and proper DOM behavior.