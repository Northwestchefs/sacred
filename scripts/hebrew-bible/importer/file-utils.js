const fs = require('node:fs');
const path = require('node:path');

function exists(filePath) {
  return fs.existsSync(filePath);
}

function listFiles(dirPath) {
  if (!exists(dirPath)) return [];

  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(dirPath, entry.name));
}

function readUtf8(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function readJsonIfExists(filePath) {
  if (!exists(filePath)) return null;

  const text = readUtf8(filePath);
  return JSON.parse(text);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeUtf8(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

module.exports = {
  ensureDir,
  exists,
  listFiles,
  readJsonIfExists,
  readUtf8,
  writeUtf8,
};
