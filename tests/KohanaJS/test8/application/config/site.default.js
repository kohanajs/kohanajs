delete require.cache[require.resolve('./site')];

module.exports = {
  cache : {
    exports  : false,
  },
  salt: 'default salt 1'
};