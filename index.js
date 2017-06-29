const fs = require('fs');
const path = require('path');
const Graph = require('./lib/graph');
const ImportParser = require('./lib/import-parser');

/**
 * class ImportGraph
 */
class ImportGraph {
    /**
     * Will create a graph for a file or a directory
     * @name ImportGraph.createGraph
     * @param {String} entryPath
     * @param {Object} [options]
     * @returns {Promise<Graph, string>}
     */
    createGraph(entryPath, options) {
        let graph = null,
            lstatForEntryPath = fs.lstatSync(entryPath),
            isDir = lstatForEntryPath.isDirectory();
        if (!isDir && !lstatForEntryPath.isFile()) {
            return Promise.reject("Entry path must be a file or a directory");
        } else {
            entryPath = path.resolve(entryPath);
            options = processOptions(options);
            let importParser = new ImportParser();
            graph = new Graph(importParser, options);
            return graph.init(entryPath, isDir);
        }
    }
}

/**
 * @param {Object} options
 */
function processOptions(options) {
    return Object.assign({
        extensions: ['js'],
        extensionPrefixes: [],
        dependencyPattern: 'js',
        loadPaths: [process.cwd()]
    }, options);
}

let importGraphInstance = new ImportGraph();
module.exports = importGraphInstance;
