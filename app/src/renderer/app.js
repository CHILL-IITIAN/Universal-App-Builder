/**
 * Universal App Builder — Renderer (Frontend)
 * 
 * Handles all UI interactions and communicates with the Electron main process
 * through the preload API bridge (window.api).
 */

// =============================================
// State
// =============================================
const state = {
    currentScreen: 'home',
    currentProject: null,
    detectedFrameworks: [],
    selectedFramework: null,
    selectedTargets: [],
    buildInProgress: false,
    consoleLines: [],
    settings: {}
};

// Framework metadata for display
const frameworkMeta = {
    flutter: { icon: '🦋', iconBg: 'rgba(2, 135, 209, 0.15)', iconColor: '#0287D1' },
    electron: { icon: '⚡', iconBg: 'rgba(151, 212, 241, 0.15)', iconColor: '#97D4F1' },
    tauri: { icon: '🦀', iconBg: 'rgba(255, 199, 92, 0.15)', iconColor: '#FFC75C' },
    'react-native': { icon: '⚛️', iconBg: 'rgba(97, 218, 251, 0.15)', iconColor: '#61DAFB' }
};

// =============================================
// DOM Ready
// =============================================
document.addEventListener('DOMContentLoaded', async () => {
    // Load app version
    try {
        const version = await window.api.getAppVersion();
        document.getElementById('appVersion').textContent = `v${version}`;
    } catch {}

    // Load settings
    await loadSettings();

    // Load history for badge and recent projects
    await refreshHistory();

    // Bind all events
    bindEvents();
});

// =============================================
// Event Binding
// =============================================
function bindEvents() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const screen = item.getAttribute('data-screen');
            if (screen) navigateTo(screen);
        });
    });

    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // Home — Browse buttons
    document.getElementById('btnBrowseFolder').addEventListener('click', handleBrowseFolder);
    document.getElementById('btnBrowseZip').addEventListener('click', handleBrowseZip);

    // Drop zone
    const dropZone = document.getElementById('dropZone');
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', handleDrop);

    // Detection screen
    document.getElementById('btnBackToHome').addEventListener('click', () => navigateTo('home'));
    document.getElementById('btnStartBuild').addEventListener('click', handleStartBuild);

    // Build screen
    document.getElementById('btnCancelBuild').addEventListener('click', handleCancelBuild);
    document.getElementById('btnClearConsole').addEventListener('click', clearConsole);
    document.getElementById('btnExportLog').addEventListener('click', handleExportLog);
    document.getElementById('btnCopyAll').addEventListener('click', handleCopyAllLogs);

    // Output screen
    document.getElementById('btnOutputHome').addEventListener('click', () => navigateTo('home'));
    document.getElementById('btnOutputHistory').addEventListener('click', () => navigateTo('history'));
    document.getElementById('btnNewBuild').addEventListener('click', () => navigateTo('home'));

    // History
    document.getElementById('btnViewAllHistory').addEventListener('click', () => navigateTo('history'));
    document.getElementById('btnClearHistory').addEventListener('click', handleClearHistory);

    // Settings
    document.getElementById('settingTheme').addEventListener('change', (e) => {
        setTheme(e.target.value);
        window.api.setSetting('theme', e.target.value);
    });
    document.getElementById('settingLanguage').addEventListener('change', (e) => {
        window.api.setSetting('language', e.target.value);
    });
    document.getElementById('settingParallel').addEventListener('change', (e) => {
        window.api.setSetting('parallelBuilds', parseInt(e.target.value));
    });
    document.getElementById('settingPkgManager').addEventListener('change', (e) => {
        window.api.setSetting('preferredPackageManager', e.target.value);
    });
    document.getElementById('settingAutoClean').addEventListener('click', function() {
        this.classList.toggle('active');
        window.api.setSetting('autoCleanTemp', this.classList.contains('active'));
    });
    document.getElementById('settingNotifications').addEventListener('click', function() {
        this.classList.toggle('active');
        window.api.setSetting('notifications', this.classList.contains('active'));
    });
    document.getElementById('settingSounds').addEventListener('click', function() {
        this.classList.toggle('active');
        window.api.setSetting('soundEffects', this.classList.contains('active'));
    });
    document.getElementById('btnBrowseOutputFolder').addEventListener('click', async () => {
        const folder = await window.api.selectOutputFolder();
        if (folder) {
            document.getElementById('settingOutputFolder').value = folder;
            window.api.setSetting('buildOutputFolder', folder);
        }
    });

    // Build event listeners from main process
    window.api.onBuildLog((data) => {
        addConsoleLine(data.message, data.type);
    });

    window.api.onBuildProgress((data) => {
        updateProgress(data.step, data.percent, data.status);
    });

    // App errors
    window.api.onAppError((data) => {
        showToast(`Error: ${data.message}`, '❌');
    });
}

