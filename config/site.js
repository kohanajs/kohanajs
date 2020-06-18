//this is example config file.
//copy this to application/config/site.js

module.exports = {
  cache : {
    exports  : false,
    database : false,
    view     : false
  },
  salt : 'theencryptsaltatleast32character',
  salts : {
    password: 'theencryptsaltatleast32character',
    verify: 'theencryptsaltatleast32character1',
    lastVerify: 'theencryptsaltatleast32character2',
    cookie: 'theencryptsaltatleast32character3'
  }
};