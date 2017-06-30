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
        options = processOptions(options);
        let importParser = new ImportParser();
        let graph = new Graph(importParser, options);
        return graph.init(entryPath);
    }
}

/**
 * @param {Object} options
 */
function processOptions(options) {
    return Object.assign({
        extensions: ['js'],
        dependencyPattern: 'js',
        loadPaths: [process.cwd()]
    }, options);
}

let importGraphInstance = new ImportGraph();
module.exports = importGraphInstance;
