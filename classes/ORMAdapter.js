class ORMAdapter{
  static OP = {
    'EQUAL' : '=',
    'GREATER_THAN' : '>',
    'LESS_THAN' : '<',
    'GREATER_THAN_EQUAL' : '>=',
    'LESS_THAN_EQUAL' : '<=',
    'NOT_EQUAL' : '<>',
    'BETWEEN' : 'BETWEEN',
    'LIKE' : 'LIKE',
    'IN' : 'IN',
    'AND' : 'AND',
    'OR' : 'OR',
    'TRUE': 'TRUE',
    'FALSE' : 'FALSE',
    'BLANK' : "''",
    'START_GROUP' : '(',
    'END_GROUP' : ')',
    'NULL' : 'NULL',
    'IS' : 'IS'
  };

  /**
   *
   * @param {ORM} client
   * @param {*} database
   */
  constructor(client, database) {
    this.client = client;
    this.tableName = client.constructor.tableName;
    this.database = database;
  }

  defaultID(){
    return ( ( (Date.now() - 1563741060000) / 1000 ) | 0 ) * 100000 + ((Math.random() * 100000) & 65535);
  }

  processValues(){
    return this.translateValue(this.client.columns.map(x => this.client[x]));
  }

  translateValue(values){
    return values;
  }

  async read(){}

  /**
   *
   * @param {[]} values
   * @returns {Promise<void>}
   */
  async update(values){}
  /**
   *
   * @param {[]} values
   * @returns {Promise<void>}
   */
  async insert(values){}

  /**
   *
   * @returns {Promise<void>}
   */
  async delete(){}

  /**
   *
   * @param {string} tableName
   * @param {string} key
   * @returns {Promise<void>}
   */
  async hasMany(tableName, key){}

  /**
   *
   * @param {string} modelTableName
   * @param {string} jointTableName
   * @param {string} lk
   * @param {string} fk
   * @returns {Promise<void>}
   */
  async belongsToMany(modelTableName, jointTableName , lk, fk){}
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
   * @param {ORM[]} models
   * @param {string} jointTableName
   * @param {string} lk
   * @param {string} fk
   */
  async remove(models, jointTableName, lk, fk){}
  /**
   *
   * @param {string} jointTableName
   * @param {string} lk
   * @returns {Promise<void>}
   */
  async removeAll(jointTableName, lk){}

  /**
   *
   * @param {Map} kv
   * @returns {[]}
   * @param {number} limit
   * @param {number} offset
   * @param {Map} orderBy
   * @returns {Promise<[]>}
   */
  async readAll(kv, limit=1000, offset=0, orderBy= new Map([['id', 'ASC']])){
    return [];
  }
  /**
   *
   * @param {string} key
   * @param {[]} values
   * @param {number} limit
   * @param {number} offset
   * @param {Map} orderBy
   * @returns {Promise<[]>}
   */
  async readBy(key, values, limit=1000, offset=0, orderBy= new Map([['id', 'ASC']])){
    return [];
  }
  /**
   *
   * @param {[[string]]}criteria
   * @param {number} limit
   * @param {number} offset
   * @param {Map} orderBy
   * @returns {Promise<[]>}
   */
  async readWith(criteria, limit=1000, offset=0, orderBy= new Map([['id', 'ASC']])){
    return [];
  }

  /**
   * @param {Map|null} kv
   * @returns {Promise<number>}
   */
  async count(kv = null){
    return 0;
  }

  /**
   *
   * @param {Map|null} kv
   * @returns {Promise<void>}
   */
  async deleteAll(kv = null){}
  /**
   *
   * @param {string} key
   * @param {[]} values
   * @returns {Promise<void>}
   */
  async deleteBy(key, values){}
  /**
   *
   * @param {[[string]]}criteria
   * @returns {Promise<void>}
   */
  async deleteWith(criteria){}

  /**
   *
   * @param {Map} kv
   * @param {Map} columnValues
   * @returns {Promise<void>}
   */
  async updateAll(kv, columnValues){}
  /**
   *
   * @param {string} key
   * @param {[]} values
   * @param {Map} columnValues
   * @returns {Promise<void>}
   */
  async updateBy(key, values, columnValues){}
  /**
   *
   * @param {[[string]]}criteria
   * @param {Map} columnValues
   * @returns {Promise<void>}
   */
  async updateWith(criteria, columnValues){}

  /**
   *
   * @param {[]} columns
   * @param {[[]]} valueGroups
   * @param {number[]} ids
   * @returns {Promise<void>}
   */
  async insertAll(columns, valueGroups, ids){}
}

module.exports = ORMAdapter;