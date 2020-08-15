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
   * @param {ORM[]} models
   * @param {number} weight
   * @param {string} jointTableName
   * @param {string} lk
   * @param {string} fk
   */
  async add(models, weight, jointTableName, lk, fk){}

  /**
   * remove
   * @param {ORM} model
   * @param {string} jointTableName
   * @param {string} lk
   * @param {string} fk
   */
  async remove(model, jointTableName, lk, fk){}

  async removeAll(jointTableName, lk){}

  async delete(){}
  async hasMany(tableName, key){}
  async belongsToMany(modelTableName, jointTableName , lk, fk){}
  async find(keys, values){}

  async all(){}
  async filter(key, values){}
}

module.exports = ORMAdapter;