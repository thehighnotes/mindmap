/**
 * Webpack Configuration for Mindmap Application
 * Enables modern JavaScript features and module bundling
 */

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
    mode: isDevelopment ? 'development' : 'production',
    
    entry: {
        app: './src/index.js',
        // Separate vendor bundle for libraries (if we add any)
        vendor: ['./src/polyfills.js']
    },
    
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: isDevelopment ? '[name].js' : '[name].[contenthash:8].js',
        chunkFilename: isDevelopment ? '[name].chunk.js' : '[name].[contenthash:8].chunk.js',
        publicPath: '/',
        clean: true
    },
    
    devtool: isDevelopment ? 'eval-source-map' : 'source-map',
    
    module: {
        rules: [
            // JavaScript/ES6+ transpilation
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            ['@babel/preset-env', {
                                targets: {
                                    electron: '13.0'
                                },
                                modules: false,
                                useBuiltIns: 'usage',
                                corejs: 3
                            }]
                        ],
                        plugins: [
                            '@babel/plugin-proposal-class-properties',
                            '@babel/plugin-proposal-private-methods',
                            '@babel/plugin-proposal-optional-chaining',
                            '@babel/plugin-proposal-nullish-coalescing-operator',
                            '@babel/plugin-syntax-dynamic-import'
                        ]
                    }
                }
            },
            
            // CSS processing
            {
                test: /\.css$/,
                use: [
                    isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
                    {
                        loader: 'css-loader',
                        options: {
                            sourceMap: isDevelopment,
                            modules: false
                        }
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            postcssOptions: {
                                plugins: [
                                    require('autoprefixer'),
                                    require('cssnano')({
                                        preset: 'default'
                                    })
                                ]
                            }
                        }
                    }
                ]
            },
            
            // Asset handling
            {
                test: /\.(png|svg|jpg|jpeg|gif)$/i,
                type: 'asset/resource',
                generator: {
                    filename: 'images/[name].[hash:8][ext]'
                }
            },
            
            // Font handling
            {
                test: /\.(woff|woff2|eot|ttf|otf)$/i,
                type: 'asset/resource',
                generator: {
                    filename: 'fonts/[name].[hash:8][ext]'
                }
            }
        ]
    },
    
    plugins: [
        new CleanWebpackPlugin(),
        
        new HtmlWebpackPlugin({
            template: './src/index.html',
            filename: 'index.html',
            chunks: ['vendor', 'app'],
            minify: !isDevelopment && {
                removeComments: true,
                collapseWhitespace: true,
                removeAttributeQuotes: true
            }
        }),
        
        ...(isDevelopment ? [] : [
            new MiniCssExtractPlugin({
                filename: '[name].[contenthash:8].css',
                chunkFilename: '[name].[contenthash:8].chunk.css'
            })
        ])
    ],
    
    optimization: {
        minimize: !isDevelopment,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    parse: {
                        ecma: 2020
                    },
                    compress: {
                        ecma: 2015,
                        comparisons: false,
                        inline: 2,
                        drop_console: !isDevelopment
                    },
                    mangle: {
                        safari10: true
                    },
                    output: {
                        ecma: 2015,
                        comments: false,
                        ascii_only: true
                    }
                }
            })
        ],
        
        splitChunks: {
            chunks: 'all',
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendor',
                    priority: 10,
                    reuseExistingChunk: true
                },
                common: {
                    minChunks: 2,
                    priority: 5,
                    reuseExistingChunk: true
                }
            }
        },
        
        runtimeChunk: 'single',
        moduleIds: 'deterministic'
    },
    
    resolve: {
        extensions: ['.js', '.json'],
        alias: {
            '@': path.resolve(__dirname, 'src'),
            '@utils': path.resolve(__dirname, 'src/utils'),
            '@state': path.resolve(__dirname, 'src/state'),
            '@rendering': path.resolve(__dirname, 'src/rendering'),
            '@components': path.resolve(__dirname, 'src/components'),
            '@connections': path.resolve(__dirname, 'src/connections')
        }
    },
    
    devServer: {
        static: {
            directory: path.join(__dirname, 'dist')
        },
        compress: true,
        port: 9000,
        hot: true,
        open: false,
        historyApiFallback: true
    },
    
    performance: {
        hints: isDevelopment ? false : 'warning',
        maxEntrypointSize: 512000,
        maxAssetSize: 512000
    },
    
    stats: {
        colors: true,
        modules: false,
        children: false,
        chunks: false,
        chunkModules: false
    }
};