// =============================================
// Navigation
// =============================================
function navigateTo(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const screenEl = document.getElementById(`screen-${screen}`);
    if (screenEl) screenEl.classList.add('active');

    const navItem = document.querySelector(`.nav-item[data-screen="${screen}"]`);
    if (navItem) navItem.classList.add('active');

    document.getElementById('breadcrumbCurrent').textContent = screen.charAt(0).toUpperCase() + screen.slice(1);
    state.currentScreen = screen;

    if (screen === 'history') refreshHistory();
    if (screen === 'settings') loadSdkStatus();
}

// =============================================
// Theme
// =============================================
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
    window.api.setSetting('theme', next);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const sw = document.getElementById('themeSwitch');
    if (theme === 'dark') sw.classList.add('active');
    else sw.classList.remove('active');

    const select = document.getElementById('settingTheme');
    if (select) select.value = theme;
}

// =============================================
// Settings
// =============================================
async function loadSettings() {
    try {
        const settings = await window.api.getSettings();
        state.settings = settings;

        // Apply theme
        setTheme(settings.theme || 'dark');

        // Fill settings UI
        if (settings.language) document.getElementById('settingLanguage').value = settings.language;
        if (settings.buildOutputFolder) document.getElementById('settingOutputFolder').value = settings.buildOutputFolder;
        if (settings.parallelBuilds) document.getElementById('settingParallel').value = settings.parallelBuilds;
        if (settings.preferredPackageManager) document.getElementById('settingPkgManager').value = settings.preferredPackageManager;

        // Toggle switches
        const autoClean = document.getElementById('settingAutoClean');
        if (settings.autoCleanTemp) autoClean.classList.add('active');
        else autoClean.classList.remove('active');

        const notifications = document.getElementById('settingNotifications');
        if (settings.notifications) notifications.classList.add('active');
        else notifications.classList.remove('active');

        const sounds = document.getElementById('settingSounds');
        if (settings.soundEffects) sounds.classList.add('active');
        else sounds.classList.remove('active');
    } catch (e) {
        console.warn('Failed to load settings:', e);
    }
}

// =============================================
// Project Import
// =============================================
async function handleBrowseFolder() {
    const folderPath = await window.api.selectFolder();
    if (!folderPath) return;

    showToast('Analyzing project...', '🔍');
    await detectAndShowProject(folderPath);
}

async function handleBrowseZip() {
    const zipPath = await window.api.selectZip();
    if (!zipPath) return;

    showToast('Extracting ZIP...', '📦');
    const result = await window.api.extractZip(zipPath);

    if (!result.success) {
        showToast(`Extraction failed: ${result.error}`, '❌');
        return;
    }

    showToast('ZIP extracted. Analyzing...', '🔍');
    await detectAndShowProject(result.path);
}

async function handleDrop(e) {
    e.preventDefault();
    const dropZone = document.getElementById('dropZone');
    dropZone.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];

    // Check if it's a folder or a ZIP
    if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
        showToast('Extracting ZIP...', '📦');
        const result = await window.api.extractZip(file.path);
        if (!result.success) {
            showToast(`Extraction failed: ${result.error}`, '❌');
            return;
        }
        await detectAndShowProject(result.path);
    } else {
        // It's a folder
        await detectAndShowProject(file.path);
    }
}

/**
 * Run framework detection and navigate to the detection screen
 */
async function detectAndShowProject(projectPath) {
    const result = await window.api.detectProject(projectPath);

    if (!result.success) {
        showToast(`Detection error: ${result.error}`, '❌');
        showDetectionError({
            projectName: path.basename(projectPath),
            projectPath: projectPath,
            message: result.error,
            warnings: []
        });
        return;
    }

    const data = result.data;

    state.currentProject = {
        path: data.projectPath,
        name: data.projectName
    };

    if (!data.detected) {
        showToast('No supported framework detected.', '⚠️');
        showDetectionError(data);
        return;
    }

    state.detectedFrameworks = data.frameworks;
    state.detectionWarnings = data.warnings || [];

    if (data.frameworks.length === 1) {
        // Single framework — auto-select
        state.selectedFramework = data.frameworks[0];
        showDetectionScreen(state.selectedFramework, false);
    } else {
        // Multiple frameworks — let user choose
        state.selectedFramework = data.frameworks[0]; // default to first
        showDetectionScreen(state.selectedFramework, true);
    }

    navigateTo('detection');
    showToast(`Detected: ${state.selectedFramework.name}`, '✅');
}

