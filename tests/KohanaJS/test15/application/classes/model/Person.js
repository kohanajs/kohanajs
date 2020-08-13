const ORM = require('../../../../../../classes/ORM');

class Person extends ORM{
  constructor(id, options) {
    super(id, options);
    if(id)return;

    this.enable = null;
    this.name = null;
    this.email = null;
  }
}

Person.jointTablePrefix = 'person';
Person.tableName = 'persons';

Person.fields = new Map([
  ['enable','Boolean'],
  ['name','String'],
  ['email','String'],
]);

Person.belongsTo = new Map([
  
]);

Person.hasMany   = [
];

Person.belongsToMany = [
];


module.exports = Person;
``