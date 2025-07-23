import fs from 'fs';
import path from 'path';

import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import metablock from 'rollup-plugin-userscript-metablock';
import nodeResolve from '@rollup/plugin-node-resolve';
import prettier from 'rollup-plugin-prettier';
import replace from '@rollup/plugin-replace';
import typescriptPlugin from '@rollup/plugin-typescript';
import typescript from 'typescript';

import pkg from './package.json' with {type: 'json'};

const entryName = 'main';
const tsEntry = `./src/${entryName}.ts`;
const jsEntry = `./src/${entryName}.js`;
const defaultEntryPath = fs.existsSync(tsEntry) ? tsEntry : jsEntry;

export default args => {

  /**
   * Include `--input inputFile.js` in the build or watch command
   * to enable simple mode.
   */
  args.i ??= args.input;
  const simple = Boolean(args.i);
  const inputFile = {...path.parse(args.i ?? defaultEntryPath), base: ''};
  const outputFile = {
    ...inputFile,
    dir: '',
    name: pkg.name + '.user',
    ext: '.js'
  };
  if (simple) {
    const {name, dir} = inputFile;
    outputFile.dir = dir;
    outputFile.name = name;
  }
  return {
    input: path.format(inputFile),
    output: {
      file: path.format(outputFile),
      format: 'iife',
      generatedCode: {
        constBindings: true
      },
    },
    external: id => (/^react(-dom)?$/).test(id),
    treeshake: true,
    plugins: [
      replace({
        'process.env.NODE_ENV': JSON.stringify('production'),
        'ENVIRONMENT': JSON.stringify('production'),
        'preventAssignment': true
      }),
      nodeResolve({extensions: ['.js', '.ts', '.tsx']}),
      typescriptPlugin({typescript}),
      commonjs({
        include: [
          'node_modules/**',
        ],
        exclude: [
          'node_modules/process-es6/**',
        ]
      }),
      babel({babelHelpers: 'bundled'}),
      prettier({
        parser: 'typescript',
        tabWidth: 2,
        printWidth: 100,
        singleQuote: true,
        bracketSpacing: false,
        arrowParens: 'avoid',
        embeddedLanguageFormatting: 'off',
      }),
      simple ? {name: 'noop'} : metablock({
        file: './src/meta.json',
        override: {
          name: pkg.displayName,
          description: pkg.description,
          version: pkg.version,
          author: pkg.author,
          license: pkg.license
        },
        order: [
          'name',
          'description',
          'version',
          'author',
          'license',
        ]
      }),
    ],
  };
};