function showDetectionError(data) {
    document.getElementById('detectedName').textContent = data.projectName;
    document.getElementById('detectedType').textContent = 'Unknown Framework';
    document.getElementById('infoFramework').textContent = 'None detected';
    document.getElementById('infoVersion').textContent = '—';
    document.getElementById('infoPackageManager').textContent = '—';
    document.getElementById('infoLocation').textContent = data.projectPath;
    document.getElementById('infoLocation').title = data.projectPath || '';
    document.getElementById('detectionBadge').textContent = '✕ Not Detected';
    document.getElementById('detectionBadge').className = 'status-badge detecting';
    document.getElementById('targetsGrid').innerHTML = '';
    document.getElementById('btnStartBuild').disabled = true;

    // Show detailed error message
    const subtitle = document.getElementById('detectionSubtitle');
    subtitle.innerHTML = `<div style="color: var(--error); white-space: pre-wrap; text-align: left;">${escapeHtml(data.message || 'No supported framework detected.')}</div>`;

    // Show warnings if any
    renderDetectionWarnings(data.warnings || []);

    navigateTo('detection');
}

function showDetectionScreen(framework, showFrameworkSelector) {
    const meta = frameworkMeta[framework.id] || {};

    // Update header
    document.getElementById('detectedName').textContent = framework.projectName || state.currentProject.name;
    document.getElementById('detectedType').textContent = `${framework.name} Application`;
    document.getElementById('infoFramework').textContent = framework.name;
    document.getElementById('infoVersion').textContent = framework.version;
    document.getElementById('infoPackageManager').textContent = framework.packageManager;
    document.getElementById('infoLocation').textContent = state.currentProject.path;
    document.getElementById('infoLocation').title = state.currentProject.path;

    const icon = document.getElementById('detectedIcon');
    icon.textContent = framework.icon;
    icon.style.background = meta.iconBg || 'var(--bg-tertiary)';
    icon.style.color = meta.iconColor || 'var(--text-primary)';

    document.getElementById('detectionBadge').textContent = '✓ Detected';
    document.getElementById('detectionBadge').className = 'status-badge ready';
    document.getElementById('btnStartBuild').disabled = false;

    // Reset subtitle
    document.getElementById('detectionSubtitle').textContent = 'Your project has been analyzed.';

    // Framework selector (if multiple detected)
    const fwSelector = document.getElementById('frameworkSelector');
    const fwNotice = document.getElementById('multiFrameworkNotice');
    if (showFrameworkSelector) {
        fwSelector.style.display = '';
        fwNotice.style.display = '';
        renderFrameworkSelector(state.detectedFrameworks);
    } else {
        fwSelector.style.display = 'none';
        fwNotice.style.display = 'none';
    }

    // Show warnings if any
    renderDetectionWarnings(state.detectionWarnings || framework.warnings || []);

    // Render targets
    state.selectedTargets = [];
    renderTargets(framework.targets || []);
}

