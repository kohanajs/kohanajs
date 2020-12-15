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
  //ORM is abstract, joinTablePrefix and tableName is null.
  static database = null;

  static tableName = null;
  //associative (junction) table name prefix
  static joinTablePrefix = null;
  static fields = new Map();
  static belongsTo = new Map();
  //hasMany cannot be Map, because children models may share same fk name.
  static hasMany = [];
  static belongsToMany = new Set();

  static defaultAdapter = require('./ORMAdapter/SQLite');
  static classPrefix = 'model/';

  created_at = null;
  updated_at = null;

  #generateMissingTableName(){
    if(this.constructor === ORM || this.constructor.tableName || this.constructor.joinTablePrefix)return;
    this.constructor.tableName = pluralize(this.constructor.name).toLowerCase();
    this.constructor.joinTablePrefix = pluralize.singular(this.constructor.tableName);
   }

  constructor(id = null, options = {}){
    super();
    //auto generate table name
    this.#generateMissingTableName();

    //ORM may use
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

    //private property options
    Object.defineProperty(this, "states", {
      enumerable : false,
      value : []
    });

    const Adapter = options.adapter || this.constructor.defaultAdapter;
    const adapter = new Adapter(this, this["database"]);

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

  snapshot(){
    this.states.push(Object.assign({}, this));
  }

  /**
   *
   * @param {object} option
   * @returns {Promise<void>}
   */
  async eagerLoad(option = {}){
    /*options format, eg product
    * {
    * with:['Product'], //1. only with Classes will be loaded, 2. pass null to skip all classses and 3. undefined will load all classes
    * default_image:{}
    * type:{}
    * vendor:{}
    * variants:{
    *  children:true,
    *  siblings:true,
    *  inventories :{}
    *  media: {}
    * },
    * media:{}
    * tags:{}
    * options:{}
    * }
    * */

    const allowClasses = (option['with'] !== undefined) ? new Set(option['with']) : null;

    const parents = [];
    this.constructor.belongsTo.forEach((v, k)=>{
      const name = k.replace('_id', '');
      const opt = option[name];

      if(!opt)return;
      parents.push(async () => ({ "name" : name, "instance": await this.parent(k), "opt": opt}));
    });

    for(let i=0; i< parents.length; i++){
      const x = await parents[i]();
      if(!x.instance)continue; //parent can be null

      this[x.name] = x.instance;
      await x.instance.eagerLoad(x.opt)
    }

    const props = [];
    this.constructor.hasMany.forEach( x =>{
      const k = x[0];

      if(allowClasses && !allowClasses.has(x[1]))return

      const Model = ORM.require(x[1]);
      const name = Model.tableName;
      const opt = option[name];
      if(!opt)return;
      props.push(async () => ({ "name" : name, "instances": await this.children(k, Model), "opt": opt}));
    });

    this.constructor.belongsToMany.forEach(x => {
      if(allowClasses && !allowClasses.has(x))return;

      const Model = ORM.require(x);
      const name = Model.tableName;
      const opt = option[name];
      if (!opt) return;
      props.push(async () => ({"name": name, "instances": await this.siblings(Model), "opt": opt}));
    });

    for(let i=0; i< props.length; i++){
      const x = await props[i]();
      this[x.name] = x.instances;

      for(let j=0 ; j< x.instances.length; j++){
        const ins = x.instances[j];
        await ins.eagerLoad(x.opt);
      }
    }
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
      this.id = this.options.insertID || this.adapter.defaultID();
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

    if(!result ){
      throw new Error(`Record not found. ${this.constructor.name} id:${this.id}` );
    }

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
   * @returns {Promise<*>}
   */
  async parent(fk){
    //this fk is null or *, but not undefined
    if(this[fk] === null)return null;
    if(this[fk] === undefined){
      throw new Error(`${fk} is not foreign key in ${this.constructor.name}`);
    }

    const modelName = this.constructor.belongsTo.get(fk);
    const Model = ORM.require(modelName);
    return await ORM.factory(Model, this[fk], {database: this.database});
  }

  /**
   * has many
   * @param {ORM} Model
   * @param {string} fk
   * @return {[]}
   */
  async children(fk, Model= null){
    const modelNames = this.constructor.hasMany.filter( value => (value[0] === fk));
    if(modelNames.length > 1 && Model === null)throw new Error('children fk have multiple Models, please specific which Model will be used');
    const ModelClass = Model || ORM.require(modelNames[0][1]);

    const results = await this.adapter.hasMany(ModelClass.tableName, fk);
    return results.map(x => Object.assign(new ModelClass(null, {database : this.database}), x));
  }

  #siblingInfo(model){
    const m = Array.isArray(model) ? model[0] : model;
    const lk = this.constructor.joinTablePrefix + '_id';
    const fk = m.constructor.joinTablePrefix + '_id';

    if( !this.constructor.belongsToMany.has(m.constructor.name) ){
      if(!m.constructor.belongsToMany.has(this.constructor.name)){
        throw new Error(`${this.constructor.name} and ${m.constructor.name} not have many to many relationship`);
      }

      return {
        joinTableName : `${m.constructor.joinTablePrefix}_${this.constructor.tableName}`,
        lk: lk,
        fk: fk
      }
    }

    return {
      joinTableName: `${this.constructor.joinTablePrefix}_${m.constructor.tableName}`,
      lk: lk,
      fk: fk
    }
  }

  /**
   * Get siblings
   * @param {Function<ORM>} Model
   * @return {[]}
   */
  async siblings(Model){
    if(!this.constructor.belongsToMany.has(Model.name))throw new Error(`${this.constructor.name} not have sibling type ${Model.name}`);
    const {joinTableName, lk, fk} = this.#siblingInfo(ORM.create(Model));

    const results = await this.adapter.belongsToMany(Model.tableName, joinTableName, lk, fk);
    return results.map(x => Object.assign(ORM.create(Model, {database : this.database}), x));
  }

  /**
   * add belongsToMany
   * @param {ORM | ORM[]} model
   * @param {number} weight
   * @returns void
   */
  async add(model, weight = 0){
    if(!this.id)throw new Error(`Cannot add ${model.constructor.name}. ${this.constructor.name} not have id`);
    //check model is not empty
    if(!model)throw new Error(`Error add model, model cannot be null or undefined`);
    if(Array.isArray(model) && model.length <= 0)throw new Error(`Error add model, model array cannot be empty`);

    const {joinTableName, lk, fk} = this.#siblingInfo(model);
    await this.adapter.add(Array.isArray(model) ? model : [model], weight, joinTableName, lk, fk);
  }

  /**
   * remove
   * @param {ORM| ORM[]} model
   */
  async remove(model){
    if(!this.id)throw new Error(`Cannot remove ${model.constructor.name}. ${this.constructor.name} not have id`);

    const {joinTableName, lk, fk} = this.#siblingInfo(model);
    await this.adapter.remove(Array.isArray(model) ? model : [model], joinTableName, lk, fk);
  }

  /**
   *
   * @param Model
   * @returns {Promise<void>}
   */
  async removeAll(Model){
    if(!this.id)throw new Error(`Cannot remove ${Model.name}. ${this.constructor.name} not have id`);

    const {joinTableName, lk} = this.#siblingInfo(ORM.create(Model));
    await this.adapter.removeAll(joinTableName, lk);
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
   * @param {Function<ORM>} Model
   * @param {object} options
   * @returns {Promise<[]|object>}
   */
  static async readAll (Model, options={}){
    const opt = Object.assign({database: this.database}, options);
    const m = ORM.create(Model, opt);
    const result = await m.adapter.readAll(opt.kv, opt.readSingleResult === true, opt.limit, opt.offset, opt.orderBy);

    if(options.asArray)return result.map(x => Object.assign( ORM.create(Model, options), x));
    if(result.length === 0)return null;
    if(result.length === 1)return Object.assign(m, result[0]);
    return result.map(x => Object.assign( ORM.create(Model, options), x));
  }
  /**
   *
   * @param Model
   * @param key
   * @param values
   * @param options
   * @returns {Promise<[]|object>}
   */
  static async readBy (Model, key, values, options={}) {
    const opt = Object.assign({database: this.database}, options);
    const m = ORM.create(Model, opt);
    const result = await m.adapter.readBy(key, values, options.readSingleResult === true, options.limit, options.offset, options.orderBy);

    if(options.asArray)return result.map(x => Object.assign( ORM.create(Model, options), x));
    if(result.length === 0)return null;
    if(result.length === 1)return Object.assign(m, result[0]);
    return result.map(x => Object.assign( ORM.create(Model, options), x));
  }

  /**
   * Given criterias [['', 'id', SQL.EQUAL, 11], [SQL.AND, 'name', SQL.EQUAL, 'peter']]
   * @param Model
   * @param criteria
   * @param options
   * @returns {Promise<[]|object>}
   */
  static async readWith (Model, criteria=[], options = {}){
    if(criteria.length === 0)return [];
    const opt = Object.assign({database: this.database}, options);
    const m = ORM.create(Model, opt);
    const result = await m.adapter.readWith(criteria, options.readSingleResult === true, options.limit, options.offset, options.orderBy);

    if(options.asArray)return result.map(x => Object.assign( ORM.create(Model, options), x));
    if(result.length === 0)return null;
    if(result.length === 1)return Object.assign(m, result[0]);
    return result.map(x => Object.assign( ORM.create(Model, options), x));
  }

  static async count (Model, options={}){
    const m = ORM.create(Model, Object.assign({database: this.database}, options));
    return await m.adapter.count(options.kv);
  }

  static async deleteAll(Model, options={}){
    const m = ORM.create(Model, Object.assign({database: this.database}, options));
    await m.adapter.deleteAll(options.kv);
  }

  /**
   *
   * @param {Function<ORM>} Model
   * @param {string} key
   * @param {[]} values
   * @param options
   * @returns {Promise<void>}
   */
  static async deleteBy (Model, key, values, options={}) {
    const m = ORM.create(Model, Object.assign({database: this.database}, options));
    return m.adapter.deleteBy(key, values);
  }

  /**
   * Given criterias [['', 'id', SQL.EQUAL, 11], [SQL.AND, 'name', SQL.EQUAL, 'peter']]
   * @param {Function<ORM>} Model
   * @param {[[string]]}criteria
   * @param options
   * @returns {Promise<void>}
   */
  static async deleteWith (Model, criteria, options = {}){
    if(!criteria || criteria.length === 0)throw new Error(`${Model.name} delete with no criteria`);

    const m = ORM.create(Model, Object.assign({database: this.database}, options));
    return await m.adapter.deleteWith(criteria);
  }

  /**
   * @param {Function<ORM>} Model
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
   * @param {Function<ORM>} Model
   * @param options
   * @param {string} key
   * @param {[]} values
   * @param {Map} columnValues
   * @returns {Promise<void>}
   */
  static async updateBy (Model, key, values, columnValues, options={}) {
    const m = ORM.create(Model, Object.assign({database: this.database}, options));
    return m.adapter.updateBy(key, values, columnValues);
  }

  /**
   * Given criterias [['', 'id', SQL.EQUAL, 11], [SQL.AND, 'name', SQL.EQUAL, 'peter']]
   * @param {Function<ORM>} Model
   * @param options
   * @param {[[string]]}criteria
   * @param {Map} columnValues
   * @returns {Promise<*>}
   */
  static async updateWith (Model, criteria, columnValues, options = {}){
    if(!criteria || criteria.length === 0)throw new Error(`${Model.name} update with no criteria`);
    if(!columnValues || columnValues.size === 0)throw new Error(`${Model.name} update without values`);

    const m = ORM.create(Model, Object.assign({database: this.database}, options));
    return await m.adapter.updateWith(criteria, columnValues);
  }

  /**
   *
   * @param {Function<ORM>} Model
   * @param options
   * @param {string[]} columns
   * @param {[String[]]} values
   * @returns {Promise<void>}
   */
  static async insertAll(Model, columns, values, options={}){
    //verify columns
    columns.forEach(x => {
      if(x === 'id')return;
      if(!Model.fields.has(x))throw new Error(`${Model.name} insert invalid columns ${x}`);
    })

    const m = ORM.create(Model, Object.assign({database: this.database}, options));
    return await m.adapter.insertAll(columns, values, options.insertIDs || []);
  }

  static require(modelName){
    return KohanaJS.require(ORM.classPrefix + modelName);
  }
}

Object.freeze(ORM.prototype);
module.exports = ORM;