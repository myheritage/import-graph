'use strict';

let _               = require('lodash'),
    fs              = require('fs'),
    path            = require('path'),
    glob            = require('glob');

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
     *
     * @param {String} [dir]
     */
    constructor(importParser, options, dir) {
        options = options || {};
        this.importParser = importParser;
        this.dir = dir;
        this.loadPaths = options.loadPaths || [];
        this.extensions = options.extensions || [];
        this.extensionPrefixes = options.extensionPrefixes || [];
        this.dependencyPattern = options.dependencyPattern || '';
        this.index = {}; // will store the graph object
    }

    /**
     * init the Graph to fill its index object
     */
    init() {
        if (this.dir) {
            let filePatterns = this.dir + '/**/*@(' + this.extensionPrefixes.join('|') + ').@(' + this.extensions.join('|') + ')';
            _.each(glob.sync(filePatterns, {dot: true}), (file) => {
                this.addFile(path.resolve(file));
            });
        }
    }

    /**
     * Recursive action to fill the index object,
     * Can call this function directly to create graph much faster for a specific file - this method will only cover its children and will not get its parent
     * @param {String} filePath
     * @param {String} [parent]
     */
    addFile(filePath, parent) {
        this.index[filePath] = this.index[filePath] || {
                imports: [],
                importedBy: [],
                stats: fs.statSync(filePath)
            };

        this.index[filePath].modified = this.index[filePath].modified || this.index[filePath].stats.mtime;
        if (!this.index[filePath].stats.isFile()) {
            // some folders might match our regexes
            return;
        }

        this.importParser.init(this.dependencyPattern);

        let resolvedParent,
            imports = this.importParser.parse(fs.readFileSync(filePath, 'utf-8')),
            cwd = path.dirname(filePath),
            loadPaths, resolved;
        for (let i = 0, l = imports.length; i < l; i++) {
            loadPaths = _([cwd, this.dir]).concat(this.loadPaths).filter().uniq().value();
            resolved = resolveFilePath(imports[i], loadPaths, this.extensions, filePath);
            if (!resolved)
                continue;
            // recursively into dependencies if not already enumerated
            if (!_.includes(this.index[filePath].imports, resolved)) {
                this.index[filePath].imports.push(resolved);
                this.addFile(fs.realpathSync(resolved), filePath);
            }
        }

        // add link back to parent
        if (parent) {
            resolvedParent = _(parent).intersection(this.loadPaths).value();

            if (resolvedParent) {
                resolvedParent = parent.substr(parent.indexOf(resolvedParent));
            } else {
                resolvedParent = parent;
            }

            this.index[filePath].importedBy.push(resolvedParent);
        }
    }

    /**
     * Function used by visitAncestors and visitDescendants to travel the graph
     * @param {String} filePath
     * @param {Function} callback
     * @param {Function} edgeCallback
     * @param {Array} visitedPaths
     */
    visit(filePath, callback, edgeCallback, visitedPaths) {
        filePath = fs.realpathSync(filePath);
        visitedPaths = visitedPaths || [];
        if (!this.index.hasOwnProperty(filePath)) {
            edgeCallback('Graph doesn\'t contain ' + filePath, null);
        }
        let edges = edgeCallback(null, this.index[filePath]);

        for (let i = 0, length = edges.length; i < length; i++) {
            if (!_.includes(visitedPaths, edges[i])) {
                visitedPaths.push(edges[i]);
                callback(edges[i], this.index[edges[i]]);
                this.visit(edges[i], callback, edgeCallback, visitedPaths);
            }
        }
    }

    /**
     * visits all files that are ancestors of the provided file
     * @param {String} filePath
     * @param {Function} callback
     */
    visitAncestors(filePath, callback) {
        this.visit(filePath, callback, (err, node) => {
            if (err || !node)
                return [];
            return node.importedBy;
        }, []);
    }

    /**
     * visits all files that are descendants of the provided file
     * @param {String} filePath
     * @param {Function} callback
     */
    visitDescendants(filePath, callback) {
        this.visit(filePath, callback, (err, node) => {
            if (err || !node)
                return [];
            return node.imports;
        }, []);
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
        filePathName = filePath.replace(re, ''),
        extLength = extensions.length,
        resolvedFilePath,
        partialPath;
    for (let i = 0, l = loadPaths.length; i < l; i++) {
        for (let j = 0; j < extLength; j++) {
            resolvedFilePath = path.normalize(loadPaths[i] + '/' + filePathName + '.' + extensions[j]);
            if (fs.existsSync(resolvedFilePath)) {
                return resolvedFilePath;
            }
        }

        // special case for _partials
        for (let j = 0; j < extLength; j++) {
            resolvedFilePath = path.normalize(loadPaths[i] + '/' + filePathName + '.' + extensions[j]);
            partialPath = path.join(path.dirname(resolvedFilePath), '_' + path.basename(resolvedFilePath));
            if (fs.existsSync(partialPath)) {
                return partialPath;
            }
        }
    }

    return false; // File to import not found or unreadable
}

module.exports = Graph;
