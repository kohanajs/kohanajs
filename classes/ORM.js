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

const KOJS = require('../KohanaJS');
const {Model} = require('@kohanajs/core-mvc');

const defaultID = () => ( ( (Date.now() - 1563741060000) / 1000 ) | 0 ) * 100000 + ((Math.random() * 100000) & 65535);

class ORM extends Model{
  constructor(id = null, options = {}){
    super();
    //private property this.db.
    Object.defineProperty(this, "db", {
      enumerable : false,
      value : options.database || ORM.database
    });

    //private property options
    Object.defineProperty(this, "options", {
      enumerable : false,
      value : options
    });

    this.id = id;
    this.created_at = null;
    this.updated_at = null;

    if(this.constructor !== ORM){
      if(!this.constructor.tableName){
        this.constructor.tableName = pluralize(this.constructor.name).toLowerCase();
      }
      if(!this.constructor.jointTablePrefix){
        this.constructor.jointTablePrefix = pluralize.singular(this.constructor.tableName);
      }
    }

    if( options.lazyload || !this.id )return;
    this.load();
  }

  load(){
    if(!this.id)return false;
    const result = this.prepare(`SELECT * from ${this.constructor.tableName} WHERE id = ?`).get(this.id);
    if(!result)return false;

    Object.assign(this, result);
    return true;
  }

  /**
   * @return ORM
   */
  save(){
    const tableName = this.constructor.tableName;
    const columns = [...this.constructor.fields.keys()];
    //add belongsTo to columns
    Array.from(this.constructor.belongsTo.keys()).forEach(x => columns.push(x));

    const values = columns.map(x => {
      const value = this[x];
      if(typeof value === 'boolean'){
        return this[x] ? 1 : 0;
      }
      return this[x]
    });

    let sql;
    if(this.id){
      sql = `UPDATE ${tableName} SET ${columns.map(x => `${x} = ?`).join(', ')} WHERE id = ?`;
    }else{
      this.id = this.options.createWithId || defaultID();
      sql = `INSERT OR IGNORE INTO ${tableName} (${columns.join(', ')}, id) VALUES (?, ${columns.map(x => `?`).join(', ')})`;
    }

    values.push(this.id);
    const result = this.prepare(sql).run(...values);
    if(this.idx !== undefined){
      this.idx = result.lastInsertRowid;
    }

    return this;
  }

  /**
   * add belongsToMany
   * @param {ORM} model
   * @param {number|null} weight
   * @returns {boolean}
   */

  add(model, weight = null){
    const Model = model.constructor;

    const jointTableName = `${this.constructor.jointTablePrefix}_${Model.tableName}`;
    const lk = this.constructor.jointTablePrefix + '_id';
    const fk = Model.jointTablePrefix + '_id';

    const record = this.prepare(`SELECT * FROM ${jointTableName} WHERE ${lk} = ? AND ${fk} = ?`).get(this.id, model.id);
    if(record)return false;

    this.prepare(`INSERT INTO ${jointTableName} (${lk}, ${fk}, weight) VALUES (?, ?, ?)`).run(this.id, model.id, weight);
    return true;
  }

  /**
   * remove
   * @param {ORM} model
   */

  remove(model){
    const Model = model.constructor;
    const jointTableName = `${this.constructor.jointTablePrefix}_${Model.tableName}`;
    const lk = this.constructor.jointTablePrefix + '_id';
    const fk = Model.jointTablePrefix + '_id';

    this.prepare(`DELETE FROM ${jointTableName} WHERE ${lk} = ? AND ${fk} = ?`).run(this.id, model.id);
  }

  delete(){
    if(!this.id)throw new Error('ORM delete Error, no id defined');
    const tableName = this.constructor.tableName;
    this.prepare(`DELETE FROM ${tableName} WHERE id = ?`).run(this.id);
  }

  /**
   * belongs to - this table have xxx_id column
   * @param {string} fk
   * @returns {ORM}
   */

  belongsTo(fk){
    const modelName = this.constructor.belongsTo.get(fk);
    const modelClass = KOJS.require(`models/${modelName}`);
    return new modelClass(this[fk], {database: this.db});
  }

  /**
   * has many
   * @param {ORM} modelClass
   * @param {string} fk
   */

  hasMany(modelClass, fk= ""){
    const key = (fk === "") ? this.constructor.name.toLowerCase() + '_id' : fk;

    return this.prepare(`SELECT * FROM ${modelClass.tableName} WHERE ${key} = ?`)
      .all(this.id)
      .map(x => Object.assign(new modelClass(null, {database : this.db}), x));
  }

  /**
   *
   * @param {ORM} modelClass
   */
  belongsToMany(modelClass){
    const jointTableName = this.constructor.jointTablePrefix + '_' + modelClass.tableName;

    const sql = `SELECT ${modelClass.tableName}.* FROM ${modelClass.tableName} JOIN ${jointTableName} ON ${modelClass.tableName}.id = ${jointTableName}.${modelClass.jointTablePrefix}_id WHERE ${jointTableName}.${this.constructor.jointTablePrefix}_id = ? ORDER BY ${jointTableName}.weight`;
    return this.prepare(sql)
      .all(this.id)
      .map(x => Object.assign(new modelClass(null, {database : this.db}), x));
  }

  all(){
    const model = this.constructor;
    return this.prepare(`SELECT * from ${model.tableName}`)
      .all()
      .map(x => Object.assign(new model(null, {database: this.db}), x));
  }

  /**
   *
   * @param {string} sql
   */
  prepare(sql){
    if(!this.db)throw new Error('Database not assigned.');
    return this.db.prepare(sql);
  }
}

//ORM is abstract, jointTablePrefix and tableName is null.
ORM.jointTablePrefix = null;
ORM.tableName = null;
ORM.database = null;

ORM.fields = new Map();
ORM.belongsTo = new Map();
ORM.hasMany   = [];//hasMany cannot be Map, because children models may share same fk name.
ORM.belongsToMany = [];
ORM.defaultID = defaultID;

Object.freeze(ORM.prototype);
module.exports = ORM;