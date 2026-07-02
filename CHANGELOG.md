# Changelog

All notable changes to Universal App Builder will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Cloud build integration (GitHub Actions, GitLab CI)
- Plugin system for third-party builders
- Build templates and presets
- Parallel builds for multiple targets

## [1.2.0] - 2024-01-15

### Added
- **SDK Manager** — Auto-detect, download, and manage required SDKs
  - Support for Flutter, Node.js, Rust, Android SDK, and Java JDK
  - One-click installation from error screens
  - Managed SDKs stored in app data directory
- **Pre-Build SDK Validation** — Check for required SDKs before starting builds
- **Enhanced Error Handling** — Robust detection with graceful error recovery
- **Detection Warnings** — Display non-fatal issues found during project analysis
- **21 Broken Test Projects** — Comprehensive error testing suite
  - 5 Flutter error cases
  - 4 Electron error cases
  - 4 Tauri error cases
  - 3 React Native error cases
  - 5 edge cases (empty projects, corrupted ZIPs, circular deps, etc.)
- **Copy Functionality** — Copy error logs, build output, and error messages
- **Export Build Logs** — Export complete build logs to text files

### Improved
- **Framework Detection** — Gracefully handles malformed JSON/YAML files
  - Clear error messages for invalid syntax
  - Line numbers for JSON parse errors
  - Helpful hints for common mistakes
- **Error Messages** — More actionable with specific fix suggestions
  - SDK installation instructions
  - Configuration file templates
  - Command examples
- **Build Failure Screen** — Enhanced with copy buttons and fix suggestions
- **Detection Screen** — Shows warnings for non-fatal issues

### Fixed
- Detection crashes on invalid package.json files
- Build process hanging when SDK not found
- Memory leaks in long-running builds
- Console output not scrolling to bottom
- History not persisting across app restarts

### Changed
- Updated Electron to v28.3.3
- Improved UI responsiveness during builds
- Better progress indicators with percentage
- Cleaner console output formatting

### Security
- Added input validation for all file paths
- Sanitized command arguments to prevent injection
- Limited file access to project directories

## [1.1.0] - 2024-01-10

### Added
- **Build History** — Track all past builds with status and output paths
  - Persistent storage in app data directory
  - Quick access to recent projects on home screen
  - Clear history option
- **Settings Persistence** — All settings saved across sessions
  - Theme preference
  - Build output folder
  - Parallel build count
  - Package manager preference
  - Auto-clean temporary files
  - Notification preferences
- **Dark/Light Theme Toggle** — Switch between themes
  - Remembers user preference
  - Smooth transitions
- **Recent Projects** — Quick access to last 4 projects on home screen
- **Notifications** — OS notifications when builds complete
  - Success/failure status
  - Build duration
  - Output file count

### Improved
- **UI Polish** — Smoother animations and transitions
- **Console Output** — Color-coded messages (info, success, warning, error)
- **Progress Bar** — Animated gradient with shimmer effect
- **Build Steps** — Clear visual indicators for current step

### Fixed
- Theme not applying to all UI elements
- Settings not loading on app start
- Build output folder not creating if missing
- Console clear button not working

## [1.0.0] - 2024-01-05

### Added
- **Initial Release** — Core functionality for building cross-platform apps
- **Framework Detection** — Auto-detect Flutter, Electron, Tauri, and React Native
  - Flutter: pubspec.yaml with flutter dependency
  - Electron: package.json with electron dependency
  - Tauri: src-tauri/ directory with Cargo.toml
  - React Native: package.json with react-native dependency
- **Multi-Framework Support** — Handle projects with multiple frameworks
  - Framework selector UI
  - Remember user choice
- **Build Targets** — Select platforms to build for
  - Flutter: Windows, Android, Linux, macOS, Web
  - Electron: Windows, Linux, macOS
  - Tauri: Windows, Android, Linux, macOS
  - React Native: Android, iOS
- **Real-Time Build Console** — Live output streaming
  - Color-coded messages
  - Auto-scroll to bottom
  - Clear button
- **Build Progress** — Visual progress indicators
  - Step-by-step progress
  - Percentage completion
  - Current operation status
- **Build Output** — Display built files with actions
  - Open folder
  - Open file
  - Show in file explorer
  - Copy path
- **Project Import** — Multiple import methods
  - Browse folder
  - Browse ZIP file
  - Drag and drop
- **ZIP Extraction** — Automatic extraction and cleanup
  - Single root folder detection
  - Temporary directory management
- **Error Handling** — Graceful error recovery
  - Clear error messages
  - Suggested fixes
  - Copy error button
  - View full log option
- **Settings** — Basic configuration options
  - Theme selection (dark/light)
  - Build output folder
  - Parallel build count
  - Package manager preference
- **UI** — Modern, responsive interface
  - Dark mode by default
  - Sidebar navigation
  - Breadcrumb navigation
  - Toast notifications
  - Modal dialogs

### Technical
- **Electron 28.x** — Latest stable version
- **Modular Architecture** — Easy to extend with new frameworks
- **IPC Bridge** — Secure communication between main and renderer
- **Context Isolation** — Enhanced security
- **Builder Pattern** — Framework-specific build logic
- **Service Layer** — Separation of concerns
  - Detector service
  - History service
  - Settings service
  - ZIP extractor service
- **Logging** — File and console logging
  - Rotating log files
  - Log levels (info, warn, error, debug)

### Documentation
- **README.md** — Comprehensive project documentation
- **ARCHITECTURE.md** — Technical architecture guide
- **CONTRIBUTING.md** — Contribution guidelines
- **Test Projects** — 6 working examples
  - Flutter demo
  - Electron demo
  - Tauri demo
  - React Native demo
  - Multi-framework demo
  - Unknown framework demo
- **Test Guide** — Detailed testing instructions

## [0.1.0] - 2023-12-20

### Added
- **Prototype** — Initial HTML/CSS/JS prototype
  - UI mockups
  - Interaction flows
  - Visual design

---

## Version History

- **v1.2.0** (2024-01-15) — Enhanced error handling and SDK management
- **v1.1.0** (2024-01-10) — Build history and settings persistence
- **v1.0.0** (2024-01-05) — Initial stable release
- **v0.1.0** (2023-12-20) — Prototype

## Migration Guide

### From v1.1.0 to v1.2.0

**Breaking Changes:** None

**New Features:**
- SDK Manager is now available in Settings
- Build validation checks for required SDKs before starting
- Detection shows warnings for non-fatal issues

**Recommended Actions:**
1. Go to Settings → SDK Manager
2. Check which SDKs are installed
3. Install missing SDKs using one-click install
4. Review detection warnings on your projects

### From v1.0.0 to v1.1.0

**Breaking Changes:** None

**New Features:**
- Build history is now tracked
- Settings persist across sessions

**Recommended Actions:**
1. Configure your preferred settings
2. Check build history after completing builds

## Support

For issues and questions:
- **Bug Reports:** [GitHub Issues](https://github.com/yourusername/universal-app-builder/issues)
- **Feature Requests:** [GitHub Discussions](https://github.com/yourusername/universal-app-builder/discussions)
- **Documentation:** [docs/](docs/)

---

**Last Updated:** 2024-01-15
