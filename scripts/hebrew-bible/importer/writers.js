const path = require('node:path');

const { ensureDir, writeUtf8 } = require('./file-utils');

function writeJson(filePath, data) {
  const serialized = `${JSON.stringify(data, null, 2)}\n`;
  writeUtf8(filePath, serialized);
}

function writeImportReport(processedDir, report) {
  ensureDir(processedDir);
  const reportPath = path.join(processedDir, 'import-report.scaffold.json');
  writeJson(reportPath, report);
  return reportPath;
}

module.exports = {
  writeImportReport,
  writeJson,
};
