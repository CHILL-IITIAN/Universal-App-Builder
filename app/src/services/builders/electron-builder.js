/**
 * Electron Builder
 * 
 * Builds Electron projects using electron-builder or electron-forge.
 * Handles: npm install, npm run build, electron-builder pack
 */

const BaseBuilder = require('./base-builder');
const path = require('path');
const fs = require('fs');

class ElectronBuilder extends BaseBuilder {
    constructor() {
        super('Electron');
    }

    async build(options) {
        const { projectPath, targets, installDeps = true, outputFolder, onLog, onProgress } = options;
        const startTime = Date.now();
        this.cancelled = false;

        const projectName = path.basename(projectPath);
        const allOutputs = [];

        // Read package.json to detect build tooling
        const pkgPath = path.join(projectPath, 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        const packageManager = this._detectPackageManager(projectPath);

        // Determine builder tool
        let builderTool = 'manual';
        if (allDeps['electron-builder']) builderTool = 'electron-builder';
        else if (allDeps['@electron-forge/cli']) builderTool = 'electron-forge';

        // Step 1: Validate
        onProgress('validate', 5, 'Validating project...');
        onLog('▶ Validating Electron project...', 'info');

        if (!fs.existsSync(pkgPath)) {
            throw new Error('package.json not found. This does not appear to be a Node.js project.');
        }

        const hasNode = await this.commandExists('node');
        if (!hasNode) {
            throw new Error('Node.js not detected. Please install Node.js and add it to your PATH. Visit: https://nodejs.org');
        }

        onLog('✓ Node.js detected', 'success');
        onLog(`$ node --version`, 'command');
        await this.exec('node', ['--version'], { cwd: projectPath, onLog });
        onLog(`✓ Build tool: ${builderTool}`, 'success');
        onLog(`✓ Package manager: ${packageManager}`, 'success');

        if (this.cancelled) return this._cancelledResult(startTime);
        onProgress('validate', 10, 'Validation complete');

        // Step 2: Install dependencies
        if (installDeps) {
            onProgress('deps', 15, 'Installing dependencies...');
            onLog('', '');
            onLog('▶ Installing dependencies...', 'info');
            onLog(`$ ${packageManager} install`, 'command');

            const installArgs = packageManager === 'yarn' ? ['install'] :
                               packageManager === 'pnpm' ? ['install'] :
                               ['install'];

            const depResult = await this.exec(packageManager, installArgs, {
                cwd: projectPath,
                onLog
            });

            if (depResult.exitCode !== 0) {
                throw new Error(`${packageManager} install failed with exit code ${depResult.exitCode}`);
            }

            onLog('✓ Dependencies installed', 'success');
        }

        if (this.cancelled) return this._cancelledResult(startTime);
        onProgress('deps', 30, 'Dependencies installed');

        // Step 3: Build for each target
        const totalTargets = targets.length;
        for (let i = 0; i < targets.length; i++) {
            if (this.cancelled) return this._cancelledResult(startTime);

            const target = targets[i];
            const baseProgress = 30 + (i / totalTargets) * 55;
            const targetLabel = target.charAt(0).toUpperCase() + target.slice(1);

            onProgress('compile', baseProgress, `Building for ${targetLabel}...`);
            onLog('', '');
            onLog(`▶ Building for ${targetLabel}...`, 'info');

            if (builderTool === 'electron-builder') {
                await this._buildWithElectronBuilder(projectPath, target, packageManager, onLog);
            } else if (builderTool === 'electron-forge') {
                await this._buildWithElectronForge(projectPath, target, packageManager, onLog);
            } else {
                await this._buildManual(projectPath, target, packageManager, onLog);
            }

            // Collect outputs from dist folder
            const distDir = path.join(projectPath, 'dist');
            const releaseDir = path.join(projectPath, 'release');
            const outDir = path.join(projectPath, 'out');

            const extensions = this._getOutputExtensions(target);
            
            for (const dir of [distDir, releaseDir, outDir]) {
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
     * Build using electron-builder
     */
    async _buildWithElectronBuilder(projectPath, target, packageManager, onLog) {
        const platformMap = { windows: '--win', linux: '--linux', macos: '--mac' };
        const platformFlag = platformMap[target] || `--${target}`;

        const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
        onLog(`$ npx electron-builder ${platformFlag}`, 'command');

        const result = await this.exec(npxCmd, ['electron-builder', platformFlag], {
            cwd: projectPath,
            onLog
        });

        if (result.exitCode !== 0) {
            throw new Error(`electron-builder failed with exit code ${result.exitCode}`);
        }
    }

    /**
     * Build using electron-forge
     */
    async _buildWithElectronForge(projectPath, target, packageManager, onLog) {
        const runCmd = packageManager === 'npm' ? 'run' : '';
        const args = packageManager === 'npm' ? ['run', 'make'] : ['make'];

        onLog(`$ ${packageManager} ${args.join(' ')}`, 'command');

        const result = await this.exec(packageManager, args, {
            cwd: projectPath,
            onLog
        });

        if (result.exitCode !== 0) {
            throw new Error(`electron-forge make failed with exit code ${result.exitCode}`);
        }
    }

    /**
     * Manual build (no builder tool configured)
     */
    async _buildManual(projectPath, target, packageManager, onLog) {
        onLog('⚠ No electron-builder or electron-forge detected.', 'warning');
        onLog('Attempting manual package with electron-packager...', 'info');

        const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
        const platformMap = { windows: 'win32', linux: 'linux', macos: 'darwin' };
        const platform = platformMap[target] || target;

        onLog(`$ npx electron-packager . --platform=${platform}`, 'command');

        const result = await this.exec(npxCmd, [
            'electron-packager', '.', `--platform=${platform}`, '--out=dist', '--overwrite'
        ], {
            cwd: projectPath,
            onLog
        });

        if (result.exitCode !== 0) {
            throw new Error(`electron-packager failed with exit code ${result.exitCode}. Consider adding electron-builder to your project.`);
        }
    }

    _detectPackageManager(projectPath) {
        if (fs.existsSync(path.join(projectPath, 'pnpm-lock.yaml'))) return 'pnpm';
        if (fs.existsSync(path.join(projectPath, 'yarn.lock'))) return 'yarn';
        return 'npm';
    }

    _getOutputExtensions(target) {
        switch (target) {
            case 'windows': return ['.exe', '.msi', '.appx'];
            case 'linux': return ['.AppImage', '.deb', '.rpm', '.snap', '.tar.gz'];
            case 'macos': return ['.dmg', '.zip', '.app'];
            default: return ['.exe', '.dmg', '.AppImage', '.deb'];
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

module.exports = ElectronBuilder;
