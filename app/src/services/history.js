/**
 * Build History Service
 * 
 * Manages persistent storage of build history.
 * Stores data in a JSON file in the app's user data directory.
 */

const fs = require('fs');
const path = require('path');
const { getHistoryFilePath, ensureDir } = require('../utils/paths');

class HistoryManager {
    constructor() {
        this.history = [];
        this.filePath = '';
        this._load();
    }

    /**
     * Load history from disk
     */
    _load() {
        try {
            this.filePath = getHistoryFilePath();
            if (fs.existsSync(this.filePath)) {
                const data = fs.readFileSync(this.filePath, 'utf-8');
                this.history = JSON.parse(data);
            }
        } catch (e) {
            this.history = [];
        }
    }

    /**
     * Save history to disk
     */
    _save() {
        try {
            const dir = path.dirname(this.filePath);
            ensureDir(dir);
            fs.writeFileSync(this.filePath, JSON.stringify(this.history, null, 2), 'utf-8');
        } catch (e) {
            console.error('Failed to save history:', e);
        }
    }

    /**
     * Add a build entry to history
     */
    add(entry) {
        const record = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            project: entry.project || 'Unknown',
            framework: entry.framework || 'unknown',
            targets: entry.targets || [],
            success: entry.success || false,
            duration: entry.duration || '0s',
            outputs: entry.outputs || [],
            error: entry.error || null,
            timestamp: entry.timestamp || new Date().toISOString(),
            outputPath: entry.outputPath || ''
        };

        this.history.unshift(record); // Most recent first

        // Keep max 100 entries
        if (this.history.length > 100) {
            this.history = this.history.slice(0, 100);
        }

        this._save();
        return record;
    }

    /**
     * Get all history entries
     */
    getAll() {
        return this.history;
    }

    /**
     * Get a specific history entry by ID
     */
    getById(id) {
        return this.history.find(h => h.id === id) || null;
    }

    /**
     * Remove a history entry
     */
    remove(id) {
        this.history = this.history.filter(h => h.id !== id);
        this._save();
    }

    /**
     * Clear all history
     */
    clear() {
        this.history = [];
        this._save();
    }

    /**
     * Get build statistics
     */
    getStats() {
        const total = this.history.length;
        const successful = this.history.filter(h => h.success).length;
        const failed = total - successful;
        const frameworks = {};

        this.history.forEach(h => {
            frameworks[h.framework] = (frameworks[h.framework] || 0) + 1;
        });

        return { total, successful, failed, frameworks };
    }
}

module.exports = HistoryManager;
