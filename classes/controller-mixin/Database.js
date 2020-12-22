const path = require('path');
const {KohanaJS, ControllerMixin} = require('kohanajs');
const Database = require('better-sqlite3');
const crypto = require('crypto');

class ControllerMixinDatabase extends ControllerMixin{
  static dbConnection = new Map();

  /**
   *
   * @param {Controller} client
   * @param {Map} databaseMap
   * @param {Map} appendDatabases
   */
  constructor(client, databaseMap=new Map([['session', KohanaJS.EXE_PATH+'/../db/session.sqlite']]), appendDatabases = null) {
    super(client);

    if(appendDatabases){
      //append to exist database connection
      const conn = this.getConnections(databaseMap);
      conn.forEach((v, k) => {
        appendDatabases.set(k, v);
      })
      return;
    }

    const conn = this.getConnections(databaseMap);

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
      connections.set(k, new Database(path.normalize(v)));
    })

    connections.set('createAt', Date.now());
    ControllerMixinDatabase.dbConnection.set(key, connections)

    return connections;
  }
}

module.exports = ControllerMixinDatabase;