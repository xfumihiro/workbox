const glob = require('glob');
const path = require('path');
const fs = require('fs-extra');
const oneLine = require('common-tags').oneLine;
const PluginInterface = require('pr-bot').PluginInterface;
const gzipSize = require('gzip-size');
const bytes = require('bytes');

const constants = require('../../gulp-tasks/utils/constants');

// 10 KB max size
const MAX_SIZE = 15 * 1000;

class AggregateSizePlugin extends PluginInterface {
  constructor() {
    super(`Workbox Aggregate Size Plugin`);
  }

  run({beforePath, afterPath} = {}) {
    const packagesToAggregate = [
      `workbox-loading`,
      `workbox-core`,
      `workbox-precaching`,
      `workbox-routing`,
      `workbox-strategies`,
      `workbox-cacheable-response`,
      `workbox-cache-expiration`,
    ];
    const globPattern = path.posix.join(
      afterPath, 'packages', `{${packagesToAggregate.join(',')}}`,
      constants.PACKAGE_BUILD_DIRNAME, 'browser', '*.prod.js',
    );
    const files = glob.sync(globPattern);
    let totalSize = 0;
    let totalGzipSize = 0;
    files.forEach((filePath) => {
      const fileContents = fs.readFileSync(filePath);
      const stat = fs.statSync(filePath);
      totalSize += stat.size;
      totalGzipSize += gzipSize.sync(fileContents);
    });

    const percentValue = (totalSize / MAX_SIZE) * 100;
    const percentString = parseFloat(percentValue).toFixed(0);

    let totalSizeString = bytes(totalSize);
    let totalGzipString = bytes(totalGzipSize);

    let markdownWarning = ``;
    if (percentValue >= 90) {
      const markdownMoji = percentValue >= 95 ? '☠️' : '⚠️';
      markdownWarning = oneLine`
      <h3 align="center">${markdownMoji} WARNING ${markdownMoji}</h3>
      <p align="center">
        We are using <strong>${percentValue}%</strong> of our max size budget.
      </p>
      `;
    }

    const failPR = totalSize >= MAX_SIZE;

    const markdownLog = `${markdownWarning}\n\n`+
      `**Total Size:**                   ${totalSizeString}\n` +
      `**Percentage of Size Used:**      ${percentString}%\n\n` +
      `**Gzipped:**                      ${totalGzipString}`;
    const prettyLog =
      `Total Size:                   ${totalSizeString}\n` +
      `**Percentage of Size Used:**  ${percentString}%\n\n` +
      `Gzipped:                      ${totalGzipString}`;
    return Promise.resolve({
      prettyLog,
      markdownLog,
      failPR,
    });
  }
}

module.exports = AggregateSizePlugin;
