const ORMAdapter = require('../ORMAdapter');

class ORMAdapterSQLite extends ORMAdapter{
  processValues(){
    return this.client.columns.map(x => {
      const value = this.client[x];
      if(typeof value === 'boolean'){
        return this.client[x] ? 1 : 0;
      }
      return this.client[x]
    });
  }

  getUpdateStatement() {
    return `UPDATE ${this.client.constructor.tableName} SET ${this.client.columns.map(x => `${x} = ?`).join(', ')} WHERE id = ?`;
  }

  getInsertStatement(){
    return `INSERT OR IGNORE INTO ${this.client.constructor.tableName} (${this.client.columns.join(', ')}, id) VALUES (?, ${this.client.columns.map(x => `?`).join(', ')})`;
  }

  async load(){
     return this.database.prepare(`SELECT * from ${this.client.constructor.tableName} WHERE id = ?`).get(this.client.id);
  }

  async save(sql, values){
    if(!this.database)throw new Error('Database not assigned.');
    const result = this.database.prepare(sql).run(...values);

    if(this.client.idx !== undefined){
      this.client.idx = result.lastInsertRowid;
    }
  }

  async delete(){
    const tableName = this.client.constructor.tableName;
    this.database.prepare(`DELETE FROM ${tableName} WHERE id = ?`).run(this.client.id);
  }

  async add(model, weight, jointTableName, lk, fk){
    this.database.prepare(`INSERT OR IGNORE INTO ${jointTableName} (${lk}, ${fk}, weight) VALUES (?, ?, ?)`).run(this.client.id, model.id, weight);
  }

  async remove(model, jointTableName, lk, fk){
    this.database.prepare(`DELETE FROM ${jointTableName} WHERE ${lk} = ? AND ${fk} = ?`).run(this.client.id, model.id);
  }

  async hasMany(tableName, key){
    return this.database.prepare(`SELECT * FROM ${tableName} WHERE ${key} = ?`).all(this.client.id);
  }

  async belongsToMany(modelTableName, jointTableName , lk, fk){
    const sql = `SELECT ${modelTableName}.* FROM ${modelTableName} JOIN ${jointTableName} ON ${modelTableName}.id = ${jointTableName}.${fk} WHERE ${jointTableName}.${lk} = ? ORDER BY ${jointTableName}.weight`;
    return this.database.prepare(sql).all(this.client.id);
  }

  async all(){
    const model = this.client.constructor;
    return this.database.prepare(`SELECT * from ${model.tableName}`)
      .all()
      .map(x => Object.assign(new model(null, {database: this.database}), x));
  }

  async find(keys, values){
    const tableName = this.client.constructor.tableName;
    const sql = `SELECT * FROM ${tableName} WHERE ${keys.map( k => `${k} = ?`).join(' AND ')}`;

    return this.database.prepare(sql).get(...values);
  }
}

module.exports = ORMAdapterSQLite;