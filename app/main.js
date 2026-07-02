/**
 * Universal App Builder — Main Process
 * 
 * This is the Electron main process. It handles:
 * - Window creation and management
 * - Native dialogs (folder/ZIP selection)
 * - IPC communication bridge to renderer
 * - Coordinating services (detection, building, history, settings)
 */

const { app, BrowserWindow, ipcMain, dialog, shell, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

// Import services
const Detector = require('./src/services/detector');
const FlutterBuilder = require('./src/services/builders/flutter-builder');
const ElectronBuilder = require('./src/services/builders/electron-builder');
const TauriBuilder = require('./src/services/builders/tauri-builder');
const ReactNativeBuilder = require('./src/services/builders/react-native-builder');
const HistoryManager = require('./src/services/history');
const SettingsManager = require('./src/services/settings');
const ZipExtractor = require('./src/services/zip-extractor');
const Logger = require('./src/utils/logger');
const SdkManager = require('./src/services/sdk-manager');

// Globals
let mainWindow = null;
const logger = new Logger();
const history = new HistoryManager();
const settings = new SettingsManager();
const detector = new Detector();
const sdkManager = new SdkManager();

// Builder registry — adding new frameworks only requires registering a new builder here
const builders = {
    flutter: new FlutterBuilder(),
    electron: new ElectronBuilder(),
    tauri: new TauriBuilder(),
    'react-native': new ReactNativeBuilder()
};

let currentBuildProcess = null;

/**
 * Create the main application window
 */
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 820,
        minWidth: 900,
        minHeight: 600,
        title: 'Universal App Builder',
        icon: path.join(__dirname, 'assets', 'icon.png'),
        backgroundColor: '#0d1117',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        },
        titleBarStyle: 'hiddenInset',
        frame: process.platform !== 'darwin',
        show: false
    });

    mainWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));

    // Show window when ready to prevent flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

/**
 * Send a message to the renderer process
 */
function sendToRenderer(channel, data) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(channel, data);
    }
}

// =============================================
// IPC Handlers — Bridge between UI and services
// =============================================

/**
 * Open folder selection dialog
 */
ipcMain.handle('dialog:select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: 'Select Project Folder'
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
});

/**
 * Open ZIP file selection dialog
 */
ipcMain.handle('dialog:select-zip', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        title: 'Select ZIP File',
        filters: [{ name: 'ZIP Files', extensions: ['zip'] }]
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
});

/**
 * Open save dialog for build output folder
 */
ipcMain.handle('dialog:select-output-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select Output Folder'
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
});

/**
 * Extract a ZIP file and return the extracted folder path
 */
ipcMain.handle('zip:extract', async (event, zipPath) => {
    try {
        const extractor = new ZipExtractor();
        const extractPath = await extractor.extract(zipPath);
        return { success: true, path: extractPath };
    } catch (error) {
        logger.error('ZIP extraction failed', error);
        return { success: false, error: error.message };
    }
});

/**
 * Detect the framework of a project at the given path
 */
ipcMain.handle('project:detect', async (event, projectPath) => {
    try {
        const result = await detector.detect(projectPath);
        logger.info(`Detection complete: ${JSON.stringify(result)}`);
        return { success: true, data: result };
    } catch (error) {
        logger.error('Detection failed', error);
        return { success: false, error: error.message };
    }
});

/**
 * Start a build for the given project and targets
 */
ipcMain.handle('build:start', async (event, { projectPath, framework, targets, installDeps }) => {
    const builder = builders[framework];
    if (!builder) {
        return { success: false, error: `No builder available for framework: ${framework}` };
    }

    // Pre-build SDK validation
    const requiredSdks = sdkManager.getRequiredSdks(framework);
    const missingSdks = [];

    for (const sdkKey of requiredSdks) {
        const status = await sdkManager.checkSdk(sdkKey);
        if (!status.installed) {
            missingSdks.push({
                key: sdkKey,
                name: status.name,
                icon: status.icon,
                size: status.size
            });
        }
    }

    if (missingSdks.length > 0) {
        const sdkList = missingSdks.map(s => `${s.icon} ${s.name}`).join(', ');
        return {
            success: false,
            error: `Missing required SDKs: ${sdkList}`,
            missingSdks,
            suggestion: 'Go to Settings → SDK Manager to install missing SDKs, or install them manually on your system.'
        };
    }

    logger.info(`Starting build: ${framework} for targets [${targets.join(', ')}]`);

    try {
        // Stream console output to renderer
        const onLog = (message, type = 'info') => {
            sendToRenderer('build:log', { message, type });
        };

        const onProgress = (step, percent, status) => {
            sendToRenderer('build:progress', { step, percent, status });
        };

        const outputFolder = settings.get('buildOutputFolder') || path.join(app.getPath('documents'), 'UBBuilds');

        const result = await builder.build({
            projectPath,
            targets,
            installDeps,
            outputFolder,
            onLog,
            onProgress
        });

        // Save to history
        history.add({
            project: path.basename(projectPath),
            framework,
            targets,
            success: result.success,
            duration: result.duration,
            outputs: result.outputs || [],
            timestamp: new Date().toISOString(),
            outputPath: outputFolder
        });

        // Send notification
        if (settings.get('notifications')) {
            const notification = new Notification({
                title: result.success ? 'Build Successful ✓' : 'Build Failed ✕',
                body: result.success
                    ? `${path.basename(projectPath)} built for ${targets.join(', ')} in ${result.duration}`
                    : result.error || 'An error occurred during the build.',
                silent: false
            });
            notification.show();
        }

        return { success: true, data: result };
    } catch (error) {
        logger.error('Build failed', error);

        // Save failed build to history
        history.add({
            project: path.basename(projectPath),
            framework,
            targets,
            success: false,
            duration: '0s',
            outputs: [],
            error: error.message,
            timestamp: new Date().toISOString()
        });

        return { success: false, error: error.message };
    }
});

