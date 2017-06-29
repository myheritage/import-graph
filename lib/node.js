const fs = require('fs');

module.exports = class Node {
    /**
     * @param {string} filePath
     */
    constructor(filePath) {
        this.parents = new Set();
        this.children = new Set();
        this.filePath = filePath;
    }

    /**
     * @returns {Promise}
     */
    get stats() {
        return this.statsPromise || (this.statsPromise = new Promise((resolve, reject) => fs.stat(this.filePath, (error, stats) => error ? reject(error) : resolve(stats))));
    }

    verifyIsFile() {
        return this.isFilePromise || (this.isFilePromise = this.stats.then(stats => stats.isFile() ? Promise.resolve() : Promise.reject()))
    }
}