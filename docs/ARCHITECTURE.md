# Architecture Guide

This document explains the architecture of Universal App Builder and how to extend it with new frameworks.

## Overview

Universal App Builder follows a modular architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                      Renderer Process                        │
│                    (Frontend UI - HTML/CSS/JS)                │
└────────────────────────┬────────────────────────────────────┘
                         │ IPC (contextBridge)
┌────────────────────────▼────────────────────────────────────┐
│                       Main Process                           │
│                   (Electron Main - Node.js)                   │
│  ┌──────────────┬──────────────┬──────────────┬───────────┐ │
│  │   Detector   │ SDK Manager  │   History    │  Logger   │ │
│  └──────┬───────┴──────────────┴──────────────┴───────────┘ │
│         │                                                    │
│  ┌──────▼──────────────────────────────────────────────────┐│
│  │                   Builder Registry                        ││
│  │  ┌──────────┬──────────┬──────────┬──────────┐          ││
│  │  │ Flutter  │ Electron │  Tauri   │React Ntv │          ││
│  │  │ Builder  │ Builder  │ Builder  │ Builder  │          ││
│  │  └──────────┴──────────┴──────────┴──────────┘          ││
│  └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Detector (`src/services/detector.js`)

Responsible for analyzing project structure and identifying frameworks.

**Key Methods:**
- `detect(projectPath)` — Main entry point, returns detected frameworks
- `_detectFlutter(projectPath)` — Flutter-specific detection
- `_detectElectron(projectPath)` — Electron-specific detection
- `_detectTauri(projectPath)` — Tauri-specific detection
- `_detectReactNative(projectPath)` — React Native-specific detection

**Detection Strategy:**
Each detector checks for framework-specific files:
- Flutter: `pubspec.yaml` with `flutter` dependency
- Electron: `package.json` with `electron` dependency
- Tauri: `src-tauri/` directory with `Cargo.toml`
- React Native: `package.json` with `react-native` dependency

**Error Handling:**
- Gracefully handles malformed files (invalid JSON/YAML)
- Returns warnings for non-fatal issues
- Never crashes on bad input

### 2. Builders (`src/services/builders/`)

Each framework has its own builder class that extends `BaseBuilder`.

**BaseBuilder Interface:**
```javascript
class BaseBuilder {
    constructor(frameworkId, displayName) { }
    
    async validate(projectPath, options) { }
    async build(projectPath, targets, options) { }
    async clean(projectPath) { }
    
    getSupportedTargets() { }
    getRequiredSdks() { }
}
```

**Builder Lifecycle:**
1. `validate()` — Check if project is valid for building
2. `build()` — Execute build commands for each target
3. `clean()` — Remove build artifacts

**Example: Flutter Builder**
```javascript
class FlutterBuilder extends BaseBuilder {
    async build(projectPath, targets, options) {
        const results = [];
        
        for (const target of targets) {
            // Run: flutter build <target> --release
            const result = await this.runCommand(
                'flutter',
                ['build', target, '--release'],
                { cwd: projectPath }
            );
            
            results.push({
                target,
                success: result.exitCode === 0,
                output: result.stdout,
                error: result.stderr
            });
        }
        
        return results;
    }
}
```

### 3. SDK Manager (`src/services/sdk-manager.js`)

Manages SDK installation and validation.

**Supported SDKs:**
- Flutter SDK
- Node.js
- Rust/Cargo
- Android SDK (command-line tools)
- Java JDK

**Key Methods:**
- `checkAll()` — Check status of all SDKs
- `checkSdk(sdkKey)` — Check specific SDK
- `installSdk(sdkKey)` — Download and install SDK
- `uninstallSdk(sdkKey)` — Remove managed SDK

**SDK Detection:**
1. Check if SDK is in system PATH
2. Check if SDK is managed by the app
3. Return status: installed (system/managed) or missing

### 4. History Manager (`src/services/history.js`)

Tracks build history with persistent storage.

**Storage:**
- JSON file in app data directory
- Stores: project name, framework, targets, status, timestamp, output paths

