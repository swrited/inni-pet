// Test if electron module is available
console.log('process.type:', process.type);
console.log('process.versions:', process.versions);
console.log('Testing require electron...');
try {
  const electron = require('electron');
  console.log('electron module:', electron);
  console.log('electron.app:', electron.app);
} catch (e) {
  console.log('Error:', e.message);
  // Try alternative
  console.log('Trying global electron...');
  console.log('global.electron:', global.electron);
}