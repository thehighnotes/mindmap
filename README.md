# Mindmap Brainstorm Tool

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/github/package-json/v/markwind/mindmap-electron)
![Downloads](https://img.shields.io/github/downloads/markwind/mindmap-electron/total)
![Platform](https://img.shields.io/badge/platform-Windows%20|%20macOS%20|%20Linux-green)

A powerful, intuitive mindmap application for visual brainstorming and organizing ideas. Works both as a standalone Electron desktop app and as a web application.

## Features

### Core Features
- **Visual Brainstorming** - Create interactive mind maps with unlimited nodes
- **Real-time Collaboration** - Work together with team members in real-time
- **Smart Save** - Automatic versioning and backup system
- **Multiple Export Formats** - Export to PNG, JSON, or legacy formats
- **Keyboard Shortcuts** - Fast navigation and editing with comprehensive shortcuts
- **Customizable Themes** - Light/dark mode with customizable colors
- **Responsive Design** - Works seamlessly on desktop and web
- **Offline First** - Full functionality without internet connection

### Advanced Features
- **AI Integration** - Generate ideas and expand nodes with AI assistance
- **File Association** - Open .mindmap and .mindmap2 files directly
- **Cross-platform** - Native apps for Windows, macOS, and Linux
- **Import/Export** - Support for various mindmap formats
- **Undo/Redo** - Complete history management
- **Search & Filter** - Quickly find nodes in complex mindmaps
- **Zoom Controls** - Navigate large mindmaps with ease
- **Auto-layout** - Automatic node arrangement algorithms

## Installation

### Download Pre-built Binary
Download the latest release for your platform from the [Releases page](https://github.com/markwind/mindmap-electron/releases).

- **Windows**: Download the `.exe` portable version or installer
- **macOS**: Download the `.dmg` file
- **Linux**: Download the `.AppImage` or `.deb` package

### Build from Source

#### Prerequisites
- Node.js 18 or higher
- npm or yarn package manager
- Git

#### Steps
```bash
# Clone the repository
git clone https://github.com/markwind/mindmap-electron.git
cd mindmap-electron

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for your platform
npm run build

# Build for specific platforms
npm run dist:win    # Windows
npm run dist:mac    # macOS
npm run dist:linux  # Linux
```

## Usage

### Quick Start
1. Launch the application
2. Click "New Mindmap" or press `Ctrl+N`
3. Double-click the central node to edit
4. Press `Tab` to create child nodes
5. Press `Enter` to create sibling nodes
6. Drag nodes to reorganize your mindmap

### Keyboard Shortcuts
| Action | Windows/Linux | macOS |
|--------|--------------|-------|
| New Mindmap | `Ctrl+N` | `Cmd+N` |
| Open | `Ctrl+O` | `Cmd+O` |
| Save | `Ctrl+S` | `Cmd+S` |
| Export | `Ctrl+E` | `Cmd+E` |
| Undo | `Ctrl+Z` | `Cmd+Z` |
| Redo | `Ctrl+Y` | `Cmd+Shift+Z` |
| Delete Node | `Delete` | `Delete` |
| Edit Node | `F2` or `Double-click` | `F2` or `Double-click` |
| Add Child | `Tab` | `Tab` |
| Add Sibling | `Enter` | `Enter` |
| Navigate | Arrow Keys | Arrow Keys |
| Zoom In/Out | `Ctrl+Plus/Minus` | `Cmd+Plus/Minus` |
| Reset Zoom | `Ctrl+0` | `Cmd+0` |

### Web Version
The application also works as a web app. Simply open `index.html` in a modern browser for full functionality without installation.

## Project Structure
```
mindmap-electron/
├── electron/           # Electron main process files
│   ├── main.js        # Main process entry
│   ├── menu.js        # Application menu
│   └── preload.js     # Preload script
├── js/                # Application logic
│   ├── core.js        # Core mindmap functionality
│   ├── ai-service.js  # AI integration
│   ├── collaboration.js # Real-time collaboration
│   └── smart-save.js  # Version control system
├── css/               # Stylesheets
├── assets/            # Icons and resources
└── index.html         # Main application file
```

## Configuration

### Settings
Access settings through the menu or press `Ctrl+,` to customize:
- Theme (Light/Dark/System)
- Auto-save interval
- Export quality
- AI service preferences
- Collaboration settings

### File Formats
- `.mindmap2` - Modern JSON-based format with full feature support
- `.mindmap` - Legacy format for backward compatibility
- `.png` - Image export for sharing
- `.json` - Raw data export

## Development

### Technologies Used
- **Electron** - Cross-platform desktop framework
- **Vanilla JavaScript** - Core application logic
- **CSS3** - Modern styling with animations
- **HTML5** - Semantic markup
- **Local Storage** - Persistent settings
- **WebSockets** - Real-time collaboration

### Contributing
Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and development process.

## Testing
```bash
# Run tests (when available)
npm test

# Run in development mode with debugging
npm run dev
```

## Building for Production

### Code Signing
The application uses SignPath for code signing on Windows. Releases are automatically signed through GitHub Actions.

### Build Configuration
See `package.json` for detailed build configuration. The app supports:
- Windows: Portable and NSIS installer
- macOS: DMG package
- Linux: AppImage and DEB packages

## Support

### Documentation
- [User Guide](https://github.com/markwind/mindmap-electron/wiki/User-Guide)
- [API Documentation](https://github.com/markwind/mindmap-electron/wiki/API)
- [FAQ](https://github.com/markwind/mindmap-electron/wiki/FAQ)

### Getting Help
- **Issues**: [GitHub Issues](https://github.com/markwind/mindmap-electron/issues)
- **Discussions**: [GitHub Discussions](https://github.com/markwind/mindmap-electron/discussions)
- **Email**: support@mindmap.example.com

## Roadmap

### Planned Features
- [ ] Cloud sync (optional premium feature)
- [ ] Mobile applications
- [ ] Plugin system
- [ ] Advanced AI features
- [ ] Template library
- [ ] Presentation mode
- [ ] Mind map animations
- [ ] Voice input
- [ ] Markdown support in nodes

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- Icons from [Font Awesome](https://fontawesome.com/)
- Inspired by traditional mind mapping techniques

## Author

**Mark Wind**
- GitHub: [@markwind](https://github.com/markwind)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes in each version.

---

**Note**: This is an open-source project. Feel free to use, modify, and distribute according to the MIT license.