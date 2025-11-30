#!/usr/bin/env node
/**
 * Architecture Analyzer
 * Analyzes codebase structure, dependencies, and generates architecture data
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

const DATA_DIR = path.join(__dirname, '..', 'docs', 'Architectural-Review', 'data');
const BASE_DIR = path.join(__dirname, '..');

// Output files
const OUTPUT = {
  deepAnalysis: path.join(DATA_DIR, 'deep-analysis.json'),
  dependencyGraph: path.join(DATA_DIR, 'dependency-graph.json'),
  featureAnalysis: path.join(DATA_DIR, 'feature-analysis.json'),
  architectureSummary: path.join(DATA_DIR, 'architecture-summary.json'),
  circularDeps: path.join(DATA_DIR, 'circular-dependencies.txt')
};

// File patterns to analyze
const PATTERNS = {
  js: ['js/**/*.js', 'electron/**/*.js'],
  css: ['css/**/*.css'],
  html: ['*.html']
};

const EXCLUDE = ['node_modules/**', 'dist/**', '*.min.js', '*.min.css'];

async function getFiles(patterns) {
  const files = [];
  for (const pattern of patterns) {
    const matches = await glob(pattern, { cwd: BASE_DIR, ignore: EXCLUDE, nodir: true });
    files.push(...matches);
  }
  return [...new Set(files)];
}

