#!/usr/bin/env node
/**
 * Semantic Search Script
 * Generates embeddings for code files using Ollama's nomic-embed-text model
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

const OLLAMA_URL = 'http://localhost:11434';
const EMBED_MODEL = 'nomic-embed-text';
const DATA_DIR = path.join(__dirname, '..', 'docs', 'Architectural-Review', 'data');
const EMBEDDINGS_FILE = path.join(DATA_DIR, 'file-embeddings.json');

// File patterns to include
const INCLUDE_PATTERNS = [
  'js/**/*.js',
  'electron/**/*.js',
  'css/**/*.css',
  '*.html',
  '*.json'
];

// Patterns to exclude
const EXCLUDE_PATTERNS = [
  'node_modules/**',
  'dist/**',
  'package-lock.json',
  '*.min.js',
  '*.min.css'
];

async function checkOllama() {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!response.ok) throw new Error('Ollama not responding');
    const data = await response.json();
    const hasModel = data.models?.some(m => m.name.includes(EMBED_MODEL));
    if (!hasModel) {
      console.error(`Error: Model ${EMBED_MODEL} not found. Run: ollama pull ${EMBED_MODEL}`);
      process.exit(1);
    }
    console.log(`Ollama running with ${EMBED_MODEL} model`);
    return true;
  } catch (err) {
    console.error('Error: Ollama is not running. Start it with: ollama serve');
    process.exit(1);
  }
}

async function getEmbedding(text) {
  const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: EMBED_MODEL,
      prompt: text.slice(0, 8000) // Limit text size
    })
  });

  if (!response.ok) {
    throw new Error(`Embedding request failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.embedding;
}

function cosineSimilarity(a, b) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function getFiles(baseDir) {
  const files = [];
  for (const pattern of INCLUDE_PATTERNS) {
    const matches = await glob(pattern, {
      cwd: baseDir,
      ignore: EXCLUDE_PATTERNS,
      nodir: true
    });
    files.push(...matches);
  }
  return [...new Set(files)]; // Dedupe
}

async function generateEmbeddings(regenerate = false) {
  const baseDir = path.join(__dirname, '..');

  // Ensure data directory exists
  fs.mkdirSync(DATA_DIR, { recursive: true });

  // Load existing embeddings if not regenerating
  let existingData = { files: {}, generated: null };
  if (!regenerate && fs.existsSync(EMBEDDINGS_FILE)) {
    try {
      existingData = JSON.parse(fs.readFileSync(EMBEDDINGS_FILE, 'utf-8'));
      console.log(`Loaded ${Object.keys(existingData.files).length} existing embeddings`);
    } catch (err) {
      console.log('Could not load existing embeddings, starting fresh');
    }
  }

  const files = await getFiles(baseDir);
  console.log(`Found ${files.length} files to process`);

  const embeddings = existingData.files || {};
  let processed = 0;
  let skipped = 0;

  for (const file of files) {
    const filePath = path.join(baseDir, file);
    const stats = fs.statSync(filePath);
    const mtime = stats.mtime.toISOString();

    // Skip if file hasn't changed
    if (embeddings[file]?.mtime === mtime) {
      skipped++;
      continue;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      // Create a rich context string for embedding
      const contextStr = `File: ${file}\n\n${content}`;

      const embedding = await getEmbedding(contextStr);

      embeddings[file] = {
        embedding,
        mtime,
        size: stats.size,
        lines: content.split('\n').length
      };

      processed++;
      process.stdout.write(`\rProcessed ${processed}/${files.length - skipped} files...`);
    } catch (err) {
      console.error(`\nError processing ${file}: ${err.message}`);
    }
  }

  console.log(`\nGenerated embeddings for ${processed} files, skipped ${skipped} unchanged`);

  // Save embeddings
  const output = {
    generated: new Date().toISOString(),
    model: EMBED_MODEL,
    fileCount: Object.keys(embeddings).length,
    files: embeddings
  };

  fs.writeFileSync(EMBEDDINGS_FILE, JSON.stringify(output, null, 2));
  console.log(`Saved to ${EMBEDDINGS_FILE}`);

  return output;
}

async function search(query, topK = 5) {
  if (!fs.existsSync(EMBEDDINGS_FILE)) {
    console.error('No embeddings found. Run with --regenerate first.');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(EMBEDDINGS_FILE, 'utf-8'));
  const queryEmbedding = await getEmbedding(query);

  const results = [];
  for (const [file, info] of Object.entries(data.files)) {
    const similarity = cosineSimilarity(queryEmbedding, info.embedding);
    results.push({ file, similarity, lines: info.lines, size: info.size });
  }

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, topK);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Semantic Search Tool

Usage:
  node semantic-search.js --regenerate    Generate/update embeddings for all files
  node semantic-search.js "query"         Search for files matching query
  node semantic-search.js --stats         Show embedding statistics

Options:
  --regenerate    Force regenerate all embeddings
  --top N         Number of results to return (default: 5)
  --stats         Show statistics about embeddings
`);
    return;
  }

  await checkOllama();

  if (args.includes('--regenerate')) {
    await generateEmbeddings(true);
  } else if (args.includes('--stats')) {
    if (!fs.existsSync(EMBEDDINGS_FILE)) {
      console.log('No embeddings file found. Run with --regenerate first.');
      return;
    }
    const data = JSON.parse(fs.readFileSync(EMBEDDINGS_FILE, 'utf-8'));
    console.log(`
Embeddings Statistics:
  Generated: ${data.generated}
  Model: ${data.model}
  Files: ${data.fileCount}
  File size: ${(fs.statSync(EMBEDDINGS_FILE).size / 1024 / 1024).toFixed(2)} MB
`);
  } else if (args.length > 0 && !args[0].startsWith('--')) {
    const query = args.filter(a => !a.startsWith('--')).join(' ');
    const topIndex = args.indexOf('--top');
    const topK = topIndex >= 0 ? parseInt(args[topIndex + 1]) || 5 : 5;

    console.log(`Searching for: "${query}"\n`);
    const results = await search(query, topK);

    console.log('Top matches:');
    results.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.file} (similarity: ${(r.similarity * 100).toFixed(1)}%, ${r.lines} lines)`);
    });
  } else {
    // Default: incremental update
    await generateEmbeddings(false);
  }
}

main().catch(console.error);
