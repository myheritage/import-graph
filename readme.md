## About

Create a graph of dependencies between files, supporting ES6 'import' syntax, SCSS '@import' syntax, CommonJS 'require' syntax, a mix of 'import' and 'require', and a custom RegExp (HowTo is explained below).

The purpose of this module is to save processing time by identifying the ancestors and\or descendants of a specific file and processing only those.
  
Based on [sass-graph](https://github.com/xzyfer/sass-graph).

### Example

Having a folder containing 3 files that is being watched:

*file-a.js:*
```javascript
import {MyObj} from './file-b';
```

*file-b.js:*
```javascript
export class MyObj {
    // some code here
}
```

*file-c.js*
```javascript
export class MySecondObj {
    // some code here
}
```

Normally, whenever a change occurs in *file-b.js*, either all files will be processed or only *file-b.js*.

Using the graph object, we can visit only the changed file and its ancestors (in this case *file-a.js* and *file-b.js*) and process only them.


## Install

Install with [npm](https://npmjs.org/package/import-graph)

```bash
npm i --S import-graph
```

## Usage

```javascript
let ImportGraph = require('import-graph');
let graph = ImportGraph.createGraph('foo/bar', {
    extensionPrefix: ['.es6'],
    extensions: ['js'],
    dependencyPattern: 'js'
});
```

The *graph* object contains these methods:
```javascript
{
    visitAncestors: function(filePath, callback){...},
    visitDescendants: function(filePath, callback){...}
}
```

Now, you can use the *graph* object to visit all ancestors and\or descendants:

```javascript
graph.visitAncestors(foo/bar/file.js, (ancestor) => {
    // will get all of 'file.js' ancestors file paths one by one
    console.log(ancestor);
});

graph.visitDescendants(foo/bar/file.js, (descendant) => {
    // will get all of 'file.js' descendants file paths one by one
    console.log(descendant);
});
```

## API

#### createGraph(entryPath, options)

Create a graph object for either a folder path or a file path and return the graph object.

##### Options

* **extensions**: *Array* - File extensions to be included in the graph with, **default: ['js']**
* **extensionPrefixes**: *Array* - Array of file extension prefixes to be included in the graph. E.g. ['.es6'] to get only '*.es6.js' files, **default: []**
* **dependencyPattern**: *String | RegExp* - Determines the dependency pattern to create the graph with (see more below), **default: 'js'**
* **loadPaths**: *Array* - The work-area to resolve file paths from, **default: [process.cwd()]**

##### dependencyPattarn options

You can choose a predefined pattern or a custom regular expression:

* **'es6'** - Will create a graph for files using the es6 'import' syntax.
* **'scss'** - Will create a graph for files using the scss '@import' syntax.
* **'commonjs'** - Will create a graph for files using the CommonJS 'require' syntax.
* **'js'** A combination of 'es6' and 'commonjs', using 'require' and 'import' syntax.

##### Custom regular expression:
Setting a regular expression to *dependencyPattern* will use it for parsing. You can create your own custom RegExp, but for the parsing to work it must have a [capture groups](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/RegExp#Special_characters_meaning_in_regular_expressions) and the last group should be the actual path needed wrapped with either ' or ". You must include the 'g' flag to make it global.

Good RegExp: `/myregexp\s*(.*);/g`,
Bad RegExp: `/myregexp\s*.*;/`

for a file with this syntax: 
```javascript
myregexp 'capture';
```
A good RegRex would be `/myregexp\s*(.*);/g`,

#### visitAncestors(filePath, callback)

Iterate on all of the ancestors of a file path by a callback, the callback execute with a single argument which is the path for the current ancestor.

```javascript
visitAncestors(file.js, function(ancestor) {...});
```

#### visitDescendants(filePath, callback)

Iterate on all of the descendants of a file path by a callback, the callback execute with a single argument which is the path for the current descendant.

```javascript
visitDescendants(file.js, function(descendant) {...});
```

## Authors

Written by [Noam Elboim](https://github.com/NoamELB) and maintained by [MyHeritage](https://github.com/MyHeritage).
Based on [sass-graph](https://github.com/xzyfer/sass-graph) module, written by [Lachlan Donald](http://lachlan.me) and maintained by [Michael Mifsud](http://twitter.com/xzyfer).

## License

MIT