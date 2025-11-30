#!/usr/bin/env node
/**
 * DocMemory - Semantic Documentation Search
 * Stores documentation chunks in SQLite with vector embeddings
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const { glob } = require('glob');

const OLLAMA_URL = 'http://localhost:11434';
const EMBED_MODEL = 'nomic-embed-text';
const DATA_DIR = path.join(__dirname, '..', 'data', 'doc-memory');
const DB_FILE = path.join(DATA_DIR, 'embeddings.db');
const HASH_FILE = path.join(DATA_DIR, 'file-hashes.json');
const DOCS_DIR = path.join(__dirname, '..', 'docs');

// Chunk size in approximate tokens (words * 1.3)
const CHUNK_SIZE = 500;

async function checkOllama() {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!response.ok) throw new Error('Ollama not responding');
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
      prompt: text.slice(0, 8000)
    })
  });
  const data = await response.json();
  return data.embedding;
}

function cosineSimilarity(a, b) {
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function initDatabase() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const db = new Database(DB_FILE);

  db.exec(`
    CREATE TABLE IF NOT EXISTS chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path TEXT NOT NULL,
      heading TEXT,
      content TEXT NOT NULL,
      embedding BLOB NOT NULL,
      word_count INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_chunks_file ON chunks(file_path);

    CREATE TABLE IF NOT EXISTS files (
      path TEXT PRIMARY KEY,
      hash TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  return db;
}

function chunkMarkdown(content, filePath) {
  const chunks = [];
  const lines = content.split('\n');

  let currentChunk = { heading: '', content: [], wordCount: 0 };
  let currentHeading = path.basename(filePath, '.md');

  for (const line of lines) {
    // Check for heading
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      // Save previous chunk if it has content
      if (currentChunk.content.length > 0 && currentChunk.wordCount > 50) {
        chunks.push({
          heading: currentChunk.heading,
          content: currentChunk.content.join('\n').trim(),
          wordCount: currentChunk.wordCount
        });
      }

      currentHeading = headingMatch[2];
      currentChunk = { heading: currentHeading, content: [], wordCount: 0 };
      continue;
    }

    // Add line to current chunk
    currentChunk.content.push(line);
    currentChunk.wordCount += line.split(/\s+/).filter(w => w).length;

    // Split if chunk is too large
    if (currentChunk.wordCount >= CHUNK_SIZE) {
      chunks.push({
        heading: currentChunk.heading,
        content: currentChunk.content.join('\n').trim(),
        wordCount: currentChunk.wordCount
      });
      currentChunk = { heading: currentHeading, content: [], wordCount: 0 };
    }
  }

  // Don't forget the last chunk
  if (currentChunk.content.length > 0 && currentChunk.wordCount > 20) {
    chunks.push({
      heading: currentChunk.heading,
      content: currentChunk.content.join('\n').trim(),
      wordCount: currentChunk.wordCount
    });
  }

  return chunks;
}

function fileHash(content) {
  return crypto.createHash('md5').update(content).digest('hex');
}

async function processFile(db, filePath, forceReprocess = false) {
  const relativePath = path.relative(path.join(__dirname, '..'), filePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  const hash = fileHash(content);

  // Check if file has changed
  const existing = db.prepare('SELECT hash FROM files WHERE path = ?').get(relativePath);
  if (existing && existing.hash === hash && !forceReprocess) {
    return { skipped: true };
  }

  // Delete old chunks for this file
  db.prepare('DELETE FROM chunks WHERE file_path = ?').run(relativePath);

  // Chunk the content
  const chunks = chunkMarkdown(content, filePath);

  if (chunks.length === 0) {
    return { chunks: 0 };
  }

  // Generate embeddings and insert
  const insertChunk = db.prepare(`
    INSERT INTO chunks (file_path, heading, content, embedding, word_count)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const chunk of chunks) {
    const contextStr = `${relativePath}\n## ${chunk.heading}\n\n${chunk.content}`;
    const embedding = await getEmbedding(contextStr);
    const embeddingBuffer = Buffer.from(new Float32Array(embedding).buffer);

    insertChunk.run(relativePath, chunk.heading, chunk.content, embeddingBuffer, chunk.wordCount);
  }

  // Update file hash
  db.prepare(`
    INSERT OR REPLACE INTO files (path, hash, updated_at)
    VALUES (?, ?, datetime('now'))
  `).run(relativePath, hash);

  return { chunks: chunks.length };
}

async function initDocs(force = false) {
  await checkOllama();

  const db = initDatabase();

  // Find all markdown files in docs/
  const docsPath = DOCS_DIR;
  if (!fs.existsSync(docsPath)) {
    console.log('No docs/ directory found. Creating it...');
    fs.mkdirSync(docsPath, { recursive: true });
    console.log('Add markdown files to docs/ and run this command again.');
    db.close();
    return;
  }

  const files = await glob('**/*.md', { cwd: docsPath, nodir: true });

  if (files.length === 0) {
    console.log('No markdown files found in docs/');
    console.log('Add documentation files to docs/ and run this command again.');
    db.close();
    return;
  }

  console.log(`Found ${files.length} markdown files\n`);

  let processed = 0;
  let skipped = 0;
  let totalChunks = 0;

  for (const file of files) {
    const filePath = path.join(docsPath, file);
    process.stdout.write(`Processing ${file}... `);

    const result = await processFile(db, filePath, force);

    if (result.skipped) {
      console.log('(unchanged)');
      skipped++;
    } else {
      console.log(`${result.chunks} chunks`);
      processed++;
      totalChunks += result.chunks || 0;
    }
  }

  console.log(`\nDone! Processed ${processed} files, skipped ${skipped} unchanged`);
  console.log(`Total chunks in database: ${totalChunks}`);

  db.close();
}

