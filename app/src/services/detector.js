/**
 * Framework Detection Service (Enhanced)
 * 
 * Analyzes a project directory to determine which framework it uses.
 * Supports: Flutter, Electron, Tauri, React Native
 * 
 * Features:
 * - Graceful handling of malformed files (YAML, JSON, TOML)
 * - Detailed warnings for issues found during detection
 * - File validation before framework identification
 * - Helpful error messages for common problems
 */

const fs = require('fs');
const path = require('path');

class Detector {
    constructor() {
        this.warnings = [];
        this.detectors = [
            this._detectFlutter.bind(this),
            this._detectElectron.bind(this),
            this._detectTauri.bind(this),
            this._detectReactNative.bind(this)
        ];
    }

    /**
     * Detect frameworks in the given project path
     */
    async detect(projectPath) {
        this.warnings = [];

        // Validate the path
        if (!projectPath || typeof projectPath !== 'string') {
            throw new Error('Invalid project path provided.');
        }

        if (!fs.existsSync(projectPath)) {
            throw new Error(
                `Project path does not exist: ${projectPath}\n\n` +
                `Possible reasons:\n` +
                `• The folder was moved or deleted\n` +
                `• The path contains typos\n` +
                `• You don't have permission to access this location\n\n` +
                `Fix: Browse to the correct project folder.`
            );
        }

        let stat;
        try {
            stat = fs.statSync(projectPath);
        } catch (e) {
            throw new Error(
                `Cannot access project path: ${e.message}\n\n` +
                `This might be a permissions issue. Try running the app with appropriate permissions.`
            );
        }

        if (!stat.isDirectory()) {
            throw new Error(
                `Selected path is not a directory: ${projectPath}\n\n` +
                `Please select a project folder, not a file.\n` +
                `If you have a ZIP file, use "Browse ZIP" instead.`
            );
        }

        // Check if directory is empty (or only has hidden files)
        const entries = this._safeReaddir(projectPath);
        const visibleEntries = entries.filter(e => !e.startsWith('.'));
        if (visibleEntries.length === 0) {
            return {
                detected: false,
                frameworks: [],
                projectName: path.basename(projectPath),
                projectPath,
                warnings: ['The project folder appears to be empty.'],
                message: 'The selected folder is empty. Please select a folder that contains a project.'
            };
        }

        // Run all detectors
        const results = [];
        for (const detectorFn of this.detectors) {
            try {
                const result = await detectorFn(projectPath);
                if (result) {
                    results.push(result);
                }
            } catch (e) {
                this.warnings.push(`Detection error: ${e.message}`);
            }
        }

        if (results.length === 0) {
            return {
                detected: false,
                frameworks: [],
                projectName: path.basename(projectPath),
                projectPath,
                warnings: this.warnings,
                message: this._getNoDetectionMessage(projectPath, visibleEntries)
            };
        }

        return {
            detected: true,
            frameworks: results,
            projectName: path.basename(projectPath),
            projectPath,
            warnings: this.warnings,
            primary: results.length === 1 ? results[0] : null
        };
    }

    /**
     * Get a helpful message when no framework is detected
     */
    _getNoDetectionMessage(projectPath, entries) {
        const hasPubspec = entries.includes('pubspec.yaml');
        const hasPackageJson = entries.includes('package.json');
        const hasSrcTauri = entries.includes('src-tauri');
        const hasCargo = entries.includes('Cargo.toml');

        if (hasPubspec) {
            return 'Found pubspec.yaml but no Flutter SDK dependency. ' +
                   'Ensure your pubspec.yaml includes:\n\n' +
                   'dependencies:\n' +
                   '  flutter:\n' +
                   '    sdk: flutter';
        }

        if (hasPackageJson) {
            return 'Found package.json but no supported framework dependency.\n\n' +
                   'Supported frameworks:\n' +
                   '• Electron: add "electron" to devDependencies\n' +
                   '• React Native: add "react-native" to dependencies\n' +
                   '• Tauri: add "@tauri-apps/cli" to devDependencies';
        }

        if (hasSrcTauri || hasCargo) {
            return 'Found Rust/Tauri files but configuration is incomplete.\n\n' +
                   'Ensure your project has:\n' +
                   '• src-tauri/Cargo.toml\n' +
                   '• src-tauri/tauri.conf.json\n' +
                   '• package.json with @tauri-apps/cli';
        }

        return 'No supported framework detected.\n\n' +
               'Universal App Builder supports:\n' +
               '• Flutter (pubspec.yaml with flutter dependency)\n' +
               '• Electron (package.json with electron dependency)\n' +
               '• Tauri (src-tauri/ directory with Cargo.toml)\n' +
               '• React Native (package.json with react-native dependency)\n\n' +
               'Make sure your project has the correct configuration files.';
    }

