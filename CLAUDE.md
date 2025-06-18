# CLAUDE.md

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with the Mindmap Brainstorm Tool repository.

## Project Overview

A sophisticated web-based mindmap visualization tool built with vanilla JavaScript, featuring advanced node and connection management, interactive editing capabilities, and various export/import options. The application is fully Dutch-localized ("Nederlands" / NL).

## Build/Run Commands
- **Run the app**: Open `index.html` in a modern web browser (Chrome, Firefox, Edge recommended)
- **Development Server**: Use any static file server (e.g., `python -m http.server`, `live-server`, VS Code Live Server)
- **Testing**: Manual testing through browser (no automated test suite detected)
- **Build Process**: None required - pure vanilla JavaScript application

## Architecture Overview

### Core Architecture Pattern
The application follows a modular architecture with clear separation of concerns:
- **State Management**: Centralized in `core.js` with global state variables
- **Component-based Structure**: Separate modules for nodes, connections, UI, and export functionality
- **Event-driven System**: Heavy use of event listeners and delegation patterns
- **DOM Manipulation**: Direct DOM manipulation without framework dependencies
- **Canvas-based Rendering**: Uses absolute positioning within a large canvas area

### Technology Stack
- **Frontend**: Pure vanilla JavaScript (ES6+)
- **Styling**: Single comprehensive CSS file with modern CSS3 features
- **Build Tools**: None - the application runs directly in the browser
- **Dependencies**: None - completely self-contained

## Directory Structure

```
mindmap/
├── CLAUDE.md                 # Project documentation for Claude
├── css/
│   └── styles.css           # All application styles
├── index.html               # Main HTML entry point
└── js/
    ├── app.js               # Application initialization
    ├── core.js              # Core state management and utilities
    ├── nodes.js             # Node management functionality
    ├── connections/         # Connection module (subdivided for complexity)
    │   ├── branches.js      # Branch connection functionality
    │   ├── core.js          # Core connection creation/deletion
    │   ├── editor.js        # Connection editing UI
    │   ├── geometry.js      # Geometric calculations
    │   ├── interaction.js   # User interaction handlers
    │   ├── rendering.js     # Visual rendering logic
    │   └── utils.js         # Utility functions
    ├── ui.js                # UI event handlers and interactions
    └── export.js            # Import/export functionality
```

## Core Components

### 1. State Management (`js/core.js`)
**Purpose**: Central state store and global configuration

**Key Responsibilities**:
- Global state variables for all application data
- Canvas initialization and configuration
- Basic operations (clear, center, zoom)
- Undo/redo stack management
- DOM reference initialization

**State Variables**:
- `nodes`: Array of all node objects
- `connections`: Array of all connection objects
- `currentTool`: Currently selected tool
- `undoStack`: Array for undo functionality
- `zoomLevel`, `canvasOffset`: View transformation state
- `currentSelectedNode/Connection`: Selection state

**Key Functions**:
- `initializeReferences()`: Sets up all DOM element references
- `initCanvas()`: Initializes the drawing canvas
- `saveStateForUndo()`: Captures state for undo functionality
- `undoLastAction()`: Reverts to previous state
- `updateCanvasTransform()`: Applies zoom and pan transformations

### 2. Node Management (`js/nodes.js`)
**Purpose**: Handle all node-related operations

**Key Responsibilities**:
- Node creation, editing, deletion
- Shape and style management
- Drag and drop functionality
- Context menu operations

**Data Structure**:
```javascript
{
    id: "node-1",
    title: "Node Title",
    content: "Optional content",
    color: "#4CAF50",
    x: 100,
    y: 200,
    shape: "rounded", // rectangle, rounded, circle, diamond
    isRoot: false
}
```

**Key Functions**:
- `createNode()`: Creates new node with specified properties
- `deleteNode()`: Removes node and its connections
- `makeEditable()`: Enables inline title editing
- `handleNodeMouseDown()`: Manages drag operations
- `arrangeNodes()`: Auto-layout algorithm

### 3. Connection System (`js/connections/`)
**Purpose**: Complex connection management split into multiple modules

#### 3.1 Core (`connections/core.js`)
- `createConnection()`: Creates connection between nodes
- `deleteConnection()`: Removes connection and cleans up
- `refreshConnections()`: Updates all connection visuals

#### 3.2 Geometry (`connections/geometry.js`)
- `getNodeCenter()`: Calculates node center points
- `getNodeEdgePoint()`: Finds edge intersection points
- `calculatePointOnConnection()`: Bezier curve calculations
- `recalculateControlPoint()`: Optimizes curve control points

