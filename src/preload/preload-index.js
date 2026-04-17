const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    updateTitleBar: (config) => ipcRenderer.send('update-titlebar-color', config),
    modrinthSearchProjects: (payload) => ipcRenderer.invoke('modrinth-search-projects', payload),
    windowControl: (action) => ipcRenderer.send('window-control', action),

    launcherBuildProfile: (payload) => ipcRenderer.invoke('launcher:build-profile', payload),
    launcherStart: (payload) => ipcRenderer.invoke('launcher:start', payload),
    launcherStop: () => ipcRenderer.invoke('launcher:stop'),
    onLauncherEvent: (callback) => {
        const listener = (_event, payload) => callback(payload);
        ipcRenderer.on('launcher:event', listener);
        return () => ipcRenderer.removeListener('launcher:event', listener);
    },

    authLoginMicrosoft: () => ipcRenderer.invoke('auth:login-microsoft'),
    authLoginOffline: (username) => ipcRenderer.invoke('auth:login-offline', username),
    authLogout: () => ipcRenderer.invoke('auth:logout'),
    authGetUser: () => ipcRenderer.invoke('auth:get-user'),
    authIsLoggedIn: () => ipcRenderer.invoke('auth:is-logged-in'),
    onAuthStateChanged: (callback) => {
        const listener = (_event, status) => callback(status);
        ipcRenderer.on('auth:state-changed', listener);
        return () => ipcRenderer.removeListener('auth:state-changed', listener);
    }
});