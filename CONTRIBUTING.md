# Contributing to Mindmap Electron

First off, thank you for considering contributing to Mindmap Electron! It's people like you that make this tool better for everyone.

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct:
- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Show empathy towards other community members

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, please include:

- **Clear and descriptive title**
- **Steps to reproduce** the issue
- **Expected behavior** vs what actually happened
- **Screenshots** if applicable
- **System information** (OS, Electron version, Node version)
- **Error messages** from the console

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- **Use case** - Why is this enhancement needed?
- **Proposed solution** - How do you envision it working?
- **Alternatives considered** - What other solutions did you consider?
- **Additional context** - Add any mockups, examples, or screenshots

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Follow the coding style** already present in the project
3. **Write clear commit messages** using conventional commits format:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation changes
   - `style:` for formatting changes
   - `refactor:` for code refactoring
   - `test:` for adding tests
   - `chore:` for maintenance tasks

4. **Test your changes** thoroughly:
   ```bash
   npm run dev  # Test in development mode
   npm run build  # Ensure it builds successfully
   ```

5. **Update documentation** if you're changing functionality
6. **Submit the pull request** with a clear description

## Development Setup

### Prerequisites
- Node.js 18 or higher
- npm 8 or higher
- Git
- A code editor (VS Code recommended)

### Local Development

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/your-username/mindmap-electron.git
   cd mindmap-electron
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   npm run dev
   ```

4. Make your changes and test them

5. Build the application:
   ```bash
   npm run build
   ```

## Project Structure

```
mindmap-electron/
├── electron/          # Electron main process
│   ├── main.js       # Main process entry point
│   ├── menu.js       # Application menu
│   └── preload.js    # Preload script
├── js/               # Application logic
│   ├── core.js       # Core mindmap functionality
│   ├── ai-service.js # AI integration
│   └── ...          # Other modules
├── css/              # Stylesheets
├── assets/           # Icons and resources
└── index.html        # Main HTML file
```

## Coding Guidelines

### JavaScript Style
- Use ES6+ features where appropriate
- Use meaningful variable and function names
- Add JSDoc comments for functions
- Keep functions small and focused
- Use async/await over callbacks

Example:
```javascript
/**
 * Creates a new mindmap node
 * @param {string} text - The node text
 * @param {Object} parent - Parent node reference
 * @returns {Object} The created node
 */
async function createNode(text, parent) {
    // Implementation
}
```

### CSS Style
- Use CSS variables for theming
- Follow BEM naming convention for classes
- Keep specificity low
- Use flexbox/grid for layouts

### HTML Style
- Use semantic HTML5 elements
- Add proper ARIA labels for accessibility
- Keep the DOM structure clean and logical

## Testing

Currently, the project uses manual testing. When adding new features:
1. Test in development mode
2. Test the built application
3. Test on different operating systems if possible
4. Check for console errors
5. Verify keyboard shortcuts work
6. Test with different screen sizes

## Documentation

- Update README.md if you're adding new features
- Add inline comments for complex logic
- Update keyboard shortcuts documentation if applicable
- Include examples in your documentation

## Release Process

1. Version updates follow semantic versioning (MAJOR.MINOR.PATCH)
2. Update version in `package.json`
3. Create a git tag: `git tag v1.0.0`
4. Push the tag: `git push origin v1.0.0`
5. GitHub Actions will automatically build and create a release

## Getting Help

- **Discord**: Join our community server (link in README)
- **GitHub Discussions**: Ask questions and share ideas
- **Issues**: Report bugs or request features
- **Email**: For sensitive security issues

## Recognition

Contributors will be recognized in:
- The project README
- Release notes for significant contributions
- A CONTRIBUTORS.md file for regular contributors

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Mindmap Electron! 🎉