const ORMAdapter = require('../../../../../classes/ORMAdapter')

class ORMAdapterTest extends ORMAdapter{
  read(){
    return {
      id: this.client.id,
      created_at: this.client.id,
      updated_at: this.client.id
    }
  }
  async belongsToMany(modelTableName, jointTableName , lk, fk){
    return [];
  }
}

module.exports = ORMAdapterTest;