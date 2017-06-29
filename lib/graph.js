const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const glob = require('glob');
const Node = require('./node');

/**
 * Class Graph
 */
class Graph {

    /**
     * @param {ImportParser} importParser
     *
     * @param {Object} [options]
     *      The Options object:
     *          loadPaths: {Array} - The work-area to resolve file paths from, default: [process.cwd()]
     *          extensions: {Array} - File extensions to create the graph with, default: ['js']
     *          extensionPrefixes: {Array} - Prefix to the file extension to create the graph with, like 'es6' to get only '*es6.js' files, default: []
     *          dependencyPattern: {String|RegExp} - Decides the syntax to create the grape with, default: 'js'
     */
    constructor(importParser, options) {
        options = options || {};
        this.importParser = importParser;
        this.loadPaths = options.loadPaths || [];
        this.extensions = options.extensions || [];
        this.extensionPrefixes = options.extensionPrefixes || [];
        this.dependencyPattern = options.dependencyPattern || '';
        this.graph = new Map(); // file path to Node object
        this.filesToProcess = 0; // remaining files to process. Each file being open increases this, and once it goes back to 0 -  we finishes
    }

    /**
     * init the Graph to fill its index object
     */
    init(entryPath, isDir) {
        if (isDir) {
            this.loadPaths.push(entryPath);
        }
        let filePatterns = isDir ? entryPath + '/**/*@(' + this.extensionPrefixes.join('|') + ').@(' + this.extensions.join('|') + ')' : entryPath;
        return new Promise((resolve, reject) => {
            this.graphReady = resolve;
            this.graphError = reject;
            _.each(glob.sync(filePatterns, {dot: true}), (file) => {
                this.filesToProcess++;                
                this.addFile(path.resolve(file));
            });
        });
    }

    addFile(filePath, parentPath = null) {
        let fileInfo = this.getFileInfo(filePath);
        fileInfo.verifyIsFile()
            .then(() => !fileInfo.processed && this.readFile(filePath, fileInfo))
            .then(fileContent => fileContent && this.processChildren(filePath, fileInfo, fileContent))
            .then(() => parentPath && this.addParent(fileInfo, parentPath))
            .then(() => --this.filesToProcess || this.graphReady(this))
            .catch(e => e && this.error(e));
    }

    getFileInfo(filePath) {
        let info = this.graph.get(filePath);
        if (!info) {
            info = new Node(filePath);
            this.graph.set(filePath, info);
        }
        return info;
    }

    readFile(filePath, fileInfo) {
        fileInfo.processed = true;
        return new Promise((resolve, reject) => fs.readFile(filePath, 'utf-8', (error, data) => error ? reject(error) : resolve(data)));
    }

    processChildren(filePath, fileInfo, fileContent) {
        const imports = this.importParser.parse(fileContent);
        const fileDir = path.dirname(filePath);
        // TODO make this more beautiful
        const loadPaths = _([fileDir]).concat(this.loadPaths).filter().uniq().value();
        this.filesToProcess += imports.length;
        for (let i = 0; i < imports.length; i++) {
            resolveFilePath(imports[i], loadPaths, this.extensions, filePath)
                .then(childPath => {
                    if (!fileInfo.children.has(childPath)) {
                        fileInfo.children.add(childPath);
                        return new Promise((resolve, reject) => fs.realpath(childPath, (error, realChildPath) => error ? reject(error) : resolve(realChildPath)));
                    }
                })
                .then(realChildPath => realChildPath && this.addFile(realChildPath, filePath))
                .catch(error => this.filesToProcess--);
        }
    }

    addParent(fileInfo, parentPath) {
        // TODO check what the hell is this doing
        let resolvedParent = _(parentPath).intersection(this.loadPaths).value();

        if (resolvedParent) {
            resolvedParent = parentPath.substr(parentPath.indexOf(resolvedParent));
        } else {
            resolvedParent = parentPath;
        }

        fileInfo.parents.add(resolvedParent);
    }

    error(message) {
        this.graphError("Failed creating the Graph: " + message);
    }

    /**
     * Function used by visitAncestors and visitDescendants to travel the graph
     * @param {String} filePath
     * @param {Function} callback
     * @param {Function} edgeCallback
     * @param {Set} visitedPaths
     * @returns {Promise}
     */
    visit(filePath, callback, edgeCallback, visitedPaths = new Set()) {
        return new Promise((resolve, reject) => {
            fs.realpath(filePath, (error, realPath) => {
                if (error) {
                    this.error(error);
                    return reject(error);
                }

                let fileInfo = this.getFileInfo(filePath);
                if (!fileInfo.processed) {
                    error = `Graph doesn't contain ${filePath}`;
                    this.error(error);
                    return reject(error);
                }

                let promises = [];
                let edges = edgeCallback(fileInfo);
                edges.forEach(nodePath => {
                    if (!visitedPaths.has(nodePath)) {
                        visitedPaths.add(nodePath);
                        callback(nodePath);
                        promises.push(this.visit(nodePath, callback, edgeCallback, visitedPaths));
                    }
                });
                Promise.all(promises).then(resolve).catch(reject);
            });
        });
    }

    /**
     * visits all files that are ancestors of the provided file
     * @param {String} filePath
     * @param {Function} callback
     * @returns {Promise}
     */
    visitAncestors(filePath, callback) {
        return this.visit(filePath, callback, node => node.parents);
    }

    /**
     * visits all files that are descendants of the provided file
     * @param {String} filePath
     * @param {Function} callback
     * @returns {Promise}
     */
    visitDescendants(filePath, callback) {
        return this.visit(filePath, callback, node => node.children);
    }
}

/**
 * Resolve file to a path
 * @param {String} filePath
 * @param {Array} loadPaths
 * @param {Array} extensions
 * @param {String} parentFilePath
 * @returns {String|boolean}
 */
function resolveFilePath(filePath, loadPaths, extensions, parentFilePath) {
    return new Promise((resolve, reject) => {
        let filesToWaitFor = 0;
        // Check if extension of the file is already a supported extension, no need to guess then
        var fileExtension = path.extname(filePath).replace('.', '');
        if (_.includes(extensions, fileExtension)) {
            extensions = [fileExtension]
        } else if (parentFilePath) {
            var preferredExtension = path.extname(parentFilePath).replace('.', '');
            var preferredExtensionIndex = _.indexOf(extensions, preferredExtension);
            // move preferredExtension to be first
            if (preferredExtensionIndex > 0) {
                extensions = [].concat(extensions);
                extensions.splice(preferredExtensionIndex, 1);
                extensions.unshift(preferredExtension);
            }
        }

        // trim file extension
        let re = new RegExp('(\.(' + extensions.join('|') + '))$', 'i'),
            filePathName = filePath.replace(re, '');
        for (let i = 0, l = loadPaths.length; i < l; i++) {
            for (let j = 0; j < extensions.length; j++) {
                let resolvedFilePath = path.normalize(loadPaths[i] + '/' + filePathName + '.' + extensions[j]);
                let partialPath = path.join(path.dirname(resolvedFilePath), '_' + path.basename(resolvedFilePath));
                filesToWaitFor += 2;
                fs.exists(resolvedFilePath, (exists) => exists ? resolve(resolvedFilePath) : reduceFile());
                fs.exists(partialPath, (exists) => exists ? resolve(partialPath) : reduceFile());
            }
        }

        function reduceFile() {
            filesToWaitFor--;
            if (filesToWaitFor === 0) {
                reject(`Child ${filePath} of file ${parentFilePath} was not found.`);
            }
        }
    });    
}

module.exports = Graph;
