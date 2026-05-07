const electron = require('electron');
console.log('electron:', electron);
console.log('typeof electron:', typeof electron);
console.log('app:', electron?.app);
console.log('BrowserWindow:', electron?.BrowserWindow);
console.log('ipcMain:', electron?.ipcMain);