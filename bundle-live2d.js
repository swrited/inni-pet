// Bundle pixi-live2d-display for browser
const fs = require('fs');
const path = require('path');

// Read the pixi-live2d-display package
const indexJs = fs.readFileSync(path.join(__dirname, 'node_modules/pixi-live2d-display/dist/index.min.js'), 'utf8');
const cubism4Js = fs.readFileSync(path.join(__dirname, 'node_modules/pixi-live2d-display/dist/cubism4.min.js'), 'utf8');

console.log('Files loaded, creating bundle...');
