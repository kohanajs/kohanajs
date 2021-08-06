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
const { Model } = require('@kohanajs/core-mvc');
const KohanaJS = require('../KohanaJS');
const ORMAdapter = require('./ORMAdapter');

class ORM extends Model {
  // ORM is abstract, joinTablePrefix and tableName is null.
  static database = null;

  static tableName = null;

  // associative (junction) table name prefix
  static joinTablePrefix = null;

  static fields = new Map();

  static belongsTo = new Map();

  // hasMany cannot be Map, because children models may share same fk name.
  static hasMany = [];

  static belongsToMany = new Set();

  static defaultAdapter = ORMAdapter;

  static classPrefix = 'model/';

  uuid = null;

  created_at = null;

  updated_at = null;

  #database = null;
  #options = null;
  #states = null;
  #adapter = null;
  #columns = null;

  constructor(id = null, options = {}) {
    super();

    this.#database = options.database || ORM.database;
    this.#options = options;
    this.#states = [];

    const Adapter = options.adapter || this.constructor.defaultAdapter;
    this.#adapter = new Adapter(this, this.#database);

    // list all columns of the model.
    this.#columns = Array.from(this.constructor.fields.keys());
    // add belongsTo to columns
    Array.from(this.constructor.belongsTo.keys()).forEach(x => this.#columns.push(x));

    this.id = id;
  }

  /**
   *
   * @returns {Array}
   */
  getColumns(){
    return this.#columns;
  }

  /**
   *
   * @returns {Array}
   */
  getStates(){
    return this.#states;
  }

  snapshot() {
    this.#states.push({ ...this });
  }

  /**
   *
   * @param {object} option
   * @param {String[]|*} option.with
   * @param {object} option.*
   * @returns {Promise<void>}
   */
  async eagerLoad(option = {}) {
    /* options format, eg product
    * {
    * with:['Product'], //1. only with Classes will be loaded, 2. pass null to skip all classses and 3. undefined will load all classes
    * default_image:{}
    * type:{}
    * vendor:{}
    * variants:{
    *  with:['Inventory', 'Media],
    *  inventories :{}
    *  media: {}
    * },
    * media:{}
    * tags:{}
    * options:{}
    * }
    * */

    const allowClasses = (option.with !== undefined) ? new Set(option.with) : null;

    const parents = [];
    this.constructor.belongsTo.forEach((v, k) => {
      if (allowClasses && !allowClasses.has(v)) return;

      const name = k.replace('_id', '');
      const opt = option[name];
      if (!opt) return;
      parents.push({ name, opt, key: k });
    });

    await Promise.all(
      parents.map(async p => {
        const instance = await this.parent(p.key);
        this[p.name] = instance;
        if (!instance) return; // parent can be null
        await instance.eagerLoad(p.opt);
      }),
    );

    const props = [];
    this.constructor.hasMany.forEach(x => {
      const k = x[0];

      if (allowClasses && !allowClasses.has(x[1])) return;

      const ModelClass = ORM.require(x[1]);
      const name = ModelClass.tableName;
      const opt = option[name];
      if (!opt) return;

      props.push({
        name, opt, key: k, model: ModelClass,
      });
    });

    await Promise.all(
      props.map(async p => {
        const instances = await this.children(p.key, p.model);
        if (!instances) return;
        this[p.model.tableName] = instances;

        await Promise.all(
          instances.map(instance => instance.eagerLoad(p.opt)),
        );
      }),
    );

    const siblings = [];
    this.constructor.belongsToMany.forEach(x => {
      if (allowClasses && !allowClasses.has(x)) return;

      const ModelClass = ORM.require(x);
      const name = ModelClass.tableName;
      const opt = option[name];
      if (!opt) return;
      siblings.push({ name, opt, model: ModelClass });
    });

    await Promise.all(
      siblings.map(async s => {
        const instances = await this.siblings(s.model);
        if (!instances) return;
        this[s.model.tableName] = instances;

        await Promise.all(
          instances.map(instance => instance.eagerLoad(s.opt)),
        );
      }),
    );
  }

  /**
   * get instance values which is not null
   * @returns {Map<any, any>}
   */
  #getValues() {
    const values = new Map();
    this.constructor.fields.forEach((v, k) => {
      if (this[k])values.set(k, this[k]);
    });
    return values;
  }

