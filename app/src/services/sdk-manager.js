/**
 * SDK Manager Service
 * 
 * Detects, downloads, installs, and manages SDKs required for building.
 * 
 * Supported SDKs:
 * - Flutter SDK
 * - Node.js
 * - Rust/Cargo
 * - Android SDK (command-line tools)
 * - Java JDK
 * 
 * SDKs are downloaded to the app's managed directory and added to PATH
 * when running builds, so users don't need to install them system-wide.
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { ensureDir } = require('../utils/paths');
const { app } = require('electron');

// SDK download URLs (latest stable versions)
const SDK_REGISTRY = {
    flutter: {
        name: 'Flutter SDK',
        icon: '🦋',
        description: 'Required for building Flutter applications',
        size: '~1.1 GB',
        checkCommand: 'flutter',
        checkArgs: ['--version'],
        versionRegex: /Flutter (\d+\.\d+\.\d+)/,
        getDownloadUrl: (platform) => {
            const urls = {
                win32: 'https://storage.googleapis.com/flutter_infra_release/releases/stable/windows/flutter_windows_3.24.0-stable.zip',
                darwin: 'https://storage.googleapis.com/flutter_infra_release/releases/stable/macos/flutter_macos_3.24.0-stable.zip',
                linux: 'https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_3.24.0-stable.tar.xz'
            };
            return urls[platform] || urls.linux;
        },
        extractType: 'archive', // zip or tar.xz
        binarySubpath: 'flutter/bin'
    },
    nodejs: {
        name: 'Node.js',
        icon: '🟢',
        description: 'Required for Electron, Tauri, and React Native builds',
        size: '~45 MB',
        checkCommand: 'node',
        checkArgs: ['--version'],
        versionRegex: /v(\d+\.\d+\.\d+)/,
        getDownloadUrl: (platform) => {
            const urls = {
                win32: 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-win-x64.zip',
                darwin: 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-darwin-x64.tar.gz',
                linux: 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-linux-x64.tar.xz'
            };
            return urls[platform] || urls.linux;
        },
        extractType: 'archive',
        binarySubpath: platform => platform === 'win32' ? '' : 'bin'
    },
    rust: {
        name: 'Rust (Cargo)',
        icon: '🦀',
        description: 'Required for building Tauri applications',
        size: '~250 MB',
        checkCommand: 'cargo',
        checkArgs: ['--version'],
        versionRegex: /cargo (\d+\.\d+\.\d+)/,
        getDownloadUrl: (platform) => {
            // Rust uses rustup installer
            const urls = {
                win32: 'https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe',
                darwin: 'https://static.rust-lang.org/rustup/dist/x86_64-apple-darwin/rustup-init',
                linux: 'https://static.rust-lang.org/rustup/dist/x86_64-unknown-linux-gnu/rustup-init'
            };
            return urls[platform] || urls.linux;
        },
        extractType: 'installer',
        binarySubpath: '.cargo/bin'
    },
    android: {
        name: 'Android SDK',
        icon: '🤖',
        description: 'Required for building Android applications',
        size: '~1.5 GB (command-line tools + platform)',
        checkCommand: 'sdkmanager',
        checkArgs: ['--version'],
        versionRegex: /(\d+\.\d+\.\d+)/,
        getDownloadUrl: (platform) => {
            const urls = {
                win32: 'https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip',
                darwin: 'https://dl.google.com/android/repository/commandlinetools-mac-11076708_latest.zip',
                linux: 'https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip'
            };
            return urls[platform] || urls.linux;
        },
        extractType: 'archive',
        binarySubpath: 'cmdline-tools/latest/bin'
    },
    java: {
        name: 'Java JDK',
        icon: '☕',
        description: 'Required for Android builds (Gradle)',
        size: '~200 MB',
        checkCommand: 'java',
        checkArgs: ['-version'],
        versionRegex: /version "(\d+[\.\d]*)"/,
        getDownloadUrl: (platform) => {
            // Using Eclipse Temurin (Adoptium) OpenJDK
            const urls = {
                win32: 'https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse',
                darwin: 'https://api.adoptium.net/v3/binary/latest/17/ga/mac/x64/jdk/hotspot/normal/eclipse',
                linux: 'https://api.adoptium.net/v3/binary/latest/17/ga/linux/x64/jdk/hotspot/normal/eclipse'
            };
            return urls[platform] || urls.linux;
        },
        extractType: 'archive',
        binarySubpath: platform => {
            // JDK archives have a versioned folder inside
            return ''; // Will be detected after extraction
        }
    }
};

class SdkManager {
    constructor() {
        this.sdkDir = '';
        this.status = {};
    }

    /**
     * Get the managed SDK directory
     */
    getSdkDir() {
        if (!this.sdkDir) {
            this.sdkDir = path.join(app.getPath('userData'), 'sdks');
            ensureDir(this.sdkDir);
        }
        return this.sdkDir;
    }

    /**
     * Check the status of all SDKs
     */
    async checkAll() {
        const results = {};

        for (const [key, sdk] of Object.entries(SDK_REGISTRY)) {
            results[key] = await this.checkSdk(key);
        }

        this.status = results;
        return results;
    }

    /**
     * Check if a specific SDK is available
     */
    async checkSdk(sdkKey) {
        const sdk = SDK_REGISTRY[sdkKey];
        if (!sdk) return { installed: false, error: 'Unknown SDK' };

        // First check system PATH
        const systemResult = await this._checkCommand(sdk.checkCommand, sdk.checkArgs, sdk.versionRegex);
        if (systemResult.installed) {
            return {
                ...systemResult,
                source: 'system',
                sdkKey,
                name: sdk.name,
                icon: sdk.icon,
                description: sdk.description
            };
        }

        // Then check managed SDK directory
        const managedPath = this._getManagedBinaryPath(sdkKey);
        if (managedPath && fs.existsSync(managedPath)) {
            const managedResult = await this._checkCommand(managedPath, sdk.checkArgs, sdk.versionRegex);
            if (managedResult.installed) {
                return {
                    ...managedResult,
                    source: 'managed',
                    sdkKey,
                    name: sdk.name,
                    icon: sdk.icon,
                    description: sdk.description
                };
            }
        }

        return {
            installed: false,
            source: 'none',
            sdkKey,
            name: sdk.name,
            icon: sdk.icon,
            description: sdk.description,
            size: sdk.size,
            canInstall: true
        };
    }

    /**
     * Check if a command exists and get its version
     */
    async _checkCommand(command, args, versionRegex) {
        try {
            const result = execSync(`${command} ${args.join(' ')}`, {
                encoding: 'utf-8',
                timeout: 10000,
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: process.platform === 'win32'
            });

            const match = result.match(versionRegex);
            return {
                installed: true,
                version: match ? match[1] : 'unknown',
                path: command
            };
        } catch (e) {
            // Try stderr too (java -version outputs to stderr)
            if (e.stderr) {
                const match = e.stderr.toString().match(versionRegex);
                if (match) {
                    return {
                        installed: true,
                        version: match[1],
                        path: command
                    };
                }
            }
            return { installed: false, error: e.message };
        }
    }

    /**
     * Download and install an SDK
     */
    async installSdk(sdkKey, onProgress, onLog) {
        const sdk = SDK_REGISTRY[sdkKey];
        if (!sdk) throw new Error(`Unknown SDK: ${sdkKey}`);

        const platform = process.platform;
        const url = sdk.getDownloadUrl(platform);
        const sdkDir = this.getSdkDir();
        const targetDir = path.join(sdkDir, sdkKey);

        ensureDir(targetDir);

        onLog(`▶ Downloading ${sdk.name}...`, 'info');
        onLog(`  URL: ${url}`, 'muted');
        onLog(`  Target: ${targetDir}`, 'muted');

        if (sdk.extractType === 'installer') {
            // Rust uses a special installer
            await this._installRust(targetDir, onProgress, onLog);
        } else {
            // Download archive
            const downloadPath = path.join(targetDir, 'download.tmp');
            await this._downloadFile(url, downloadPath, onProgress, onLog);

            onLog(`▶ Extracting ${sdk.name}...`, 'info');
            onProgress(70, 'Extracting...');

            await this._extractArchive(downloadPath, targetDir, sdk.extractType, onLog);

            // Clean up download
            try { fs.unlinkSync(downloadPath); } catch {}

            onLog(`✓ ${sdk.name} installed successfully`, 'success');
            onProgress(100, 'Installed');
        }

        // Verify installation
        const status = await this.checkSdk(sdkKey);
        return status;
    }

    /**
     * Download a file with progress reporting
     */
    _downloadFile(url, destPath, onProgress, onLog) {
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(destPath);
            let downloadedBytes = 0;
            let totalBytes = 0;

            const makeRequest = (requestUrl) => {
                const protocol = requestUrl.startsWith('https') ? https : http;
                
                protocol.get(requestUrl, { headers: { 'User-Agent': 'UniversalAppBuilder/1.0' } }, (response) => {
                    // Handle redirects
                    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                        makeRequest(response.headers.location);
                        return;
                    }

                    if (response.statusCode !== 200) {
                        reject(new Error(`Download failed with status ${response.statusCode}`));
                        return;
                    }

                    totalBytes = parseInt(response.headers['content-length'] || '0', 10);
                    onLog(`  Size: ${this._formatBytes(totalBytes)}`, 'muted');

                    response.on('data', (chunk) => {
                        downloadedBytes += chunk.length;
                        if (totalBytes > 0) {
                            const percent = Math.round((downloadedBytes / totalBytes) * 60); // 0-60% for download
                            onProgress(percent, `Downloading... ${this._formatBytes(downloadedBytes)} / ${this._formatBytes(totalBytes)}`);
                        }
                    });

                    response.pipe(file);

                    file.on('finish', () => {
                        file.close();
                        resolve();
                    });
                }).on('error', (err) => {
                    try { fs.unlinkSync(destPath); } catch {}
                    reject(err);
                });
            };

            makeRequest(url);
        });
    }

    /**
     * Extract an archive (zip, tar.gz, tar.xz)
     */
    async _extractArchive(archivePath, targetDir, type, onLog) {
        return new Promise((resolve, reject) => {
            let command, args;

            if (archivePath.endsWith('.zip')) {
                if (process.platform === 'win32') {
                    command = 'powershell';
                    args = ['-Command', `Expand-Archive -Force -Path "${archivePath}" -DestinationPath "${targetDir}"`];
                } else {
                    command = 'unzip';
                    args = ['-o', archivePath, '-d', targetDir];
                }
            } else if (archivePath.endsWith('.tar.xz')) {
                command = 'tar';
                args = ['-xf', archivePath, '-C', targetDir];
            } else if (archivePath.endsWith('.tar.gz') || archivePath.endsWith('.tgz')) {
                command = 'tar';
                args = ['-xzf', archivePath, '-C', targetDir];
            } else {
                reject(new Error(`Unsupported archive format: ${archivePath}`));
                return;
            }

            onLog(`$ ${command} ${args.join(' ')}`, 'command');

            const proc = spawn(command, args, { shell: process.platform === 'win32' });

            proc.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error(`Extraction failed with exit code ${code}`));
            });

            proc.on('error', reject);
        });
    }

    /**
     * Install Rust using rustup
     */
    async _installRust(targetDir, onProgress, onLog) {
        onLog('▶ Installing Rust via rustup...', 'info');

        const platform = process.platform;

        if (platform === 'win32') {
            // Download rustup-init.exe
            const url = SDK_REGISTRY.rust.getDownloadUrl(platform);
            const installerPath = path.join(targetDir, 'rustup-init.exe');
            await this._downloadFile(url, installerPath, onProgress, onLog);

            onLog('$ rustup-init.exe -y --no-modify-path', 'command');
            onProgress(70, 'Running Rust installer...');

            return new Promise((resolve, reject) => {
                const proc = spawn(installerPath, ['-y', '--no-modify-path'], {
                    env: { ...process.env, CARGO_HOME: path.join(targetDir, '.cargo'), RUSTUP_HOME: path.join(targetDir, '.rustup') }
                });

                proc.stdout.on('data', (d) => onLog(d.toString().trim(), 'info'));
                proc.stderr.on('data', (d) => onLog(d.toString().trim(), 'warning'));

                proc.on('close', (code) => {
                    if (code === 0) {
                        onLog('✓ Rust installed successfully', 'success');
                        resolve();
                    } else {
                        reject(new Error(`Rust installation failed (exit code ${code})`));
                    }
                });
            });
        } else {
            // Linux/macOS — use curl | sh
            onLog('$ curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y', 'command');
            onProgress(70, 'Running Rust installer...');

            return new Promise((resolve, reject) => {
                const proc = spawn('sh', ['-c', 'curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path'], {
                    env: { ...process.env, CARGO_HOME: path.join(targetDir, '.cargo'), RUSTUP_HOME: path.join(targetDir, '.rustup') }
                });

                proc.stdout.on('data', (d) => onLog(d.toString().trim(), 'info'));
                proc.stderr.on('data', (d) => onLog(d.toString().trim(), 'warning'));

                proc.on('close', (code) => {
                    if (code === 0) {
                        onLog('✓ Rust installed successfully', 'success');
                        resolve();
                    } else {
                        reject(new Error(`Rust installation failed (exit code ${code})`));
                    }
                });
            });
        }
    }

    /**
     * Get the path to a managed SDK's binary
     */
    _getManagedBinaryPath(sdkKey) {
        const sdk = SDK_REGISTRY[sdkKey];
        if (!sdk) return null;

        const sdkDir = this.getSdkDir();
        const targetDir = path.join(sdkDir, sdkKey);
        const subpath = typeof sdk.binarySubpath === 'function'
            ? sdk.binarySubpath(process.platform)
            : sdk.binarySubpath;

        if (!subpath) return null;

        const binaryName = sdk.checkCommand + (process.platform === 'win32' ? '.exe' : '');
        return path.join(targetDir, subpath, binaryName);
    }

    /**
     * Get environment variables for a build that include managed SDK paths
     */
    getBuildEnv() {
        const env = { ...process.env };
        const pathSep = process.platform === 'win32' ? ';' : ':';
        const extraPaths = [];

        for (const key of Object.keys(SDK_REGISTRY)) {
            const sdk = SDK_REGISTRY[key];
            const sdkDir = this.getSdkDir();
            const targetDir = path.join(sdkDir, key);
            const subpath = typeof sdk.binarySubpath === 'function'
                ? sdk.binarySubpath(process.platform)
                : sdk.binarySubpath;

            if (subpath) {
                const binDir = path.join(targetDir, subpath);
                if (fs.existsSync(binDir)) {
                    extraPaths.push(binDir);
                }
            }
        }

        if (extraPaths.length > 0) {
            env.PATH = extraPaths.join(pathSep) + pathSep + (env.PATH || '');
        }

        return env;
    }

    /**
     * Get which SDKs are needed for a given framework
     */
    getRequiredSdks(framework) {
        switch (framework) {
            case 'flutter': return ['flutter', 'java', 'android'];
            case 'electron': return ['nodejs'];
            case 'tauri': return ['nodejs', 'rust'];
            case 'react-native': return ['nodejs', 'java', 'android'];
            default: return [];
        }
    }

    /**
     * Uninstall a managed SDK
     */
    async uninstallSdk(sdkKey) {
        const sdkDir = this.getSdkDir();
        const targetDir = path.join(sdkDir, sdkKey);

        if (fs.existsSync(targetDir)) {
            fs.rmSync(targetDir, { recursive: true, force: true });
            return true;
        }
        return false;
    }

    _formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
}

module.exports = SdkManager;
