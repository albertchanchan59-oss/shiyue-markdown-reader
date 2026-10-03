const { contextBridge, ipcRenderer } = require('electron');
const actions = new Set(['ready', 'open', 'save', 'hash', 'print']);
contextBridge.exposeInMainWorld('shiyueDesktop', {
  request(message) {
    if (!message || !actions.has(message.action)) return Promise.reject(new Error('不支持的桌面操作。'));
    return ipcRenderer.invoke('shiyue:request', message);
  },
  onFiles(callback) {
    const listener = (_event, files) => callback(files);
    ipcRenderer.on('shiyue:files', listener);
    return () => ipcRenderer.removeListener('shiyue:files', listener);
  },
  onCommand(callback) {
    const listener = (_event, command) => callback(command);
    ipcRenderer.on('shiyue:command', listener);
    return () => ipcRenderer.removeListener('shiyue:command', listener);
  },
});
