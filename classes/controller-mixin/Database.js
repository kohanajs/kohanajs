const KohanaJS = require('../../KohanaJS');
const {ControllerMixin} = require("@kohanajs/core-mvc");
const DatabaseDriver = require('../DatabaseDriver');
const crypto = require('crypto');

class ControllerMixinDatabase extends ControllerMixin{
  static #dbConnection = new Map();
  static DATABASE_MAP = 'databaseMap';
  static DATABASE_DRIVER = 'databaseDriver';
  static DATABASES = 'databases';

  static init(state){
    if(!state.get(this.DATABASE_MAP))state.set(this.DATABASE_MAP, new Map());
    if(!state.get(this.DATABASES))state.set(this.DATABASES, new Map());
    if(!state.get(this.DATABASE_DRIVER))state.set(this.DATABASE_DRIVER, DatabaseDriver);
    state.get('client').databases = state.get(this.DATABASES);

    const conn = this.#getConnections(state.get(this.DATABASE_MAP), state.get(this.DATABASE_DRIVER));
    conn.forEach((v, k) => {
      state.get(this.DATABASES).set(k, v);
    })
  }

  /**
   *
   * @param {Map} databaseMap
   * @param {DatabaseDriver.} driverClass
   */
  static #getConnections(databaseMap, driverClass){
    const hash = crypto.createHash('sha256');
    hash.update(Array.from(databaseMap.keys()).join('') + Array.from(databaseMap.values()).join(''));
    const key = hash.digest('hex');

    const conn = ControllerMixinDatabase.#dbConnection.get(key);
    if(conn && KohanaJS.config.database?.cache)return conn;

    const connections = new Map();
    databaseMap.forEach((v, k) => {
      connections.set(k, driverClass.create(v));
    })

    connections.set('createdAt', Date.now());
    ControllerMixinDatabase.#dbConnection.set(key, connections)

    return connections;
  }
}

module.exports = ControllerMixinDatabase;