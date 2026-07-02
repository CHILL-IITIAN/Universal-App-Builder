/**
 * Tauri Builder
 * 
 * Builds Tauri projects using cargo and the Tauri CLI.
 * Handles: npm install, cargo build, tauri build
 */

const BaseBuilder = require('./base-builder');
const path = require('path');
const fs = require('fs');

class TauriBuilder extends BaseBuilder {
    constructor() {
        super('Tauri');
    }

    async build(options) {
        const { projectPath, targets, installDeps = true, outputFolder, onLog, onProgress } = options;
        const startTime = Date.now();
        this.cancelled = false;

        const projectName = path.basename(projectPath);
        const allOutputs = [];
        const totalTargets = targets.length;
        const packageManager = this._detectPackageManager(projectPath);

        // Step 1: Validate
        onProgress('validate', 5, 'Validating project...');
        onLog('▶ Validating Tauri project...', 'info');

        const srcTauriPath = path.join(projectPath, 'src-tauri');
        if (!fs.existsSync(srcTauriPath)) {
            throw new Error('src-tauri directory not found. This does not appear to be a Tauri project.');
        }

        // Check for Rust
        const hasRust = await this.commandExists('cargo');
        if (!hasRust) {
            throw new Error('Rust toolchain not detected. Please install Rust from https://rustup.rs');
        }
        onLog('✓ Rust toolchain detected', 'success');
        onLog('$ cargo --version', 'command');
        await this.exec('cargo', ['--version'], { cwd: projectPath, onLog });

        // Check for Node.js (Tauri frontend needs it)
        const hasNode = await this.commandExists('node');
        if (!hasNode) {
            throw new Error('Node.js not detected. Tauri requires Node.js for the frontend. Visit: https://nodejs.org');
        }
        onLog('✓ Node.js detected', 'success');

        if (this.cancelled) return this._cancelledResult(startTime);
        onProgress('validate', 10, 'Validation complete');

        // Step 2: Install dependencies
        if (installDeps) {
            onProgress('deps', 15, 'Installing dependencies...');
            onLog('', '');

            // Install frontend deps
            if (fs.existsSync(path.join(projectPath, 'package.json'))) {
                onLog('▶ Installing frontend dependencies...', 'info');
                onLog(`$ ${packageManager} install`, 'command');

                const installArgs = ['install'];
                const depResult = await this.exec(packageManager, installArgs, {
                    cwd: projectPath,
                    onLog
                });

                if (depResult.exitCode !== 0) {
                    throw new Error(`${packageManager} install failed with exit code ${depResult.exitCode}`);
                }
                onLog('✓ Frontend dependencies installed', 'success');
            }

            // Install Rust dependencies (cargo check)
            onLog('', '');
            onLog('▶ Fetching Rust dependencies...', 'info');
            onLog('$ cargo fetch', 'command');

            const cargoResult = await this.exec('cargo', ['fetch'], {
                cwd: srcTauriPath,
                onLog
            });

            if (cargoResult.exitCode !== 0) {
                onLog('⚠ cargo fetch returned non-zero exit code (continuing...)', 'warning');
            } else {
                onLog('✓ Rust dependencies fetched', 'success');
            }
        }

        if (this.cancelled) return this._cancelledResult(startTime);
        onProgress('deps', 25, 'Dependencies installed');

        // Step 3: Build for each target
        for (let i = 0; i < targets.length; i++) {
            if (this.cancelled) return this._cancelledResult(startTime);

            const target = targets[i];
            const baseProgress = 25 + (i / totalTargets) * 60;
            const targetLabel = target.charAt(0).toUpperCase() + target.slice(1);

            onProgress('compile', baseProgress, `Building for ${targetLabel}...`);
            onLog('', '');
            onLog(`▶ Building Tauri app for ${targetLabel}...`, 'info');

            if (target === 'android') {
                await this._buildAndroid(projectPath, srcTauriPath, onLog);
            } else {
                await this._buildDesktop(projectPath, target, packageManager, onLog);
            }

            // Collect outputs
            const releaseDir = path.join(srcTauriPath, 'target', 'release');
            const bundleDir = path.join(releaseDir, 'bundle');
            const extensions = this._getOutputExtensions(target);

            for (const dir of [bundleDir, releaseDir]) {
                const outputs = this.collectOutputs(dir, extensions);
                const targetOutputDir = this.getOutputFolder(outputFolder, `${projectName}-${target}`);

                for (const output of outputs) {
                    const destPath = path.join(targetOutputDir, output.name);
                    try {
                        fs.copyFileSync(output.path, destPath);
                        allOutputs.push({
                            target,
                            path: destPath,
                            name: output.name,
                            size: output.size,
                            sizeFormatted: output.sizeFormatted
                        });
                    } catch (e) {
                        onLog(`Warning: Could not copy ${output.name}: ${e.message}`, 'warning');
                    }
                }
            }

            onLog(`✓ Build successful for ${targetLabel}`, 'success');
        }

        // Step 4: Complete
        if (this.cancelled) return this._cancelledResult(startTime);
        onProgress('package', 90, 'Collecting outputs...');
        onLog('', '');
        onLog('▶ Collecting build outputs...', 'info');
        onLog(`✓ ${allOutputs.length} output file(s) collected`, 'success');

        const duration = Date.now() - startTime;
        onProgress('output', 100, 'Build complete!');
        onLog('', '');
        onLog('═══════════════════════════════════════', 'success');
        onLog('  BUILD SUCCESSFUL', 'success');
        onLog(`  Duration: ${this.formatDuration(duration)}`, 'success');
        onLog(`  Outputs: ${allOutputs.length} file(s)`, 'success');
        onLog('═══════════════════════════════════════', 'success');

        return {
            success: true,
            duration: this.formatDuration(duration),
            outputs: allOutputs
        };
    }

