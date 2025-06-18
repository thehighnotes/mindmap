# Fase 1: Bugfixes en Stabilisatie Mindmap Applicatie

## Doelstellingen
- Kritieke bugs oplossen die de basisfunctionaliteit verstoren
- Stabiliteit verbeteren door betere error handling
- Consistente state management implementeren
- Memory leaks voorkomen

## Prioriteit 1: Kritieke Bugs (Week 1)

### 1.1 State Management Centraliseren
- [ ] Definieer één centrale state manager in `core.js`
- [ ] Migreer alle `window.SharedState` variabelen naar globale variabelen
- [ ] Creëer getter/setter functies voor state access
- [ ] Update alle modules om de nieuwe state management te gebruiken

**Files om aan te passen:**
- `js/core.js`
- `js/connections/branches.js`
- `js/connections/interaction.js`
- `js/ui.js`

### 1.2 Branch Position Tracking Repareren
- [ ] Implementeer betrouwbare branch position tracking
- [ ] Voeg fallback waarden toe voor `branchPointRelativePosition`
- [ ] Verbeter timing van `updateBranchStartPoints()` 
- [ ] Test branch positie behoud bij node/connection beweging

**Files om aan te passen:**
- `js/connections/branches.js`
- `js/connections/geometry.js`
- `js/connections/rendering.js`

### 1.3 Missing Functions Implementeren
- [ ] Creëer `showSubtleToast()` functie in `core.js`
- [ ] Verwijder verwijzingen naar `createBranchedConnection()`
- [ ] Implementeer correcte functie mapping in module loader

**Files om aan te passen:**
- `js/core.js`
- `js/connections/branches.js`
- `js/connections/utils.js`

## Prioriteit 2: Stabiliteit Verbeteringen (Week 2)

### 2.1 Event Listener Management
- [ ] Creëer centrale event manager class
- [ ] Implementeer automatische cleanup bij component destroy
- [ ] Fix memory leaks in branch creation
- [ ] Test voor zombie event listeners

**Files om aan te passen:**
- `js/core.js` (nieuwe EventManager class)
- `js/connections/branches.js`
- `js/connections/interaction.js`
- `js/ui.js`

### 2.2 Error Handling Toevoegen
- [ ] Voeg try-catch blocks toe aan alle kritieke functies
- [ ] Implementeer graceful fallbacks voor null/undefined values
- [ ] Creëer centrale error logging functie
- [ ] Test error scenarios

**Files om aan te passen:**
- Alle connection modules
- `js/nodes.js`
- `js/export.js`

### 2.3 Z-index Management
- [ ] Definieer z-index hierarchy voor alle elementen
- [ ] Fix verbindingen die boven nodes verschijnen
- [ ] Creëer CSS classes voor layer management
- [ ] Test layering tijdens verschillende operations

**Files om aan te passen:**
- `css/styles.css`
- `js/connections/rendering.js`
- `js/nodes.js`

## Prioriteit 3: Validatie en Consistency (Week 3)

### 3.1 Node/Connection Validatie
- [ ] Implementeer validatie functies voor nodes en connections
- [ ] Check voor orphaned connections bij node delete
- [ ] Valideer branch connections bij parent delete
- [ ] Test cascade delete scenarios

**Files om aan te passen:**
- `js/nodes.js`
- `js/connections/core.js`
- `js/connections/branches.js`

### 3.2 Zoom/Pan Consistency
- [ ] Audit alle mouse position calculations
- [ ] Ensure zoom-aware positioning overal
- [ ] Fix canvas transformation bugs
- [ ] Test op verschillende zoom levels

**Files om aan te passen:**
- `js/connections/geometry.js`
- `js/connections/interaction.js`
- `js/ui.js`

### 3.3 Control Point Stabilisatie
- [ ] Fix control point "jumping" issues
- [ ] Implementeer smooth transitions
- [ ] Verbeter `preserveDirection` logic
- [ ] Test curve behavior tijdens drag operations

**Files om aan te passen:**
- `js/connections/geometry.js`
- `js/connections/rendering.js`
- `js/connections/interaction.js`

## Testing Checklist

### Functionaliteit Tests
- [ ] Nodes maken, verplaatsen, verwijderen
- [ ] Connections maken tussen nodes
- [ ] Branches maken vanaf connections
- [ ] Branch positions blijven correct na movement
- [ ] Undo/redo werkt voor alle operations
- [ ] Import/export behoudt alle data

### Stress Tests
- [ ] 100+ nodes performance
- [ ] 200+ connections performance
- [ ] Rapid create/delete cycles
- [ ] Extreme zoom levels
- [ ] Browser compatibility (Chrome, Firefox, Edge)

### Edge Cases
- [ ] Delete node met multiple connections
- [ ] Delete connection met branches
- [ ] Overlappende nodes
- [ ] Zeer lange connection paths
- [ ] Circulaire references

## Deliverables

1. **Gestabiliseerde codebase** met alle kritieke bugs opgelost
2. **Test rapport** met gevonden en opgeloste issues
3. **Documentatie updates** voor gewijzigde functionaliteit
4. **Performance baseline** metingen

## Success Criteria

- Geen crashes tijdens normale gebruikersacties
- Branch positions blijven stabiel bij alle operations
- Memory gebruik blijft constant (geen leaks)
- Alle basis functionaliteit werkt zoals verwacht
- Performance acceptabel tot 100 nodes/200 connections

## Follow-up Acties

Na succesvolle afronding van Fase 1:
- Begin met Fase 2: Feature Enhancements
- Overweeg automated testing framework
- Plan refactoring voor betere modulariteit
- Evalueer TypeScript migratie