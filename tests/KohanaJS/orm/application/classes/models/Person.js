const ORM = require('../../../../../../classes/ORM');

class Person extends ORM{
  constructor(id, db) {
    super(id, db);

    if(id)return;

    //foreignKeys


    //fields
    this.first_name = null;
    this.last_name = null;
    this.phone = null;
    this.email = null;
  }
}

Person.jointTablePrefix = 'person';
Person.tableName = 'persons';

Person.fields = new Map([
  ['first_name', 'String'],
  ['last_name', 'String'],
  ['phone', 'String'],
  ['email', 'String']
]);

Person.belongsTo = new Map([
  
]);

Person.hasMany = [
  ['person_id', 'Address'],
  ['person_id', 'User'],
  ['person_id', 'Customer']
];

Person.belongsToMany = [
  
];


module.exports = Person;