#### 3.3 Rendering (`connections/rendering.js`)
- `drawConnection()`: Main rendering function
- `updateConnectionPath()`: Updates SVG paths
- Complex SVG generation with interactive zones

#### 3.4 Interaction (`connections/interaction.js`)
- `startConnectionDrag()`: Handles curve manipulation
- `highlightConnectionPath()`: Visual feedback
- Control point dragging logic

#### 3.5 Branches (`connections/branches.js`)
- `startBranchFromConnection()`: Creates Y-branches
- `updateBranchStartPoints()`: Maintains branch positions
- Relative positioning on parent connections

#### 3.6 Editor (`connections/editor.js`)
- `openConnectionEditor()`: Modal for connection properties
- `setConnectionStyle()`: Updates visual properties
- Label and style management

### 4. UI Management (`js/ui.js`)
**Purpose**: User interface event handling and interactions

**Key Responsibilities**:
- Mouse and keyboard event handling
- Tool selection and mode switching
- Context menu management
- Modal dialog control
- Zoom and pan operations

**Key Functions**:
- `handleMouseMove/Up()`: Mouse event processing
- `setupEventListeners()`: Initializes all UI events
- `selectNode/Connection()`: Selection management
- `setupCtrlConnectMode()`: CTRL+click connection creation

### 5. Export/Import (`js/export.js`)
**Purpose**: Data persistence and interoperability

**Supported Formats**:
- JSON: Full project save/load
- Mermaid: Flowchart syntax export/import
- PNG: Image export with full rendering

**Key Functions**:
- `exportToJson()`: Serializes complete state
- `importFromJson()`: Restores from file
- `exportToMermaid()`: Converts to Mermaid syntax
- `exportAsImage()`: Canvas to PNG conversion

### 6. Application Entry (`js/app.js`)
**Purpose**: Application bootstrap and initialization

**Initialization Sequence**:
1. Wait for DOM ready
2. Initialize DOM references
3. Set up canvas
4. Install event listeners
5. Create initial mindmap structure
6. Show welcome message

## Key Features

### Node Features
- Multiple shapes (rectangle, rounded, circle, diamond)
- Custom colors
- Inline title editing
- Drag and drop positioning
- Quick child creation (+buttons)
- Context menu operations
- Root node designation

### Connection Features
- Curved bezier connections
- Y-branches from existing connections
- Intermediate node insertion
- Connection labels
- Style options (solid, dashed)
- Type designation (primary, secondary)
- Interactive curve manipulation
- Branch points on connections

### Navigation Features
- Pan (space + drag or middle mouse)
- Zoom (mouse wheel or buttons)
- Minimap overview
- Grid snapping
- Auto-layout algorithm
- Center view

### Editing Features
- Double-click inline editing
- Context menus
- Modal editors
- Undo/redo functionality
- Keyboard shortcuts
- CTRL+click connections

### Export/Import
- JSON project files
- Mermaid diagram syntax
- PNG image export
- Full state preservation

## Code Style Guidelines

### JavaScript Conventions
- Use `const`/`let`, avoid `var`
- CamelCase for functions and variables
- Descriptive naming (e.g., `updateBranchStartPoints`)
- Prefix private with underscore (rarely used)
- DOM elements suffixed with `El`
- Comprehensive error handling with try/catch

### CSS Conventions
- BEM-like naming for components
- CSS custom properties for theming
- Transitions for smooth interactions
- Z-index management for layering
- Responsive design considerations

### DOM Patterns
- Store references at initialization
- Event delegation where possible
- Use data attributes for state
- Minimize reflows/repaints
- requestAnimationFrame for animations

## Development Guidelines

### Adding New Features
1. Identify appropriate module (nodes, connections, UI, etc.)
2. Follow existing patterns in that module
3. Update state management in `core.js` if needed
4. Add event handlers in `ui.js`
5. Ensure undo/redo support
6. Test all interaction modes

### Modifying Connections
1. Start with `connections/geometry.js` for calculations
2. Update `connections/rendering.js` for visuals
3. Add interactions in `connections/interaction.js`
4. Handle special cases in `connections/branches.js`

### State Management
1. Always save state before modifications
2. Update both data structures and DOM
3. Call appropriate refresh functions
4. Maintain consistency across modules

### Performance Considerations
- Use requestAnimationFrame for animations
- Batch DOM updates where possible
- Cache repeated calculations
- Optimize connection refresh calls
- Lazy load heavy operations

