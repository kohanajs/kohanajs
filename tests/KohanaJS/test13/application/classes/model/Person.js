const ORM = require('../../../../../../classes/ORM');

class Person extends ORM{
  constructor(id, options) {
    super(id, options);
    if(id)return;

    this.enable = null;
  }
}

Person.joinTablePrefix = 'person';
Person.tableName = 'persons';

Person.fields = new Map([
  ['enable','Boolean']
]);

Person.belongsTo = new Map([
  
]);

Person.hasMany   = [
];

Person.belongsToMany = [
];


module.exports = Person;
