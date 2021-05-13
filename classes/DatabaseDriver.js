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
  // eslint-disable-next-line no-useless-constructor,no-empty-function
  constructor(datasource) {}

  // eslint-disable-next-line class-methods-use-this
  prepare(sql) { return new DatabaseStatement(sql); }

  // eslint-disable-next-line class-methods-use-this
  async transaction(fn) {}

  // eslint-disable-next-line class-methods-use-this
  async exec(sql) {}

  // eslint-disable-next-line class-methods-use-this
  async close() {}

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
