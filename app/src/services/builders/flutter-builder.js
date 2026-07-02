/**
 * Flutter Builder
 * 
 * Builds Flutter projects for various platforms.
 * Handles: flutter pub get, flutter build <target>
 */

const BaseBuilder = require('./base-builder');
const path = require('path');
const fs = require('fs');

class FlutterBuilder extends BaseBuilder {
    constructor() {
        super('Flutter');
    }

    async build(options) {
        const { projectPath, targets, installDeps = true, outputFolder, onLog, onProgress } = options;
        const startTime = Date.now();
        this.cancelled = false;

        const projectName = path.basename(projectPath);
        const allOutputs = [];
        const totalTargets = targets.length;

        // Step 1: Validate
        onProgress('validate', 5, 'Validating project...');
        onLog('▶ Validating Flutter project structure...', 'info');

        if (!fs.existsSync(path.join(projectPath, 'pubspec.yaml'))) {
            throw new Error('pubspec.yaml not found. This does not appear to be a Flutter project.');
        }

        const hasFlutter = await this.commandExists('flutter');
        if (!hasFlutter) {
            throw new Error('Flutter SDK not detected. Please install Flutter and add it to your PATH. Visit: https://flutter.dev/docs/get-started/install');
        }

        onLog('✓ Flutter SDK detected', 'success');
        onLog(`$ flutter --version`, 'command');
        const versionResult = await this.exec('flutter', ['--version'], { cwd: projectPath, onLog });
        onLog('✓ Project validation complete', 'success');

        if (this.cancelled) return this._cancelledResult(startTime);
        onProgress('validate', 10, 'Validation complete');

        // Step 2: Install dependencies
        if (installDeps) {
            onProgress('deps', 15, 'Installing dependencies...');
            onLog('', '');
            onLog('▶ Resolving dependencies...', 'info');
            onLog('$ flutter pub get', 'command');

            const depResult = await this.exec('flutter', ['pub', 'get'], {
                cwd: projectPath,
                onLog
            });

            if (depResult.exitCode !== 0) {
                throw new Error(`flutter pub get failed with exit code ${depResult.exitCode}`);
            }

            onLog('✓ Dependencies resolved', 'success');
        }

        if (this.cancelled) return this._cancelledResult(startTime);
        onProgress('deps', 25, 'Dependencies installed');

        // Step 3: Build each target
        for (let i = 0; i < targets.length; i++) {
            if (this.cancelled) return this._cancelledResult(startTime);

            const target = targets[i];
            const baseProgress = 25 + (i / totalTargets) * 60;
            const targetLabel = target.charAt(0).toUpperCase() + target.slice(1);

            onProgress('compile', baseProgress, `Building for ${targetLabel}...`);
            onLog('', '');
            onLog(`▶ Building for ${targetLabel}...`, 'info');

            const buildArgs = this._getBuildArgs(target);
            onLog(`$ flutter ${buildArgs.join(' ')}`, 'command');

            const buildResult = await this.exec('flutter', buildArgs, {
                cwd: projectPath,
                onLog
            });

            if (buildResult.exitCode !== 0) {
                onLog(`✕ Build failed for ${targetLabel} (exit code: ${buildResult.exitCode})`, 'error');
                throw new Error(`Flutter build failed for ${target}. Check the build log for details.`);
            }

            onLog(`✓ Build successful for ${targetLabel}`, 'success');

            // Collect outputs
            const buildOutputDir = this._getBuildOutputDir(projectPath, target);
            const extensions = this._getOutputExtensions(target);
            const outputs = this.collectOutputs(buildOutputDir, extensions);

            // Copy outputs to the designated output folder
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
                    onLog(`Warning: Could not copy ${output.name} to output folder: ${e.message}`, 'warning');
                }
            }
        }

        // Step 4: Package/collect
        if (this.cancelled) return this._cancelledResult(startTime);
        onProgress('package', 90, 'Collecting outputs...');
        onLog('', '');
        onLog('▶ Collecting build outputs...', 'info');
        onLog(`✓ ${allOutputs.length} output file(s) collected`, 'success');

        // Step 5: Complete
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
     * Get the flutter build command arguments for a target
     */
    _getBuildArgs(target) {
        switch (target) {
            case 'windows': return ['build', 'windows', '--release'];
            case 'android': return ['build', 'apk', '--release'];
            case 'linux': return ['build', 'linux', '--release'];
            case 'macos': return ['build', 'macos', '--release'];
            case 'web': return ['build', 'web', '--release'];
            default: return ['build', target, '--release'];
        }
    }

    /**
     * Get the build output directory for a target
     */
    _getBuildOutputDir(projectPath, target) {
        switch (target) {
            case 'windows': return path.join(projectPath, 'build', 'windows', 'x64', 'runner', 'Release');
            case 'android': return path.join(projectPath, 'build', 'app', 'outputs', 'flutter-apk');
            case 'linux': return path.join(projectPath, 'build', 'linux', 'x64', 'release', 'bundle');
            case 'macos': return path.join(projectPath, 'build', 'macos', 'Build', 'Products', 'Release');
            case 'web': return path.join(projectPath, 'build', 'web');
            default: return path.join(projectPath, 'build', target);
        }
    }

    /**
     * Get expected output file extensions for a target
     */
    _getOutputExtensions(target) {
        switch (target) {
            case 'windows': return ['.exe', '.dll', '.msix'];
            case 'android': return ['.apk', '.aab'];
            case 'linux': return ['.AppImage', '.deb', '.rpm', '.so'];
            case 'macos': return ['.app', '.dmg'];
            case 'web': return ['.html', '.js', '.wasm'];
            default: return [];
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

module.exports = FlutterBuilder;
