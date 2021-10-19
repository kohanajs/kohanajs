class DatabaseStatement {
  // eslint-disable-next-line no-useless-constructor,no-empty-function
  constructor(sql) {}

  // eslint-disable-next-line class-methods-use-this
  async run(arg) {}

  // eslint-disable-next-line class-methods-use-this
  async get(arg) { return {}; }

  // eslint-disable-next-line class-methods-use-this
  async all(arg) { return []; }
}

class DatabaseDriver {
  /**
   *
   * @param {string} datasource
   */
  // eslint-disable-next-line no-useless-constructor,no-empty-function
  constructor(datasource) {}

  // eslint-disable-next-line class-methods-use-this
  prepare(sql) { return new DatabaseStatement(sql); }

  // eslint-disable-next-line class-methods-use-this
  async transaction(fn) {
    await this.transactionStart();
    try{
      await fn();
    }catch(e){
      await this.transactionRollback();
      throw e;
    }
    await this.transactionCommit();
  }

  // eslint-disable-next-line class-methods-use-this
  async exec(sql) {
    console.log('Database exec using Abstract DatabaseDriver');
    console.log(sql);
  }

  // eslint-disable-next-line class-methods-use-this
  async close() {}

  // eslint-disable-next-line class-methods-use-this
  async transactionStart(){}

  // eslint-disable-next-line class-methods-use-this
  async transactionRollback(){}

  // eslint-disable-next-line class-methods-use-this
  async transactionCommit(){}

  // eslint-disable-next-line class-methods-use-this
  async checkpoint(){}

  /**
   *
   * @param {string} datasource
   * @returns {function | Object | DatabaseDriver}
   */
  static create(datasource) {
    return new DatabaseDriver(datasource);
  }
}

module.exports = DatabaseDriver;
