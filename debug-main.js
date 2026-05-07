// Debug Electron runtime
console.log('=== Electron Debug ===');
console.log('process.type:', process.type);
console.log('process.versions.electron:', process.versions?.electron);
console.log('ELECTRON_RUN_AS_NODE:', process.env.ELECTRON_RUN_AS_NODE);

// Try to detect if we're in Electron
if (process.versions?.electron) {
  console.log('Electron detected in versions!');
  // In Electron, the 'electron' module should be available
  try {
    // Try clearing require cache
    delete require.cache[require.resolve('electron')];
  } catch (e) {
    console.log('Cannot clear cache:', e.message);
  }
  
  // Check Module._pathList
  console.log('Module.paths:', module.paths);
}

console.log('=== End Debug ===');

// Now try to require electron
try {
  const electron = require('electron');
  console.log('SUCCESS: electron loaded:', typeof electron);
  if (electron.app) {
    console.log('app available!');
    electron.app.whenReady().then(() => {
      console.log('App ready!');
      const win = new electron.BrowserWindow({ width: 400, height: 300 });
      win.loadURL('data:text/html,<h1>Test</h1>');
    });
  }
} catch (e) {
  console.log('FAILED:', e.message);
}