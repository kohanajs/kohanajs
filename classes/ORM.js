/*
MIT License

Copyright (c) 2020 Kojin Nakana

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

 */
const pluralize = require('pluralize');
pluralize.addPluralRule('person', 'persons');

const KohanaJS = require('../KohanaJS');
const {Model} = require('@kohanajs/core-mvc');

class ORM extends Model{
  //ORM is abstract, jointTablePrefix and tableName is null.
  static database = null;

  static tableName = null;
  static joinTablePrefix = null;
  static fields = new Map();
  static belongsTo = new Map();
  static hasMany = [];//hasMany cannot be Map, because children models may share same fk name.
  static belongsToMany = [];

  static defaultDatabase = null;
  static defaultAdapter = require('./ORMAdapter/SQLite');
  static classPrefix = 'model/';

  created_at = null;
  updated_at = null;

  constructor(id = null, options = {}){
    super();
    //auto generate table name
    if(this.constructor !== ORM){
      if(!this.constructor.tableName){
        this.constructor.tableName = pluralize(this.constructor.name).toLowerCase();
      }
      if(!this.constructor.jointTablePrefix){
        this.constructor.jointTablePrefix = pluralize.singular(this.constructor.tableName);
      }
    }

    //private property this.database.
    Object.defineProperty(this, "database", {
      enumerable : false,
      value : options.database || ORM.database
    });

    //private property options
    Object.defineProperty(this, "options", {
      enumerable : false,
      value : options
    });

    const Adapter = options.adapter || this.constructor.defaultAdapter;
    const adapter = new Adapter(this, this.database);

    //private property adapter
    Object.defineProperty(this, "adapter", {
      enumerable : false,
      value : adapter,
    });

    //list all columns of the model.
    const columns = Array.from(this.constructor.fields.keys());
    //add belongsTo to columns
    Array.from(this.constructor.belongsTo.keys()).forEach(x => columns.push(x));
    //private property adapter
    Object.defineProperty(this, "columns", {
      enumerable : false,
      value : columns,
    });

    this.id = id;
  }