    /**
     * Safe directory reading — returns empty array on error
     */
    _safeReaddir(dirPath) {
        try {
            return fs.readdirSync(dirPath);
        } catch (e) {
            this.warnings.push(`Cannot read directory ${dirPath}: ${e.message}`);
            return [];
        }
    }

    /**
     * Safe file reading — returns null on error with warning
     */
    _safeReadFile(filePath, label) {
        try {
            return fs.readFileSync(filePath, 'utf-8');
        } catch (e) {
            this.warnings.push(`Cannot read ${label || filePath}: ${e.message}`);
            return null;
        }
    }

    /**
     * Safe JSON parsing — returns null on error with warning
     */
    _safeParseJSON(content, filePath) {
        try {
            return JSON.parse(content);
        } catch (e) {
            this.warnings.push(
                `Invalid JSON in ${path.basename(filePath)}: ${e.message}\n` +
                `Tip: Check for missing commas, trailing commas, or comments (not allowed in JSON).`
            );
            return null;
        }
    }

    // ==========================================
    // Flutter Detection
    // ==========================================
    async _detectFlutter(projectPath) {
        const pubspecPath = path.join(projectPath, 'pubspec.yaml');
        if (!fs.existsSync(pubspecPath)) return null;

        const content = this._safeReadFile(pubspecPath, 'pubspec.yaml');
        if (!content) return null;

        // Validate YAML structure (basic check)
        if (!this._validateYAML(content, pubspecPath)) {
            return null;
        }

        // Check for flutter dependency
        const hasFlutterDep = /flutter:\s*\n\s*sdk:\s*flutter/.test(content) ||
                              /dependencies:[\s\S]*?flutter:\s*\n\s*sdk:/.test(content);

        if (!hasFlutterDep) {
            this.warnings.push(
                'pubspec.yaml found but no Flutter SDK dependency detected.\n' +
                'Add this to your pubspec.yaml:\n\n' +
                'dependencies:\n' +
                '  flutter:\n' +
                '    sdk: flutter'
            );
            return null;
        }

        // Extract project name
        const nameMatch = content.match(/^name:\s*(.+)$/m);
        const projectName = nameMatch ? nameMatch[1].trim() : path.basename(projectPath);

        // Get Flutter SDK version
        const sdkVersion = await this._getFlutterVersion();

        // Check platform folders and generate warnings
        const platforms = {
            android: fs.existsSync(path.join(projectPath, 'android')),
            ios: fs.existsSync(path.join(projectPath, 'ios')),
            web: fs.existsSync(path.join(projectPath, 'web')),
            linux: fs.existsSync(path.join(projectPath, 'linux')),
            macos: fs.existsSync(path.join(projectPath, 'macos')),
            windows: fs.existsSync(path.join(projectPath, 'windows'))
        };

        const availablePlatforms = Object.entries(platforms).filter(([, v]) => v).map(([k]) => k);
        if (availablePlatforms.length === 0) {
            this.warnings.push(
                'No platform folders found (android/, ios/, web/, etc.).\n' +
                'Run "flutter create ." in your project to generate platform folders.'
            );
        }

        return {
            id: 'flutter',
            name: 'Flutter',
            icon: '🦋',
            projectName,
            version: sdkVersion || 'Unknown',
            packageManager: 'pub (Dart)',
            config: {
                pubspecPath,
                ...platforms
            },
            targets: this._getFlutterTargets(projectPath),
            warnings: [...this.warnings]
        };
    }

