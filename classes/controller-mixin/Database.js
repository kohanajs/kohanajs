const KohanaJS = require('../../KohanaJS');
const {ControllerMixin} = require("@kohanajs/core-mvc");
const DatabaseDriver = require('../DatabaseDriver');
const crypto = require('crypto');

class ControllerMixinDatabase extends ControllerMixin{
  static dbConnection = new Map();
  static defaultDatabases = new Map();
  static defaultDatabaseDriver = DatabaseDriver;

  /**
   *
   * @param {Controller} client
   * @param {Object} opts
   */
  constructor(client, opts={}) {
    super(client);

    this.options = Object.assign({
      append: null,
      databases : ControllerMixinDatabase.defaultDatabases,
      driver : ControllerMixinDatabase.defaultDatabaseDriver
    }, opts)

    if(this.options.append){
      //append to exist database connection
      const conn = this.getConnections(this.options.databases);
      conn.forEach((v, k) => {
        this.options.append.set(k, v);
      })
      return;
    }

    const conn = this.getConnections(this.options.databases);

    this.exports = {
      databases: conn,
    }
  }

  /**
   *
   * @param {Map} databaseMap
   */
  getConnections(databaseMap){
    const hash = crypto.createHash('sha256');
    hash.update(Array.from(databaseMap.keys()).join('') + Array.from(databaseMap.values()).join(''));
    const key = hash.digest('hex');

    const conn = ControllerMixinDatabase.dbConnection.get(key);
    if(conn && KohanaJS.config.database?.cache)return conn;

    const connections = new Map();
    databaseMap.forEach((v, k) => {
      connections.set(k, this.options.driver.create(v));
    })

    connections.set('createdAt', Date.now());
    ControllerMixinDatabase.dbConnection.set(key, connections)

    return connections;
  }
}

module.exports = ControllerMixinDatabase;