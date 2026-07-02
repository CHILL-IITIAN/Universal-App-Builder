/**
 * Universal App Builder — Preload Script
 * 
 * This script runs in a privileged context before the renderer page loads.
 * It uses contextBridge to expose a safe, limited API to the renderer
 * without giving it full Node.js access.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Dialog operations
    selectFolder: () => ipcRenderer.invoke('dialog:select-folder'),
    selectZip: () => ipcRenderer.invoke('dialog:select-zip'),
    selectOutputFolder: () => ipcRenderer.invoke('dialog:select-output-folder'),

    // ZIP operations
    extractZip: (zipPath) => ipcRenderer.invoke('zip:extract', zipPath),

    // Project detection
    detectProject: (projectPath) => ipcRenderer.invoke('project:detect', projectPath),

    // Build operations
    startBuild: (options) => ipcRenderer.invoke('build:start', options),
    cancelBuild: () => ipcRenderer.invoke('build:cancel'),

    // Build event listeners
    onBuildLog: (callback) => {
        ipcRenderer.on('build:log', (event, data) => callback(data));
    },
    onBuildProgress: (callback) => {
        ipcRenderer.on('build:progress', (event, data) => callback(data));
    },
    removeBuildListeners: () => {
        ipcRenderer.removeAllListeners('build:log');
        ipcRenderer.removeAllListeners('build:progress');
    },

    // History
    getHistory: () => ipcRenderer.invoke('history:get'),
    clearHistory: () => ipcRenderer.invoke('history:clear'),

    // Settings
    getSettings: () => ipcRenderer.invoke('settings:getAll'),
    setSetting: (key, value) => ipcRenderer.invoke('settings:set', { key, value }),

    // Shell operations
    openPath: (folderPath) => ipcRenderer.invoke('shell:open-path', folderPath),
    openFile: (filePath) => ipcRenderer.invoke('shell:open-file', filePath),
    showInFolder: (filePath) => ipcRenderer.invoke('shell:show-in-folder', filePath),

    // Logging
    exportLog: (logContent) => ipcRenderer.invoke('log:export', logContent),

    // Paths
    getDefaultOutputPath: () => ipcRenderer.invoke('paths:default-output'),

    // App info
    getAppVersion: () => ipcRenderer.invoke('app:version'),

    // SDK Manager
    sdkCheckAll: () => ipcRenderer.invoke('sdk:check-all'),
    sdkCheck: (sdkKey) => ipcRenderer.invoke('sdk:check', sdkKey),
    sdkInstall: (sdkKey) => ipcRenderer.invoke('sdk:install', sdkKey),
    sdkUninstall: (sdkKey) => ipcRenderer.invoke('sdk:uninstall', sdkKey),
    sdkGetRequired: (framework) => ipcRenderer.invoke('sdk:required', framework),
    onSdkProgress: (callback) => {
        ipcRenderer.on('sdk:progress', (event, data) => callback(data));
    },
    onSdkLog: (callback) => {
        ipcRenderer.on('sdk:log', (event, data) => callback(data));
    },

    // Error handling
    onAppError: (callback) => {
        ipcRenderer.on('app:error', (event, data) => callback(data));
    }
});
