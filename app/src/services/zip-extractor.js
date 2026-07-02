/**
 * ZIP Extractor Service
 * 
 * Extracts ZIP files into a temporary workspace directory.
 * Uses the adm-zip library for cross-platform ZIP handling.
 */

const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');
const { generateTempExtractPath, ensureDir } = require('../utils/paths');

class ZipExtractor {
    /**
     * Extract a ZIP file to a temporary directory
     * @param {string} zipPath - Path to the ZIP file
     * @returns {string} Path to the extracted directory
     */
    async extract(zipPath) {
        if (!fs.existsSync(zipPath)) {
            throw new Error(`ZIP file not found: ${zipPath}`);
        }

        const extractPath = generateTempExtractPath();
        ensureDir(extractPath);

        try {
            const zip = new AdmZip(zipPath);
            const entries = zip.getEntries();

            // Detect if ZIP has a single root folder
            const rootDirs = new Set();
            entries.forEach(entry => {
                const parts = entry.entryName.split('/');
                if (parts.length > 1) {
                    rootDirs.add(parts[0]);
                }
            });

            zip.extractAllTo(extractPath, true);

            // If there's exactly one root directory, return that path
            // This avoids an extra nesting level
            if (rootDirs.size === 1) {
                const rootDir = Array.from(rootDirs)[0];
                const innerPath = path.join(extractPath, rootDir);
                if (fs.existsSync(innerPath) && fs.statSync(innerPath).isDirectory()) {
                    return innerPath;
                }
            }

            return extractPath;
        } catch (error) {
            // Clean up on failure
            try {
                fs.rmSync(extractPath, { recursive: true, force: true });
            } catch {}
            throw new Error(`Failed to extract ZIP: ${error.message}`);
        }
    }

    /**
     * Clean up a previously extracted directory
     */
    cleanup(extractPath) {
        try {
            if (fs.existsSync(extractPath)) {
                fs.rmSync(extractPath, { recursive: true, force: true });
            }
        } catch (e) {
            console.warn(`Failed to cleanup ${extractPath}: ${e.message}`);
        }
    }
}

module.exports = ZipExtractor;