    /**
     * Basic YAML validation
     */
    _validateYAML(content, filePath) {
        // Check for common YAML issues
        const lines = content.split('\n');
        
        // Check for tabs (YAML doesn't allow tabs for indentation)
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].match(/^\t/)) {
                this.warnings.push(
                    `pubspec.yaml line ${i + 1}: Tabs are not allowed for YAML indentation. Use spaces instead.`
                );
            }
        }

        // Check for unclosed brackets
        const openBrackets = (content.match(/\[/g) || []).length;
        const closeBrackets = (content.match(/\]/g) || []).length;
        if (openBrackets !== closeBrackets) {
            this.warnings.push(
                `pubspec.yaml: Unclosed brackets detected ([ count: ${openBrackets}, ] count: ${closeBrackets}).\n` +
                `Fix: Ensure all [ ] brackets are properly closed.`
            );
            return false;
        }

        // Check for basic structure
        if (!content.match(/^\w+:/m)) {
            this.warnings.push(
                'pubspec.yaml appears to have invalid structure.\n' +
                'Expected YAML key-value pairs like "name: my_app".'
            );
            return false;
        }

        return true;
    }

    // ==========================================
    // Electron Detection
    // ==========================================
    async _detectElectron(projectPath) {
        const packageJsonPath = path.join(projectPath, 'package.json');
        if (!fs.existsSync(packageJsonPath)) return null;

        const content = this._safeReadFile(packageJsonPath, 'package.json');
        if (!content) return null;

        const pkg = this._safeParseJSON(content, packageJsonPath);
        if (!pkg) return null;

        const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

        if (!allDeps.electron) {
            // Only warn if it looks like it could be an electron project
            if (pkg.main && pkg.main.includes('electron')) {
                this.warnings.push(
                    'package.json references electron in "main" but electron is not in dependencies.\n' +
                    'Run: npm install --save-dev electron'
                );
            }
            return null;
        }

        // Check for build tooling
        const hasBuilder = !!(allDeps['electron-builder'] || allDeps['electron-forge'] || allDeps['@electron-forge/cli']);
        const builderTool = allDeps['electron-builder'] ? 'electron-builder' :
                           allDeps['@electron-forge/cli'] ? 'electron-forge' : null;

        if (!hasBuilder) {
            this.warnings.push(
                'No build tool detected (electron-builder or electron-forge).\n' +
                'Consider adding: npm install --save-dev electron-builder'
            );
        }

        // Check if main entry point exists
        const mainFile = pkg.main || 'main.js';
        const mainPath = path.join(projectPath, mainFile);
        if (!fs.existsSync(mainPath)) {
            this.warnings.push(
                `Entry point "${mainFile}" specified in package.json does not exist.\n` +
                `Create the file or update the "main" field in package.json.`
            );
        }

        return {
            id: 'electron',
            name: 'Electron',
            icon: '⚡',
            projectName: pkg.name || path.basename(projectPath),
            version: allDeps.electron.replace(/[\^~>=<]/g, ''),
            packageManager: this._detectNodePackageManager(projectPath),
            config: {
                packageJsonPath,
                builderTool: builderTool || 'manual',
                hasBuilder,
                main: mainFile,
                mainExists: fs.existsSync(mainPath),
                scripts: pkg.scripts || {}
            },
            targets: [
                { id: 'windows', name: 'Windows', desc: '.exe installer', icon: '🪟' },
                { id: 'linux', name: 'Linux', desc: '.AppImage / .deb', icon: '🐧' },
                { id: 'macos', name: 'macOS', desc: '.dmg package', icon: '🍎' }
            ],
            warnings: [...this.warnings]
        };
    }

    // ==========================================
    // Tauri Detection
    // ==========================================
    async _detectTauri(projectPath) {
        const srcTauriPath = path.join(projectPath, 'src-tauri');
        if (!fs.existsSync(srcTauriPath)) return null;

        const tauriConfPath = path.join(srcTauriPath, 'tauri.conf.json');
        const cargoPath = path.join(srcTauriPath, 'Cargo.toml');

        let version = 'Unknown';
        let projectName = path.basename(projectPath);
        const tauriWarnings = [];

        // Check Cargo.toml
        if (fs.existsSync(cargoPath)) {
            const cargoContent = this._safeReadFile(cargoPath, 'Cargo.toml');
            if (cargoContent) {
                const versionMatch = cargoContent.match(/^version\s*=\s*"([^"]+)"/m);
                if (versionMatch) version = versionMatch[1];

                // Check for tauri dependency
                if (!cargoContent.includes('tauri')) {
                    tauriWarnings.push(
                        'Cargo.toml found but no tauri dependency.\n' +
                        'Add to [dependencies]: tauri = { version = "1.5", features = [] }'
                    );
                }
            }
        } else {
            tauriWarnings.push('src-tauri/Cargo.toml not found. This is required for Tauri builds.');
        }

        // Check tauri.conf.json
        if (fs.existsSync(tauriConfPath)) {
            const confContent = this._safeReadFile(tauriConfPath, 'tauri.conf.json');
            if (confContent) {
                const conf = this._safeParseJSON(confContent, tauriConfPath);
                if (conf) {
                    projectName = conf.package?.productName || conf.app?.windows?.[0]?.title || projectName;
                    version = conf.package?.version || version;
                }
            }
        } else {
            tauriWarnings.push(
                'src-tauri/tauri.conf.json not found.\n' +
                'Run "npx tauri init" to generate the configuration file.'
            );
        }

        // Check for Rust main file
        const rustMainPath = path.join(srcTauriPath, 'src', 'main.rs');
        if (!fs.existsSync(rustMainPath)) {
            tauriWarnings.push('src-tauri/src/main.rs not found. This is the Rust entry point.');
        }

        this.warnings.push(...tauriWarnings);

        return {
            id: 'tauri',
            name: 'Tauri',
            icon: '🦀',
            projectName,
            version,
            packageManager: 'cargo + ' + this._detectNodePackageManager(projectPath),
            config: {
                srcTauriPath,
                tauriConfPath: fs.existsSync(tauriConfPath) ? tauriConfPath : null,
                cargoPath: fs.existsSync(cargoPath) ? cargoPath : null,
                hasFrontend: fs.existsSync(path.join(projectPath, 'package.json')),
                hasRustMain: fs.existsSync(rustMainPath)
            },
            targets: [
                { id: 'windows', name: 'Windows', desc: '.exe / .msi', icon: '🪟' },
                { id: 'android', name: 'Android', desc: '.apk file', icon: '🤖' },
                { id: 'linux', name: 'Linux', desc: '.AppImage / .deb', icon: '🐧' },
                { id: 'macos', name: 'macOS', desc: '.dmg package', icon: '🍎' }
            ],
            warnings: [...this.warnings]
        };
    }

    // ==========================================
    // React Native Detection
    // ==========================================
    async _detectReactNative(projectPath) {
        const packageJsonPath = path.join(projectPath, 'package.json');
        if (!fs.existsSync(packageJsonPath)) return null;

        const content = this._safeReadFile(packageJsonPath, 'package.json');
        if (!content) return null;

        const pkg = this._safeParseJSON(content, packageJsonPath);
        if (!pkg) return null;

        const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

        if (!allDeps['react-native']) return null;

        const hasAndroid = fs.existsSync(path.join(projectPath, 'android'));
        const hasIOS = fs.existsSync(path.join(projectPath, 'ios'));
        const isExpo = !!allDeps['expo'];

        // Warnings for missing platforms
        if (!hasAndroid && !hasIOS && !isExpo) {
            this.warnings.push(
                'No android/ or ios/ folders found.\n' +
                'Run "npx react-native init" or add platforms manually.'
            );
        }

        // Check for App.js or index.js
        const hasAppJs = fs.existsSync(path.join(projectPath, 'App.js')) ||
                         fs.existsSync(path.join(projectPath, 'App.tsx')) ||
                         fs.existsSync(path.join(projectPath, 'index.js'));
        if (!hasAppJs) {
            this.warnings.push('No App.js, App.tsx, or index.js found in project root.');
        }

        const targets = [];
        if (hasAndroid || isExpo) {
            targets.push({ id: 'android', name: 'Android', desc: '.apk / .aab', icon: '🤖' });
        }
        if (hasIOS || isExpo) {
            targets.push({ id: 'ios', name: 'iOS', desc: '.ipa (requires macOS)', icon: '📱' });
        }

        // If no targets available, show both with warning
        if (targets.length === 0) {
            targets.push(
                { id: 'android', name: 'Android', desc: '.apk / .aab (android/ folder missing)', icon: '🤖' },
                { id: 'ios', name: 'iOS', desc: '.ipa (ios/ folder missing)', icon: '📱' }
            );
        }

        return {
            id: 'react-native',
            name: 'React Native',
            icon: '⚛️',
            projectName: pkg.name || path.basename(projectPath),
            version: allDeps['react-native'].replace(/[\^~>=<]/g, ''),
            packageManager: this._detectNodePackageManager(projectPath),
            config: {
                packageJsonPath,
                hasAndroid,
                hasIOS,
                isExpo,
                hasAppJson: fs.existsSync(path.join(projectPath, 'app.json')),
                hasAppJs
            },
            targets,
            warnings: [...this.warnings]
        };
    }

    // ==========================================
    // Helpers
    // ==========================================

    async _getFlutterVersion() {
        try {
            const { execSync } = require('child_process');
            const output = execSync('flutter --version 2>/dev/null || echo ""', {
                encoding: 'utf-8',
                timeout: 10000
            });
            const match = output.match(/Flutter (\d+\.\d+\.\d+)/);
            return match ? match[1] : null;
        } catch {
            return null;
        }
    }

    _getFlutterTargets(projectPath) {
        const targets = [];
        const platformMap = {
            windows: { name: 'Windows', desc: '.exe installer', icon: '🪟' },
            android: { name: 'Android', desc: '.apk file', icon: '🤖' },
            linux: { name: 'Linux', desc: '.AppImage', icon: '🐧' },
            macos: { name: 'macOS', desc: '.dmg package', icon: '🍎' },
            web: { name: 'Web', desc: 'Static site', icon: '🌐' }
        };

        for (const [dir, meta] of Object.entries(platformMap)) {
            if (fs.existsSync(path.join(projectPath, dir))) {
                targets.push({ id: dir, ...meta });
            }
        }

        if (targets.length === 0) {
            return Object.entries(platformMap).map(([id, meta]) => ({ id, ...meta }));
        }
        return targets;
    }

    _detectNodePackageManager(projectPath) {
        if (fs.existsSync(path.join(projectPath, 'pnpm-lock.yaml'))) return 'pnpm';
        if (fs.existsSync(path.join(projectPath, 'yarn.lock'))) return 'yarn';
        if (fs.existsSync(path.join(projectPath, 'bun.lockb'))) return 'bun';
        return 'npm';
    }
}

module.exports = Detector;