function renderDetectionWarnings(warnings) {
    // Find or create warnings container
    let warningsContainer = document.getElementById('detectionWarnings');
    
    if (!warningsContainer) {
        // Create warnings container if it doesn't exist
        const projectInfoCard = document.querySelector('.project-info-card');
        if (!projectInfoCard) return;
        
        warningsContainer = document.createElement('div');
        warningsContainer.id = 'detectionWarnings';
        warningsContainer.className = 'alert alert-warning';
        warningsContainer.style.marginBottom = '24px';
        projectInfoCard.parentNode.insertBefore(warningsContainer, projectInfoCard.nextSibling);
    }

    if (!warnings || warnings.length === 0) {
        warningsContainer.style.display = 'none';
        warningsContainer.innerHTML = '';
        return;
    }

    warningsContainer.style.display = 'block';
    warningsContainer.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 12px;">
            <span style="font-size: 24px; flex-shrink: 0;">⚠️</span>
            <div style="flex: 1;">
                <strong style="display: block; margin-bottom: 8px;">
                    ${warnings.length === 1 ? 'Warning' : `${warnings.length} Warnings`} Detected
                </strong>
                <ul style="margin: 0; padding-left: 20px; color: var(--text-secondary);">
                    ${warnings.map(w => `<li style="margin-bottom: 4px;">${escapeHtml(w)}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;
}

function renderFrameworkSelector(frameworks) {
    const grid = document.getElementById('frameworkGrid');
    grid.innerHTML = '';

    frameworks.forEach(fw => {
        const div = document.createElement('div');
        div.className = 'target-option' + (fw.id === state.selectedFramework.id ? ' selected' : '');
        div.innerHTML = `
            <div class="target-checkbox"></div>
            <span class="target-icon">${fw.icon}</span>
            <div class="target-info">
                <span class="target-name">${fw.name}</span>
                <span class="target-desc">v${fw.version}</span>
            </div>
        `;
        div.addEventListener('click', () => {
            state.selectedFramework = fw;
            grid.querySelectorAll('.target-option').forEach(o => o.classList.remove('selected'));
            div.classList.add('selected');
            // Re-render targets for the new framework
            state.selectedTargets = [];
            renderTargets(fw.targets || []);
            // Update info
            showDetectionScreen(fw, true);
        });
        grid.appendChild(div);
    });
}

function renderTargets(targets) {
    const grid = document.getElementById('targetsGrid');
    grid.innerHTML = '';

    targets.forEach(target => {
        const div = document.createElement('div');
        div.className = 'target-option';
        div.setAttribute('data-target', target.id);
        div.innerHTML = `
            <div class="target-checkbox"></div>
            <span class="target-icon">${target.icon}</span>
            <div class="target-info">
                <span class="target-name">${target.name}</span>
                <span class="target-desc">${target.desc}</span>
            </div>
        `;
        div.addEventListener('click', () => {
            div.classList.toggle('selected');
            if (div.classList.contains('selected')) {
                state.selectedTargets.push(target.id);
            } else {
                state.selectedTargets = state.selectedTargets.filter(t => t !== target.id);
            }
        });
        grid.appendChild(div);
    });
}

// =============================================
// Build
// =============================================
async function handleStartBuild() {
    if (state.selectedTargets.length === 0) {
        showToast('Please select at least one build target.', '⚠️');
        return;
    }

    if (!state.selectedFramework || !state.currentProject) {
        showToast('No project loaded.', '❌');
        return;
    }

    state.buildInProgress = true;
    clearConsole();
    resetProgressSteps();
    navigateTo('build');

    document.getElementById('buildSubtitle').textContent =
        `Compiling ${state.currentProject.name} for ${state.selectedTargets.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')}...`;

    document.getElementById('btnCancelBuild').style.display = '';

    // Start the build via IPC
    const result = await window.api.startBuild({
        projectPath: state.currentProject.path,
        framework: state.selectedFramework.id,
        targets: state.selectedTargets,
        installDeps: true
    });

    state.buildInProgress = false;
    document.getElementById('btnCancelBuild').style.display = 'none';

    if (result.success && result.data) {
        showBuildOutput(result.data);
    } else if (result.data && result.data.cancelled) {
        addConsoleLine('', '');
        addConsoleLine('✕ Build cancelled by user.', 'error');
        document.getElementById('progressStatus').textContent = 'Build cancelled';
    } else if (result.missingSdks) {
        // SDK missing — show helpful error with install buttons
        showMissingSdkError(result);
    } else {
        // Build failed
        addConsoleLine('', '');
        addConsoleLine(`✕ BUILD FAILED: ${result.error}`, 'error');
        showBuildFailure(result.error);
    }

    // Refresh history
    await refreshHistory();
}

async function handleCancelBuild() {
    if (state.buildInProgress) {
        await window.api.cancelBuild();
        state.buildInProgress = false;
        addConsoleLine('', '');
        addConsoleLine('✕ Build cancelled by user.', 'error');
        document.getElementById('progressStatus').textContent = 'Build cancelled';
        document.getElementById('btnCancelBuild').style.display = 'none';
        showToast('Build cancelled.', '⚠️');
    }
}

function resetProgressSteps() {
    document.querySelectorAll('.progress-step').forEach(step => {
        step.className = 'progress-step';
    });
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('progressPercent').textContent = '0%';
    document.getElementById('progressStatus').textContent = 'Initializing...';
}

function updateProgress(step, percent, status) {
    // Update progress bar
    document.getElementById('progressBar').style.width = `${percent}%`;
    document.getElementById('progressPercent').textContent = `${Math.round(percent)}%`;
    document.getElementById('progressStatus').textContent = status;

    // Update step indicators
    const stepOrder = ['validate', 'deps', 'compile', 'package', 'output'];
    const currentIdx = stepOrder.indexOf(step);

    document.querySelectorAll('.progress-step').forEach((el, idx) => {
        if (idx < currentIdx) {
            el.className = 'progress-step completed';
            el.querySelector('span').textContent = '✓';
        } else if (idx === currentIdx) {
            el.className = 'progress-step active';
            el.querySelector('span').innerHTML = '<span class="spinner" style="width:12px;height:12px;border-width:1.5px;display:inline-block;"></span>';
        } else {
            el.className = 'progress-step';
            el.querySelector('span').textContent = idx + 1;
        }
    });
}

// =============================================
// Console
// =============================================
function addConsoleLine(text, type = '') {
    const body = document.getElementById('consoleBody');
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const line = document.createElement('div');
    line.className = 'console-line';
    line.innerHTML = `
        <span class="console-time">${time}</span>
        <span class="console-text ${type}">${escapeHtml(text)}</span>
        <button class="copy-line-btn" title="Copy line" style="opacity:0;transition:opacity 0.2s;">📋</button>
    `;
    
    // Add copy functionality for this line
    const copyBtn = line.querySelector('.copy-line-btn');
    copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
            copyBtn.textContent = '✓';
            setTimeout(() => { copyBtn.textContent = '📋'; }, 1000);
            showToast('Line copied to clipboard', '📋');
        });
    });
    
    // Show copy button on hover
    line.addEventListener('mouseenter', () => { copyBtn.style.opacity = '1'; });
    line.addEventListener('mouseleave', () => { copyBtn.style.opacity = '0'; });
    
    // Allow text selection and copy via keyboard
    line.querySelector('.console-text').addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const selection = window.getSelection().toString() || text;
        navigator.clipboard.writeText(selection);
        showToast('Copied to clipboard', '📋');
    });
    
    body.appendChild(line);
    body.scrollTop = body.scrollHeight;

    state.consoleLines.push({ time, text, type });
}

