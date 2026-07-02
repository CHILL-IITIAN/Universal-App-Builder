# 🚀 Universal App Builder

<div align="center">

**Build Flutter, Electron, Tauri, and React Native apps from a single interface**

[![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)](https://github.com/yourusername/universal-app-builder)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-28.x-47848F?logo=electron)](https://www.electronjs.org/)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)]()

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## 📋 Overview

Universal App Builder is a desktop application that simplifies building cross-platform apps. Instead of remembering different build commands for each framework, just drop your project folder and let the app handle everything.

**No more terminal commands. No more configuration headaches. Just drag, detect, and build.**

![App Screenshot](docs/screenshot.png)

---

## ✨ Features

### Core Features
- 🎯 **Auto-Detection** — Automatically identifies Flutter, Electron, Tauri, and React Native projects
- 🔨 **One-Click Build** — Select target platform and build with a single click
- 📊 **Real-Time Console** — Watch build progress with color-coded logs
- 📦 **Multi-Platform Output** — Build for Windows, macOS, Linux, Android, iOS, and Web
- 🔄 **Build History** — Track all past builds with success/failure status
- ⚙️ **Customizable Settings** — Configure SDK paths, output folders, themes, and more

### Advanced Features
- 🛠️ **SDK Manager** — Auto-detect, download, and manage required SDKs
- ⚠️ **Smart Error Handling** — Clear error messages with actionable fixes
- 📋 **Copy & Export** — Copy error logs, export build reports
- 🌙 **Dark/Light Themes** — Modern UI inspired by VS Code
- 🔌 **Plugin Architecture** — Easy to extend with new framework support

### Supported Frameworks

| Framework | Detection Method | Build Targets |
|-----------|------------------|---------------|
| **Flutter** | `pubspec.yaml` + flutter dependency | Windows, Android, Linux, macOS, Web |
| **Electron** | `package.json` + electron dependency | Windows, Linux, macOS |
| **Tauri** | `src-tauri/` + Cargo.toml | Windows, Android, Linux, macOS |
| **React Native** | `package.json` + react-native dependency | Android, iOS |

---

## 🚀 Installation

### Option 1: Download Pre-built Binary (Recommended)

Download the latest release for your platform:

- **Windows**: `Universal-App-Builder-v1.2.0-win32-x64.zip` (104 MB)
  - Extract and run `Universal App Builder.exe`
  - No installation required

<details>
<summary>Other platforms (build from source)</summary>

```bash
# macOS
npm run build:mac

# Linux
npm run build:linux
```

</details>

### Option 2: Build from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/universal-app-builder.git
cd universal-app-builder/app

# Install dependencies
npm install

# Run in development mode
npm start

# Build for production
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

### Prerequisites

The app itself requires:
- **Node.js** 18+ (for running the app)

To build projects, you'll need the respective SDKs:
- **Flutter SDK** — [Install](https://flutter.dev/docs/get-started/install)
- **Rust/Cargo** — [Install](https://rustup.rs) (for Tauri)
- **Android SDK** — [Install via Android Studio](https://developer.android.com/studio)
- **Xcode** — macOS only (for iOS builds)

💡 **Tip**: Use the built-in SDK Manager to automatically install missing SDKs!

---

## 📖 Usage

### Quick Start

1. **Launch the app** — Run `Universal App Builder.exe`
2. **Import a project** — Click "Browse Folder" or drag a project folder
3. **Review detection** — The app auto-detects the framework
4. **Select targets** — Choose which platforms to build for
5. **Build** — Click "Start Build" and watch the magic happen
6. **Get output** — Find your built app in the output folder

### Detailed Workflow

#### 1. Project Import

**Folder Import:**
```
Click "Browse Folder" → Select your project directory
```

**ZIP Import:**
```
Click "Browse ZIP" → Select a .zip file
The app extracts and analyzes it automatically
```

**Drag & Drop:**
```
Drag any folder or ZIP file onto the app window
```

#### 2. Framework Detection

The app analyzes your project structure:

```
✅ Flutter detected (v3.19.0)
   • Windows ✓  Android ✓  Linux ✓  macOS ✓  Web ✓

⚠️ Warnings:
   • No android/ folder found. Run "flutter create ." to add it.
```

If multiple frameworks are detected, you'll be prompted to choose.

#### 3. Build Configuration

Select your target platforms:
- ☑️ Windows (.exe)
- ☑️ Android (.apk)
- ☐ Linux (.AppImage)
- ☐ macOS (.dmg)

#### 4. Build Process

Watch real-time progress:
```
[14:32:05] ▶ Installing dependencies...
[14:32:07] $ flutter pub get
[14:32:15] ✓ Dependencies installed (24 packages)
[14:32:15] ▶ Building for Windows...
[14:32:16] $ flutter build windows --release
[14:34:58] ✓ Build successful!
[14:34:58] ▶ Collecting output files...
[14:34:59] ✓ StudentManager.exe (148 MB)
```

#### 5. Build Output

After completion:
- **Open Folder** — Navigate to output directory
- **Open File** — Launch the built app directly
- **Copy Path** — Copy file path to clipboard
- **View Logs** — Review build console output

---

## 📚 Documentation

### Project Structure

```
universal-app-builder/
├── app/                          # Main Electron application
│   ├── main.js                   # Main process
│   ├── preload.js                # IPC bridge
│   ├── package.json              # Dependencies
│   └── src/
│       ├── renderer/             # Frontend (HTML/CSS/JS)
│       ├── services/             # Backend services
│       │   ├── detector.js       # Framework detection
│       │   ├── sdk-manager.js    # SDK management
│       │   ├── history.js        # Build history
│       │   └── builders/         # Framework-specific builders
│       └── utils/                # Utilities
│
├── test-projects/                # Working test projects
│   ├── flutter-demo/             # Flutter example
│   ├── electron-demo/            # Electron example
│   ├── tauri-demo/               # Tauri example
│   ├── react-native-demo/        # React Native example
│   ├── multi-framework-demo/     # Multiple frameworks
│   └── unknown-project/          # No framework
│
├── broken-projects/              # Error testing suite
│   ├── flutter-*/                # 5 Flutter error cases
│   ├── electron-*/               # 4 Electron error cases
│   ├── tauri-*/                  # 4 Tauri error cases
│   ├── react-native-*/           # 3 React Native error cases
│   └── [edge cases]              # 5 edge cases
│
├── prototype/                    # Original UI prototype
│   └── Prototype.html
│
└── docs/                         # Documentation
    ├── ARCHITECTURE.md
    ├── ERROR-HANDLING.md
    └── CONTRIBUTING.md
```

### Adding New Framework Support

1. Create a new builder in `src/services/builders/`
2. Extend the `BaseBuilder` class
3. Implement the `build()` method
4. Register it in `main.js`:

```javascript
const builders = {
    flutter: new FlutterBuilder(),
    electron: new ElectronBuilder(),
    tauri: new TauriBuilder(),
    'react-native': new ReactNativeBuilder(),
    unity: new UnityBuilder()  // ← Add your framework
};
```

5. Add detection logic in `detector.js`

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed guide.

---

## 🧪 Testing

### Test Projects

The repository includes **27 test projects** for comprehensive testing:

**Working Projects (6):**
- Flutter, Electron, Tauri, React Native examples
- Multi-framework detection test
- Unknown framework test

**Broken Projects (21):**
- Missing config files
- Invalid JSON/YAML
- Syntax errors
- Missing dependencies
- Corrupted archives
- Edge cases

See [test-projects/TEST-GUIDE.md](test-projects/TEST-GUIDE.md) for detailed testing instructions.

### Running Tests

```bash
# Test with working projects
cd test-projects
# Import each project and verify detection + build

# Test error handling
cd broken-projects
# Import each broken project and verify error messages
```

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

### Ways to Contribute

1. **Add Framework Support** — Implement builders for new frameworks
2. **Improve Error Messages** — Make errors clearer and more actionable
3. **Add Test Cases** — Create more broken project scenarios
4. **Fix Bugs** — Check the [Issues](https://github.com/yourusername/universal-app-builder/issues) page
5. **Documentation** — Improve docs, add examples, fix typos

### Development Setup

```bash
# Clone and install
git clone https://github.com/yourusername/universal-app-builder.git
cd universal-app-builder/app
npm install

# Run in dev mode with hot reload
npm start

# Run tests
npm test
```

### Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for detailed guidelines.

---

## 🐛 Known Issues

- **Windows NSIS Installer** — Currently builds as portable ZIP only (NSIS requires Wine on Linux)
- **iOS Builds** — Only work on macOS (Apple requirement)
- **Android SDK** — Large download (~1.5 GB) via SDK Manager

See [Issues](https://github.com/yourusername/universal-app-builder/issues) for full list.

---

## 🗺️ Roadmap

### v1.3.0 (Planned)
- [ ] Cloud build integration (GitHub Actions, GitLab CI)
- [ ] Build templates and presets
- [ ] Parallel builds for multiple targets
- [ ] Code signing automation

### v2.0.0 (Future)
- [ ] Plugin system for custom build steps
- [ ] Team collaboration features
- [ ] Build analytics and performance metrics
- [ ] Mobile companion app for remote monitoring

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Electron** — For making cross-platform desktop apps possible
- **Flutter, Tauri, React Native** — For amazing cross-platform frameworks
- **VS Code & GitHub Desktop** — UI inspiration
- **All Contributors** — Thank you for making this better!

---

## 📞 Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/universal-app-builder/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/universal-app-builder/discussions)

---

<div align="center">

**Made with ❤️ by the Universal App Builder team**

[⬆ Back to Top](#-universal-app-builder)

</div>