/**
 * Cancel the current build
 */
ipcMain.handle('build:cancel', async () => {
    if (currentBuildProcess) {
        currentBuildProcess.kill('SIGTERM');
        currentBuildProcess = null;
        logger.info('Build cancelled by user');
        return { success: true };
    }
    return { success: false, error: 'No build in progress' };
});

/**
 * Get build history
 */
ipcMain.handle('history:get', async () => {
    return history.getAll();
});

/**
 * Clear build history
 */
ipcMain.handle('history:clear', async () => {
    history.clear();
    return { success: true };
});

/**
 * Get all settings
 */
ipcMain.handle('settings:get', async () => {
    return settings.getAll();
});

/**
 * Update a setting
 */
ipcMain.handle('settings:set', async (event, { key, value }) => {
    settings.set(key, value);
    return { success: true };
});

/**
 * Get all settings at once
 */
ipcMain.handle('settings:getAll', async () => {
    return settings.getAll();
});

/**
 * Open a folder in the system file explorer
 */
ipcMain.handle('shell:open-path', async (event, folderPath) => {
    try {
        await shell.openPath(folderPath);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

/**
 * Open a file with the system default application
 */
ipcMain.handle('shell:open-file', async (event, filePath) => {
    try {
        await shell.openPath(filePath);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

/**
 * Show a file in the system file explorer (highlighted)
 */
ipcMain.handle('shell:show-in-folder', async (event, filePath) => {
    try {
        shell.showItemInFolder(filePath);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

/**
 * Export build log to a file
 */
ipcMain.handle('log:export', async (event, logContent) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Export Build Log',
        defaultPath: `build-log-${Date.now()}.txt`,
        filters: [{ name: 'Text Files', extensions: ['txt'] }]
    });

    if (result.canceled) return { success: false };

    fs.writeFileSync(result.filePath, logContent, 'utf-8');
    return { success: true, path: result.filePath };
});

/**
 * Get the app's default build output directory
 */
ipcMain.handle('paths:default-output', async () => {
    return path.join(app.getPath('documents'), 'UBBuilds');
});

/**
 * Get app version
 */
ipcMain.handle('app:version', () => {
    return app.getVersion();
});

// =============================================
// SDK Manager IPC Handlers
// =============================================

/**
 * Check status of all SDKs
 */
ipcMain.handle('sdk:check-all', async () => {
    try {
        const results = await sdkManager.checkAll();
        return { success: true, data: results };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

/**
 * Check a specific SDK
 */
ipcMain.handle('sdk:check', async (event, sdkKey) => {
    try {
        const result = await sdkManager.checkSdk(sdkKey);
        return { success: true, data: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

/**
 * Install an SDK
 */
ipcMain.handle('sdk:install', async (event, sdkKey) => {
    try {
        const onProgress = (percent, status) => {
            sendToRenderer('sdk:progress', { sdkKey, percent, status });
        };
        const onLog = (message, type) => {
            sendToRenderer('sdk:log', { sdkKey, message, type });
        };

        const result = await sdkManager.installSdk(sdkKey, onProgress, onLog);
        return { success: true, data: result };
    } catch (error) {
        logger.error(`SDK install failed (${sdkKey})`, error);
        return { success: false, error: error.message };
    }
});

/**
 * Uninstall a managed SDK
 */
ipcMain.handle('sdk:uninstall', async (event, sdkKey) => {
    try {
        const result = await sdkManager.uninstallSdk(sdkKey);
        return { success: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

/**
 * Get required SDKs for a framework
 */
ipcMain.handle('sdk:required', async (event, framework) => {
    return sdkManager.getRequiredSdks(framework);
});

// =============================================
// App lifecycle
// =============================================

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Handle uncaught exceptions gracefully
process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', error);
    if (mainWindow) {
        sendToRenderer('app:error', {
            message: error.message,
            stack: error.stack
        });
    }
});