function clearConsole() {
    document.getElementById('consoleBody').innerHTML = '';
    state.consoleLines = [];
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function handleCopyAllLogs() {
    const allLogs = state.consoleLines.map(line => `[${line.time}] ${line.text}`).join('\n');
    try {
        await navigator.clipboard.writeText(allLogs);
        showToast('All logs copied to clipboard', '📋');
    } catch (e) {
        showToast('Failed to copy logs', '❌');
    }
}

async function handleExportLog() {
    let logText = 'Universal App Builder — Build Log\n';
    logText += '==================================\n';
    logText += `Date: ${new Date().toLocaleString()}\n`;
    logText += `Project: ${state.currentProject?.name || 'N/A'}\n`;
    logText += `Framework: ${state.selectedFramework?.name || 'N/A'}\n`;
    logText += `Targets: ${state.selectedTargets.join(', ')}\n\n`;

    state.consoleLines.forEach(l => {
        logText += `[${l.time}] ${l.text}\n`;
    });

    const result = await window.api.exportLog(logText);
    if (result.success) {
        showToast('Log exported successfully.', '📄');
    }
}

// =============================================
// Build Output
// =============================================
function showBuildOutput(buildData) {
    const outputHeader = document.getElementById('outputHeader');
    outputHeader.innerHTML = `
        <div class="output-success-icon">✓</div>
        <h2>Build Successful!</h2>
        <p>Your application has been built in ${buildData.duration} and is ready to distribute.</p>
    `;

    const cards = document.getElementById('outputCards');
    cards.innerHTML = '';

    if (buildData.outputs && buildData.outputs.length > 0) {
        buildData.outputs.forEach(output => {
            const card = document.createElement('div');
            card.className = 'output-card';
            card.innerHTML = `
                <div class="output-card-header">
                    <span class="output-filename">📄 ${escapeHtml(output.name)}</span>
                    <span class="output-badge success">✓ Built</span>
                </div>
                <div class="output-details">
                    <div class="output-detail">
                        <span class="output-detail-label">Platform</span>
                        <span class="output-detail-value">${output.target.charAt(0).toUpperCase() + output.target.slice(1)}</span>
                    </div>
                    <div class="output-detail">
                        <span class="output-detail-label">File Size</span>
                        <span class="output-detail-value">${output.sizeFormatted}</span>
                    </div>
                    <div class="output-detail">
                        <span class="output-detail-label">Build Duration</span>
                        <span class="output-detail-value">${buildData.duration}</span>
                    </div>
                    <div class="output-detail">
                        <span class="output-detail-label">Output Path</span>
                        <span class="output-detail-value" style="font-size:11px;word-break:break-all;">${escapeHtml(output.path)}</span>
                    </div>
                </div>
                <div class="output-actions">
                    <button class="btn btn-sm" data-action="open-folder" data-path="${escapeHtml(output.path)}">📂 Open Folder</button>
                    <button class="btn btn-sm" data-action="open-file" data-path="${escapeHtml(output.path)}">📄 Open File</button>
                    <button class="btn btn-sm" data-action="show-in-folder" data-path="${escapeHtml(output.path)}">📋 Show</button>
                </div>
            `;

            // Bind output action buttons
            card.querySelectorAll('[data-action]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const action = btn.getAttribute('data-action');
                    const filePath = btn.getAttribute('data-path');
                    if (action === 'open-folder') {
                        const dir = filePath.substring(0, filePath.lastIndexOf('/') > -1 ? filePath.lastIndexOf('/') : filePath.lastIndexOf('\\'));
                        await window.api.openPath(dir || filePath);
                    } else if (action === 'open-file') {
                        await window.api.openFile(filePath);
                    } else if (action === 'show-in-folder') {
                        await window.api.showInFolder(filePath);
                    }
                });
            });

            cards.appendChild(card);
        });
    } else {
        cards.innerHTML = `
            <div class="output-card">
                <p style="color: var(--text-secondary);">Build completed but no output files were found in the expected locations. Check the build log for details.</p>
            </div>
        `;
    }

    navigateTo('output');
    showToast('Build completed successfully!', '✅');
}

