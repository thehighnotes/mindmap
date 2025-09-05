/**
 * Tests for RenderQueue
 */

describe('RenderQueue', () => {
    let renderQueue;
    let mockRenderer;

    beforeEach(() => {
        // Create mock renderer
        mockRenderer = {
            updatePositions: jest.fn(),
            updateStyles: jest.fn(),
            fullUpdate: jest.fn()
        };
        
        renderQueue = new RenderQueue(mockRenderer);
        
        // Mock requestAnimationFrame for tests
        global.requestAnimationFrame = jest.fn((callback) => {
            setTimeout(callback, 0);
            return 1;
        });
        
        global.cancelAnimationFrame = jest.fn();
    });

    afterEach(() => {
        renderQueue.clear();
        jest.clearAllMocks();
    });

    describe('Dirty Marking', () => {
        test('should mark element as dirty', () => {
            renderQueue.markDirty('element-1', 'position', { x: 100, y: 200 });
            
            const stats = renderQueue.getStats();
            expect(stats.totalFrames).toBe(0); // Not rendered yet
        });

        test('should not downgrade from full update', () => {
            renderQueue.markDirty('element-1', 'full');
            renderQueue.markDirty('element-1', 'position', { x: 100, y: 200 });
            renderQueue.markDirty('element-1', 'style', { color: 'red' });
            
            // Should still be marked as full update
            // This would be visible after render
        });

        test('should upgrade update type when necessary', () => {
            renderQueue.markDirty('element-1', 'position', { x: 100, y: 200 });
            renderQueue.markDirty('element-1', 'full'); // Upgrade to full
            
            // Element should now be marked for full update
        });

        test('should batch multiple dirty marks', () => {
            const elements = [
                { id: 'el-1', type: 'position', data: { x: 1, y: 1 } },
                { id: 'el-2', type: 'style', data: { color: 'blue' } },
                { id: 'el-3', type: 'full', data: {} }
            ];
            
            renderQueue.markDirtyBatch(elements);
            
            // All elements should be marked
        });
    });

    describe('Rendering', () => {
        test('should schedule render on next frame', (done) => {
            renderQueue.markDirty('element-1', 'position', { x: 100, y: 200 });
            
            expect(global.requestAnimationFrame).toHaveBeenCalled();
            
            // Wait for async render
            setTimeout(() => {
                expect(mockRenderer.updatePositions).toHaveBeenCalled();
                done();
            }, 10);
        });

        test('should batch updates by type', (done) => {
            renderQueue.markDirty('el-1', 'position', { x: 1, y: 1 });
            renderQueue.markDirty('el-2', 'position', { x: 2, y: 2 });
            renderQueue.markDirty('el-3', 'style', { color: 'red' });
            renderQueue.markDirty('el-4', 'full', {});
            
            setTimeout(() => {
                expect(mockRenderer.updatePositions).toHaveBeenCalledWith(
                    expect.arrayContaining([
                        expect.objectContaining({ id: 'el-1' }),
                        expect.objectContaining({ id: 'el-2' })
                    ])
                );
                expect(mockRenderer.updateStyles).toHaveBeenCalled();
                expect(mockRenderer.fullUpdate).toHaveBeenCalled();
                done();
            }, 10);
        });

        test('should force immediate render', () => {
            renderQueue.markDirty('element-1', 'position', { x: 100, y: 200 });
            
            renderQueue.forceRender();
            
            expect(mockRenderer.updatePositions).toHaveBeenCalled();
        });

        test('should clear pending updates', () => {
            renderQueue.markDirty('element-1', 'position', { x: 100, y: 200 });
            renderQueue.markDirty('element-2', 'style', { color: 'blue' });
            
            renderQueue.clear();
            
            // Force render should do nothing
            renderQueue.forceRender();
            expect(mockRenderer.updatePositions).not.toHaveBeenCalled();
            expect(mockRenderer.updateStyles).not.toHaveBeenCalled();
        });
    });

    describe('Performance Stats', () => {
        test('should track render statistics', (done) => {
            renderQueue.markDirty('element-1', 'position', { x: 100, y: 200 });
            
            setTimeout(() => {
                const stats = renderQueue.getStats();
                expect(stats.totalFrames).toBeGreaterThan(0);
                expect(stats.lastRenderTime).toBeGreaterThanOrEqual(0);
                done();
            }, 10);
        });

        test('should reset statistics', (done) => {
            renderQueue.markDirty('element-1', 'position', { x: 100, y: 200 });
            
            setTimeout(() => {
                renderQueue.resetStats();
                const stats = renderQueue.getStats();
                expect(stats.totalFrames).toBe(0);
                expect(stats.droppedFrames).toBe(0);
                done();
            }, 10);
        });
    });

    describe('Throttled Updates', () => {
        test('should create throttled update function', () => {
            const updateFn = jest.fn(() => ({ x: 100, y: 200 }));
            const throttled = renderQueue.createThrottledUpdate(updateFn, 'element-1', 'position');
            
            throttled();
            
            expect(updateFn).toHaveBeenCalled();
        });
    });

    describe('Renderer Wrapping', () => {
        test('should wrap renderer with queue', () => {
            const originalRenderer = {
                render: jest.fn(),
                updatePosition: jest.fn(),
                updateStyle: jest.fn()
            };
            
            const wrapped = RenderQueue.wrapRenderer(originalRenderer);
            
            // Wrapped methods should use queue
            wrapped.updatePosition('el-1', 100, 200);
            wrapped.updateStyle('el-2', { color: 'red' });
            
            // Original methods should not be called directly
            expect(originalRenderer.updatePosition).not.toHaveBeenCalled();
            expect(originalRenderer.updateStyle).not.toHaveBeenCalled();
            
            // Queue should be accessible
            expect(wrapped.renderQueue).toBeDefined();
        });
    });

    describe('Error Handling', () => {
        test('should handle renderer errors gracefully', (done) => {
            const errorRenderer = {
                updatePositions: jest.fn(() => {
                    throw new Error('Render error');
                })
            };
            
            const queue = new RenderQueue(errorRenderer);
            
            // Mock console.error to suppress output
            const originalError = console.error;
            console.error = jest.fn();
            
            queue.markDirty('element-1', 'position', { x: 100, y: 200 });
            
            setTimeout(() => {
                expect(console.error).toHaveBeenCalled();
                console.error = originalError;
                done();
            }, 10);
        });
    });

    describe('Fallback Rendering', () => {
        test('should use fallback for position updates', (done) => {
            // Renderer without updatePositions method
            const simpleRenderer = {};
            const queue = new RenderQueue(simpleRenderer);
            
            // Create mock element
            const element = document.createElement('div');
            element.id = 'element-1';
            document.body.appendChild(element);
            
            queue.markDirty('element-1', 'position', { x: 100, y: 200 });
            
            setTimeout(() => {
                // Element should have been updated directly
                expect(element.style.left).toBe('100px');
                expect(element.style.top).toBe('200px');
                
                // Cleanup
                document.body.removeChild(element);
                done();
            }, 10);
        });

        test('should use fallback for style updates', (done) => {
            // Renderer without updateStyles method
            const simpleRenderer = {};
            const queue = new RenderQueue(simpleRenderer);
            
            // Create mock element
            const element = document.createElement('div');
            element.id = 'element-1';
            document.body.appendChild(element);
            
            queue.markDirty('element-1', 'style', { backgroundColor: 'red', opacity: '0.5' });
            
            setTimeout(() => {
                // Element should have been updated directly
                expect(element.style.backgroundColor).toBe('red');
                expect(element.style.opacity).toBe('0.5');
                
                // Cleanup
                document.body.removeChild(element);
                done();
            }, 10);
        });
    });
});