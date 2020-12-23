class DatabaseStatement{
  constructor(sql) {}
  async run(arg){}
  async get(arg){return {}}
  async all(arg){return []}
}

class DatabaseDriver{
  constructor(datasource) {}
  prepare(sql){return new DatabaseStatement(sql)}
  async transaction(fn){}
  async exec(sql){}
  async close(){}

  /**
   *
   * @param {string} datasource
   * @returns {function | Object | DatabaseDriver}
   */
  static create(datasource){
    return new DatabaseDriver(datasource);
  }
}

module.exports = DatabaseDriver;