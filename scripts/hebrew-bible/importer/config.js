const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '../../..');

const PATHS = {
  repoRoot: REPO_ROOT,
  rawDir: path.join(REPO_ROOT, 'reference', 'hebrew-bible', 'raw'),
  processedDir: path.join(REPO_ROOT, 'reference', 'hebrew-bible', 'processed'),
  manifestPath: path.join(REPO_ROOT, 'reference', 'hebrew-bible', 'source-manifest.json'),
};

const SUPPORTED_FILE_EXTENSIONS = Object.freeze(['.json', '.xml', '.txt']);

const FORMAT_ADAPTERS = Object.freeze({
  '.json': 'json-adapter (placeholder)',
  '.xml': 'xml-adapter (placeholder)',
  '.txt': 'txt-adapter (placeholder)',
});

module.exports = {
  PATHS,
  SUPPORTED_FILE_EXTENSIONS,
  FORMAT_ADAPTERS,
};
