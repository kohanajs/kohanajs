const ORMAdapter = require('../../../../../classes/ORMAdapter')

class ORMAdapterTest extends ORMAdapter{
  read(){
    if(this.client.constructor.name === 'Address' && this.client.id === 11){
      return {
        id: this.client.id,
        created_at: this.client.id,
        updated_at: this.client.id,
        person_id: 2
      }
    }

     if(this.client.id < 100) return {
      id: this.client.id,
      created_at: this.client.id,
      updated_at: this.client.id
    };

    return null;
  }
  async belongsToMany(modelTableName, jointTableName , lk, fk){
    if(modelTableName === 'tags' && this.client.id === 22){
      return [
        {id: 33, name: 'Foo'},
        {id: 34, name: 'Bar'}
      ]
    }
    return [];
  }

  async hasMany(tableName, key){
    return [];
  }

  async readAll(kv, limit=1000, offset=0, orderBy= new Map([['id', 'ASC']])){
    if(this.client.constructor.name === 'Product' && this.client.name === 'Foo'){
      return [{id: 88}];
    }

    if(kv && kv.get('name') === 'test'){
      return [
        {id: 55},
        {id: 66},
        {id: 77}
      ]
    }

    if(kv && kv.get('name') === 'one'){
      return [
        {id: 55},
      ]
    }

    return [];
  }

  async readBy(key, values, limit=1000, offset=0, orderBy= new Map([['id', 'ASC']])){
    if(this.client.constructor.name === 'Product' && key === "name" && values[0] === 'test'){
      return [
        {id:22},
        {id:33}
      ]
    }

    return [];
  }

  async readWith(criteria, limit=1000, offset=0, orderBy= new Map([['id', 'ASC']])){
    if(this.client.constructor.name === 'Product' && criteria[0][1] === 'price' && criteria[0][3] === '100' && criteria[1][0] === 'AND' ){
      return [
        {id: 11},
        {id: 22}
      ]
    }
    return [];
  }
}

module.exports = ORMAdapterTest;