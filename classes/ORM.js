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

    const Adapter = options.adapter || ORM.defaultAdapter;
    const adapter = new Adapter(this, this.database);

    //private property adapter
    Object.defineProperty(this, "adapter", {
      enumerable : false,
      value : adapter,
    });

    const columns = [...this.constructor.fields.keys()];
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
    //SQLite not have boolean type, translate it.
    const values = this.adapter.processValues();

    let sql;
    if(this.id){
      sql = this.adapter.getUpdateStatement();
    }else{
      this.id = this.options.createWithId || this.adapter.defaultID();
      sql = this.adapter.getInsertStatement();
    }

    values.push(this.id);
    await this.adapter.save(sql, values);
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

    await this.adapter.add(model, weight, jointTableName, lk, fk);
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

  async all(){
    return this.adapter.all()
  }

  /**
   * find exist instance from values
   * @param {Object} values
   */
  async find(values){
    const ks = Object.keys(values);
    const vs = ks.map(k => String(values[k]));
    if(ks.length <= 0)return;

    const result = await this.adapter.find(ks, vs);

    Object.assign(this, result);
  }
}

//ORM is abstract, jointTablePrefix and tableName is null.
ORM.jointTablePrefix = null;
ORM.tableName = null;

ORM.fields = new Map();
ORM.belongsTo = new Map();
ORM.hasMany = [];//hasMany cannot be Map, because children models may share same fk name.
ORM.belongsToMany = [];

ORM.defaultDatabase = null;
ORM.defaultAdapter = require('./ORMAdapter/SQLite');

ORM.create = (Model, options ={}) => {
  return new Model(null, options);
}

ORM.factory = async (Model, id, options ={}) => {
  const m = new Model(id, options);
  await m.load();
  return m;
}

ORM.getAll = async (Model, options={}) => {
  return await ORM.create(Model, options).all();
}

Object.freeze(ORM.prototype);
module.exports = ORM;