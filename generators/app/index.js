'use strict';

// @ts-check

require('@babel/register')({
    ignore: [],
    only: [
        /d3|delaunator|internmap|mermaid|pirates|robust-predicates/
    ],
    presets: [
        [require.resolve('@babel/preset-env'), { modules: 'commonjs' }]
    ],
    plugins: [require.resolve('@babel/plugin-transform-runtime')],
    cache: true,
});

const Generator = require('yeoman-generator');
const { parse } = require('mermaid');
const prettier = require('gulp-prettier');
const { getExtends, parseFunctions, parseProperties, isInterface, getImplements, isAbstract, isFinal } = require('../../services/mermaid');

module.exports = class extends Generator {
    constructor(args, opts) {
        super(args, opts);

        this.argument('path', {
            type: String,
            description: 'The path to your Mermaid file',
            required: true
        });

        this.registerTransformStream(prettier({ tabWidth: 4 }));
    }

    async writing() {
        const { path } = this.options;

        try {
            if (!this.fs.exists(path)) {
                throw 'The file at the supplied location can\'t be found';
            }
    
            const fileContents = this.fs.read(path);

            try {
                var parsed = parse(fileContents).parser.yy;
            } catch {
                throw 'The file at the supplied location can\'t be parsed'
            }

            if ('classDiagram' !== parsed.graphType) {
                throw 'Not a class diagram';
            }

            Object.values(parsed.getClasses()).forEach(c => {
                const type = isInterface(c) ? 'interface' : 'class';

                this.composeWith(
                    require.resolve(`generator-phab/generators/${type}`),
                    {
                        contextRoot: this.contextRoot,
                        name: c.id,
                        abstract: isAbstract(c),
                        final: isFinal(c),
                        [type]: {
                            extends: getExtends(c.id, parsed),
                            implements: getImplements(c.id, parsed),
                            properties: parseProperties(c),
                            functions: parseFunctions(c),
                        }
                    }
                );
            });
        } catch (e) {
            this.log.error(e);

            process.exit(1);
        }
    }
};