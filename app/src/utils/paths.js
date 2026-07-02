/**
 * Path Utilities
 * 
 * Helpers for resolving common paths used by the application.
 */

const path = require('path');
const { app } = require('electron');
const fs = require('fs');

/**
 * Get the application's user data directory
 */
function getUserDataDir() {
    return app.getPath('userData');
}

/**
 * Get the default build output directory
 */
function getDefaultOutputDir() {
    return path.join(app.getPath('documents'), 'UBBuilds');
}

/**
 * Get the temporary workspace directory for extracted ZIPs
 */
function getTempDir() {
    const tempDir = path.join(app.getPath('temp'), 'universal-app-builder');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
    return tempDir;
}

/**
 * Get the history file path
 */
function getHistoryFilePath() {
    return path.join(getUserDataDir(), 'build-history.json');
}

/**
 * Get the settings file path
 */
function getSettingsFilePath() {
    return path.join(getUserDataDir(), 'settings.json');
}

/**
 * Ensure a directory exists, creating it if needed
 */
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
    return dirPath;
}

/**
 * Generate a unique temp directory name for a ZIP extraction
 */
function generateTempExtractPath() {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    return path.join(getTempDir(), `extract-${id}`);
}

/**
 * Clean up temporary directories older than a given age (in ms)
 */
function cleanupTempDirs(maxAgeMs = 24 * 60 * 60 * 1000) {
    const tempDir = getTempDir();
    if (!fs.existsSync(tempDir)) return;

    const now = Date.now();
    const entries = fs.readdirSync(tempDir);

    for (const entry of entries) {
        const fullPath = path.join(tempDir, entry);
        try {
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory() && (now - stat.mtimeMs) > maxAgeMs) {
                fs.rmSync(fullPath, { recursive: true, force: true });
            }
        } catch (e) {
            // Skip files we can't stat
        }
    }
}

module.exports = {
    getUserDataDir,
    getDefaultOutputDir,
    getTempDir,
    getHistoryFilePath,
    getSettingsFilePath,
    ensureDir,
    generateTempExtractPath,
    cleanupTempDirs
};
