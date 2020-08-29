const ORM = require('../../../../../../classes/ORM');

class Person extends ORM{
  constructor(key, options) {
    super(key, options);

    //foreignKeys


    //fields
    this.first_name = null;
    this.last_name = null;
    this.phone = null;
    this.email = null;
    this.idx = null;
  }
}

Person.joinTablePrefix = 'person';
Person.tableName = 'persons';

Person.fields = new Map([
  ['first_name','String'],
  ['last_name','String'],
  ['phone','String'],
  ['email','String'],
  ['idx','String']
]);

Person.belongsTo = new Map([
  
]);

Person.hasMany   = [
  ['person_id', 'User']
];

Person.belongsToMany = [
  
];


module.exports = Person;
