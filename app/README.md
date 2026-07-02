# ⚡ Universal App Builder

A modern desktop application that lets you import any project, automatically detect its framework, and build it into executable formats — all without touching the terminal.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Electron](https://img.shields.io/badge/Electron-28.x-47848F?logo=electron)

## ✨ Features

- **🔍 Auto-Detection** — Automatically identifies Flutter, Electron, Tauri, and React Native projects
- **🔨 One-Click Builds** — Select your target platform and build with a single click
- **📦 Multi-Platform Output** — Build for Windows, macOS, Linux, Android, iOS, and Web
- **📋 Real-Time Console** — Watch build progress with color-coded log output
- **📜 Build History** — Track all past builds with success/failure status
- **⚙️ Customizable Settings** — Configure SDK paths, output folders, themes, and more
- **🌙 Dark & Light Themes** — Modern UI inspired by VS Code and GitHub Desktop
- **🔌 Modular Architecture** — Easy to extend with new framework builders

## 🛠️ Supported Frameworks

| Framework | Detection | Build Targets |
|-----------|-----------|---------------|
| **Flutter** | `pubspec.yaml` + flutter dep | Windows, Android, Linux, macOS, Web |
| **Electron** | `package.json` + electron dep | Windows, Linux, macOS |
| **Tauri** | `src-tauri/` + `Cargo.toml` | Windows, Android, Linux, macOS |
| **React Native** | `package.json` + react-native dep | Android, iOS |

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org))
- **npm** (included with Node.js)

Optional (depending on which frameworks you want to build):
- **Flutter SDK** — [Install](https://flutter.dev/docs/get-started/install)
- **Rust/Cargo** — [Install](https://rustup.rs) (for Tauri)
- **Android SDK** — [Install via Android Studio](https://developer.android.com/studio)
- **Xcode** — macOS only (for iOS builds)

### Installation

```bash
# Clone or download this repository
cd universal-app-builder

# Install dependencies
npm install

# Start the application in development mode
npm start
```

### Building the App Itself

```bash
# Build for all platforms
npm run build

# Build for specific platform
npm run build:win      # Windows (.exe installer)
npm run build:mac      # macOS (.dmg)
npm run build:linux    # Linux (.AppImage)
```

Built executables will be in the `dist/` folder.

## 📁 Project Structure

```
universal-app-builder/
├── main.js                          # Electron main process
├── preload.js                       # Secure IPC bridge
├── package.json                     # Dependencies & build config
├── README.md
│
├── src/
│   ├── renderer/                    # Frontend (UI)
│   │   ├── index.html               # Main HTML
│   │   ├── styles.css               # All styles (dark/light themes)
│   │   └── app.js                   # UI logic & IPC communication
│   │
│   ├── services/                    # Backend services
│   │   ├── detector.js              # Framework auto-detection engine
│   │   ├── history.js               # Build history persistence
│   │   ├── settings.js              # Settings management
│   │   ├── zip-extractor.js         # ZIP file extraction
│   │   │
│   │   └── builders/                # Framework build adapters
│   │       ├── base-builder.js      # Abstract base class
│   │       ├── flutter-builder.js   # Flutter build logic
│   │       ├── electron-builder.js  # Electron build logic
│   │       ├── tauri-builder.js     # Tauri build logic
│   │       └── react-native-builder.js  # React Native build logic
│   │
│   └── utils/                       # Shared utilities
│       ├── logger.js                # File & console logging
│       └── paths.js                 # Path resolution helpers
│
└── assets/
    └── icon.png                     # Application icon
```

## 🏗️ Architecture

The application follows a **modular adapter pattern**:

```
┌─────────────────────────────────────────────┐
│              Renderer Process                │
│         (HTML / CSS / JavaScript)            │
├─────────────────────────────────────────────┤
│              Preload Bridge                  │
│      (contextBridge / IPC handlers)          │
├─────────────────────────────────────────────┤
│              Main Process                    │
│    ┌──────────┬──────────┬──────────┐       │
│    │ Detector │ Builders │ History  │       │
│    │          │          │ Settings │       │
│    └──────────┴──────────┴──────────┘       │
│         │           │           │            │
│    ┌────┴───┐ ┌─────┴────┐ ┌──┴───┐        │
│    │Flutter │ │ Electron │ │Tauri │ ...     │
│    │Builder │ │ Builder  │ │Build │        │
│    └────────┘ └──────────┘ └──────┘        │
└─────────────────────────────────────────────┘
```

### Adding a New Framework

1. Create a new file in `src/services/builders/` (e.g., `unity-builder.js`)
2. Extend `BaseBuilder` and implement the `build()` method
3. Register it in `main.js` in the `builders` object
4. Add detection rules in `src/services/detector.js`
5. That's it — no other files need to change!

```javascript
// Example: Adding Unity support
const UnityBuilder = require('./src/services/builders/unity-builder');

const builders = {
    flutter: new FlutterBuilder(),
    electron: new ElectronBuilder(),
    tauri: new TauriBuilder(),
    'react-native': new ReactNativeBuilder(),
    unity: new UnityBuilder()  // ← Just add this
};
```

## 🎨 UI Screens

| Screen | Description |
|--------|-------------|
| **Home** | Drop zone, browse buttons, recent projects |
| **Detection** | Project info, framework details, target selection |
| **Build** | Real-time progress, streaming console, cancel |
| **Output** | Build results with file details and actions |
| **History** | Past build records with rebuild option |
| **Settings** | Theme, SDK paths, build config, notifications |

## 🔒 Security

- **100% local** — Nothing is ever uploaded or transmitted
- **No telemetry** — No analytics or data collection
- **Sandboxed** — Renderer process has no direct Node.js access
- **CSP enabled** — Content Security Policy restricts resource loading

## 📋 Error Handling

The app provides clear, human-readable error messages with suggested fixes:

- Flutter SDK not detected → Install link provided
- Rust toolchain missing → rustup.rs link
- Android SDK missing → Android Studio link
- Node.js not installed → nodejs.org link
- Gradle build failed → Suggest checking SDK config
- Package install failed → Suggest checking lock files

## 📄 License

MIT License — free for personal and commercial use.

---

Built with ❤️ using Electron
