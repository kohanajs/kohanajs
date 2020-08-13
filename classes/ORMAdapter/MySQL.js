const ORMAdapter = require('../ORMAdapter');

class ORMAdapterSQL extends ORMAdapter{
  processValues(){
    return this.client.columns.map(x => {
      const value = this[x];
      if(typeof value === 'boolean'){
        return this[x] ? 'TRUE' : 'FALSE';
      }
      return this[x]
    });
  }

  getUpdateStatement() {
    return `UPDATE ${this.client.constructor.tableName} SET ${this.client.columns.map(x => `${x} = ?`).join(', ')} WHERE id = ?`;
  }

  getInsertStatement(){
    return `INSERT IGNORE INTO ${this.client.constructor.tableName} (${this.client.columns.join(', ')}, id) VALUES (?, ${this.client.columns.map(x => `?`).join(', ')})`;
  }

  async load(){
    return await this.database.prepare(`SELECT * from ${this.constructor.tableName} WHERE id = ?`).get(this.client.id);
  }

  async save(sql, values){
    await this.database.prepare(sql).run(...values);

//    if(this.idx !== undefined){
//      this.idx = result.lastInsertRowid;
//    }
  }

  async delete(){
    const tableName = this.constructor.tableName;
    await this.database.prepare(`DELETE FROM ${tableName} WHERE id = ?`).run(this.client.id);
  }

  async add(model, weight, jointTableName, lk, fk){
    await this.database.prepare(`INSERT OR IGNORE INTO ${jointTableName} (${lk}, ${fk}, weight) VALUES (?, ?, ?)`).run(this.client.id, model.id, weight);
  }

  async remove(model, jointTableName, lk, fk){
    await this.database.prepare(`DELETE FROM ${jointTableName} WHERE ${lk} = ? AND ${fk} = ?`).run(this.client.id, model.id);
  }

  async hasMany(tableName, key){
    return await this.database.prepare(`SELECT * FROM ${tableName} WHERE ${key} = ?`).all(this.client.id);
  }

  async belongsToMany(modelTableName, jointTableName , lk, fk){
    const sql = `SELECT ${modelTableName}.* FROM ${modelTableName} JOIN ${jointTableName} ON ${modelTableName}.id = ${jointTableName}.${fk} WHERE ${jointTableName}.${lk} = ? ORDER BY ${jointTableName}.weight`;
    return await this.database.prepare(sql).all(this.client.id);
  }

  async all(){
    const model = this.client.constructor;
    const results = await this.database.prepare(`SELECT * from ${model.tableName}`).all();
    return results.map(x => Object.assign(new model(null, {database: this.database}), x));
  }

  async find(keys, values){
    const tableName = this.client.constructor.tableName;
    const sql = `SELECT * FROM ${tableName} WHERE ${keys.map( k => `${k} = ?`).join(' AND ')}`;

    return await this.database.prepare(sql).get(...values);
  }
}

module.exports = ORMAdapterSQL;