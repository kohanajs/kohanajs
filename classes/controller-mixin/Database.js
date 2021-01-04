const KohanaJS = require('../../KohanaJS');
const {ControllerMixin} = require("@kohanajs/core-mvc");
const DatabaseDriver = require('../DatabaseDriver');
const crypto = require('crypto');

class ControllerMixinDatabase extends ControllerMixin{
  static #dbConnection = new Map();
  #driver;
  /**
   *
   * @param {Controller} client
   * @param {Object} opts
   */
  constructor(client, opts={}) {
    super(client);
    const {append=undefined, databases=new Map(), driver=DatabaseDriver} = opts;
    this.#driver = driver

    if(append){
      //append to exist database connection
      const conn = this.#getConnections(databases);
      conn.forEach((v, k) => {
        append.set(k, v);
      })
      return;
    }

    const conn = this.#getConnections(databases);

    this.exports = {
      databases: conn,
    }
  }

  /**
   *
   * @param {Map} databaseMap
   */
  #getConnections(databaseMap){
    const hash = crypto.createHash('sha256');
    hash.update(Array.from(databaseMap.keys()).join('') + Array.from(databaseMap.values()).join(''));
    const key = hash.digest('hex');

    const conn = ControllerMixinDatabase.#dbConnection.get(key);
    if(conn && KohanaJS.config.database?.cache)return conn;

    const connections = new Map();
    databaseMap.forEach((v, k) => {
      connections.set(k, this.#driver.create(v));
    })

    connections.set('createdAt', Date.now());
    ControllerMixinDatabase.#dbConnection.set(key, connections)

    return connections;
  }
}

module.exports = ControllerMixinDatabase;