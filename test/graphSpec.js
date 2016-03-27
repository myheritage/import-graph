'use strict';

let path            = require('path'),
    chai            = require('chai'),
    expect          = chai.expect,
    Graph           = require('../lib/graph'),
    ImportParserMock= require('./mocks/import-parserMock'),
    pathToMockFiles = path.join(process.cwd(),'test','mocks','graph'),
    graph,
    importParserMock,
    testFilesPaths = {
        1: path.join(pathToMockFiles,'1.txt'),
        2: path.join(pathToMockFiles,'2.fix.txt1'),
        3: path.join(pathToMockFiles,'3.fix.txt1'),
        4: path.join(pathToMockFiles,'dir1','4.txt'),
        5: path.join(pathToMockFiles,'dir1','5.fix.txt1'),
        6: path.join(pathToMockFiles,'dir2','6.txt'),
        7: path.join(pathToMockFiles,'dir2','7.txt'),
        8: path.join(pathToMockFiles,'8.txt'),
        9: path.join(pathToMockFiles,'dir1','dir3','9.txt')
    };

describe('graph', () => {
    beforeEach(() => {
        importParserMock = new ImportParserMock();
        graph = new Graph(importParserMock, {
            loadPaths: [pathToMockFiles],
            extensions: ['txt'],
            extensionPrefixes: [],
            dependencyPattern: 'js'
        }, pathToMockFiles)
    });
    describe('init method', () => {
        it('should create graph for "txt" files', () => {
            graph.init();
            expect(graph.index[testFilesPaths[1]].importedBy).to.deep.equal([]);
            expect(graph.index[testFilesPaths[1]].imports).to.deep.equal([testFilesPaths[4]]);
            expect(graph.index[testFilesPaths[4]].importedBy).to.deep.equal([testFilesPaths[1]]);
            expect(graph.index[testFilesPaths[4]].imports).to.deep.equal([testFilesPaths[6]]);
            expect(graph.index[testFilesPaths[7]].imports).to.deep.equal([testFilesPaths[8], testFilesPaths[9]]);
        });

        it('should create graph for "txt" and "txt1" files', () => {
            graph.extensions.push('txt1');
            graph.init();
            expect(graph.index[testFilesPaths[1]].importedBy).to.deep.equal([]);
            expect(graph.index[testFilesPaths[1]].imports).to.deep.equal([testFilesPaths[4],testFilesPaths[2]]);
            expect(graph.index[testFilesPaths[2]].importedBy).to.deep.equal([testFilesPaths[1]]);
            expect(graph.index[testFilesPaths[2]].imports).to.deep.equal([testFilesPaths[3]]);
            expect(graph.index[testFilesPaths[3]].importedBy).to.deep.equal([testFilesPaths[2]]);
            expect(graph.index[testFilesPaths[3]].imports).to.deep.equal([testFilesPaths[5]]);
        });

        it('should create graph for files with a prefix', () => {
            graph.extensions.push('txt1');
            graph.extensionPrefixes.push('fix');
            graph.init();
            expect(graph.index[testFilesPaths[1]]).to.be.undefined;
            expect(graph.index[testFilesPaths[2]].importedBy).to.deep.equal([]);
            expect(graph.index[testFilesPaths[2]].imports).to.deep.equal([testFilesPaths[3]]);
            expect(graph.index[testFilesPaths[3]].importedBy).to.deep.equal([testFilesPaths[2]]);
            expect(graph.index[testFilesPaths[3]].imports).to.deep.equal([testFilesPaths[5]]);
        });
    });

    describe('addFile method', () => {
        it('should create graph for "txt" files on this file', () => {
            graph.addFile(testFilesPaths[1]);
            expect(graph.index[testFilesPaths[1]].importedBy).to.deep.equal([]);
            expect(graph.index[testFilesPaths[1]].imports).to.deep.equal([testFilesPaths[4]]);
            expect(graph.index[testFilesPaths[4]].importedBy).to.deep.equal([testFilesPaths[1]]);
            expect(graph.index[testFilesPaths[4]].imports).to.deep.equal([testFilesPaths[6]]);
            expect(graph.index[testFilesPaths[7]]).to.be.undefined;
            expect(graph.index[testFilesPaths[8]]).to.be.undefined;
            expect(graph.index[testFilesPaths[9]]).to.be.undefined;
        });

        it('should create graph on a file with parent and child', () => {
            graph.addFile(testFilesPaths[4]);
            expect(graph.index[testFilesPaths[1]]).to.be.undefined;
            expect(graph.index[testFilesPaths[4]].imports).to.deep.equal([testFilesPaths[6]]);
            expect(graph.index[testFilesPaths[4]].importedBy).to.deep.equal([]);
            expect(graph.index[testFilesPaths[6]].imports).to.deep.equal([]);
            expect(graph.index[testFilesPaths[6]].importedBy).to.deep.equal([testFilesPaths[4]]);
        });
    });

    describe('visitAncestors method', () => {
        it('should not visit any ancestors for a parentless node', () => {
            graph.addFile(testFilesPaths[1]);
            let notInside = true;
            graph.visitAncestors(testFilesPaths[1], (node) => {
                notInside = false;
            });
            expect(notInside).to.be.true;
        });

        it('should not visit all ancestors of a node', () => {
            graph.addFile(testFilesPaths[1]);
            let ancestors = [];
            graph.visitAncestors(testFilesPaths[6], (node) => {
                ancestors.push(node);
            });
            expect(ancestors).to.deep.equal([testFilesPaths[4],testFilesPaths[1]]);
        });
    });

    describe('visitDescendants method', () => {
        it('should not visit any descendants for a childrenless node', () => {
            graph.addFile(testFilesPaths[1]);
            let notInside = true;
            graph.visitDescendants(testFilesPaths[6], (node) => {
                notInside = false;
            });
            expect(notInside).to.be.true;
        });

        it('should not visit all descendants of a node', () => {
            graph.addFile(testFilesPaths[1]);
            let descendants = [];
            graph.visitDescendants(testFilesPaths[1], (node) => {
                descendants.push(node);
            });
            expect(descendants).to.deep.equal([testFilesPaths[4],testFilesPaths[6]]);
        });
    });
});