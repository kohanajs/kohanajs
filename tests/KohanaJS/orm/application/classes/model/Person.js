const ORM = require('../../../../../../classes/ORM');

class Person extends ORM{
  first_name;
  last_name;
  phone;
  email;

  static joinTablePrefix = 'person';
  static tableName = 'persons';

  static fields = new Map([
    ['first_name', 'String'],
    ['last_name', 'String'],
    ['phone', 'String'],
    ['email', 'String']
  ]);

  static hasMany = [
    ['person_id', 'Address'],
    ['person_id', 'User'],
    ['person_id', 'Customer'],
  ];
}

module.exports = Person;
