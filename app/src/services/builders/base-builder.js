/**
 * Base Builder Class
 * 
 * Abstract base class for all framework builders.
 * Provides common functionality for:
 * - Executing shell commands with streaming output
 * - Progress tracking
 * - Output file collection
 * - Duration measurement
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class BaseBuilder {
    constructor(frameworkName) {
        this.frameworkName = frameworkName;
        this.currentProcess = null;
        this.cancelled = false;
    }

    /**
     * Execute a shell command and stream output
     * @param {string} command - Command to execute
     * @param {string[]} args - Command arguments
     * @param {Object} options - Options (cwd, env, onLog)
     * @returns {Promise<{exitCode: number, stdout: string, stderr: string}>}
     */
    exec(command, args = [], options = {}) {
        return new Promise((resolve, reject) => {
            const { cwd, env, onLog } = options;

            this.currentProcess = spawn(command, args, {
                cwd: cwd || process.cwd(),
                env: { ...process.env, ...env },
                shell: process.platform === 'win32',
                windowsHide: true
            });

            let stdout = '';
            let stderr = '';

            this.currentProcess.stdout.on('data', (data) => {
                const text = data.toString();
                stdout += text;
                if (onLog) {
                    text.split('\n').filter(l => l.trim()).forEach(line => {
                        onLog(line, 'info');
                    });
                }
            });

            this.currentProcess.stderr.on('data', (data) => {
                const text = data.toString();
                stderr += text;
                if (onLog) {
                    text.split('\n').filter(l => l.trim()).forEach(line => {
                        onLog(line, 'warning');
                    });
                }
            });

            this.currentProcess.on('close', (exitCode) => {
                this.currentProcess = null;
                resolve({ exitCode, stdout, stderr });
            });

            this.currentProcess.on('error', (error) => {
                this.currentProcess = null;
                reject(error);
            });
        });
    }

    /**
     * Kill the current running process
     */
    cancel() {
        this.cancelled = true;
        if (this.currentProcess) {
            this.currentProcess.kill('SIGTERM');
            this.currentProcess = null;
        }
    }

    /**
     * Check if a command exists on the system
     */
    async commandExists(command) {
        try {
            const check = process.platform === 'win32' ? 'where' : 'which';
            const result = await this.exec(check, [command], { onLog: () => {} });
            return result.exitCode === 0;
        } catch {
            return false;
        }
    }

    /**
     * Get the output folder for builds
     */
    getOutputFolder(baseOutputFolder, projectName) {
        const outputDir = path.join(baseOutputFolder, projectName);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        return outputDir;
    }

    /**
     * Collect output files from a directory matching extensions
     */
    collectOutputs(dir, extensions) {
        const outputs = [];
        if (!fs.existsSync(dir)) return outputs;

        const walk = (currentDir) => {
            const entries = fs.readdirSync(currentDir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);
                if (entry.isDirectory()) {
                    // Don't recurse too deep
                    if (currentDir.split(path.sep).length - dir.split(path.sep).length < 3) {
                        walk(fullPath);
                    }
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (extensions.includes(ext)) {
                        const stat = fs.statSync(fullPath);
                        outputs.push({
                            path: fullPath,
                            name: entry.name,
                            size: stat.size,
                            sizeFormatted: this.formatBytes(stat.size)
                        });
                    }
                }
            }
        };

        walk(dir);
        return outputs;
    }

    /**
     * Format bytes to human-readable string
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    /**
     * Format duration in ms to human-readable string
     */
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        }
        return `${remainingSeconds}s`;
    }

    /**
     * Abstract method — must be implemented by subclasses
     * @param {Object} options - Build options
     * @param {string} options.projectPath - Path to the project
     * @param {string[]} options.targets - Target platforms
     * @param {boolean} options.installDeps - Whether to install dependencies
     * @param {string} options.outputFolder - Where to put build outputs
     * @param {Function} options.onLog - Log callback (message, type)
     * @param {Function} options.onProgress - Progress callback (step, percent, status)
     */
    async build(options) {
        throw new Error('build() must be implemented by subclass');
    }
}

module.exports = BaseBuilder;