    /**
     * Build for desktop platforms using Tauri CLI
     */
    async _buildDesktop(projectPath, target, packageManager, onLog) {
        const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
        
        // Try using tauri CLI via npx
        onLog(`$ npx tauri build`, 'command');

        const result = await this.exec(npxCmd, ['tauri', 'build'], {
            cwd: projectPath,
            onLog
        });

        if (result.exitCode !== 0) {
            // Fallback to cargo build
            onLog('⚠ Tauri CLI build failed, falling back to cargo build --release', 'warning');
            onLog('$ cargo build --release', 'command');

            const cargoResult = await this.exec('cargo', ['build', '--release'], {
                cwd: path.join(projectPath, 'src-tauri'),
                onLog
            });

            if (cargoResult.exitCode !== 0) {
                throw new Error(`Tauri build failed with exit code ${cargoResult.exitCode}`);
            }
        }
    }

    /**
     * Build for Android
     */
    async _buildAndroid(projectPath, srcTauriPath, onLog) {
        onLog('▶ Building for Android...', 'info');
        onLog('Note: Tauri Android builds require the Android SDK and NDK.', 'info');

        const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
        onLog(`$ npx tauri android build --apk`, 'command');

        const result = await this.exec(npxCmd, ['tauri', 'android', 'build', '--apk'], {
            cwd: projectPath,
            onLog
        });

        if (result.exitCode !== 0) {
            throw new Error(`Tauri Android build failed. Ensure Android SDK/NDK are installed and configured.`);
        }
    }

    _detectPackageManager(projectPath) {
        if (fs.existsSync(path.join(projectPath, 'pnpm-lock.yaml'))) return 'pnpm';
        if (fs.existsSync(path.join(projectPath, 'yarn.lock'))) return 'yarn';
        return 'npm';
    }

    _getOutputExtensions(target) {
        switch (target) {
            case 'windows': return ['.exe', '.msi'];
            case 'linux': return ['.AppImage', '.deb', '.rpm'];
            case 'macos': return ['.app', '.dmg'];
            case 'android': return ['.apk', '.aab'];
            default: return ['.exe', '.dmg', '.AppImage'];
        }
    }

    _cancelledResult(startTime) {
        return {
            success: false,
            cancelled: true,
            duration: this.formatDuration(Date.now() - startTime),
            outputs: []
        };
    }
}

module.exports = TauriBuilder;
