class ORMAdapter{
  /**
   *
   * @param {ORM} client
   * @param {*} database
   */
  constructor(client, database) {
    this.client = client;
    this.database = database;
  }

  defaultID(){
    return ( ( (Date.now() - 1563741060000) / 1000 ) | 0 ) * 100000 + ((Math.random() * 100000) & 65535);
  }

  processValues(){}
  getUpdateStatement(){}
  getInsertStatement(){}

  async load(){}
  async save(sql){}

  /**
   * add belongsToMany
   * @param {ORM} model
   * @param {number} weight
   * @param {string} jointTableName
   * @param {string} lk
   * @param {string} fk
   */
  async add(model, weight, jointTableName, lk, fk){}

  /**
   * remove
   * @param {ORM} model
   * @param {string} jointTableName
   * @param {string} lk
   * @param {string} fk
   */
  async remove(model, jointTableName, lk, fk){}

  async delete(){}
  async hasMany(tableName, key){}
  async all(){}
  async find(keys, values){}
}

module.exports = ORMAdapter;