module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: 'last 2 Chrome versions, last 2 Firefox versions, Firefox ESR',
      }
    ]
  ],
  generatorOpts: {
    retainLines: true,  // workaround for Babel mangling of singleline comments
  }
};
