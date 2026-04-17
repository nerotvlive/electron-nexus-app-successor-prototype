const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { LaunchService } = require('./services/launch-service');
const { buildLaunchProfile } = require('./services/launch-profile-builder');
const { AuthService } = require('./services/auth-service');

let mainWindow;
const launchService = new LaunchService();
const authService = new AuthService();

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1100,
        minHeight: 700,
        backgroundColor: '#00000000',
        title: 'Zyneon Desktop',
        ...(process.platform === 'win32' ? {
            titleBarStyle: 'hidden',
            titleBarOverlay: {
                color: '#00000000',
                symbolColor: '#ffffff',
                height: 39
            }
        } : {}),
        ...(process.platform === 'linux' ? {
            titleBarStyle: 'hidden',
        } : {}),
        backgroundMaterial: "mica",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '../preload/preload-index.js'),
        },
    });

    mainWindow.setMenuBarVisibility(false);
    mainWindow.webContents.on('before-input-event', (event, input) => {
        const isMac = process.platform === 'darwin';
        const openDevTools =
            input.type === 'keyDown' &&
            (
                input.key === 'F12' ||
                (!isMac && input.control && input.shift && input.key.toUpperCase() === 'I') ||
                (isMac && input.meta && input.alt && input.key.toUpperCase() === 'I')
            );

        if (openDevTools) {
            if (mainWindow.webContents.isDevToolsOpened()) {
                mainWindow.webContents.closeDevTools();
            } else {
                mainWindow.webContents.openDevTools({ mode: 'detach' });
            }
            event.preventDefault();
        }
    });

    if(process.platform === 'linux') {
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html?linux=true'));
    } else {
        mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }
}

app.whenReady().then(() => {
    authService.loadSession();
    createMainWindow();

    launchService.on('event', (eventPayload) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('launcher:event', eventPayload);
        }
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

ipcMain.on('window-control', (_event, action) => {
    if (!mainWindow) return;

    if (action === 'minimize') {
        mainWindow.minimize();
    } else if (action === 'maximize') {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    } else if (action === 'close') {
        mainWindow.close();
    }
});

ipcMain.handle('launcher:build-profile', async (_event, payload = {}) => {
    try {
        const data = buildLaunchProfile(payload);
        return { ok: true, data };
    } catch (error) {
        return {
            ok: false,
            error: {
                code: 'LAUNCH_PROFILE_BUILD_FAILED',
                message: error?.message || String(error),
            },
        };
    }
});

ipcMain.handle('launcher:start', async (_event, payload = {}) => {
    try {
        const data = await launchService.start(payload);
        return { ok: true, data };
    } catch (error) {
        return {
            ok: false,
            error: {
                code: 'LAUNCH_START_FAILED',
                message: error?.message || String(error),
            },
        };
    }
});

ipcMain.handle('launcher:stop', async () => {
    try {
        const data = await launchService.stop();
        return { ok: true, data };
    } catch (error) {
        return {
            ok: false,
            error: {
                code: 'LAUNCH_STOP_FAILED',
                message: error?.message || String(error),
            },
        };
    }
});

ipcMain.handle('modrinth-search-projects', async (_event, payload = {}) => {
    const query = String(payload.query ?? '').trim();
    const limit = Math.min(Math.max(Number(payload.limit ?? 20), 1), 50);
    const offset = Math.max(Number(payload.offset ?? 0), 0);
    const facets = Array.isArray(payload.facets) && payload.facets.length > 0
        ? payload.facets
        : [["project_type:modpack"]];

    const params = new URLSearchParams({
        query,
        limit: String(limit),
        offset: String(offset),
        index: 'relevance',
        facets: JSON.stringify(facets),
    });

    const response = await fetch(`https://api.modrinth.com/v2/search?${params.toString()}`, {
        headers: {
            'User-Agent': 'ZyneonDesktop/Z1'
        }
    });

    if (!response.ok) {
        throw new Error(`Modrinth request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
});

ipcMain.handle('auth:login-microsoft', async () => {
    return await authService.loginMicrosoft();
});

ipcMain.handle('auth:login-offline', async (_event, username) => {
    return await authService.loginOffline(username);
});

ipcMain.handle('auth:logout', async () => {
    authService.logout();
    return { ok: true };
});

ipcMain.handle('auth:get-user', async () => {
    return authService.getUser();
});

ipcMain.handle('auth:is-logged-in', async () => {
    return authService.isLoggedIn();
});


ipcMain.on('update-titlebar-color', (event, config) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && process.platform === 'win32') {
        win.setTitleBarOverlay({
            color: config.color || '#00000000',
            symbolColor: config.symbolColor || '#ffffff',
            height: 39
        });
        if(config.symbolColor === '#ffffff') {
            win.setBackgroundMaterial("mica");
        } else {
            win.setBackgroundMaterial("acrylic");
        }
    }
});