#!/usr/bin/env node
/**
 * AI Code Assistant
 * Ask natural language questions about the codebase using Ollama LLM
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const OLLAMA_URL = 'http://localhost:11434';
const LLM_MODEL = 'qwen3:4b-instruct';
const EMBED_MODEL = 'nomic-embed-text';
const MAX_CONTEXT = 16384;
const DATA_DIR = path.join(__dirname, '..', 'docs', 'Architectural-Review', 'data');
const EMBEDDINGS_FILE = path.join(DATA_DIR, 'file-embeddings.json');
const DEEP_ANALYSIS_FILE = path.join(DATA_DIR, 'deep-analysis.json');

async function checkOllama() {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!response.ok) throw new Error('Ollama not responding');
    const data = await response.json();
    const hasLLM = data.models?.some(m => m.name.includes(LLM_MODEL.split(':')[0]));
    const hasEmbed = data.models?.some(m => m.name.includes(EMBED_MODEL));
    if (!hasLLM) {
      console.error(`Error: Model ${LLM_MODEL} not found. Run: ollama pull ${LLM_MODEL}`);
      process.exit(1);
    }
    if (!hasEmbed) {
      console.error(`Error: Model ${EMBED_MODEL} not found. Run: ollama pull ${EMBED_MODEL}`);
      process.exit(1);
    }
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

async function findRelevantFiles(query, topK = 5) {
  if (!fs.existsSync(EMBEDDINGS_FILE)) {
    console.error('No embeddings found. Run: npm run assistant:refresh');
    return [];
  }

  const data = JSON.parse(fs.readFileSync(EMBEDDINGS_FILE, 'utf-8'));
  const queryEmbedding = await getEmbedding(query);

  const results = [];
  for (const [file, info] of Object.entries(data.files)) {
    const similarity = cosineSimilarity(queryEmbedding, info.embedding);
    results.push({ file, similarity, lines: info.lines });
  }

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, topK);
}

function loadArchitectureContext() {
  const context = [];

  // Load deep analysis if available
  if (fs.existsSync(DEEP_ANALYSIS_FILE)) {
    try {
      const analysis = JSON.parse(fs.readFileSync(DEEP_ANALYSIS_FILE, 'utf-8'));
      if (analysis.summary) {
        context.push(`## Project Summary\n${analysis.summary}`);
      }
      if (analysis.features) {
        const featureList = Object.keys(analysis.features).slice(0, 10).join(', ');
        context.push(`## Key Features: ${featureList}`);
      }
    } catch (err) {
      // Ignore errors
    }
  }

  return context.join('\n\n');
}

async function streamChat(prompt, contextFiles = []) {
  const baseDir = path.join(__dirname, '..');

  // Build context from files
  let fileContext = '';
  for (const { file, similarity } of contextFiles) {
    try {
      const content = fs.readFileSync(path.join(baseDir, file), 'utf-8');
      const truncated = content.slice(0, 3000); // Limit per file
      fileContext += `\n### File: ${file} (relevance: ${(similarity * 100).toFixed(0)}%)\n\`\`\`\n${truncated}\n\`\`\`\n`;
    } catch (err) {
      // Skip files that can't be read
    }
  }

  const archContext = loadArchitectureContext();

  const systemPrompt = `You are an expert code assistant for the Mindmap Electron application. This is a brainstorming/mindmap tool built with Electron and vanilla JavaScript.

Your task is to answer questions about the codebase accurately and concisely. Base your answers on the provided code context.

${archContext}

## Relevant Code Files:
${fileContext || 'No specific files found for this query.'}`;

  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: LLM_MODEL,
      prompt: prompt,
      system: systemPrompt,
      stream: true,
      options: {
        num_ctx: MAX_CONTEXT,
        temperature: 0.3
      }
    })
  });

  if (!response.ok) {
    throw new Error(`LLM request failed: ${response.statusText}`);
  }

  // Stream the response
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(l => l.trim());

    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        if (data.response) {
          process.stdout.write(data.response);
        }
      } catch (err) {
        // Ignore parse errors
      }
    }
  }

  console.log('\n');
}

async function runInteractiveServer() {
  const PORT = 3456;

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Code Assistant</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #1a1a2e; color: #eee; min-height: 100vh; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #00d4ff; margin-bottom: 20px; }
    .chat { background: #16213e; border-radius: 8px; padding: 20px; min-height: 400px; margin-bottom: 20px; overflow-y: auto; max-height: 60vh; }
    .message { margin-bottom: 16px; padding: 12px; border-radius: 6px; }
    .user { background: #0f3460; margin-left: 20%; }
    .assistant { background: #1a1a2e; border: 1px solid #333; margin-right: 20%; }
    .input-area { display: flex; gap: 10px; }
    input { flex: 1; padding: 12px; border-radius: 6px; border: 1px solid #333; background: #16213e; color: #eee; font-size: 16px; }
    button { padding: 12px 24px; border-radius: 6px; border: none; background: #00d4ff; color: #000; font-weight: bold; cursor: pointer; }
    button:hover { background: #00b8e6; }
    button:disabled { background: #555; cursor: not-allowed; }
    .files { font-size: 12px; color: #888; margin-top: 8px; }
    pre { background: #0a0a1a; padding: 10px; border-radius: 4px; overflow-x: auto; margin: 10px 0; }
    code { font-family: 'Fira Code', monospace; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Mindmap Code Assistant</h1>
    <div class="chat" id="chat"></div>
    <div class="input-area">
      <input type="text" id="query" placeholder="Ask about the codebase..." onkeypress="if(event.key==='Enter')ask()">
      <button onclick="ask()" id="btn">Ask</button>
    </div>
  </div>
  <script>
    const chat = document.getElementById('chat');
    const input = document.getElementById('query');
    const btn = document.getElementById('btn');

    async function ask() {
      const query = input.value.trim();
      if (!query) return;

      input.value = '';
      btn.disabled = true;

      chat.innerHTML += '<div class="message user">' + escapeHtml(query) + '</div>';

      const msgDiv = document.createElement('div');
      msgDiv.className = 'message assistant';
      chat.appendChild(msgDiv);
      chat.scrollTop = chat.scrollHeight;

      try {
        const response = await fetch('/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value);
          fullResponse += text;
          msgDiv.innerHTML = formatResponse(fullResponse);
          chat.scrollTop = chat.scrollHeight;
        }
      } catch (err) {
        msgDiv.innerHTML = '<span style="color: #ff6b6b;">Error: ' + err.message + '</span>';
      }

      btn.disabled = false;
      input.focus();
    }

    function escapeHtml(text) {
      return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function formatResponse(text) {
      // Simple markdown-like formatting
      return text
        .replace(/\`\`\`(\\w+)?\\n([\\s\\S]*?)\`\`\`/g, '<pre><code>$2</code></pre>')
        .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
        .replace(/\\n/g, '<br>');
    }

    input.focus();
  </script>
</body>
</html>`;

  const server = http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } else if (req.method === 'POST' && req.url === '/ask') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const { query } = JSON.parse(body);

          res.writeHead(200, {
            'Content-Type': 'text/plain',
            'Transfer-Encoding': 'chunked'
          });

          // Find relevant files
          const relevantFiles = await findRelevantFiles(query, 5);

          // Stream LLM response
          const baseDir = path.join(__dirname, '..');
          let fileContext = '';
          for (const { file, similarity } of relevantFiles) {
            try {
              const content = fs.readFileSync(path.join(baseDir, file), 'utf-8');
              const truncated = content.slice(0, 3000);
              fileContext += `\n### File: ${file}\n\`\`\`\n${truncated}\n\`\`\`\n`;
            } catch (err) {}
          }

          const archContext = loadArchitectureContext();
          const systemPrompt = `You are an expert code assistant for the Mindmap Electron application.\n\n${archContext}\n\n## Relevant Code:\n${fileContext}`;

          const llmRes = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: LLM_MODEL,
              prompt: query,
              system: systemPrompt,
              stream: true,
              options: { num_ctx: MAX_CONTEXT, temperature: 0.3 }
            })
          });

          const reader = llmRes.body.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(l => l.trim());

            for (const line of lines) {
              try {
                const data = JSON.parse(line);
                if (data.response) {
                  res.write(data.response);
                }
              } catch (err) {}
            }
          }

          res.end();
        } catch (err) {
          res.writeHead(500);
          res.end('Error: ' + err.message);
        }
      });
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  server.listen(PORT, () => {
    console.log(`\nCode Assistant running at http://localhost:${PORT}\n`);
    console.log('Press Ctrl+C to stop\n');
  });
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
AI Code Assistant

Usage:
  node code-assistant.js "question"       Ask a question about the codebase
  node code-assistant.js --interactive    Start web UI (http://localhost:3456)
  node code-assistant.js --refresh        Regenerate embeddings and architecture

Examples:
  node code-assistant.js "How does the mindmap rendering work?"
  node code-assistant.js "What components use local storage?"
  node code-assistant.js "Where is the file save functionality?"
`);
    return;
  }

  await checkOllama();

  if (args.includes('--interactive')) {
    await runInteractiveServer();
  } else if (args.includes('--refresh')) {
    console.log('Refreshing architecture analysis...');
    const { execSync } = require('child_process');
    try {
      execSync('node scripts/architecture-analyzer.js --full', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    } catch (err) {}
    console.log('\nRefreshing semantic embeddings...');
    try {
      execSync('node scripts/semantic-search.js --regenerate', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    } catch (err) {}
    console.log('\nRefresh complete!');
  } else if (args.length > 0 && !args[0].startsWith('--')) {
    const query = args.join(' ');
    console.log(`\nSearching for relevant files...\n`);

    const relevantFiles = await findRelevantFiles(query, 5);

    if (relevantFiles.length > 0) {
      console.log('Relevant files:');
      relevantFiles.forEach(f => console.log(`  - ${f.file} (${(f.similarity * 100).toFixed(0)}%)`));
      console.log('\n---\n');
    }

    await streamChat(query, relevantFiles);
  } else {
    console.log('Usage: node code-assistant.js "your question" or --interactive');
    console.log('Run with --help for more options');
  }
}

main().catch(console.error);
