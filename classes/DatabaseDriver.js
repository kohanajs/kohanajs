class DatabaseStatement{
  constructor(sql) {}
  async run(arg){}
  async get(arg){}
  async all(arg){}
}

class DatabaseDriver{
  constructor(datasource) {}
  prepare(sql){return new DatabaseStatement(sql)}
  transaction(fn){}
  exec(sql){}
  close(){}

  /**
   *
   * @param {string} datasource
   * @returns {function | Object | DatabaseDriver}
   */
  async static create(datasource){
    return new DatabaseDriver(datasource);
  }
}

DatabaseDriver.defaultDriver = DatabaseDriver;
module.exports = DatabaseDriver;