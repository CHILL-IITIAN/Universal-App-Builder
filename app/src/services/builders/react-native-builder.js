/**
 * React Native Builder
 * 
 * Builds React Native projects for Android and iOS.
 * Handles: npm install, gradlew assembleRelease (Android), xcodebuild (iOS)
 * Also supports Expo projects via eas build.
 */

const BaseBuilder = require('./base-builder');
const path = require('path');
const fs = require('fs');

class ReactNativeBuilder extends BaseBuilder {
    constructor() {
        super('React Native');
    }

    async build(options) {
        const { projectPath, targets, installDeps = true, outputFolder, onLog, onProgress } = options;
        const startTime = Date.now();
        this.cancelled = false;

        const projectName = path.basename(projectPath);
        const allOutputs = [];
        const totalTargets = targets.length;
        const packageManager = this._detectPackageManager(projectPath);

        // Detect if this is an Expo project
        const pkgPath = path.join(projectPath, 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        const isExpo = !!allDeps['expo'];

        // Step 1: Validate
        onProgress('validate', 5, 'Validating project...');
        onLog('▶ Validating React Native project...', 'info');

        if (!fs.existsSync(pkgPath)) {
            throw new Error('package.json not found. This does not appear to be a React Native project.');
        }

        const hasNode = await this.commandExists('node');
        if (!hasNode) {
            throw new Error('Node.js not detected. Please install Node.js. Visit: https://nodejs.org');
        }
        onLog('✓ Node.js detected', 'success');
        onLog(`✓ Project type: ${isExpo ? 'Expo (React Native)' : 'React Native (bare)'}`, 'success');

        // Check for Android SDK if building Android
        if (targets.includes('android')) {
            const androidDir = path.join(projectPath, 'android');
            if (!fs.existsSync(androidDir) && !isExpo) {
                throw new Error('android/ directory not found. Run "npx react-native init" or ensure the Android project is initialized.');
            }
        }

        // Check for iOS project if building iOS
        if (targets.includes('ios')) {
            if (process.platform !== 'darwin') {
                onLog('⚠ iOS builds require macOS. Skipping iOS validation.', 'warning');
            } else {
                const iosDir = path.join(projectPath, 'ios');
                if (!fs.existsSync(iosDir) && !isExpo) {
                    throw new Error('ios/ directory not found. The iOS project is not initialized.');
                }
            }
        }

        if (this.cancelled) return this._cancelledResult(startTime);
        onProgress('validate', 10, 'Validation complete');

        // Step 2: Install dependencies
        if (installDeps) {
            onProgress('deps', 15, 'Installing dependencies...');
            onLog('', '');
            onLog('▶ Installing npm dependencies...', 'info');
            onLog(`$ ${packageManager} install`, 'command');

            const depResult = await this.exec(packageManager, ['install'], {
                cwd: projectPath,
                onLog
            });

            if (depResult.exitCode !== 0) {
                throw new Error(`${packageManager} install failed with exit code ${depResult.exitCode}`);
            }

            onLog('✓ Dependencies installed', 'success');

            // For bare RN, install iOS pods if on macOS
            if (!isExpo && targets.includes('ios') && process.platform === 'darwin') {
                const iosDir = path.join(projectPath, 'ios');
                if (fs.existsSync(path.join(iosDir, 'Podfile'))) {
                    onLog('', '');
                    onLog('▶ Installing iOS CocoaPods...', 'info');
                    onLog('$ pod install', 'command');

                    const podResult = await this.exec('pod', ['install'], {
                        cwd: iosDir,
                        onLog
                    });

                    if (podResult.exitCode !== 0) {
                        onLog('⚠ pod install failed — iOS build may not succeed', 'warning');
                    } else {
                        onLog('✓ CocoaPods installed', 'success');
                    }
                }
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
            onLog(`▶ Building for ${targetLabel}...`, 'info');

            if (isExpo) {
                await this._buildExpo(projectPath, target, onLog);
            } else if (target === 'android') {
                await this._buildAndroid(projectPath, onLog);
            } else if (target === 'ios') {
                await this._buildIOS(projectPath, projectName, onLog);
            }

            // Collect outputs
            const extensions = this._getOutputExtensions(target);
            const outputDirs = this._getOutputDirs(projectPath, target);

            for (const dir of outputDirs) {
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
     * Build Android APK using Gradle
     */
    async _buildAndroid(projectPath, onLog) {
        const androidDir = path.join(projectPath, 'android');
        const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';

        onLog('$ cd android && gradlew assembleRelease', 'command');

        const result = await this.exec(gradlew, ['assembleRelease'], {
            cwd: androidDir,
            onLog
        });

        if (result.exitCode !== 0) {
            throw new Error(`Gradle build failed with exit code ${result.exitCode}. Check that Android SDK is properly configured.`);
        }
    }

    /**
     * Build iOS using xcodebuild
     */
    async _buildIOS(projectPath, projectName, onLog) {
        if (process.platform !== 'darwin') {
            throw new Error('iOS builds require macOS with Xcode installed.');
        }

        const iosDir = path.join(projectPath, 'ios');
        
        // Find .xcworkspace or .xcodeproj
        const entries = fs.readdirSync(iosDir);
        const workspace = entries.find(e => e.endsWith('.xcworkspace'));
        const xcodeProj = entries.find(e => e.endsWith('.xcodeproj'));

        if (workspace) {
            onLog(`$ xcodebuild -workspace ${workspace} -scheme Release -configuration Release`, 'command');
            const result = await this.exec('xcodebuild', [
                '-workspace', workspace,
                '-scheme', projectName,
                '-configuration', 'Release',
                '-archivePath', path.join(iosDir, 'build', `${projectName}.xcarchive`),
                'archive'
            ], { cwd: iosDir, onLog });

            if (result.exitCode !== 0) {
                throw new Error(`xcodebuild failed with exit code ${result.exitCode}`);
            }
        } else if (xcodeProj) {
            onLog(`$ xcodebuild -project ${xcodeProj} -scheme Release -configuration Release`, 'command');
            const result = await this.exec('xcodebuild', [
                '-project', xcodeProj,
                '-scheme', projectName,
                '-configuration', 'Release',
                'build'
            ], { cwd: iosDir, onLog });

            if (result.exitCode !== 0) {
                throw new Error(`xcodebuild failed with exit code ${result.exitCode}`);
            }
        } else {
            throw new Error('No Xcode project or workspace found in ios/ directory.');
        }
    }

    /**
     * Build Expo project using EAS
     */
    async _buildExpo(projectPath, target, onLog) {
        const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
        const platform = target === 'ios' ? 'ios' : 'android';

        onLog(`$ npx eas build --platform ${platform} --local`, 'command');
        onLog('Note: EAS local build requires eas-cli to be installed.', 'info');

        const result = await this.exec(npxCmd, [
            'eas', 'build',
            '--platform', platform,
            '--local',
            '--non-interactive'
        ], {
            cwd: projectPath,
            onLog
        });

        if (result.exitCode !== 0) {
            // Fallback: try expo build (deprecated but still available)
            onLog('⚠ EAS build failed. Trying expo build...', 'warning');

            const expoResult = await this.exec(npxCmd, [
                'expo', 'build:' + platform,
                '--non-interactive'
            ], {
                cwd: projectPath,
                onLog
            });

            if (expoResult.exitCode !== 0) {
                throw new Error(`Expo build failed. Install eas-cli: npm install -g eas-cli`);
            }
        }
    }

    _detectPackageManager(projectPath) {
        if (fs.existsSync(path.join(projectPath, 'pnpm-lock.yaml'))) return 'pnpm';
        if (fs.existsSync(path.join(projectPath, 'yarn.lock'))) return 'yarn';
        return 'npm';
    }

    _getOutputExtensions(target) {
        switch (target) {
            case 'android': return ['.apk', '.aab'];
            case 'ios': return ['.ipa', '.app'];
            default: return ['.apk', '.ipa'];
        }
    }

    _getOutputDirs(projectPath, target) {
        switch (target) {
            case 'android':
                return [
                    path.join(projectPath, 'android', 'app', 'build', 'outputs', 'apk', 'release'),
                    path.join(projectPath, 'android', 'app', 'build', 'outputs', 'bundle', 'release')
                ];
            case 'ios':
                return [
                    path.join(projectPath, 'ios', 'build'),
                    path.join(projectPath, 'ios', 'build', 'Build', 'Products', 'Release-iphoneos')
                ];
            default:
                return [];
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

module.exports = ReactNativeBuilder;