  // instance methods

  /**
   * @return ORM
   */
  async write() {
    if (this.id) {
      await this.#adapter.update(this.#adapter.processValues());
    } else {
      const adapterClass = this.#adapter.constructor;
      this.id = this.#options.insertID ?? adapterClass.defaultID() ?? ORMAdapter.defaultID();
      this.uuid = adapterClass.uuid() ?? ORMAdapter.uuid();
      await this.#adapter.insert(this.#adapter.processValues());
    }

    return this;
  }

  /**
   *
   * @returns {Promise<ORM>}
   */
  async read() {
    const result = await (
      this.id
        ? this.#readByID()
        : this.#readByValues()
    );

    if (!result) {
      throw new Error(`Record not found. ${this.constructor.name} id:${this.id}`);
    }

    Object.assign(this, result);
    return this;
  }

  async #readByID() {
    return this.#adapter.read();
  }

  async #readByValues() {
    const values = this.#getValues();
    if (values.size === 0) throw new Error(`${this.constructor.name}: No id and no value to read`);
    const results = await this.#adapter.readAll(values, 1);
    return results[0];
  }

  /**
   *
   * @returns {Promise<void>}
   */
  async delete() {
    if (!this.id) throw new Error('ORM delete Error, no id defined');
    await this.#adapter.delete();
  }

  // relation methods
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
   * @returns {Promise<*>}
   */
  async parent(fk) {
    // this fk is null or *, but not undefined
    if (this[fk] === null) return null;
    if (this[fk] === undefined) {
      throw new Error(`${fk} is not foreign key in ${this.constructor.name}`);
    }

    const modelName = this.constructor.belongsTo.get(fk);
    const ModelClass = ORM.require(modelName);
    return ORM.factory(ModelClass, this[fk], { database: this.#database });
  }

  /**
   * has many
   * @param {ORM} MClass
   * @param {string} fk
   * @return {[]}
   */
  async children(fk, MClass = null) {
    const modelNames = this.constructor.hasMany.filter(value => (value[0] === fk));
    if (modelNames.length > 1 && MClass === null) throw new Error('children fk have multiple Models, please specific which Model will be used');
    const ModelClass = MClass || ORM.require(modelNames[0][1]);

    const results = await this.#adapter.hasMany(ModelClass.tableName, fk);
    return results.map(x => Object.assign(new ModelClass(null, { database: this.#database }), x));
  }

  #siblingInfo(model) {
    const m = Array.isArray(model) ? model[0] : model;
    const M = m.constructor;
    const lk = `${this.constructor.joinTablePrefix}_id`;
    const fk = `${M.joinTablePrefix}_id`;

    if (!this.constructor.belongsToMany.has(M.name)) {
      if (!M.belongsToMany.has(this.constructor.name)) {
        throw new Error(`${this.constructor.name} and ${M.name} not have many to many relationship`);
      }

      return {
        joinTableName: `${M.joinTablePrefix}_${this.constructor.tableName}`,
        lk,
        fk,
      };
    }

    return {
      joinTableName: `${this.constructor.joinTablePrefix}_${M.tableName}`,
      lk,
      fk,
    };
  }

  /**
   * Get siblings
   * @param {ORM.} MClass
   * @return {[]}
   */
  async siblings(MClass) {
    const { joinTableName, lk, fk } = this.#siblingInfo(ORM.create(MClass));

    const results = await this.#adapter.belongsToMany(MClass.tableName, joinTableName, lk, fk);
    return results.map(x => Object.assign(ORM.create(MClass, { database: this.#database }), x));
  }

  /**
   * add belongsToMany
   * @param {ORM | ORM[]} model
   * @param {number} weight
   * @returns void
   */
  async add(model, weight = 0) {
    if (!this.id) throw new Error(`Cannot add ${model.constructor.name}. ${this.constructor.name} not have id`);
    // check model is not empty
    if (!model) throw new Error('Error add model, model cannot be null or undefined');
    if (Array.isArray(model) && model.length <= 0) throw new Error('Error add model, model array cannot be empty');

    const { joinTableName, lk, fk } = this.#siblingInfo(model);
    await this.#adapter.add(Array.isArray(model) ? model : [model], weight, joinTableName, lk, fk);
  }

  /**
   * remove
   * @param {ORM| ORM[]} model
   */
  async remove(model) {
    if (!this.id) throw new Error(`Cannot remove ${model.constructor.name}. ${this.constructor.name} not have id`);

    const { joinTableName, lk, fk } = this.#siblingInfo(model);
    await this.#adapter.remove(Array.isArray(model) ? model : [model], joinTableName, lk, fk);
  }

  /**
   *
   * @param MClass
   * @returns {Promise<void>}
   */
  async removeAll(MClass) {
    if (!this.id) throw new Error(`Cannot remove ${MClass.name}. ${this.constructor.name} not have id`);

    const { joinTableName, lk } = this.#siblingInfo(ORM.create(MClass));
    await this.#adapter.removeAll(joinTableName, lk);
  }

  /**
   * @param MClass
   * @param options
   * @param options.database
   * @param options.adapter
   * @param options.insertID
   * @returns {ORM}
   */
  static create(MClass, options = {}) {
    return new MClass(null, options);
  }

  /**
   * Create and read data from database
   * @param MClass
   * @param id
   * @param options
   * @param options.database
   * @param options.adapter
   * @returns {Promise<*>}
   */
  static async factory(MClass, id, options = {}) {
    const m = new MClass(id, options);
    await m.read();
    return m;
  }

  static async #readResult(result, m, creator, asArray){
    if (asArray) return result.map(creator);
    if (result.length === 0) return null;
    if (result.length === 1) return Object.assign(m, result[0]);
    return result.map(creator);
  }

  // Collection methods
  /**
   * read all records from the model
   * @param {ORM.} MClass
   * @param {object} options
   * @param options.database
   * @param options.adapter
   * @param options.kv
   * @param options.limit
   * @param options.offset
   * @param options.orderBy
   * @param options.asArray
   * @returns {Promise<[]|object>}
   */
  static async readAll(MClass, options = {}) {
    const m = ORM.create(MClass, options);
    const result = await m.#adapter.readAll(options.kv, options.limit, options.offset, options.orderBy) || [];

    return this.#readResult(result, m, x => Object.assign(ORM.create(MClass, options), x), options.asArray);
  }

  /**
   *
   * @param MClass
   * @param key
   * @param values
   * @param options
   * @param options.database
   * @param options.adapter
   * @param options.limit
   * @param options.offset
   * @param options.orderBy
   * @param options.asArray
   * @returns {Promise<[]|object>}
   */
  static async readBy(MClass, key, values, options = {}) {
    const m = ORM.create(MClass, options);
    const result = await m.#adapter.readBy(key, values, options.limit, options.offset, options.orderBy);

    return this.#readResult(result, m, x => Object.assign(ORM.create(MClass, options), x), options.asArray);
  }

  /**
   * Given criterias [['', 'id', SQL.EQUAL, 11], [SQL.AND, 'name', SQL.EQUAL, 'peter']]
   * @param MClass
   * @param criteria
   * @param options
   * @param options.database
   * @param options.adapter
   * @param options.limit
   * @param options.offset
   * @param options.orderBy
   * @param options.asArray
   * @returns {Promise<[]|object>}
   */
  static async readWith(MClass, criteria = [], options = {}) {
    if (criteria.length === 0) return [];
    const m = ORM.create(MClass, options);
    const result = await m.#adapter.readWith(criteria, options.limit, options.offset, options.orderBy);

    return this.#readResult(result, m, x => Object.assign(ORM.create(MClass, options), x), options.asArray);
  }

  /**
   *
   * @param MClass
   * @param options
   * @param options.database
   * @param options.adapter
   * @param options.kv
   * @returns {Promise<*>}
   */
  static async count(MClass, options = {}) {
    const m = ORM.create(MClass, options);
    return m.#adapter.count(options.kv);
  }

  static async deleteAll(MClass, options = {}) {
    const m = ORM.create(MClass, options);
    await m.#adapter.deleteAll(options.kv);
  }

  /**
   *
   * @param {ORM.} MClass
   * @param {string} key
   * @param {[]} values
   * @param options
   * @returns {Promise<void>}
   */
  static async deleteBy(MClass, key, values, options = {}) {
    const m = ORM.create(MClass, options);
    return m.#adapter.deleteBy(key, values);
  }

  /**
   * Given criterias [['', 'id', SQL.EQUAL, 11], [SQL.AND, 'name', SQL.EQUAL, 'peter']]
   * @param {ORM.} MClass
   * @param {[[string]]}criteria
   * @param options
   * @returns {Promise<void>}
   */
  static async deleteWith(MClass, criteria, options = {}) {
    if (!criteria || criteria.length === 0) throw new Error(`${MClass.name} delete with no criteria`);

    const m = ORM.create(MClass, options);
    return m.#adapter.deleteWith(criteria);
  }

  /**
   * @param {ORM.} MClass
   * @param options
   * @param {Map} kv
   * @param {Map} columnValues
   */
  static async updateAll(MClass, kv, columnValues, options = {}) {
    const m = ORM.create(MClass, options);
    await m.#adapter.updateAll(kv, columnValues);
  }

  /**
   *
   * @param {ORM.} MClass
   * @param options
   * @param {string} key
   * @param {[]} values
   * @param {Map} columnValues
   * @returns {Promise<void>}
   */
  static async updateBy(MClass, key, values, columnValues, options = {}) {
    const m = ORM.create(MClass, options);
    return m.#adapter.updateBy(key, values, columnValues);
  }

  /**
   * Given criterias [['', 'id', SQL.EQUAL, 11], [SQL.AND, 'name', SQL.EQUAL, 'peter']]
   * @param {ORM.} MClass
   * @param options
   * @param {[[string]]}criteria
   * @param {Map} columnValues
   * @returns {Promise<*>}
   */
  static async updateWith(MClass, criteria, columnValues, options = {}) {
    if (!criteria || criteria.length === 0) throw new Error(`${MClass.name} update with no criteria`);
    if (!columnValues || columnValues.size === 0) throw new Error(`${MClass.name} update without values`);

    const m = ORM.create(MClass, options);
    return m.#adapter.updateWith(criteria, columnValues);
  }

  /**
   *
   * @param {ORM.} MClass
   * @param options
   * @param {string[]} columns
   * @param {[String[]]} values
   * @returns {Promise<void>}
   */
  static async insertAll(MClass, columns, values, options = {}) {
    // verify columns
    columns.forEach(x => {
      if (x === 'id') return;
      if (!MClass.fields.has(x) && !MClass.belongsTo.has(x)) throw new Error(`${MClass.name} insert invalid columns ${x}`);
    });

    const m = ORM.create(MClass, options);
    return m.#adapter.insertAll(columns, values, options.insertIDs || []);
  }

  static require(modelName) {
    return KohanaJS.require(ORM.classPrefix + modelName);
  }
}

Object.freeze(ORM.prototype);
module.exports = ORM;
