'use strict';

let fs = require('fs'),
    path = require('path'),
    Graph = require('./lib/graph'),
    ImportParser = require('./lib/import-parser');

/**
 * class ImportGraph
 */
class ImportGraph {
    /**
     * Will create a graph for a file or a directory
     * @name ImportGraph.createGraph
     * @param {String} entryPath
     * @param {Object} [options]
     * @returns {Graph | null}
     */
    createGraph(entryPath, options) {
        let graph = null,
            lstatForEntryPath = fs.lstatSync(entryPath),
            isFile = (lstatForEntryPath.isFile());
        if (isFile || lstatForEntryPath.isDirectory()) {
            entryPath = path.resolve(entryPath);
            options = processOptions(options);
            let importParser = new ImportParser();
            if (isFile) {
                graph = new Graph(importParser, options);
                graph.addFile(entryPath);
            } else {
                graph = new Graph(importParser, options, entryPath);
                graph.init();
            }

        }
        return graph;
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
