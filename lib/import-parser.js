'use strict';

const ES6_IMPORT_NAME           = 'es6';
const SCSS_IMPORT_NAME          = 'scss';
const COMMONJS_REQUIRE_NAME     = 'commonjs';
const ALL_JS_NAME               = 'js';
const ES6_IMPORT_REGEXP         = /([^\S]|^)import\s(.+?);/g;
const SCSS_IMPORT_REGEXP        = /([^\S]|^)@import\s(.+?);/g;
const COMMONJS_REQUIRE_REGEXP   = /([^\S]|^|=|\(|,)require\s*\((.+?)\)/g;
const ALL_JS_REGEXP             = /(([^\S]|^)import\s|([^\S]|^|=|\(|,)require\s*\()(.+?)[\);]/g;
const QUOTE_REGEXP              = /["'](.+?)["']/g;
const COMMENTS_REGEXP           = /\/\*.+?\*\/|\/\/.*(?=[\n\r])/g;

/**
 * ImportParser
 */
class ImportParser {
    /**
     * @param {String|RegExp} dependencyPattern
     */
    init (dependencyPattern) {
        this.dependencyPattern = dependencyPattern || ALL_JS_NAME;
    }

    /**
     * @name ImportParser.parse
     * @param {String|*} content - the content of the current file to parse
     * @returns {Array} For each match of the regular expression, we add a string of it to the returned array
     */
    parse(content) {
        let syntaxRegExp = this.syntaxRegExp,
            syntaxMatch = {},
            innerQuoteMatch = {},
            results = [],
            lastCaptureGroupIndex;

        content = String(content).replace(COMMENTS_REGEXP, ''); // remove comments

        // depth in until content is depleted
        while ((syntaxMatch = syntaxRegExp.exec(content)) !== null) {
            lastCaptureGroupIndex = syntaxMatch.length - 1;
            while ((innerQuoteMatch = QUOTE_REGEXP.exec(syntaxMatch[lastCaptureGroupIndex])) !== null) {
                results.push(innerQuoteMatch[1]);
            }
        }
        return results;
    }

    /**
     * @name ImportParser.syntaxRegExp
     * @returns {RegExp}
     */
    get syntaxRegExp () {
        let returnedSyntaxRegExp = ALL_JS_REGEXP;
        if (typeof this.dependencyPattern === 'string') {
            switch (this.dependencyPattern) {
                case ES6_IMPORT_NAME:
                    returnedSyntaxRegExp = ES6_IMPORT_REGEXP;
                    break;
                case SCSS_IMPORT_NAME:
                    returnedSyntaxRegExp = SCSS_IMPORT_REGEXP;
                    break;
                case COMMONJS_REQUIRE_NAME:
                    returnedSyntaxRegExp = COMMONJS_REQUIRE_REGEXP;
                    break;
            }
        } else if (this.dependencyPattern instanceof RegExp) {
            returnedSyntaxRegExp = this.dependencyPattern;
        }
        return returnedSyntaxRegExp;
    }
}

module.exports = ImportParser;