async function search(query, options = {}) {
  await checkOllama();

  if (!fs.existsSync(DB_FILE)) {
    console.error('Database not found. Run: npm run docs:init');
    process.exit(1);
  }

  const db = new Database(DB_FILE, { readonly: true });

  // Get query embedding
  const queryEmbedding = await getEmbedding(query);

  // Get all chunks
  const chunks = db.prepare('SELECT id, file_path, heading, content, embedding, word_count FROM chunks').all();

  // Calculate similarities
  const results = chunks.map(chunk => {
    const embedding = new Float32Array(chunk.embedding.buffer, chunk.embedding.byteOffset, chunk.embedding.length / 4);
    const similarity = cosineSimilarity(queryEmbedding, Array.from(embedding));

    return {
      id: chunk.id,
      file: chunk.file_path,
      heading: chunk.heading,
      content: chunk.content,
      wordCount: chunk.word_count,
      similarity
    };
  });

  // Sort by similarity
  results.sort((a, b) => b.similarity - a.similarity);

  // Apply filters
  let filtered = results;

  if (options.since) {
    // Filter by recency would require file modification times
    // For now, we'll skip this filter
  }

  if (options.tags) {
    // Simple tag filtering - look for tags in content
    const tags = options.tags.split(',').map(t => t.trim().toLowerCase());
    filtered = filtered.filter(r =>
      tags.some(tag =>
        r.content.toLowerCase().includes(tag) ||
        r.heading.toLowerCase().includes(tag)
      )
    );
  }

  db.close();

  return filtered.slice(0, options.limit || 5);
}

async function showStats() {
  if (!fs.existsSync(DB_FILE)) {
    console.log('Database not found. Run: npm run docs:init');
    return;
  }

  const db = new Database(DB_FILE, { readonly: true });

  const chunkCount = db.prepare('SELECT COUNT(*) as count FROM chunks').get();
  const fileCount = db.prepare('SELECT COUNT(DISTINCT file_path) as count FROM chunks').get();
  const wordCount = db.prepare('SELECT SUM(word_count) as total FROM chunks').get();

  const topFiles = db.prepare(`
    SELECT file_path, COUNT(*) as chunks, SUM(word_count) as words
    FROM chunks
    GROUP BY file_path
    ORDER BY chunks DESC
    LIMIT 10
  `).all();

  console.log(`
DocMemory Statistics
====================

Database: ${DB_FILE}
Size: ${(fs.statSync(DB_FILE).size / 1024).toFixed(1)} KB

Content:
  Files indexed: ${fileCount.count}
  Total chunks: ${chunkCount.count}
  Total words: ${wordCount.total || 0}

Top files by chunks:
${topFiles.map(f => `  ${f.file_path}: ${f.chunks} chunks, ${f.words} words`).join('\n')}
`);

  db.close();
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
DocMemory - Semantic Documentation Search

Usage:
  node doc-memory.js init              Initialize/update documentation database
  node doc-memory.js rebuild           Force rebuild all documentation
  node doc-memory.js search "query"    Search documentation
  node doc-memory.js stats             Show statistics

Search Options:
  --limit N      Return top N results (default: 5)
  --tags TAG     Filter by tags (comma-separated)

Examples:
  node doc-memory.js search "how does trust score work"
  node doc-memory.js search "WebGL" --limit 10
  node doc-memory.js search "authentication" --tags api,security
`);
    return;
  }

  const command = args[0];

  if (command === 'init') {
    await initDocs(false);
  } else if (command === 'rebuild') {
    await initDocs(true);
  } else if (command === 'update') {
    await initDocs(false);
  } else if (command === 'stats') {
    await showStats();
  } else if (command === 'search') {
    const query = args.slice(1).filter(a => !a.startsWith('--')).join(' ');
    if (!query) {
      console.error('Please provide a search query');
      process.exit(1);
    }

    const limitIndex = args.indexOf('--limit');
    const limit = limitIndex >= 0 ? parseInt(args[limitIndex + 1]) || 5 : 5;

    const tagsIndex = args.indexOf('--tags');
    const tags = tagsIndex >= 0 ? args[tagsIndex + 1] : null;

    console.log(`Searching: "${query}"\n`);

    const results = await search(query, { limit, tags });

    if (results.length === 0) {
      console.log('No results found.');
      return;
    }

    console.log(`Top ${results.length} results:\n`);

    results.forEach((r, i) => {
      console.log(`${i + 1}. [${(r.similarity * 100).toFixed(1)}%] ${r.file}`);
      console.log(`   Section: ${r.heading}`);
      console.log(`   Preview: ${r.content.slice(0, 150).replace(/\n/g, ' ')}...`);
      console.log('');
    });
  } else if (args.length > 0 && !args[0].startsWith('--')) {
    // Treat as search query
    const query = args.filter(a => !a.startsWith('--')).join(' ');
    const results = await search(query, { limit: 5 });

    if (results.length === 0) {
      console.log('No results found.');
      return;
    }

    console.log(`\nResults for "${query}":\n`);
    results.forEach((r, i) => {
      console.log(`${i + 1}. [${(r.similarity * 100).toFixed(1)}%] ${r.file} - ${r.heading}`);
    });
  } else {
    console.log('Usage: node doc-memory.js [init|rebuild|search|stats]');
    console.log('Run with --help for more options');
  }
}

main().catch(console.error);
