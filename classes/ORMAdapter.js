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

  op(operator){
    if(operator === '')return '';
    return this.constructor.OP[operator] || ((typeof operator === 'string') ? `'${operator}'`: operator);
  }

  formatCriteria(criteria){
    if(!Array.isArray(criteria[0]))throw new Error('criteria must group by array.');
    return criteria.map((x, i) => `${(i===0) ? '' : this.op(x[0] || '')} ${x[1] || ''} ${this.op(x[2] || '')} ${this.op(x[3] || '')} `);
  }

  processValues(){
    return this.translateValue(this.client.columns.map(x => this.client[x]));
  }

  translateValue(values){
    return values;
  }

  async load(){}

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
   * @param {ORM} model
   * @param {string} jointTableName
   * @param {string} lk
   * @param {string} fk
   */
  async remove(model, jointTableName, lk, fk){}
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
   * @returns {Promise<void>}
   */
  async loadAll(kv=null){}
  /**
   *
   * @param {string} key
   * @param {[]} values
   * @returns {Promise<void>}
   */
  async loadBy(key, values){}
  /**
   *
   * @param {[[string]]}criteria
   * @returns {Promise<void>}
   */
  async loadWith(criteria){}

  /**
   *
   * @param {Map} kv
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
}

module.exports = ORMAdapter;