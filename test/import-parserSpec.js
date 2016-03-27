'use strict';

let chai            = require('chai'),
    expect          = chai.expect,
    ImportParser    = require('../lib/import-parser'),
    importParser,
    contentMock     =   "import test 'test1';\n" +
                        "import \"test2\";\n" +
                        "_import 'test3';\n" +
                        "funcimport 'test4';\n" +
                        " import 'test5';\n" +
                        "@import 'test6';\n" +
                        " @import \"test7\";\n" +
                        "asd@import \"test8\";\n" +
                        "var a = require('test9');\n" +
                        "var a =require(\"test10\")\n" +
                        "require(\"test11\")\n" +
                        "  require  (\"test12\")\n" +
                        "(require(\"test13\"))\n" +
                        "_require(\"test14\")\n" +
                        "funcrequire(\"test15\")\n" +
                        "customregexp'test16'\n" +
                        "//import test 'test17';";

describe('import-parser', () => {
    beforeEach(() => {
        importParser = new ImportParser();
    });

    describe('parse method', () => {
        it('should handle bad input files', () => {
            let result = importParser.parse();
            expect(result).to.deep.equal([]);
        });

        it('should get strings for dependencies for all js syntax', () => {
            expect(importParser.parse(contentMock)).to.deep.equal(['test1','test2','test5','test9','test10','test11','test12','test13']);
        });

        it('should get strings for dependencies for es6 import syntax', () => {
            importParser.init('es6');
            expect(importParser.parse(contentMock)).to.deep.equal(['test1','test2','test5']);
        });

        it('should get strings for dependencies for scss import syntax', () => {
            importParser.init('scss');
            expect(importParser.parse(contentMock)).to.deep.equal(['test6','test7']);
        });

        it('should get strings for dependencies for commonjs require syntax', () => {
            importParser.init('commonjs');
            expect(importParser.parse(contentMock)).to.deep.equal(['test9','test10','test11','test12','test13']);
        });

        it('should get strings for dependencies custom regexp', () => {
            importParser.init(/customregexp(.*)/g);
            expect(importParser.parse(contentMock)).to.deep.equal(['test16']);
        });
    });

    describe('syntaxRegExp method', () => {
        it('should return the correct regexp for syntax all js syntax', () => {
            expectToMatchRegex(null, /(([^\S]|^)import\s|([^\S]|^|=|\(|,)require\s*\()(.+?)[\);]/g);
            expectToMatchRegex('js', /(([^\S]|^)import\s|([^\S]|^|=|\(|,)require\s*\()(.+?)[\);]/g);
        });

        it('should return the correct regexp for syntax es6 import syntax', () => {
            expectToMatchRegex('es6', /([^\S]|^)import\s(.+?);/g);
        });

        it('should return the correct regexp for syntax scss import syntax', () => {
            expectToMatchRegex('scss', /([^\S]|^)@import\s(.+?);/g);
        });

        it('should return the correct regexp for syntax commonjs require syntax', () => {
            expectToMatchRegex('commonjs', /([^\S]|^|=|\(|,)require\s*\((.+?)\)/g);
        });

        it('should return a custom made RegExp', () => {
            expectToMatchRegex(/MyTestRegExp/g, /MyTestRegExp/g);
        });

        /**
         * helper for syntaxRegExp method spec
         * @param {String|RegExp} syntaxParam
         * @param {RegExp} toMatchRegExp
         */
        function expectToMatchRegex (syntaxParam, toMatchRegExp) {
            if (syntaxParam) {
                importParser.init(syntaxParam);
            }
            let resultRegex = importParser.syntaxRegExp;
            expect(resultRegex instanceof RegExp).to.be.true;
            expect(resultRegex.toString()).to.equal((toMatchRegExp).toString());
        }
    });
});
