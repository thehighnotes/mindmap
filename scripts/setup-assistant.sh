#!/bin/bash
# Setup script for AI Code Assistant tools

set -e

echo "========================================"
echo "AI Code Assistant Setup"
echo "========================================"
echo

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "Ollama not found. Installing..."
    curl -fsSL https://ollama.ai/install.sh | sh
else
    echo "Ollama is installed: $(ollama --version)"
fi

# Check if Ollama is running
echo
echo "Checking Ollama service..."
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "Starting Ollama service..."
    ollama serve &
    sleep 3
fi

echo "Ollama service is running"

# Check/pull models
echo
echo "Checking required models..."

if ! ollama list | grep -q "nomic-embed-text"; then
    echo "Pulling nomic-embed-text (embeddings model)..."
    ollama pull nomic-embed-text
else
    echo "nomic-embed-text: installed"
fi

if ! ollama list | grep -q "qwen3:4b-instruct"; then
    echo "Pulling qwen3:4b-instruct (LLM model)..."
    ollama pull qwen3:4b-instruct
else
    echo "qwen3:4b-instruct: installed"
fi

echo
echo "========================================"
echo "Generating codebase data..."
echo "========================================"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Run architecture analysis
echo
echo "Running architecture analysis..."
node scripts/architecture-analyzer.js --full

# Generate semantic embeddings
echo
echo "Generating semantic embeddings..."
node scripts/semantic-search.js --regenerate

echo
echo "========================================"
echo "Setup complete!"
echo "========================================"
echo
echo "Usage:"
echo "  npm run assistant \"your question\"      - Ask about the codebase"
echo "  npm run assistant:interactive         - Web UI at http://localhost:3456"
echo "  npm run docs:init                     - Initialize documentation search"
echo "  npm run arch:query -- --feature-metrics - View feature health"
echo
