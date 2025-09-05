/**
 * Babel Configuration
 * Transpiles modern JavaScript to compatible code
 */

module.exports = {
    presets: [
        [
            '@babel/preset-env',
            {
                targets: {
                    // Target Electron 13+ and modern browsers
                    electron: '13.0',
                    chrome: '91',
                    firefox: '89',
                    safari: '14'
                },
                modules: false, // Let webpack handle modules
                useBuiltIns: 'usage',
                corejs: 3,
                debug: false
            }
        ]
    ],
    
    plugins: [
        // Stage 3 proposals
        '@babel/plugin-proposal-class-properties',
        '@babel/plugin-proposal-private-methods',
        '@babel/plugin-proposal-private-property-in-object',
        
        // Modern syntax support
        '@babel/plugin-proposal-optional-chaining',
        '@babel/plugin-proposal-nullish-coalescing-operator',
        '@babel/plugin-proposal-logical-assignment-operators',
        '@babel/plugin-proposal-numeric-separator',
        
        // Async/await optimization
        '@babel/plugin-transform-runtime',
        
        // Dynamic imports
        '@babel/plugin-syntax-dynamic-import',
        
        // Decorators (if needed in future)
        ['@babel/plugin-proposal-decorators', { legacy: true }]
    ],
    
    env: {
        development: {
            plugins: [
                // Better debugging in development
                '@babel/plugin-transform-react-jsx-source'
            ]
        },
        
        production: {
            plugins: [
                // Remove console.logs in production
                ['transform-remove-console', {
                    exclude: ['error', 'warn']
                }]
            ]
        },
        
        test: {
            presets: [
                ['@babel/preset-env', {
                    targets: { node: 'current' }
                }]
            ]
        }
    }
};