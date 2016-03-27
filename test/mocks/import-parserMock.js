'use strict';
let path = require('path');

class ImportParserMock {
    init(){}
    // literal files content will be the return value
    // should be an array with relative paths to other files
    parse (fileContent) {
        return (fileContent) ? JSON.parse(fileContent) : [];
    }
}

module.exports = ImportParserMock;