## Localization

The application is fully localized in Dutch (Nederlands):
- All UI text in Dutch
- Comments primarily in Dutch
- Variable names in English
- Error messages in Dutch

Key Dutch terms:
- Knooppunt = Node
- Verbinding = Connection
- Bewerken = Edit
- Opslaan = Save
- Laden = Load
- Vertakking = Branch
- Hoofdknooppunt = Root node

## Common Tasks

### Adding a New Tool
1. Add button to toolbar in `index.html`
2. Add tool handler in `ui.js`
3. Update `currentTool` state in `core.js`
4. Implement tool logic in appropriate module
5. Add keyboard shortcut if needed

### Creating Custom Node Shapes
1. Define shape in `nodes.js` createNode()
2. Add rendering logic in node creation
3. Update shape calculations in `connections/geometry.js`
4. Add shape option to node editor modal

### Implementing New Export Format
1. Add export function in `export.js`
2. Create format conversion logic
3. Add UI button in `index.html`
4. Wire up event handler in `ui.js`

## Testing Approach

Since there's no automated test suite:
1. Manual testing in multiple browsers
2. Test all tools and interaction modes
3. Verify undo/redo for all operations
4. Check export/import round trips
5. Test edge cases (empty mindmap, single node, etc.)
6. Performance test with large mindmaps

## Browser Compatibility

Target browsers:
- Chrome 80+
- Firefox 75+
- Edge 80+
- Safari 13+

Key APIs used:
- ES6+ features
- SVG manipulation
- Blob API for exports
- FileReader API
- Local file system access

## Known Issues and Limitations

1. No backend persistence (browser only)
2. Large mindmaps may impact performance
3. No collaborative editing features
4. Limited mobile/touch support
5. No automated testing framework

## Refactoring Status (Connections Module)

During a refactoring attempt to modularize the connections.js file (saved as connections.js.backup), several issues were identified:

### Missing Functions in Refactored Code
1. **`updateTempBranchPath()`** - Called but not defined in branches.js
2. **`highlightPotentialTargets()`** - Called but not defined
3. **`clearHighlightedTargets()`** - Called but not defined  
4. **`findNodeAtPosition()`** - Called but not defined
5. **`createBranchedConnection()`** - Complete implementation missing

### Missing Global Variables
1. **`isCreatingBranch`** - Used in branches.js but not declared globally

### Incomplete Implementations
1. **`startBranchFromConnection()`** - Has two versions in backup:
   - New version using `startBranchDrag`
   - Original version for compatibility
   - Refactored version is incomplete

2. **Event handlers in `startBranchDrag()`** - Missing proper implementations for:
   - Mouse movement tracking
   - Node highlighting
   - Branch creation logic

### Core Issues
- The refactored code splits functionality across modules but loses critical helper functions
- Global state management is inconsistent between modules
- Some functions assume access to global DOM references (like `canvas`)
- Missing visual feedback functions for better UX

### Resolution Implemented
The refactoring has been completed with the following fixes:

1. **Added missing global variable** (`isCreatingBranch`) to `core.js`

2. **Implemented all missing helper functions** in `branches.js`:
   - `updateTempBranchPath()` - Updates temporary branch path visualization
   - `findNodeAtPosition()` - Finds node at given coordinates
   - `highlightPotentialTargets()` - Highlights potential target nodes during drag
   - `clearHighlightedTargets()` - Clears all node highlights

3. **Completed event handlers** in `startBranchDrag()`:
   - Added proper mouse position calculation using `canvas.getBoundingClientRect()`
   - Added keyboard handler for ESC key to cancel branch creation
   - Cleaned up event listeners on completion

4. **Fixed branch creation logic**:
   - Removed dependency on missing `createBranchedConnection()`
   - Implemented direct branch creation in `handleMouseUp`
   - Proper branch configuration with all required properties

5. **Cross-module dependencies resolved**:
   - All functions now have access to required global variables
   - Proper DOM element references maintained
   - Consistent state management across modules

### Remaining Tasks
1. Test the complete refactoring with actual usage
2. Verify all branch operations work as expected
3. Check that undo/redo functionality remains intact

## Future Enhancement Opportunities

1. Add backend storage integration
2. Implement collaborative editing
3. Add more export formats (PDF, SVG)
4. Improve mobile responsiveness
5. Add automated testing
6. Implement proper touch/gesture support
7. Add animation effects
8. Create node templates library
9. Add search/filter functionality
10. Implement connection routing algorithms