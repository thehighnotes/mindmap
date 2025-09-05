/**
 * Tests for StateManager
 */

describe('StateManager', () => {
    let stateManager;

    beforeEach(() => {
        stateManager = new StateManager();
    });

    describe('Node Operations', () => {
        test('should add a node', () => {
            const node = {
                id: 'node-1',
                title: 'Test Node',
                x: 100,
                y: 200,
                color: '#4CAF50',
                shape: 'rounded'
            };

            stateManager.addNode(node);
            
            const retrievedNode = stateManager.getNode('node-1');
            expect(retrievedNode).toEqual(node);
        });

        test('should update a node', () => {
            const node = {
                id: 'node-1',
                title: 'Original Title',
                x: 100,
                y: 200
            };

            stateManager.addNode(node);
            stateManager.updateNode('node-1', { title: 'Updated Title', x: 150 });

            const updatedNode = stateManager.getNode('node-1');
            expect(updatedNode.title).toBe('Updated Title');
            expect(updatedNode.x).toBe(150);
            expect(updatedNode.y).toBe(200); // Unchanged
        });

        test('should remove a node', () => {
            const node = { id: 'node-1', title: 'Test' };
            
            stateManager.addNode(node);
            expect(stateManager.getNode('node-1')).toBeTruthy();
            
            stateManager.removeNode('node-1');
            expect(stateManager.getNode('node-1')).toBeUndefined();
        });

        test('should get all nodes', () => {
            stateManager.addNode({ id: 'node-1', title: 'Node 1' });
            stateManager.addNode({ id: 'node-2', title: 'Node 2' });
            stateManager.addNode({ id: 'node-3', title: 'Node 3' });

            const nodes = stateManager.getNodes();
            expect(nodes).toHaveLength(3);
            expect(nodes.map(n => n.id)).toContain('node-1');
            expect(nodes.map(n => n.id)).toContain('node-2');
            expect(nodes.map(n => n.id)).toContain('node-3');
        });

        test('should throw error when adding node without id', () => {
            expect(() => {
                stateManager.addNode({ title: 'No ID' });
            }).toThrow('Node must have an id');
        });
    });

    describe('Connection Operations', () => {
        beforeEach(() => {
            // Add nodes for connections
            stateManager.addNode({ id: 'node-1', title: 'Node 1', x: 0, y: 0 });
            stateManager.addNode({ id: 'node-2', title: 'Node 2', x: 100, y: 100 });
        });

        test('should add a connection', () => {
            const connection = {
                id: 'conn-1',
                from: 'node-1',
                to: 'node-2',
                type: 'default'
            };

            stateManager.addConnection(connection);
            
            const retrievedConn = stateManager.getConnection('conn-1');
            expect(retrievedConn).toEqual(connection);
        });

        test('should update a connection', () => {
            const connection = {
                id: 'conn-1',
                from: 'node-1',
                to: 'node-2',
                label: 'Original'
            };

            stateManager.addConnection(connection);
            stateManager.updateConnection('conn-1', { label: 'Updated' });

            const updated = stateManager.getConnection('conn-1');
            expect(updated.label).toBe('Updated');
        });

        test('should remove a connection', () => {
            const connection = { id: 'conn-1', from: 'node-1', to: 'node-2' };
            
            stateManager.addConnection(connection);
            expect(stateManager.getConnection('conn-1')).toBeTruthy();
            
            stateManager.removeConnection('conn-1');
            expect(stateManager.getConnection('conn-1')).toBeUndefined();
        });

        test('should remove connections when node is deleted', () => {
            stateManager.addConnection({ id: 'conn-1', from: 'node-1', to: 'node-2' });
            stateManager.addConnection({ id: 'conn-2', from: 'node-2', to: 'node-1' });
            
            stateManager.removeNode('node-1');
            
            expect(stateManager.getConnection('conn-1')).toBeUndefined();
            expect(stateManager.getConnection('conn-2')).toBeUndefined();
        });
    });

    describe('UI State', () => {
        test('should update UI state', () => {
            stateManager.updateUI({
                selectedNode: 'node-1',
                zoomLevel: 1.5,
                currentTool: 'connection'
            });

            const uiState = stateManager.getUIState();
            expect(uiState.selectedNode).toBe('node-1');
            expect(uiState.zoomLevel).toBe(1.5);
            expect(uiState.currentTool).toBe('connection');
        });

        test('should maintain other UI properties when updating', () => {
            const initialUI = stateManager.getUIState();
            const initialOffset = initialUI.offset;

            stateManager.updateUI({ selectedNode: 'node-1' });

            const updatedUI = stateManager.getUIState();
            expect(updatedUI.selectedNode).toBe('node-1');
            expect(updatedUI.offset).toEqual(initialOffset);
        });
    });

    describe('History Management', () => {
        test('should undo last action', () => {
            stateManager.addNode({ id: 'node-1', title: 'Node 1', x: 0, y: 0 });
            stateManager.addNode({ id: 'node-2', title: 'Node 2', x: 100, y: 100 });
            
            expect(stateManager.getNodes()).toHaveLength(2);
            
            stateManager.undo();
            expect(stateManager.getNodes()).toHaveLength(1);
            expect(stateManager.getNode('node-2')).toBeUndefined();
        });

        test('should redo after undo', () => {
            stateManager.addNode({ id: 'node-1', title: 'Node 1', x: 0, y: 0 });
            
            stateManager.undo();
            expect(stateManager.getNodes()).toHaveLength(0);
            
            stateManager.redo();
            expect(stateManager.getNodes()).toHaveLength(1);
            expect(stateManager.getNode('node-1')).toBeTruthy();
        });

        test('should clear future on new action after undo', () => {
            stateManager.addNode({ id: 'node-1', title: 'Node 1', x: 0, y: 0 });
            stateManager.addNode({ id: 'node-2', title: 'Node 2', x: 100, y: 100 });
            
            stateManager.undo(); // Remove node-2
            stateManager.addNode({ id: 'node-3', title: 'Node 3', x: 200, y: 200 });
            
            const result = stateManager.redo();
            expect(result).toBe(false); // No redo available
            
            expect(stateManager.getNodes()).toHaveLength(2);
            expect(stateManager.getNode('node-1')).toBeTruthy();
            expect(stateManager.getNode('node-3')).toBeTruthy();
            expect(stateManager.getNode('node-2')).toBeUndefined();
        });

        test('should limit history size', () => {
            const maxSize = 50; // Default max history size
            
            for (let i = 0; i < maxSize + 10; i++) {
                stateManager.addNode({ id: `node-${i}`, title: `Node ${i}`, x: i, y: i });
            }
            
            // Try to undo beyond max history
            let undoCount = 0;
            while (stateManager.undo()) {
                undoCount++;
            }
            
            expect(undoCount).toBeLessThanOrEqual(maxSize);
        });
    });

    describe('Subscriptions', () => {
        test('should notify subscribers on state change', (done) => {
            const callback = jest.fn((change) => {
                expect(change.type).toBe('ADD_NODE');
                expect(change.payload.id).toBe('node-1');
                done();
            });

            stateManager.subscribe('ADD_NODE', callback);
            stateManager.addNode({ id: 'node-1', title: 'Test', x: 0, y: 0 });
        });

        test('should support wildcard subscriptions', () => {
            const callback = jest.fn();
            
            stateManager.subscribeAll(callback);
            
            stateManager.addNode({ id: 'node-1', title: 'Test', x: 0, y: 0 });
            stateManager.updateNode('node-1', { title: 'Updated' });
            stateManager.removeNode('node-1');
            
            expect(callback).toHaveBeenCalledTimes(3);
        });

        test('should unsubscribe correctly', () => {
            const callback = jest.fn();
            
            const unsubscribe = stateManager.subscribe('ADD_NODE', callback);
            
            stateManager.addNode({ id: 'node-1', title: 'Test', x: 0, y: 0 });
            expect(callback).toHaveBeenCalledTimes(1);
            
            unsubscribe();
            
            stateManager.addNode({ id: 'node-2', title: 'Test 2', x: 100, y: 100 });
            expect(callback).toHaveBeenCalledTimes(1); // Still 1, not called again
        });
    });

    describe('Transactions', () => {
        test('should batch changes in transaction', () => {
            const callback = jest.fn();
            stateManager.subscribeAll(callback);
            
            stateManager.transaction(() => {
                stateManager.addNode({ id: 'node-1', title: 'Node 1', x: 0, y: 0 });
                stateManager.addNode({ id: 'node-2', title: 'Node 2', x: 100, y: 100 });
                stateManager.addConnection({ id: 'conn-1', from: 'node-1', to: 'node-2' });
            });
            
            // Should receive one batched notification
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledWith({
                type: 'TRANSACTION_COMMIT',
                changes: expect.arrayContaining([
                    expect.objectContaining({ type: 'ADD_NODE' }),
                    expect.objectContaining({ type: 'ADD_NODE' }),
                    expect.objectContaining({ type: 'ADD_CONNECTION' })
                ])
            });
        });
    });

    describe('Computed Properties', () => {
        test('should compute derived values', () => {
            const nodeCount = stateManager.computed('nodeCount', (state) => {
                return state.nodes.size;
            });
            
            expect(nodeCount.get()).toBe(0);
            
            stateManager.addNode({ id: 'node-1', title: 'Node 1', x: 0, y: 0 });
            expect(nodeCount.get()).toBe(1);
            
            stateManager.addNode({ id: 'node-2', title: 'Node 2', x: 100, y: 100 });
            expect(nodeCount.get()).toBe(2);
            
            stateManager.removeNode('node-1');
            expect(nodeCount.get()).toBe(1);
        });

        test('should cache computed values', () => {
            const computeFn = jest.fn((state) => state.nodes.size);
            const nodeCount = stateManager.computed('nodeCount', computeFn);
            
            // Access multiple times
            nodeCount.get();
            nodeCount.get();
            nodeCount.get();
            
            // Should only compute once
            expect(computeFn).toHaveBeenCalledTimes(1);
            
            // After state change, should recompute
            stateManager.addNode({ id: 'node-1', title: 'Node 1', x: 0, y: 0 });
            nodeCount.get();
            
            expect(computeFn).toHaveBeenCalledTimes(2);
        });
    });

    describe('Persistence', () => {
        test('should mark state as dirty on changes', () => {
            expect(stateManager.isDirty()).toBe(false);
            
            stateManager.addNode({ id: 'node-1', title: 'Node 1', x: 0, y: 0 });
            expect(stateManager.isDirty()).toBe(true);
            
            stateManager.markClean();
            expect(stateManager.isDirty()).toBe(false);
        });

        test('should serialize state', () => {
            stateManager.addNode({ id: 'node-1', title: 'Node 1', x: 0, y: 0 });
            stateManager.addConnection({ id: 'conn-1', from: 'node-1', to: 'node-1' });
            
            const serialized = stateManager.serialize();
            
            expect(serialized.nodes).toHaveLength(1);
            expect(serialized.connections).toHaveLength(1);
            expect(serialized.metadata).toBeDefined();
            expect(serialized.ui).toBeDefined();
        });

        test('should deserialize state', () => {
            const data = {
                nodes: [
                    { id: 'node-1', title: 'Node 1', x: 0, y: 0 },
                    { id: 'node-2', title: 'Node 2', x: 100, y: 100 }
                ],
                connections: [
                    { id: 'conn-1', from: 'node-1', to: 'node-2' }
                ]
            };
            
            stateManager.deserialize(data);
            
            expect(stateManager.getNodes()).toHaveLength(2);
            expect(stateManager.getConnections()).toHaveLength(1);
            expect(stateManager.getNode('node-1')).toBeTruthy();
            expect(stateManager.getConnection('conn-1')).toBeTruthy();
        });
    });

    describe('Middleware', () => {
        test('should apply middleware to actions', () => {
            const middleware = jest.fn((action, state) => {
                // Modify action
                if (action.type === 'ADD_NODE') {
                    return {
                        ...action,
                        payload: {
                            ...action.payload,
                            modified: true
                        }
                    };
                }
                return action;
            });
            
            stateManager.use(middleware);
            
            stateManager.addNode({ id: 'node-1', title: 'Test', x: 0, y: 0 });
            
            expect(middleware).toHaveBeenCalled();
            
            const node = stateManager.getNode('node-1');
            expect(node.modified).toBe(true);
        });

        test('should allow middleware to cancel actions', () => {
            const middleware = (action, state) => {
                if (action.type === 'REMOVE_NODE') {
                    // Cancel deletion
                    return null;
                }
                return action;
            };
            
            stateManager.use(middleware);
            
            stateManager.addNode({ id: 'node-1', title: 'Test', x: 0, y: 0 });
            stateManager.removeNode('node-1');
            
            // Node should still exist
            expect(stateManager.getNode('node-1')).toBeTruthy();
        });
    });

    describe('Error Handling', () => {
        test('should handle errors in subscribers gracefully', () => {
            const errorCallback = jest.fn(() => {
                throw new Error('Subscriber error');
            });
            
            const normalCallback = jest.fn();
            
            // Mock console.error to prevent test output noise
            const originalConsoleError = console.error;
            console.error = jest.fn();
            
            stateManager.subscribe('ADD_NODE', errorCallback);
            stateManager.subscribe('ADD_NODE', normalCallback);
            
            // Should not throw
            expect(() => {
                stateManager.addNode({ id: 'node-1', title: 'Test', x: 0, y: 0 });
            }).not.toThrow();
            
            // Normal callback should still be called
            expect(normalCallback).toHaveBeenCalled();
            
            // Restore console.error
            console.error = originalConsoleError;
        });
    });

    describe('Deep Cloning', () => {
        test('should return immutable copies of state', () => {
            stateManager.addNode({ id: 'node-1', title: 'Test', x: 0, y: 0 });
            
            const node1 = stateManager.getNode('node-1');
            const node2 = stateManager.getNode('node-1');
            
            // Should be equal but not the same reference
            expect(node1).toEqual(node2);
            expect(node1).not.toBe(node2);
            
            // Modifying returned object should not affect state
            node1.title = 'Modified';
            
            const node3 = stateManager.getNode('node-1');
            expect(node3.title).toBe('Test');
        });
    });
});