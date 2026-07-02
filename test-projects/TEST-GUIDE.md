# 🧪 Universal App Builder — Test Projects & Guide

This folder contains **6 dummy projects** to test every feature and flow
of the Universal App Builder application end-to-end.

---

## 📦 Test Projects

| # | Project | Framework | Purpose |
|---|---------|-----------|---------|
| 1 | **Student Manager** | Flutter | Tests single-framework detection + multi-target build |
| 2 | **Task Tracker** | Electron | Tests Node.js project detection + electron-builder |
| 3 | **SecureVault** | Tauri | Tests Rust + Tauri detection |
| 4 | **FitApp** | React Native | Tests RN detection with Android + iOS |
| 5 | **Hybrid App** | Flutter + Tauri + Electron | Tests **multiple frameworks detected** flow |
| 6 | **Random Project** | None | Tests **"no framework detected"** error flow |

---

## 🧪 Test Scenarios

### ✅ Scenario 1: Flutter Project via Folder Browse
```
1. Click "Browse Folder"
2. Select: test-projects/flutter-demo/
3. Expected: Flutter detected, 5 build targets shown
4. Select: Windows + Android
5. Click "Start Build"
6. Expected: Build console with Flutter commands
```

### ✅ Scenario 2: Electron Project via Drag & Drop
```
1. Drag test-projects/electron-demo/ folder onto the drop zone
2. Expected: Electron detected, 3 build targets
3. Select: Windows
4. Click "Start Build"
```

### ✅ Scenario 3: ZIP Import (React Native)
```
1. Click "Browse ZIP"
2. Select: Test-Project-ReactNative-FitApp.zip
3. Expected: ZIP extracted → React Native detected
4. Expected: Android + iOS targets shown
```

### ✅ Scenario 4: Multiple Frameworks Detected
```
1. Click "Browse Folder"
2. Select: test-projects/multi-framework-demo/
3. Expected: ⚠️ Warning "Multiple frameworks detected"
4. Expected: Framework selector with Flutter, Tauri, Electron
5. Select one framework → targets update accordingly
```

### ✅ Scenario 5: No Framework Detected
```
1. Click "Browse Folder"
2. Select: test-projects/unknown-project/
3. Expected: Toast "No supported framework detected"
4. Expected: Detection screen shows error with helpful message
5. Build button should be disabled
```

### ✅ Scenario 6: Copy Error Logs
```
1. Trigger a build failure (use unknown project or missing SDK)
2. On failure screen, click "📋 Copy Error"
3. Verify error message is in clipboard
4. Click "📋 Copy Fixes"
5. Verify error + suggestions are copied
6. Click "📄 View Full Log" → navigate back to console
7. Hover over console lines → copy buttons appear
8. Click "📋 Copy All" → all logs copied
```

### ✅ Scenario 7: SDK Manager
```
1. Go to Settings
2. Scroll to SDK Manager section
3. Expected: List of 5 SDKs with status (✓ or ✕)
4. Click "Install" on a missing SDK
5. Expected: Download progress bar + status updates
6. After install: Status changes to "✓ Managed"
```

### ✅ Scenario 8: Build History
```
1. After completing a build (successful or failed)
2. Navigate to Build History
3. Expected: Entry with project name, framework, target, status
4. Click "📂 Output" on successful build → opens folder
```

### ✅ Scenario 9: Theme Toggle
```
1. Click 🌙 Dark Mode toggle in sidebar footer
2. Expected: UI switches to light theme
3. Go to Settings → Theme dropdown shows "Light"
4. Switch back to Dark
```

### ✅ Scenario 10: Export Log
```
1. During or after a build, click "📄 Export Log"
2. Expected: Save dialog appears
3. Save file → verify .txt log contains all console output
```

---

## 📋 Expected Detection Rules

### Flutter (`flutter-demo/`)
- ✅ `pubspec.yaml` exists
- ✅ Contains `flutter:` sdk dependency
- ✅ `lib/` directory with Dart files
- **Targets:** Windows, Android, Linux, macOS, Web

### Electron (`electron-demo/`)
- ✅ `package.json` exists
- ✅ Contains `electron` in devDependencies
- ✅ Contains `electron-builder` in devDependencies
- **Targets:** Windows, Linux, macOS

### Tauri (`tauri-demo/`)
- ✅ `src-tauri/` directory exists
- ✅ `Cargo.toml` with tauri dependency
- ✅ `tauri.conf.json` configuration
- **Targets:** Windows, Android, Linux, macOS

### React Native (`react-native-demo/`)
- ✅ `package.json` exists
- ✅ Contains `react-native` in dependencies
- ✅ `android/` and `ios/` directories
- **Targets:** Android, iOS

### Multi-Framework (`multi-framework-demo/`)
- ⚠️ Flutter + Tauri + Electron all detected
- Should show framework chooser modal

### Unknown (`unknown-project/`)
- ❌ No recognized configuration files
- Should show "No framework detected" error

---

## 🗂️ File Structure

```
test-projects/
├── flutter-demo/              # Flutter project
│   ├── pubspec.yaml
│   ├── lib/main.dart
│   ├── android/
│   ├── ios/
│   ├── web/
│   ├── linux/
│   ├── windows/
│   └── macos/
│
├── electron-demo/             # Electron project
│   ├── package.json
│   ├── main.js
│   └── src/index.html
│
├── tauri-demo/                # Tauri project
│   ├── package.json
│   ├── src-tauri/
│   │   ├── Cargo.toml
│   │   ├── tauri.conf.json
│   │   └── src/main.rs
│   └── public/index.html
│
├── react-native-demo/         # React Native project
│   ├── package.json
│   ├── App.js
│   ├── android/
│   └── ios/
│
├── multi-framework-demo/      # Multi-framework (test ambiguity)
│   ├── pubspec.yaml           # Flutter
│   ├── src-tauri/             # Tauri
│   ├── package.json           # Electron
│   └── lib/
│
└── unknown-project/           # No framework (test error)
    ├── README.md
    └── src/main.py
```