function showBuildFailure(error) {
    const outputHeader = document.getElementById('outputHeader');
    outputHeader.innerHTML = `
        <div class="output-error-icon">✕</div>
        <h2>Build Failed</h2>
        <p>${escapeHtml(error || 'An unknown error occurred during the build.')}</p>
    `;

    const errorMessage = error || 'An unknown error occurred during the build.';
    const fixSuggestions = getFixSuggestions(errorMessage);

    document.getElementById('outputCards').innerHTML = `
        <div class="output-card" style="border-color: var(--error);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
                <h4 style="color: var(--error); margin:0;">❌ Error Details</h4>
                <button class="btn btn-sm" id="btnCopyError" title="Copy error message">📋 Copy Error</button>
            </div>
            <div style="background: var(--error-bg); padding: 12px 16px; border-radius: var(--radius-md); margin-bottom: 16px; font-family: monospace; font-size: 13px; color: var(--error); user-select: text; cursor: text; word-break: break-word;">
                ${escapeHtml(errorMessage)}
            </div>
            
            <h4 style="margin-bottom: 12px; color: var(--warning);">💡 Possible Fixes</h4>
            <ul style="list-style: none; display: flex; flex-direction: column; gap: 8px; font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;">
                ${fixSuggestions.map(s => `<li style="padding: 8px 12px; background: var(--bg-tertiary); border-radius: var(--radius-sm);">• ${s}</li>`).join('')}
            </ul>
            
            <div style="display: flex; gap: 8px;">
                <button class="btn btn-sm" id="btnCopyFixes" title="Copy all suggestions">📋 Copy Fixes</button>
                <button class="btn btn-sm" id="btnViewFullLog">📄 View Full Log</button>
            </div>
        </div>
    `;

    // Bind error copy buttons
    document.getElementById('btnCopyError').addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(errorMessage);
            showToast('Error message copied!', '📋');
        } catch (e) {
            showToast('Failed to copy', '❌');
        }
    });

    document.getElementById('btnCopyFixes').addEventListener('click', async () => {
        const fixesText = fixSuggestions.join('\n');
        try {
            await navigator.clipboard.writeText(`Error: ${errorMessage}\n\nPossible Fixes:\n${fixesText}`);
            showToast('Error and fixes copied!', '📋');
        } catch (e) {
            showToast('Failed to copy', '❌');
        }
    });

    document.getElementById('btnViewFullLog').addEventListener('click', () => {
        navigateTo('build');
    });

    navigateTo('output');
    showToast('Build failed. See output for details.', '❌');
}

/**
 * Show error when required SDKs are missing
 */
function showMissingSdkError(result) {
    const { missingSdks, suggestion } = result;

    const outputHeader = document.getElementById('outputHeader');
    outputHeader.innerHTML = `
        <div class="output-error-icon">⚠️</div>
        <h2>Missing SDKs</h2>
        <p>The build cannot start because required tools are not installed.</p>
    `;

    const sdkCards = missingSdks.map(sdk => `
        <div class="sdk-item" style="margin-bottom: 12px;">
            <div class="sdk-icon">${sdk.icon}</div>
            <div class="sdk-info">
                <div class="sdk-name">${escapeHtml(sdk.name)}</div>
                <div class="sdk-status missing">✕ Not installed — ${escapeHtml(sdk.size || 'Required')}</div>
            </div>
            <div class="sdk-actions">
                <button class="btn btn-sm btn-primary" onclick="installSdkFromError('${sdk.key}')">⬇️ Install</button>
            </div>
        </div>
    `).join('');

    document.getElementById('outputCards').innerHTML = `
        <div class="output-card" style="border-color: var(--warning);">
            <h4 style="color: var(--warning); margin-bottom: 16px;">⚠️ Required SDKs Not Found</h4>
            <div style="margin-bottom: 16px;">
                ${sdkCards}
            </div>
            <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;">
                ${escapeHtml(suggestion || 'Install the missing SDKs to continue.')}
            </p>
            <div style="display: flex; gap: 8px;">
                <button class="btn btn-sm" id="btnGoToSettings">⚙️ Open SDK Manager</button>
                <button class="btn btn-sm" id="btnRetryBuild">🔄 Retry Build</button>
            </div>
        </div>
    `;

    document.getElementById('btnGoToSettings').addEventListener('click', () => {
        navigateTo('settings');
    });

    document.getElementById('btnRetryBuild').addEventListener('click', () => {
        navigateTo('detection');
    });

    navigateTo('output');
    showToast(`${missingSdks.length} required SDK(s) missing`, '⚠️');
}

/**
 * Install SDK from error screen
 */
window.installSdkFromError = async function(sdkKey) {
    showToast(`Installing ${sdkKey}...`, '⬇️');
    navigateTo('settings');
    await loadSdkStatus();
    await handleSdkInstall(sdkKey);
};

/**
 * Get fix suggestions based on error message
 */
