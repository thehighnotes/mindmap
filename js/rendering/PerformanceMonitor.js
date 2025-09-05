/**
 * PerformanceMonitor - Comprehensive performance tracking and optimization suggestions
 * Monitors rendering, memory usage, and provides actionable insights
 */

class PerformanceMonitor {
    #metrics = {
        fps: {
            current: 0,
            average: 0,
            min: Infinity,
            max: 0,
            samples: []
        },
        renderTime: {
            average: 0,
            max: 0,
            samples: []
        },
        memory: {
            used: 0,
            limit: 0,
            trend: 'stable'
        },
        domOperations: {
            reads: 0,
            writes: 0,
            reflows: 0
        },
        elements: {
            nodes: 0,
            connections: 0,
            total: 0
        }
    };

    #config = {
        enableFPSMonitor: true,
        enableMemoryMonitor: true,
        enableDOMMonitor: true,
        sampleInterval: 1000, // ms
        warningThresholds: {
            fps: 30,
            renderTime: 50, // ms
            memoryUsage: 0.8, // 80% of available
            domElements: 1000
        }
    };

    #observers = {
        performance: null,
        mutation: null
    };

    #frameTimestamps = [];
    #isMonitoring = false;
    #callbacks = new Set();

    constructor(config = {}) {
        this.#config = { ...this.#config, ...config };
        this.#setupMonitoring();
    }

    // ==================== Public API ====================

    /**
     * Start monitoring
     */
    start() {
        if (this.#isMonitoring) return;
        
        this.#isMonitoring = true;
        
        if (this.#config.enableFPSMonitor) {
            this.#startFPSMonitoring();
        }
        
        if (this.#config.enableMemoryMonitor) {
            this.#startMemoryMonitoring();
        }
        
        if (this.#config.enableDOMMonitor) {
            this.#startDOMMonitoring();
        }
        
        console.log('Performance monitoring started');
    }

    /**
     * Stop monitoring
     */
    stop() {
        this.#isMonitoring = false;
        
        if (this.#observers.performance) {
            this.#observers.performance.disconnect();
        }
        
        if (this.#observers.mutation) {
            this.#observers.mutation.disconnect();
        }
        
        console.log('Performance monitoring stopped');
    }

    /**
     * Get current metrics
     */
    getMetrics() {
        return this.#deepClone(this.#metrics);
    }

    /**
     * Get performance report
     */
    getReport() {
        const metrics = this.getMetrics();
        const issues = this.#detectIssues(metrics);
        const suggestions = this.#generateSuggestions(issues);
        
        return {
            timestamp: Date.now(),
            metrics,
            issues,
            suggestions,
            score: this.#calculatePerformanceScore(metrics)
        };
    }

    /**
     * Subscribe to performance warnings
     */
    subscribe(callback) {
        this.#callbacks.add(callback);
        return () => this.#callbacks.delete(callback);
    }

    /**
     * Mark a custom performance event
     */
    mark(name, data = {}) {
        if (window.performance && window.performance.mark) {
            window.performance.mark(name);
        }
        
        // Log custom metric
        if (window.Logger) {
            window.Logger.debug(`Performance mark: ${name}`, data);
        }
    }

    /**
     * Measure between two marks
     */
    measure(name, startMark, endMark) {
        if (window.performance && window.performance.measure) {
            try {
                window.performance.measure(name, startMark, endMark);
                const measures = window.performance.getEntriesByName(name, 'measure');
                const duration = measures[measures.length - 1]?.duration || 0;
                
                if (window.Logger) {
                    window.Logger.debug(`Performance measure: ${name}`, {
                        duration: `${duration.toFixed(2)}ms`,
                        start: startMark,
                        end: endMark
                    });
                }
                
                return duration;
            } catch (e) {
                console.error('Performance measure failed:', e);
            }
        }
        return 0;
    }

    // ==================== FPS Monitoring ====================

    #startFPSMonitoring() {
        const measureFPS = () => {
            if (!this.#isMonitoring) return;
            
            const now = performance.now();
            this.#frameTimestamps.push(now);
            
            // Keep only timestamps from last second
            const oneSecondAgo = now - 1000;
            this.#frameTimestamps = this.#frameTimestamps.filter(t => t > oneSecondAgo);
            
            // Calculate FPS
            const fps = this.#frameTimestamps.length;
            this.#updateFPSMetrics(fps);
            
            requestAnimationFrame(measureFPS);
        };
        
        requestAnimationFrame(measureFPS);
    }

    #updateFPSMetrics(fps) {
        const metrics = this.#metrics.fps;
        
        metrics.current = fps;
        metrics.samples.push(fps);
        
        // Keep only last 60 samples
        if (metrics.samples.length > 60) {
            metrics.samples.shift();
        }
        
        // Update statistics
        metrics.average = metrics.samples.reduce((a, b) => a + b, 0) / metrics.samples.length;
        metrics.min = Math.min(metrics.min, fps);
        metrics.max = Math.max(metrics.max, fps);
        
        // Check for warnings
        if (fps < this.#config.warningThresholds.fps) {
            this.#emitWarning('low-fps', {
                current: fps,
                threshold: this.#config.warningThresholds.fps
            });
        }
    }

    // ==================== Memory Monitoring ====================

    #startMemoryMonitoring() {
        if (!window.performance || !window.performance.memory) {
            console.warn('Memory monitoring not supported in this browser');
            return;
        }
        
        setInterval(() => {
            if (!this.#isMonitoring) return;
            
            const memory = window.performance.memory;
            const used = memory.usedJSHeapSize;
            const limit = memory.jsHeapSizeLimit;
            
            // Update metrics
            this.#metrics.memory.used = used;
            this.#metrics.memory.limit = limit;
            
            // Calculate trend
            const usage = used / limit;
            if (usage > 0.9) {
                this.#metrics.memory.trend = 'critical';
                this.#emitWarning('high-memory', {
                    usage: `${(usage * 100).toFixed(2)}%`,
                    used: this.#formatBytes(used),
                    limit: this.#formatBytes(limit)
                });
            } else if (usage > this.#config.warningThresholds.memoryUsage) {
                this.#metrics.memory.trend = 'increasing';
            } else {
                this.#metrics.memory.trend = 'stable';
            }
            
        }, this.#config.sampleInterval);
    }

    // ==================== DOM Monitoring ====================

    #startDOMMonitoring() {
        // Monitor DOM mutations
        if (window.MutationObserver) {
            this.#observers.mutation = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    if (mutation.type === 'childList') {
                        this.#metrics.domOperations.writes += mutation.addedNodes.length;
                        this.#metrics.domOperations.writes += mutation.removedNodes.length;
                    } else if (mutation.type === 'attributes') {
                        this.#metrics.domOperations.writes++;
                    }
                });
            });
            
            const canvas = document.getElementById('canvas');
            if (canvas) {
                this.#observers.mutation.observe(canvas, {
                    childList: true,
                    attributes: true,
                    subtree: true
                });
            }
        }
        
        // Monitor element counts
        setInterval(() => {
            if (!this.#isMonitoring) return;
            
            const nodes = document.querySelectorAll('.node').length;
            const connections = document.querySelectorAll('.connection, path').length;
            const total = nodes + connections;
            
            this.#metrics.elements.nodes = nodes;
            this.#metrics.elements.connections = connections;
            this.#metrics.elements.total = total;
            
            if (total > this.#config.warningThresholds.domElements) {
                this.#emitWarning('too-many-elements', {
                    total,
                    threshold: this.#config.warningThresholds.domElements
                });
            }
        }, this.#config.sampleInterval * 5); // Check every 5 seconds
    }

    // ==================== Performance Observer ====================

    #setupMonitoring() {
        if (!window.PerformanceObserver) return;
        
        try {
            // Monitor long tasks
            this.#observers.performance = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.duration > this.#config.warningThresholds.renderTime) {
                        this.#metrics.renderTime.samples.push(entry.duration);
                        
                        if (this.#metrics.renderTime.samples.length > 100) {
                            this.#metrics.renderTime.samples.shift();
                        }
                        
                        this.#metrics.renderTime.max = Math.max(
                            this.#metrics.renderTime.max,
                            entry.duration
                        );
                        
                        this.#metrics.renderTime.average = 
                            this.#metrics.renderTime.samples.reduce((a, b) => a + b, 0) / 
                            this.#metrics.renderTime.samples.length;
                        
                        this.#emitWarning('long-task', {
                            duration: entry.duration,
                            name: entry.name
                        });
                    }
                }
            });
            
            this.#observers.performance.observe({ entryTypes: ['longtask', 'measure'] });
        } catch (e) {
            console.warn('Performance observer setup failed:', e);
        }
    }

    // ==================== Analysis ====================

    #detectIssues(metrics) {
        const issues = [];
        
        // FPS issues
        if (metrics.fps.average < this.#config.warningThresholds.fps) {
            issues.push({
                type: 'low-fps',
                severity: metrics.fps.average < 20 ? 'critical' : 'warning',
                message: `Average FPS is ${metrics.fps.average.toFixed(1)}`
            });
        }
        
        // Memory issues
        if (metrics.memory.used && metrics.memory.limit) {
            const usage = metrics.memory.used / metrics.memory.limit;
            if (usage > this.#config.warningThresholds.memoryUsage) {
                issues.push({
                    type: 'high-memory',
                    severity: usage > 0.9 ? 'critical' : 'warning',
                    message: `Memory usage at ${(usage * 100).toFixed(1)}%`
                });
            }
        }
        
        // Render time issues
        if (metrics.renderTime.average > this.#config.warningThresholds.renderTime) {
            issues.push({
                type: 'slow-render',
                severity: 'warning',
                message: `Average render time is ${metrics.renderTime.average.toFixed(1)}ms`
            });
        }
        
        // DOM complexity issues
        if (metrics.elements.total > this.#config.warningThresholds.domElements) {
            issues.push({
                type: 'dom-complexity',
                severity: 'warning',
                message: `${metrics.elements.total} DOM elements (${metrics.elements.nodes} nodes, ${metrics.elements.connections} connections)`
            });
        }
        
        return issues;
    }

    #generateSuggestions(issues) {
        const suggestions = [];
        
        issues.forEach(issue => {
            switch (issue.type) {
                case 'low-fps':
                    suggestions.push('Consider reducing the number of animated elements');
                    suggestions.push('Enable hardware acceleration for transforms');
                    suggestions.push('Use requestAnimationFrame for animations');
                    break;
                    
                case 'high-memory':
                    suggestions.push('Remove unused nodes and connections');
                    suggestions.push('Clear undo history if too large');
                    suggestions.push('Consider saving and reloading the mindmap');
                    break;
                    
                case 'slow-render':
                    suggestions.push('Enable virtual DOM rendering');
                    suggestions.push('Batch DOM updates');
                    suggestions.push('Use CSS transforms instead of position changes');
                    break;
                    
                case 'dom-complexity':
                    suggestions.push('Consider pagination or virtualization');
                    suggestions.push('Hide off-screen elements');
                    suggestions.push('Simplify connection paths');
                    break;
            }
        });
        
        return [...new Set(suggestions)]; // Remove duplicates
    }

    #calculatePerformanceScore(metrics) {
        let score = 100;
        
        // FPS score (40% weight)
        const fpsRatio = metrics.fps.average / 60;
        score -= (1 - Math.min(1, fpsRatio)) * 40;
        
        // Memory score (20% weight)
        if (metrics.memory.used && metrics.memory.limit) {
            const memoryRatio = metrics.memory.used / metrics.memory.limit;
            score -= Math.max(0, memoryRatio - 0.5) * 40; // Start penalizing above 50%
        }
        
        // Render time score (25% weight)
        const renderRatio = metrics.renderTime.average / 16; // 16ms = 60fps
        score -= Math.max(0, renderRatio - 1) * 25;
        
        // DOM complexity score (15% weight)
        const elementRatio = metrics.elements.total / 500; // Optimal under 500 elements
        score -= Math.max(0, elementRatio - 1) * 15;
        
        return Math.max(0, Math.min(100, score));
    }

    // ==================== Utilities ====================

    #emitWarning(type, data) {
        const warning = {
            type,
            data,
            timestamp: Date.now()
        };
        
        // Notify subscribers
        this.#callbacks.forEach(callback => {
            try {
                callback(warning);
            } catch (e) {
                console.error('Performance warning callback error:', e);
            }
        });
        
        // Log warning
        if (window.Logger) {
            window.Logger.warn(`Performance warning: ${type}`, data);
        }
    }

    #formatBytes(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }

    #deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
}

// ==================== Global Instance ====================

(function() {
    'use strict';
    
    // Create global performance monitor
    if (window.performance && !window.performanceMonitor) {
        window.performanceMonitor = new PerformanceMonitor({
            enableFPSMonitor: true,
            enableMemoryMonitor: true,
            enableDOMMonitor: true
        });
        
        // Auto-start monitoring
        window.performanceMonitor.start();
        
        // Subscribe to warnings
        window.performanceMonitor.subscribe((warning) => {
            console.warn('Performance issue detected:', warning);
        });
        
        // Log periodic reports
        setInterval(() => {
            const report = window.performanceMonitor.getReport();
            if (window.Logger && report.score < 80) {
                window.Logger.info('Performance Report', {
                    score: report.score.toFixed(1),
                    issues: report.issues.length,
                    suggestions: report.suggestions
                });
            }
        }, 60000); // Every minute
    }
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceMonitor;
} else {
    window.PerformanceMonitor = PerformanceMonitor;
}