**Key Methods:**
- `add(entry)` — Add build to history
- `getAll()` — Get all history entries
- `clear()` — Clear all history

### 5. Logger (`src/utils/logger.js`)

Centralized logging with file output.

**Log Levels:**
- `info()` — General information
- `warn()` — Warnings
- `error()` — Errors
- `debug()` — Debug information

**Output:**
- Console (during development)
- Log files (in app data directory)

## Adding a New Framework

### Step 1: Create Builder Class

Create `src/services/builders/my-framework-builder.js`:

```javascript
const BaseBuilder = require('./base-builder');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class MyFrameworkBuilder extends BaseBuilder {
    constructor() {
        super('my-framework', 'My Framework');
    }

    async validate(projectPath, options) {
        // Check if project is valid
        const configFile = path.join(projectPath, 'my-framework.config.json');
        
        if (!fs.existsSync(configFile)) {
            throw new Error('my-framework.config.json not found');
        }
        
        return {
            valid: true,
            version: '1.0.0'
        };
    }

    async build(projectPath, targets, options) {
        const results = [];
        
        for (const target of targets) {
            try {
                // Run build command
                const result = await this.runCommand(
                    'my-framework',
                    ['build', '--target', target, '--release'],
                    { cwd: projectPath }
                );
                
                const success = result.exitCode === 0;
                const outputPath = this._getOutputPath(projectPath, target);
                
                results.push({
                    target,
                    success,
                    outputPath: success ? outputPath : null,
                    output: result.stdout,
                    error: result.stderr
                });
            } catch (error) {
                results.push({
                    target,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return results;
    }

    async clean(projectPath) {
        const buildDir = path.join(projectPath, 'build');
        if (fs.existsSync(buildDir)) {
            fs.rmSync(buildDir, { recursive: true });
        }
    }

    getSupportedTargets() {
        return [
            { id: 'windows', name: 'Windows', icon: '🪟', ext: '.exe' },
            { id: 'linux', name: 'Linux', icon: '🐧', ext: '.AppImage' },
            { id: 'macos', name: 'macOS', icon: '🍎', ext: '.dmg' }
        ];
    }

    getRequiredSdks() {
        return ['nodejs']; // List of required SDK keys
    }

    _getOutputPath(projectPath, target) {
        // Return path to built output
        return path.join(projectPath, 'build', target, 'output.exe');
    }

    runCommand(command, args, options) {
        return new Promise((resolve, reject) => {
            const proc = spawn(command, args, options);
            let stdout = '';
            let stderr = '';
            
            proc.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            proc.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            proc.on('close', (exitCode) => {
                resolve({ exitCode, stdout, stderr });
            });
            
            proc.on('error', reject);
        });
    }
}

module.exports = MyFrameworkBuilder;
```

### Step 2: Add Detection Logic

Edit `src/services/detector.js` and add detection method:

```javascript
_detectMyFramework(projectPath) {
    const configPath = path.join(projectPath, 'my-framework.config.json');
    
    if (!fs.existsSync(configPath)) {
        return null;
    }
    
    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        
        return {
            id: 'my-framework',
            name: 'My Framework',
            version: config.version || 'Unknown',
            config: {
                configPath
            }
        };
    } catch (error) {
        this.warnings.push(`Invalid my-framework.config.json: ${error.message}`);
        return null;
    }
}
```

Add to detectors array in constructor:
```javascript
this.detectors = [
    this._detectFlutter.bind(this),
    this._detectElectron.bind(this),
    this._detectTauri.bind(this),
    this._detectReactNative.bind(this),
    this._detectMyFramework.bind(this)  // ← Add here
];
```

### Step 3: Register Builder

Edit `main.js` and register the builder:

```javascript
const MyFrameworkBuilder = require('./src/services/builders/my-framework-builder');

const builders = {
    flutter: new FlutterBuilder(),
    electron: new ElectronBuilder(),
    tauri: new TauriBuilder(),
    'react-native': new ReactNativeBuilder(),
    'my-framework': new MyFrameworkBuilder()  // ← Add here
};
```