function getFixSuggestions(errorMessage) {
    const suggestions = [];
    const lower = errorMessage.toLowerCase();

    if (lower.includes('flutter') && (lower.includes('not found') || lower.includes('not detected'))) {
        suggestions.push('Install Flutter SDK from https://flutter.dev/docs/get-started/install');
        suggestions.push('Add Flutter to your system PATH environment variable');
        suggestions.push('Run "flutter doctor" in terminal to verify installation');
    } else if (lower.includes('node') || lower.includes('npm')) {
        suggestions.push('Install Node.js from https://nodejs.org');
        suggestions.push('Verify installation: run "node --version" in terminal');
    } else if (lower.includes('rust') || lower.includes('cargo')) {
        suggestions.push('Install Rust from https://rustup.rs');
        suggestions.push('Run "rustup update" to ensure latest toolchain');
    } else if (lower.includes('android') || lower.includes('gradle')) {
        suggestions.push('Install Android Studio from https://developer.android.com/studio');
        suggestions.push('Ensure ANDROID_HOME environment variable is set');
        suggestions.push('Accept Android SDK licenses: sdkmanager --licenses');
    } else if (lower.includes('java') || lower.includes('jdk')) {
        suggestions.push('Install JDK 11 or higher from https://adoptium.net');
        suggestions.push('Set JAVA_HOME environment variable');
    } else if (lower.includes('permission denied') || lower.includes('eacces')) {
        suggestions.push('Check file/folder permissions');
        suggestions.push('Try running the app with appropriate permissions');
    } else if (lower.includes('network') || lower.includes('timeout') || lower.includes('fetch')) {
        suggestions.push('Check your internet connection');
        suggestions.push('Try again later — the server may be temporarily unavailable');
        suggestions.push('Check if a proxy or firewall is blocking the connection');
    } else {
        suggestions.push('Check the build console above for specific error details');
        suggestions.push('Ensure all required SDKs are installed and in your PATH');
        suggestions.push('Try cleaning the project and rebuilding');
        suggestions.push('Search for the error message online for framework-specific solutions');
    }

    return suggestions;
}

// =============================================
// History
// =============================================
async function refreshHistory() {
    try {
        const history = await window.api.getHistory();
        const badge = document.getElementById('historyBadge');
        badge.textContent = history.length;

        // Render recent projects on home screen
        renderRecentProjects(history.slice(0, 4));

        // If on history screen, re-render
        if (state.currentScreen === 'history') {
            renderHistoryList(history);
        }
    } catch (e) {
        console.warn('Failed to load history:', e);
    }
}

function renderRecentProjects(items) {
    const container = document.getElementById('recentProjects');
    const empty = document.getElementById('emptyRecentProjects');

    // Remove existing cards (keep empty state element)
    container.querySelectorAll('.project-card').forEach(c => c.remove());

    if (items.length === 0) {
        empty.style.display = '';
        return;
    }

    empty.style.display = 'none';

    items.forEach(item => {
        const meta = frameworkMeta[item.framework] || {};
        const card = document.createElement('div');
        card.className = 'project-card';
        card.innerHTML = `
            <div class="project-card-header">
                <div class="project-icon ${item.framework}" style="background:${meta.iconBg || 'var(--bg-tertiary)'}; color:${meta.iconColor || 'inherit'};">
                    ${meta.icon || '📁'}
                </div>
                <div>
                    <div class="project-name">${escapeHtml(item.project)}</div>
                    <div class="project-framework">${item.framework} • ${item.targets?.join(', ') || ''}</div>
                </div>
            </div>
            <div class="project-meta">
                <span>📅 ${formatDate(item.timestamp)}</span>
                <span>${item.success ? '✅ Success' : '❌ Failed'}</span>
            </div>
        `;
        card.addEventListener('click', () => {
            showToast('Re-open this project by browsing to its folder.', 'ℹ️');
        });
        container.appendChild(card);
    });
}

