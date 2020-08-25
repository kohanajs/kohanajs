const ORMAdapter = require('../ORMAdapter');

class ORMAdapterSQLite extends ORMAdapter{
  static OP = Object.assign({}, ORMAdapter.OP, {
    NOT_EQUAL: '!=',
    TRUE : 1,
    FALSE : 0,
  })

  translateValue(values){
    return values.map(x =>{
      if(typeof x === 'boolean')return x ? 1 : 0;
      if(x === null)return 'NULL';
      return x;
    })
  }

  async read(){
     return this.database.prepare(`SELECT * from ${this.tableName} WHERE id = ?`).get(this.client.id);
  }

  async update(values){
    this.database.prepare(`UPDATE ${this.tableName} SET ${this.client.columns.map(x => `${x} = ?`).join(', ')} WHERE id = ?`).run(...values, this.client.id);
  }

  async insert(values){
    this.database.prepare(`INSERT OR IGNORE INTO ${this.tableName} (${this.client.columns.join(', ')}, id) VALUES (?, ${this.client.columns.map(x => `?`).join(', ')})`).run(...values, this.client.id);
  }

  async delete(){
    this.database.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`).run(this.client.id);
  }

  async hasMany(tableName, key){
    return this.database.prepare(`SELECT * FROM ${tableName} WHERE ${key} = ?`).all(this.client.id);
  }

  async belongsToMany(modelTableName, jointTableName , lk, fk){
    return this.database.prepare(`SELECT ${modelTableName}.* FROM ${modelTableName} JOIN ${jointTableName} ON ${modelTableName}.id = ${jointTableName}.${fk} WHERE ${jointTableName}.${lk} = ? ORDER BY ${jointTableName}.weight`).all(this.client.id);
  }

  async add(models, weight, jointTableName, lk, fk){
    const ids = models.map(x=> x.id);
    const values = models.map((x, i) =>`(${this.client.id} , ?, ${weight + (i * 0.000001)})`);
    this.database.prepare(`INSERT OR IGNORE INTO ${jointTableName} (${lk}, ${fk}, weight) VALUES ${values.join(', ')}`).run(...ids);
  }

  async remove(model, jointTableName, lk, fk){
    this.database.prepare(`DELETE FROM ${jointTableName} WHERE ${lk} = ? AND ${fk} = ?`).run(this.client.id, model.id);
  }

  async removeAll(jointTablename, lk){
    this.database.prepare(`DELETE FROM ${jointTablename} WHERE ${lk} = ?`).run(this.client.id);
  }

  async readAll(kv=null){
    if(!kv)return this.database.prepare(`SELECT * from ${this.tableName}`).all();
    const v = this.translateValue(Array.from(kv.values()));
    return this.database.prepare(`SELECT * FROM ${this.tableName} WHERE ${Array.from(kv.keys()).map( k => `${k} = ?`).join(' AND ')}`).all(...v);
  }

  async readBy(key, values){
    const v = this.translateValue(values);
    return this.database.prepare(`SELECT * FROM ${this.tableName} WHERE ${key} IN (${v.map(() => "?").join(", ")})`).all(...v);
  }

  async readWith(criteria){
    const wheres = this.formatCriteria(criteria);
    const sql = `SELECT * FROM ${this.tableName} WHERE ${wheres.join('')}`;
//    console.log(sql);
    return this.database.prepare(sql).all();
  }

  async deleteAll(kv=null){
    if(!kv)return this.database.prepare(`DELETE FROM ${this.tableName}`).run();
    const v = this.translateValue(Array.from(kv.values()));
    return this.database.prepare(`DELETE FROM ${this.tableName} WHERE ${Array.from(kv.keys()).map( k => `${k} = ?`).join(' AND ')}`).run(...v);
  }

  async deleteBy(key, values){
    const v = this.translateValue(values);
    return this.database.prepare(`DELETE FROM ${this.tableName} WHERE ${key} IN (${v.map(() => "?").join(", ")})`).run(...v);
  }

  async deleteWith(criteria){
    const wheres = this.formatCriteria(criteria);
    const sql = `DELETE FROM ${this.tableName} WHERE ${wheres.join('')}`;
//    console.log(sql);
    return this.database.prepare(sql).run();
  }

  async updateAll(kv, columnValues){
    const keys = Array.from(columnValues.keys());
    const newValues = this.translateValue(Array.from(columnValues.values()));
    if(!kv)return this.database.prepare(`UPDATE ${this.tableName} SET ${keys.map(key => `${key} = ?`)}`).run(...newValues);
    const v = this.translateValue(Array.from(kv.values()));
    return this.database.prepare(`UPDATE ${this.tableName} SET ${keys.map(key => `${key} = ?`)} WHERE ${Array.from(kv.keys()).map( k => `${k} = ?`).join(' AND ')}`).run(...newValues, ...v);
  }

  async updateBy(key, values, columnValues){
    const keys = Array.from(columnValues.keys());
    const newValues = this.translateValue(Array.from(columnValues.values()));
    const v = this.translateValue(values);
    return this.database.prepare(`UPDATE ${this.tableName} SET ${keys.map(key => `${key} = ?`)} WHERE ${key} IN (${v.map(() => "?").join(", ")})`).run(...newValues, ...v);
  }

  async updateWith(criteria, columnValues){
    const keys = Array.from(columnValues.keys());
    const newValues = this.translateValue(Array.from(columnValues.values()));

    const wheres = this.formatCriteria(criteria);
    const sql = `UPDATE ${this.tableName} SET ${keys.map(key => `${key} = ?`)} WHERE ${wheres.join('')}`;
    return this.database.prepare(sql).run(...newValues);
  }
}

module.exports = ORMAdapterSQLite;