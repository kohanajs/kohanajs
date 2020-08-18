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
    this.created_at = null;
    this.updated_at = null;
  }

  async load(){
    if(!this.id)return this;
    const result = await this.adapter.load();
    if(!result)return this;

    Object.assign(this, result);
    return this;
  }

  /**
   * @return ORM
   */
  async save(){
    if(this.id){
      await this.adapter.update(this.adapter.processValues());
    }else{
      this.id = this.options.createWithId || this.adapter.defaultID();
      await this.adapter.insert(this.adapter.processValues());
    }

    return this;
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

  async removeAll(Model){
    const jointTableName = `${this.constructor.jointTablePrefix}_${Model.tableName}`;
    const lk = this.constructor.jointTablePrefix + '_id';
    await this.adapter.removeAll(jointTableName, lk);
  }

  async delete(){
    if(!this.id)throw new Error('ORM delete Error, no id defined');
    await this.adapter.delete()
  }

  /**
   * belongs to - this table have xxx_id column
   * @param {string} fk
   * @param {*} database
   * @param {string} modelClassPath
   * @returns {ORM}
   */

  async belongsTo(fk, database=null, modelClassPath='model'){
    const modelName = this.constructor.belongsTo.get(fk);
    const modelClass = KohanaJS.require(`${modelClassPath}/${modelName}`);
    const ins = new modelClass(this[fk], {database: database || this.database});
    await ins.load();
    return ins;
  }

  /**
   * has many
   * @param {ORM} Model
   * @param {string} fk
   * @param {*} database
   */

  async hasMany(Model, fk= "", database=null){
    const key = (fk === "") ? this.constructor.name.toLowerCase() + '_id' : fk;
    const results = await this.adapter.hasMany(Model.tableName, key);
    return results.map(x => Object.assign(new Model(null, {database : database || this.database}), x));
  }

  /**
   *
   * @param {ORM} Model
   * @param {*} database
   */
  async belongsToMany(Model, database=null){
    const jointTableName = this.constructor.jointTablePrefix + '_' + Model.tableName;
    const lk = this.constructor.jointTablePrefix + '_id';
    const fk = Model.jointTablePrefix + '_id';

    const results = await this.adapter.belongsToMany(Model.tableName, jointTableName, lk, fk);
    return results.map(x => Object.assign(new Model(null, {database : database || this.database}), x));
  }

  /**
   * find exist instance from values
   * @param {Map} kv
   */
  async find(kv){
    if(kv.size <= 0)return;

    const result = await this.adapter.find(kv);
    Object.assign(this, result);
  }

  //ORM is abstract, jointTablePrefix and tableName is null.
  static joinTablePrefix = null;
  static tableName = null;
  static fields = new Map();
  static belongsTo = new Map();
  static hasMany = [];//hasMany cannot be Map, because children models may share same fk name.
  static belongsToMany = [];

  static defaultDatabase = null;
  static defaultAdapter = require('./ORMAdapter/SQLite');
  static classPrefix = 'model/';

  static prepend(modelName) {
    return ORM.classPrefix + modelName;
  }

  static create (Model, options ={}) {
    return new Model(null, options);
  }

  /**
   * Create and load data from database
   * @param Model
   * @param id
   * @param options
   * @returns {Promise<*>}
   */
  static async factory (Model, id, options ={}){
    const m = new Model(id, options);
    await m.load();
    return m;
  }

  /**
   * load all records from the model
   * @param Model
   * @param options
   * @returns {Promise<*>}
   */
  static async all (Model, options={}){
    const m = new Model(null, options);
    const records = await m.adapter.all();
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
  static async filterBy (Model, key, values, options={}) {
    const m = new Model(null, options);
    return m.adapter.filterBy(key, values);
  }

  /**
   * Given criterias [['', 'id', SQL.EQUAL, 11], [SQL.AND, 'name', SQL.EQUAL, 'peter']]
   * @param Model
   * @param criteria
   * @param options
   * @returns {Promise<*>}
   */
  static async filter (Model, criteria=[], options = {}){
    if(criteria.length === 0)return [];

    const m = new Model(null, options);
    return await m.adapter.filter(criteria);
  }
}

Object.freeze(ORM.prototype);
module.exports = ORM;