### Step 4: Update SDK Manager (if needed)

If your framework requires a new SDK, add it to `src/services/sdk-manager.js`:

```javascript
const SDK_REGISTRY = {
    // ... existing SDKs ...
    
    'my-framework-sdk': {
        name: 'My Framework SDK',
        version: '1.0.0',
        checkCommand: 'my-framework',
        checkArgs: ['--version'],
        downloadUrl: {
            win32: 'https://example.com/my-framework-windows.zip',
            darwin: 'https://example.com/my-framework-macos.tar.gz',
            linux: 'https://example.com/my-framework-linux.tar.gz'
        }
    }
};
```

### Step 5: Add Icon

Add framework icon to `src/renderer/app.js`:

```javascript
const frameworkIcons = {
    flutter: '🦋',
    electron: '⚡',
    tauri: '🦀',
    'react-native': '⚛️',
    'my-framework': '🎯'  // ← Add icon
};
```

### Step 6: Test

Create test projects:
- `test-projects/my-framework-demo/` — Working example
- `broken-projects/my-framework-missing-config/` — Error case

## Best Practices

### Error Handling
- Always validate inputs before processing
- Return structured error objects with `code`, `message`, and `details`
- Never let exceptions bubble up to the UI
- Log errors with full context

### Build Commands
- Use `spawn` instead of `exec` for better control
- Stream output in real-time via IPC
- Handle process termination gracefully
- Set reasonable timeouts

### File Operations
- Always check if files/directories exist before accessing
- Use `path.join()` for cross-platform path handling
- Clean up temporary files after builds
- Handle permission errors gracefully

### SDK Management
- Check system PATH before downloading
- Validate downloads with checksums
- Provide clear uninstall options
- Cache downloads to avoid re-downloading

## Performance Considerations

### Build Process
- Run builds in separate processes to avoid blocking UI
- Use worker threads for CPU-intensive tasks
- Implement build cancellation
- Show real-time progress updates

### File Operations
- Use streaming for large files
- Implement progress indicators for long operations
- Clean up old build artifacts periodically

### Memory Management
- Don't load entire files into memory when not needed
- Clean up event listeners when components unmount
- Use weak references for caches

## Security Considerations

### Input Validation
- Sanitize all file paths
- Validate project structure before building
- Limit file access to project directory
- Prevent path traversal attacks

### Command Execution
- Never use `shell: true` with user input
- Escape command arguments properly
- Use allowlists for commands
- Run builds with limited permissions

### Data Storage
- Encrypt sensitive data (API keys, credentials)
- Don't store passwords in plain text
- Use OS keychain when available
- Clear sensitive data from memory after use

## Debugging

### Logging
```javascript
const logger = require('../utils/logger');

logger.info('Build started', { projectPath, targets });
logger.warn('Deprecated API used', { api: 'oldMethod' });
logger.error('Build failed', { error: error.message, stack: error.stack });
```

### DevTools
In development mode, open DevTools:
```javascript
mainWindow.webContents.openDevTools();
```

### Common Issues

**Issue: Build hangs**
- Check if child process is waiting for input
- Add timeout to command execution
- Implement proper process termination

**Issue: Memory leak**
- Check for uncleaned event listeners
- Verify streams are closed
- Monitor heap usage with `process.memoryUsage()`

**Issue: Slow detection**
- Profile detection methods
- Cache results when possible
- Use async/await properly

## Future Enhancements

### Planned Features
- Plugin system for third-party builders
- Remote build support (cloud CI/CD)
- Build templates and presets
- Parallel builds for multiple targets
- Build analytics and performance metrics

### Architecture Improvements
- Move to TypeScript for better type safety
- Implement proper dependency injection
- Add comprehensive unit tests
- Create builder testing framework
- Implement event-driven architecture

## Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [Node.js Child Process](https://nodejs.org/api/child_process.html)
- [Framework Build Tools](https://github.com/user-attachments/assets/universal-app-builder)

---

**Last Updated:** 2024-01-15  
**Version:** 1.2.0