  /**
   * get instance values which is not null
   * @returns {Map<any, any>}
   */
  #getValues(){
    const values = new Map();
    this.constructor.fields.forEach((v,k)=>{
      if(!!this[k])values.set(k, this[k]);
    })
    return values;
  }

  //instance methods

  /**
   * @return ORM
   */
  async write(){
    if(this.id){
      await this.adapter.update(this.adapter.processValues());
    }else{
      this.id = this.options.createWithId || this.adapter.defaultID();
      await this.adapter.insert(this.adapter.processValues());
    }

    return this;
  }

  /**
   *
   * @returns {Promise<ORM>}
   */
  async read(){
    const result = await (
      this.id ?
        this.#readByID() :
        this.#readByValues()
    );

    if(!result )throw new Error(`Record not found. ${this.constructor.name} id:${this.id}` + JSON.stringify(this, null, 4) );
    Object.assign(this, result);
    return this;
  }

  async #readByID(){
    return await this.adapter.read();
  }

  async #readByValues(){
    const values = this.#getValues();
    if(values.size === 0)throw new Error(`${this.constructor.name}: No id and no value to read`)
    const results = await this.adapter.readAll(values);
    return results[0];
  }

  /**
   *
   * @returns {Promise<void>}
   */
  async delete(){
    if(!this.id)throw new Error('ORM delete Error, no id defined');
    await this.adapter.delete()
  }

  //relation methods
  /**
   * belongs to - this table have xxx_id column
   * @param {string} fk
   * @param {*} database
   * @param {string} modelClassPath
   * @returns {ORM}
   */

  /**
   *
   * @param fk
   * @param database
   * @param modelClassPath
   * @returns {Promise<*>}
   */
  async parent(fk){
    if(!this[fk])throw new Error(`${fk} is undefined`);

    const modelName = this.constructor.belongsTo.get(fk);
    const Model = KohanaJS.require(`${this.constructor.classPrefix}/${modelName}`);
    return await ORM.factory(Model, this[fk], {database: this.database});
  }

  /**
   * has many
   * @param {ORM} Model
   * @param {string} fk
   * @param {*} database
   * @return {[]}
   */
  async children(fk, Model= null){
    const modelNames = this.constructor.hasMany.filter( value => (value[0] === fk));
    if(modelNames.length > 1 && Model === null)throw new Error('children fk have multiple Models, please specific which Model will be used');

    const ModelClass = Model || KohanaJS.require(`${this.constructor.classPrefix}/${modelNames[0]}`);

    const results = await this.adapter.hasMany(ModelClass.tableName, fk);
    return results.map(x => Object.assign(new ModelClass(null, {database : this.database}), x));
  }

  /**
   *
   * @param {ORM} Model
   * @param {*} database
   * @return {[]}
   */
  async siblings(Model){
    const jointTableName = this.constructor.jointTablePrefix + '_' + Model.tableName;
    const lk = this.constructor.jointTablePrefix + '_id';
    const fk = Model.jointTablePrefix + '_id';

    const results = await this.adapter.belongsToMany(Model.tableName, jointTableName, lk, fk);
    return results.map(x => Object.assign(ORM.create(Model, {database : this.database}), x));
  }

  /**
   * add belongsToMany
   * @param {ORM} model
   * @param {number} weight
   * @returns void
   */
  async add(model, weight = 0){
    const jointTableName = `${this.constructor.jointTablePrefix}_${model.constructor.tableName}`;
    const lk = this.constructor.jointTablePrefix + '_id';
    const fk = model.constructor.jointTablePrefix + '_id';

    await this.adapter.add([model], weight, jointTableName, lk, fk);
  }

  /**
   * remove
   * @param {ORM} model
   */
  async remove(model){
    const jointTableName = `${this.constructor.jointTablePrefix}_${model.constructor.tableName}`;
    const lk = this.constructor.jointTablePrefix + '_id';
    const fk = model.constructor.jointTablePrefix + '_id';

    await this.adapter.remove(model, jointTableName, lk, fk);
  }

  /**
   *
   * @param Model
   * @returns {Promise<void>}
   */
  async removeAll(Model){
    const jointTableName = `${this.constructor.jointTablePrefix}_${Model.tableName}`;
    const lk = this.constructor.jointTablePrefix + '_id';
    await this.adapter.removeAll(jointTableName, lk);
  }


  /**
   * @param Model
   * @param options
   * @returns {*}
   */
  static create (Model, options ={}) {
    return new Model(null, options);
  }

  /**
   * Create and read data from database
   * @param Model
   * @param id
   * @param options
   * @returns {Promise<*>}
   */
  static async factory (Model, id, options ={}){
    const m = new Model(id, options);
    await m.read();
    return m;
  }

  //Collection methods
  /**
   * read all records from the model
   * @param {Function} Model
   * @param {Map} kv
   * @param options
   * @returns {Promise<*>}
   */
  static async readAll (Model, kv = null,options={}){
    const m = ORM.create(Model, Object.assign({database: this.database}, options));
    const records = await m.adapter.readAll(kv);
    return records.map(x => Object.assign(new Model(null, options), x));
  }

  /**
   *
   * @param Model
   * @param key
   * @param values
   * @param options
   * @returns []
   */
  static async readBy (Model, key, values, options={}) {
    const m = ORM.create(Model, Object.assign({database: this.database}, options));
    return m.adapter.readBy(key, values);
  }

  /**
   * Given criterias [['', 'id', SQL.EQUAL, 11], [SQL.AND, 'name', SQL.EQUAL, 'peter']]
   * @param Model
   * @param criteria
   * @param options
   * @returns {Promise<*>}
   */
  static async readWith (Model, criteria=[], options = {}){
    if(criteria.length === 0)return [];

    const m = ORM.create(Model, Object.assign({database: this.database}, options));
    return await m.adapter.readWith(criteria);
  }

  static async deleteAll(Model, kv=null, options={}){
    const m = ORM.create(Model, Object.assign({database: this.database}, options));
    await m.adapter.deleteAll(kv);
  }

  /**
   *
   * @param {Function} Model
   * @param {string} key
   * @param {[]} values
   * @param options
   * @returns []
   */
  static async deleteBy (Model, key, values, options={}) {
    const m = ORM.create(Model, Object.assign({database: this.database}, options));
    return m.adapter.deleteBy(key, values);
  }

  /**
   * Given criterias [['', 'id', SQL.EQUAL, 11], [SQL.AND, 'name', SQL.EQUAL, 'peter']]
   * @param Model
   * @param criteria
   * @param options
   * @returns {Promise<*>}
   */
  static async deleteWith (Model, criteria=[], options = {}){
    if(criteria.length === 0)return [];

    const m = ORM.create(Model, Object.assign({database: this.database}, options));
    return await m.adapter.deleteWith(criteria);
  }

  /**
   * @param {Function} Model
   * @param options
   * @param {Map} kv
   * @param {Map} columnValues
   */
  static async updateAll(Model, kv, columnValues, options={}){
    const m = ORM.create(Model, Object.assign({database: this.database}, options));
    await m.adapter.updateAll(kv, columnValues);
  }

  /**
   *
   * @param {Function} Model
   * @param options
   * @param {string} key
   * @param {[]} values
   * @param {Map} columnValues
   * @returns []
   */
  static async updateBy (Model, key, values, columnValues, options={}) {
    const m = ORM.create(Model, Object.assign({database: this.database}, options));
    return m.adapter.updateBy(key, values, columnValues);
  }

  /**
   * Given criterias [['', 'id', SQL.EQUAL, 11], [SQL.AND, 'name', SQL.EQUAL, 'peter']]
   * @param {Function} Model
   * @param options
   * @param {[[string]]}criteria
   * @param {Map} columnValues
   * @returns {Promise<*>}
   */
  static async updateWith (Model, criteria, columnValues, options = {}){
    if(criteria.length === 0)return [];

    const m = ORM.create(Model, Object.assign({database: this.database}, options));
    return await m.adapter.updateWith(criteria, columnValues);
  }
}

Object.freeze(ORM.prototype);
module.exports = ORM;