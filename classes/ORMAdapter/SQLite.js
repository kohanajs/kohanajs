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

  async remove(models, jointTableName, lk, fk){
    const ids = models.map(x=> x.id);
    const sql = `DELETE FROM ${jointTableName} WHERE ${lk} = ${this.client.id} AND ${fk} IN (${ids.map(()=>'?').join(', ')})`;
    this.database.prepare(sql).run(...ids);
  }

  async removeAll(jointTablename, lk){
    this.database.prepare(`DELETE FROM ${jointTablename} WHERE ${lk} = ?`).run(this.client.id);
  }

  async readResult(readSingleResult, sql, values){
    const statement = this.database.prepare(sql);

    if(readSingleResult){
      const result = statement.get(...values);
      if(!result)return [];
      return [result];
    }else{
      return statement.all(...values);
    }
  }

  async readAll(kv, readSingleResult = false){
    if(!kv){
      return await this.readResult(readSingleResult,
        `SELECT * FROM ${this.tableName}`,
        []
      );
    }

    return await this.readResult(readSingleResult,
      `SELECT * FROM ${this.tableName} WHERE ${Array.from(kv.keys()).map( k => `${k} = ?`).join(' AND ')}`,
      this.translateValue(Array.from(kv.values()))
    );
  }

  async readBy(key, values, readSingleResult = false){
    return await this.readResult(readSingleResult,
      `SELECT * FROM ${this.tableName} WHERE ${key} IN (${values.map(() => "?").join(", ")})`,
      this.translateValue(values));
  }

  async readWith(criteria, readSingleResult = false){
    const wheres = this.formatCriteria(criteria);
    return await this.readResult(readSingleResult, `SELECT * FROM ${this.tableName} WHERE ${wheres.join('')}`, []);
  }

  async deleteAll(kv){
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

  async insertAll(columns, valueGroups, ids){
    const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}, id) VALUES ${valueGroups.map(values=> '(' + values.map(()=>'?').join(', ')+', ?)').join(', ')}`
    //valueGroup need to process, add id, translateValues
    const newValueGroups = valueGroups.map((values, i) => {
      const newValues = this.translateValue(values);
      newValues.push(ids[i] || this.defaultID());
      return newValues;
    });
    return this.database.prepare(sql).run(...newValueGroups.flat());
  }
}

module.exports = ORMAdapterSQLite;