function renderHistoryList(history) {
    const list = document.getElementById('historyList');
    const empty = document.getElementById('emptyHistory');

    list.querySelectorAll('.history-item').forEach(i => i.remove());

    if (history.length === 0) {
        empty.style.display = '';
        return;
    }

    empty.style.display = 'none';

    history.forEach(item => {
        const meta = frameworkMeta[item.framework] || {};
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <div class="history-status ${item.success ? 'success' : 'failure'}">
                ${item.success ? '✓' : '✕'}
            </div>
            <div class="history-info">
                <div class="history-title">${escapeHtml(item.project)}</div>
                <div class="history-meta">
                    <span>${meta.icon || '📁'} ${item.framework}</span>
                    <span>🎯 ${item.targets?.join(', ') || '—'}</span>
                    <span>⏱️ ${item.duration || '—'}</span>
                    <span>📅 ${formatDate(item.timestamp)}</span>
                </div>
            </div>
            <div class="history-actions">
                ${item.outputPath ? `<button class="btn btn-sm" data-path="${escapeHtml(item.outputPath)}">📂 Output</button>` : ''}
            </div>
        `;

        // Open output folder
        const outputBtn = div.querySelector('[data-path]');
        if (outputBtn) {
            outputBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await window.api.openPath(outputBtn.getAttribute('data-path'));
            });
        }

        list.appendChild(div);
    });
}

async function handleClearHistory() {
    await window.api.clearHistory();
    showToast('History cleared.', '🗑️');
    await refreshHistory();
}

// =============================================
// Utilities
// =============================================
function showToast(message, icon = 'ℹ️') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span>${escapeHtml(message)}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function formatDate(isoString) {
    if (!isoString) return '—';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

// =============================================
// SDK Manager
// =============================================
async function loadSdkStatus() {
    const container = document.getElementById('sdkManagerList');
    container.innerHTML = `
        <div style="text-align: center; padding: 20px; color: var(--text-muted);">
            <div class="spinner" style="margin: 0 auto 12px;"></div>
            <p>Checking SDK status...</p>
        </div>
    `;

    try {
        const result = await window.api.sdkCheckAll();
        if (!result.success) {
            container.innerHTML = `<p style="color: var(--error);">Failed to check SDKs: ${escapeHtml(result.error)}</p>`;
            return;
        }

        renderSdkList(result.data);
    } catch (e) {
        container.innerHTML = `<p style="color: var(--error);">Error loading SDK status: ${escapeHtml(e.message)}</p>`;
    }
}

function renderSdkList(sdkData) {
    const container = document.getElementById('sdkManagerList');
    container.innerHTML = '';

    // Order of display
    const sdkOrder = ['flutter', 'nodejs', 'rust', 'android', 'java'];

    for (const key of sdkOrder) {
        const sdk = sdkData[key];
        if (!sdk) continue;

        const item = document.createElement('div');
        item.className = 'sdk-item';
        item.id = `sdk-item-${key}`;

        const isInstalled = sdk.installed;
        const source = sdk.source || 'none';
        const statusClass = isInstalled ? 'installed' : 'missing';
        const statusText = isInstalled
            ? `✓ v${sdk.version} (${source === 'system' ? 'System' : 'Managed'})`
            : `✕ Not installed — ${sdk.size || 'Download required'}`;

        const badgeHtml = isInstalled
            ? `<span class="sdk-badge ${source}">${source === 'system' ? '💻 System' : '📦 Managed'}</span>`
            : '';

        const actionHtml = isInstalled
            ? (source === 'managed' ? `<button class="btn btn-sm btn-danger" onclick="handleSdkUninstall('${key}')">Uninstall</button>` : '')
            : `<button class="btn btn-sm btn-primary" onclick="handleSdkInstall('${key}')">⬇️ Install</button>`;

        item.innerHTML = `
            <div class="sdk-icon">${sdk.icon}</div>
            <div class="sdk-info">
                <div class="sdk-name">${escapeHtml(sdk.name)} ${badgeHtml}</div>
                <div class="sdk-description">${escapeHtml(sdk.description || '')}</div>
                <div class="sdk-status ${statusClass}">${statusText}</div>
                <div class="sdk-progress-container" id="sdk-progress-${key}" style="display:none;">
                    <div class="sdk-progress-bar-bg">
                        <div class="sdk-progress-bar" id="sdk-progress-bar-${key}" style="width: 0%"></div>
                    </div>
                    <div class="sdk-progress-text" id="sdk-progress-text-${key}">Preparing...</div>
                </div>
            </div>
            <div class="sdk-actions" id="sdk-actions-${key}">
                ${actionHtml}
            </div>
        `;

        container.appendChild(item);
    }
}

async function handleSdkInstall(sdkKey) {
    const actionsEl = document.getElementById(`sdk-actions-${sdkKey}`);
    const progressEl = document.getElementById(`sdk-progress-${sdkKey}`);
    const progressBar = document.getElementById(`sdk-progress-bar-${sdkKey}`);
    const progressText = document.getElementById(`sdk-progress-text-${sdkKey}`);

    // Disable button and show progress
    actionsEl.innerHTML = '<button class="btn btn-sm" disabled>Installing...</button>';
    progressEl.style.display = '';

    // Listen for progress events
    const progressHandler = (data) => {
        if (data.sdkKey === sdkKey) {
            progressBar.style.width = `${data.percent}%`;
            progressText.textContent = data.status;
        }
    };

    const logHandler = (data) => {
        if (data.sdkKey === sdkKey) {
            progressText.textContent = data.message;
        }
    };

    window.api.onSdkProgress(progressHandler);
    window.api.onSdkLog(logHandler);

    try {
        const result = await window.api.sdkInstall(sdkKey);
        if (result.success) {
            showToast(`${result.data?.name || sdkKey} installed successfully!`, '✅');
        } else {
            showToast(`Installation failed: ${result.error}`, '❌');
        }
    } catch (e) {
        showToast(`Installation error: ${e.message}`, '❌');
    }

    // Refresh SDK list
    await loadSdkStatus();
}

async function handleSdkUninstall(sdkKey) {
    if (!confirm(`Are you sure you want to uninstall this SDK?`)) return;

    try {
        const result = await window.api.sdkUninstall(sdkKey);
        if (result.success) {
            showToast('SDK uninstalled.', '🗑️');
        } else {
            showToast(`Uninstall failed: ${result.error}`, '❌');
        }
    } catch (e) {
        showToast(`Error: ${e.message}`, '❌');
    }

    await loadSdkStatus();
}
