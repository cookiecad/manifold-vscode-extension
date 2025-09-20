// Node.js script to generate assets-manifest.json for the extension build
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'media', 'assets');
const mediaDir = path.join(__dirname, '..', 'media');

function findFile(dir, prefix, ext) {
  const files = fs.readdirSync(dir);
  return files.find(f => f.startsWith(prefix) && f.endsWith(ext));
}

function main() {
  const worker = findFile(assetsDir, 'worker-wrapper', '.js');
  const wasm = findFile(assetsDir, 'manifold', '.wasm');
  const mainJs = findFile(mediaDir, 'main', '.js');
  const mainCss = findFile(assetsDir, 'index', '.css');
  const playIcon = findFile(mediaDir, 'play', '.png');
  const pauseIcon = findFile(mediaDir, 'pause', '.png');
  if (!worker || !wasm || !mainJs || !mainCss || !playIcon || !pauseIcon) {
    throw new Error('Missing one or more required asset files.');
  }
  const manifest = {
    worker,
    wasm,
    mainJs,
    mainCss,
    playIcon,
    pauseIcon
  };
  const manifestPath = path.join(assetsDir, 'assets-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('Generated assets-manifest.json:', manifest);
}

if (require.main === module) {
  main();
}