function analyzeJsFile(filePath, content) {
  const analysis = {
    path: filePath,
    lines: content.split('\n').length,
    size: content.length,
    imports: [],
    exports: [],
    functions: [],
    classes: [],
    dependencies: [],
    features: []
  };

  // Extract imports/requires
  const importMatches = content.matchAll(/(?:import\s+.*?from\s+['"](.+?)['"]|require\s*\(\s*['"](.+?)['"]\s*\))/g);
  for (const match of importMatches) {
    analysis.imports.push(match[1] || match[2]);
  }

  // Extract exports
  const exportMatches = content.matchAll(/export\s+(?:default\s+)?(?:function|class|const|let|var)\s+(\w+)/g);
  for (const match of exportMatches) {
    analysis.exports.push(match[1]);
  }

  // Extract functions
  const funcMatches = content.matchAll(/(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\(|(\w+)\s*:\s*(?:async\s*)?function)/g);
  for (const match of funcMatches) {
    const name = match[1] || match[2] || match[3];
    if (name && !['if', 'for', 'while', 'switch'].includes(name)) {
      analysis.functions.push(name);
    }
  }

  // Extract classes
  const classMatches = content.matchAll(/class\s+(\w+)/g);
  for (const match of classMatches) {
    analysis.classes.push(match[1]);
  }

  // Detect features based on content patterns
  if (content.includes('localStorage') || content.includes('sessionStorage')) {
    analysis.features.push('storage');
  }
  if (content.includes('fetch(') || content.includes('XMLHttpRequest')) {
    analysis.features.push('network');
  }
  if (content.includes('addEventListener') || content.includes('onclick')) {
    analysis.features.push('events');
  }
  if (content.includes('canvas') || content.includes('getContext')) {
    analysis.features.push('canvas');
  }
  if (content.includes('electron') || content.includes('ipcRenderer') || content.includes('ipcMain')) {
    analysis.features.push('electron');
  }
  if (content.includes('JSON.parse') || content.includes('JSON.stringify')) {
    analysis.features.push('json');
  }

  return analysis;
}

function buildDependencyGraph(fileAnalyses) {
  const graph = {
    nodes: [],
    edges: [],
    hubServices: []
  };

  // Build nodes
  for (const analysis of fileAnalyses) {
    graph.nodes.push({
      id: analysis.path,
      label: path.basename(analysis.path),
      lines: analysis.lines,
      functions: analysis.functions.length,
      classes: analysis.classes.length,
      features: analysis.features
    });
  }

  // Build edges based on imports
  const fileMap = new Map(fileAnalyses.map(a => [a.path, a]));

  for (const analysis of fileAnalyses) {
    for (const imp of analysis.imports) {
      // Try to resolve local imports
      if (imp.startsWith('.')) {
        const dir = path.dirname(analysis.path);
        let resolved = path.normalize(path.join(dir, imp));

        // Add .js extension if missing
        if (!resolved.endsWith('.js')) {
          resolved += '.js';
        }

        if (fileMap.has(resolved)) {
          graph.edges.push({
            from: analysis.path,
            to: resolved,
            type: 'import'
          });
        }
      }
    }
  }

  // Find hub services (files with many incoming edges)
  const incomingCounts = new Map();
  for (const edge of graph.edges) {
    incomingCounts.set(edge.to, (incomingCounts.get(edge.to) || 0) + 1);
  }

  graph.hubServices = Array.from(incomingCounts.entries())
    .filter(([_, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .map(([file, count]) => ({ file, dependents: count }));

  return graph;
}

function detectCircularDependencies(graph) {
  const circular = [];
  const visited = new Set();
  const stack = new Set();

  function dfs(node, path = []) {
    if (stack.has(node)) {
      const cycleStart = path.indexOf(node);
      circular.push(path.slice(cycleStart).concat(node));
      return;
    }
    if (visited.has(node)) return;

    visited.add(node);
    stack.add(node);
    path.push(node);

    const outgoing = graph.edges.filter(e => e.from === node);
    for (const edge of outgoing) {
      dfs(edge.to, [...path]);
    }

    stack.delete(node);
  }

  for (const node of graph.nodes) {
    dfs(node.id);
  }

  return circular;
}

function generateFeatureAnalysis(fileAnalyses) {
  const features = {};

  // Group files by detected features
  for (const analysis of fileAnalyses) {
    for (const feature of analysis.features) {
      if (!features[feature]) {
        features[feature] = {
          name: feature,
          files: [],
          totalLines: 0,
          totalFunctions: 0
        };
      }
      features[feature].files.push(analysis.path);
      features[feature].totalLines += analysis.lines;
      features[feature].totalFunctions += analysis.functions.length;
    }
  }

  // Calculate health scores (simple heuristic)
  for (const feature of Object.values(features)) {
    const avgLinesPerFile = feature.totalLines / feature.files.length;
    const avgFuncsPerFile = feature.totalFunctions / feature.files.length;

    // Lower is better for complexity
    feature.complexityScore = Math.min(100, Math.round(
      (avgLinesPerFile / 500 + avgFuncsPerFile / 20) * 50
    ));

    feature.healthScore = 100 - feature.complexityScore;
  }

  return features;
}

function generateSummary(fileAnalyses, graph, features) {
  const totalLines = fileAnalyses.reduce((sum, a) => sum + a.lines, 0);
  const totalFunctions = fileAnalyses.reduce((sum, a) => sum + a.functions.length, 0);
  const totalClasses = fileAnalyses.reduce((sum, a) => sum + a.classes.length, 0);

  return {
    generated: new Date().toISOString(),
    summary: `Mindmap Electron Application - A brainstorming/mindmap tool built with Electron and vanilla JavaScript.`,
    stats: {
      totalFiles: fileAnalyses.length,
      totalLines,
      totalFunctions,
      totalClasses,
      avgLinesPerFile: Math.round(totalLines / fileAnalyses.length)
    },
    architecture: {
      type: 'Electron + Vanilla JS',
      mainEntry: 'electron/main.js',
      renderer: 'index.html',
      features: Object.keys(features)
    },
    hubServices: graph.hubServices.slice(0, 5),
    featureSummary: Object.entries(features).map(([name, data]) => ({
      name,
      fileCount: data.files.length,
      healthScore: data.healthScore
    }))
  };
}

async function runFullAnalysis() {
  console.log('Starting architecture analysis...\n');

  // Ensure data directory exists
  fs.mkdirSync(DATA_DIR, { recursive: true });

  // Get all JS files
  const jsFiles = await getFiles(PATTERNS.js);
  console.log(`Found ${jsFiles.length} JavaScript files`);

  // Analyze each file
  const fileAnalyses = [];
  for (const file of jsFiles) {
    const filePath = path.join(BASE_DIR, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const analysis = analyzeJsFile(file, content);
      fileAnalyses.push(analysis);
    } catch (err) {
      console.error(`Error analyzing ${file}: ${err.message}`);
    }
  }

  console.log(`Analyzed ${fileAnalyses.length} files\n`);

  // Build dependency graph
  console.log('Building dependency graph...');
  const graph = buildDependencyGraph(fileAnalyses);
  console.log(`  Nodes: ${graph.nodes.length}, Edges: ${graph.edges.length}`);

  // Detect circular dependencies
  console.log('Checking for circular dependencies...');
  const circular = detectCircularDependencies(graph);
  if (circular.length > 0) {
    console.log(`  Found ${circular.length} circular dependency chains`);
  } else {
    console.log('  No circular dependencies found');
  }

  // Generate feature analysis
  console.log('Analyzing features...');
  const features = generateFeatureAnalysis(fileAnalyses);
  console.log(`  Detected ${Object.keys(features).length} features`);

  // Generate summary
  console.log('Generating summary...');
  const summary = generateSummary(fileAnalyses, graph, features);

  // Write output files
  console.log('\nWriting output files...');

  // Deep analysis (all file details)
  const deepAnalysis = {
    generated: new Date().toISOString(),
    summary: summary.summary,
    files: fileAnalyses,
    features
  };
  fs.writeFileSync(OUTPUT.deepAnalysis, JSON.stringify(deepAnalysis, null, 2));
  console.log(`  ${OUTPUT.deepAnalysis}`);

  // Dependency graph
  fs.writeFileSync(OUTPUT.dependencyGraph, JSON.stringify(graph, null, 2));
  console.log(`  ${OUTPUT.dependencyGraph}`);

  // Feature analysis
  fs.writeFileSync(OUTPUT.featureAnalysis, JSON.stringify(features, null, 2));
  console.log(`  ${OUTPUT.featureAnalysis}`);

  // Architecture summary
  fs.writeFileSync(OUTPUT.architectureSummary, JSON.stringify(summary, null, 2));
  console.log(`  ${OUTPUT.architectureSummary}`);

  // Circular dependencies
  if (circular.length > 0) {
    const circularText = circular.map(cycle => cycle.join(' -> ')).join('\n');
    fs.writeFileSync(OUTPUT.circularDeps, circularText);
    console.log(`  ${OUTPUT.circularDeps}`);
  }

  console.log('\nAnalysis complete!');

  return { summary, graph, features, fileAnalyses };
}

async function queryArchitecture(query) {
  // Check if analysis exists
  if (!fs.existsSync(OUTPUT.architectureSummary)) {
    console.error('No analysis found. Run: npm run arch:full');
    process.exit(1);
  }

  const summary = JSON.parse(fs.readFileSync(OUTPUT.architectureSummary, 'utf-8'));
  const features = JSON.parse(fs.readFileSync(OUTPUT.featureAnalysis, 'utf-8'));
  const graph = JSON.parse(fs.readFileSync(OUTPUT.dependencyGraph, 'utf-8'));

  if (query === '--feature-metrics') {
    console.log('\nFeature Health Metrics:\n');
    for (const [name, data] of Object.entries(features)) {
      const bar = '█'.repeat(Math.round(data.healthScore / 10));
      console.log(`  ${name.padEnd(15)} ${bar} ${data.healthScore}%`);
      console.log(`                   ${data.files.length} files, ${data.totalFunctions} functions`);
    }
  } else if (query === '--hub-services') {
    console.log('\nHub Services (most dependencies):\n');
    for (const hub of graph.hubServices) {
      console.log(`  ${hub.file}: ${hub.dependents} dependents`);
    }
  } else if (query.startsWith('feature:')) {
    const featureName = query.split(':')[1];
    const feature = features[featureName];
    if (feature) {
      console.log(`\nFeature: ${featureName}\n`);
      console.log(`  Health Score: ${feature.healthScore}%`);
      console.log(`  Total Lines: ${feature.totalLines}`);
      console.log(`  Total Functions: ${feature.totalFunctions}`);
      console.log(`\n  Files:`);
      feature.files.forEach(f => console.log(`    - ${f}`));
    } else {
      console.log(`Feature '${featureName}' not found.`);
      console.log(`Available: ${Object.keys(features).join(', ')}`);
    }
  } else {
    // Search for query in files
    const deepAnalysis = JSON.parse(fs.readFileSync(OUTPUT.deepAnalysis, 'utf-8'));
    const matches = deepAnalysis.files.filter(f =>
      f.path.toLowerCase().includes(query.toLowerCase()) ||
      f.functions.some(fn => fn.toLowerCase().includes(query.toLowerCase())) ||
      f.classes.some(c => c.toLowerCase().includes(query.toLowerCase()))
    );

    if (matches.length > 0) {
      console.log(`\nFiles matching "${query}":\n`);
      for (const match of matches.slice(0, 10)) {
        console.log(`  ${match.path}`);
        const matchingFuncs = match.functions.filter(f => f.toLowerCase().includes(query.toLowerCase()));
        if (matchingFuncs.length > 0) {
          console.log(`    Functions: ${matchingFuncs.join(', ')}`);
        }
        const matchingClasses = match.classes.filter(c => c.toLowerCase().includes(query.toLowerCase()));
        if (matchingClasses.length > 0) {
          console.log(`    Classes: ${matchingClasses.join(', ')}`);
        }
      }
    } else {
      console.log(`No matches found for "${query}"`);
    }
  }
}

async function runServer() {
  const http = require('http');
  const PORT = 3001;

  const graph = fs.existsSync(OUTPUT.dependencyGraph)
    ? JSON.parse(fs.readFileSync(OUTPUT.dependencyGraph, 'utf-8'))
    : { nodes: [], edges: [] };

  const features = fs.existsSync(OUTPUT.featureAnalysis)
    ? JSON.parse(fs.readFileSync(OUTPUT.featureAnalysis, 'utf-8'))
    : {};

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Architecture Explorer</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui; background: #1a1a2e; color: #eee; }
    .container { display: flex; height: 100vh; }
    .sidebar { width: 300px; background: #16213e; padding: 20px; overflow-y: auto; }
    .main { flex: 1; padding: 20px; }
    h1 { color: #00d4ff; margin-bottom: 20px; font-size: 1.5em; }
    h2 { color: #00d4ff; margin: 20px 0 10px; font-size: 1.2em; }
    .stat { background: #0f3460; padding: 10px; border-radius: 6px; margin-bottom: 10px; }
    .stat-label { color: #888; font-size: 12px; }
    .stat-value { font-size: 24px; font-weight: bold; }
    .file-list { list-style: none; }
    .file-list li { padding: 5px 0; border-bottom: 1px solid #333; font-size: 13px; }
    .feature { display: inline-block; background: #0f3460; padding: 4px 8px; border-radius: 4px; margin: 2px; font-size: 12px; }
    .graph { background: #0a0a1a; border-radius: 8px; height: calc(100vh - 100px); display: flex; align-items: center; justify-content: center; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="sidebar">
      <h1>Architecture Explorer</h1>
      <div class="stat">
        <div class="stat-label">Files</div>
        <div class="stat-value">${graph.nodes.length}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Dependencies</div>
        <div class="stat-value">${graph.edges.length}</div>
      </div>
      <h2>Features</h2>
      <div>
        ${Object.keys(features).map(f => `<span class="feature">${f}</span>`).join('')}
      </div>
      <h2>Hub Services</h2>
      <ul class="file-list">
        ${graph.hubServices.slice(0, 5).map(h => `<li>${h.file} (${h.dependents})</li>`).join('')}
      </ul>
      <h2>All Files</h2>
      <ul class="file-list">
        ${graph.nodes.slice(0, 20).map(n => `<li>${n.label} (${n.lines} lines)</li>`).join('')}
      </ul>
    </div>
    <div class="main">
      <div class="graph">
        <p>Graph visualization requires D3.js integration</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const server = http.createServer((req, res) => {
    if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } else if (req.url === '/api/graph') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(graph));
    } else if (req.url === '/api/features') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(features));
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  server.listen(PORT, () => {
    console.log(`\nArchitecture Explorer running at http://localhost:${PORT}\n`);
    console.log('Press Ctrl+C to stop\n');
  });
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Architecture Analyzer

Usage:
  node architecture-analyzer.js --full             Run full analysis
  node architecture-analyzer.js --query "term"     Search architecture
  node architecture-analyzer.js --server           Start web explorer

Query Options:
  --feature-metrics    Show feature health scores
  --hub-services       Show most depended-on files
  feature:NAME         Show details for a feature

Examples:
  node architecture-analyzer.js --full
  node architecture-analyzer.js --query --feature-metrics
  node architecture-analyzer.js --query feature:electron
  node architecture-analyzer.js --query "TrustService"
`);
    return;
  }

  if (args.includes('--full')) {
    await runFullAnalysis();
  } else if (args.includes('--server')) {
    await runServer();
  } else if (args.includes('--query') || args.length > 0) {
    const queryIndex = args.indexOf('--query');
    const query = queryIndex >= 0 ? args[queryIndex + 1] : args[0];
    if (query && !query.startsWith('--')) {
      await queryArchitecture(query);
    } else if (args.includes('--feature-metrics')) {
      await queryArchitecture('--feature-metrics');
    } else if (args.includes('--hub-services')) {
      await queryArchitecture('--hub-services');
    } else {
      console.log('Please provide a query term');
    }
  } else {
    console.log('Usage: node architecture-analyzer.js [--full|--query|--server]');
    console.log('Run with --help for more options');
  }
}

main().catch(console.error);
