const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  speak: (text) => ipcRenderer.send('speak', text),
  listen: () => ipcRenderer.send('listen'),
  setEmotion: (emotion) => ipcRenderer.send('setEmotion', emotion),
  hide: () => ipcRenderer.send('hide-window'),
  startDrag: () => ipcRenderer.send('start-drag'),
  stopDrag: () => ipcRenderer.send('stop-drag'),
  onSpeak: (callback) => ipcRenderer.on('speak', (event, text) => callback(text)),
  onListen: (callback) => ipcRenderer.on('listen', () => callback()),
  onSetEmotion: (callback) => ipcRenderer.on('setEmotion', (event, emotion) => callback(emotion)),
  onCursorPosition: (callback) => {
    const listener = (event, payload) => callback(payload);
    ipcRenderer.on('cursor-position', listener);
    return () => ipcRenderer.removeListener('cursor-position', listener);
  },
  onPetClick: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('pet-click', listener);
    return () => ipcRenderer.removeListener('pet-click', listener);
  }
});
