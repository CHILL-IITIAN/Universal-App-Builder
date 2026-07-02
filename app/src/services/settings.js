/**
 * Settings Service
 * 
 * Manages application settings with persistence.
 * Stores settings in a JSON file in the app's user data directory.
 */

const fs = require('fs');
const path = require('path');
const { getSettingsFilePath, ensureDir, getDefaultOutputDir } = require('../utils/paths');

// Default settings
const DEFAULTS = {
    theme: 'dark',
    language: 'en',
    buildOutputFolder: '',
    parallelBuilds: 2,
    preferredPackageManager: 'auto',
    autoCleanTemp: true,
    notifications: true,
    soundEffects: false,
    sdkPaths: {
        flutter: '',
        androidSdk: '',
        rustCargo: '',
        nodejs: ''
    }
};

class SettingsManager {
    constructor() {
        this.settings = { ...DEFAULTS };
        this.filePath = '';
        this._load();
    }

    /**
     * Load settings from disk
     */
    _load() {
        try {
            this.filePath = getSettingsFilePath();
            if (fs.existsSync(this.filePath)) {
                const data = fs.readFileSync(this.filePath, 'utf-8');
                const saved = JSON.parse(data);
                this.settings = { ...DEFAULTS, ...saved };
            }
        } catch (e) {
            this.settings = { ...DEFAULTS };
        }

        // Set default build output folder if not set
        if (!this.settings.buildOutputFolder) {
            try {
                this.settings.buildOutputFolder = getDefaultOutputDir();
            } catch {
                this.settings.buildOutputFolder = '';
            }
        }
    }

    /**
     * Save settings to disk
     */
    _save() {
        try {
            const dir = path.dirname(this.filePath);
            ensureDir(dir);
            fs.writeFileSync(this.filePath, JSON.stringify(this.settings, null, 2), 'utf-8');
        } catch (e) {
            console.error('Failed to save settings:', e);
        }
    }

    /**
     * Get a setting value
     */
    get(key) {
        // Support nested keys with dot notation
        const keys = key.split('.');
        let value = this.settings;
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return undefined;
            }
        }
        return value;
    }

    /**
     * Set a setting value
     */
    set(key, value) {
        const keys = key.split('.');
        let target = this.settings;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!(keys[i] in target)) {
                target[keys[i]] = {};
            }
            target = target[keys[i]];
        }
        target[keys[keys.length - 1]] = value;
        this._save();
    }

    /**
     * Get all settings
     */
    getAll() {
        return { ...this.settings };
    }

    /**
     * Reset all settings to defaults
     */
    reset() {
        this.settings = { ...DEFAULTS };
        this._save();
    }

    /**
     * Update multiple settings at once
     */
    update(updates) {
        this.settings = { ...this.settings, ...updates };
        this._save();
    }
}

module.exports = SettingsManager;
