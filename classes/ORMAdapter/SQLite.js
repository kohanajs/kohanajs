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
      return x;
    })
  }

  async load(){
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

  async hasMany(tableName, key){
    return this.database.prepare(`SELECT * FROM ${tableName} WHERE ${key} = ?`).all(this.client.id);
  }

  async belongsToMany(modelTableName, jointTableName , lk, fk){
    return this.database.prepare(`SELECT ${modelTableName}.* FROM ${modelTableName} JOIN ${jointTableName} ON ${modelTableName}.id = ${jointTableName}.${fk} WHERE ${jointTableName}.${lk} = ? ORDER BY ${jointTableName}.weight`).all(this.client.id);
  }

  async find(kv){
    const v = this.translateValue(Array.from(kv.values()));
    return this.database.prepare(`SELECT * FROM ${this.tableName} WHERE ${Array.from(kv.keys()).map( k => `${k} = ?`).join(' AND ')}`).get(...v);
  }

  async all(){
    return this.database.prepare(`SELECT * from ${this.tableName}`).all()
  }

  async filterBy(key, values){
    const v = this.translateValue(values);
    return this.database.prepare(`SELECT * FROM ${this.tableName} WHERE ${key} in (${v.map(() => "?").join(", ")})`).all(...v);
  }

  async filter(criteria){
    const wheres = this.formatCriteria(criteria);
    const sql = `SELECT * FROM ${this.tableName} WHERE ${wheres.join('')}`;
//    console.log(sql);
    return this.database.prepare(sql).all();
  }

  async deleteBy(key, values){
    const v = this.translateValue(values);
    return this.database.prepare(`DELETE FROM ${this.tableName} WHERE ${key} in (${v.map(() => "?").join(", ")})`).run(...v);
  }

  async deleteWith(criteria){
    const wheres = this.formatCriteria(criteria);
    const sql = `DELETE FROM ${this.tableName} WHERE ${wheres.join('')}`;
//    console.log(sql);
    return this.database.prepare(sql).run();
  }
}

module.exports = ORMAdapterSQLite;