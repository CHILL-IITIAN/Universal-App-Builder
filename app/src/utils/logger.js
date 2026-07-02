/**
 * Logger Utility
 * 
 * Provides structured logging to both console and file.
 * Logs are stored in the app's user data directory.
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class Logger {
    constructor() {
        this.logDir = '';
        this.logFile = '';
        this.initialized = false;
    }

    /**
     * Initialize the logger — must be called after app is ready
     */
    init() {
        if (this.initialized) return;
        try {
            this.logDir = path.join(app.getPath('userData'), 'logs');
            if (!fs.existsSync(this.logDir)) {
                fs.mkdirSync(this.logDir, { recursive: true });
            }
            const date = new Date().toISOString().split('T')[0];
            this.logFile = path.join(this.logDir, `build-${date}.log`);
            this.initialized = true;
        } catch (e) {
            // If app isn't ready yet, just use console
            this.initialized = false;
        }
    }

    /**
     * Write a log entry
     */
    _write(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const entry = `[${timestamp}] [${level}] ${message}${data ? ' ' + JSON.stringify(data) : ''}`;

        // Console output
        switch (level) {
            case 'ERROR': console.error(entry); break;
            case 'WARN': console.warn(entry); break;
            default: console.log(entry);
        }

        // File output
        this.init();
        if (this.logFile) {
            try {
                fs.appendFileSync(this.logFile, entry + '\n');
            } catch (e) {
                // Silently fail file writes
            }
        }
    }

    info(message, data = null) {
        this._write('INFO', message, data);
    }

    warn(message, data = null) {
        this._write('WARN', message, data);
    }

    error(message, data = null) {
        this._write('ERROR', message, data instanceof Error ? { message: data.message, stack: data.stack } : data);
    }

    debug(message, data = null) {
        this._write('DEBUG', message, data);
    }

    /**
     * Get the log directory path
     */
    getLogDir() {
        this.init();
        return this.logDir;
    }

    /**
     * Get all log file paths
     */
    getLogFiles() {
        this.init();
        if (!fs.existsSync(this.logDir)) return [];
        return fs.readdirSync(this.logDir)
            .filter(f => f.endsWith('.log'))
            .map(f => path.join(this.logDir, f));
    }
}

module.exports = Logger;
