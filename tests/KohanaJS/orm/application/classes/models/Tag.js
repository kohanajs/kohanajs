const ORM = require('../../../../../../classes/ORM');

class Tag extends ORM{
  constructor(id, db) {
    super(id, db);

    if(id)return;

    //foreignKeys


    //fields
    this.name = null;
  }
}

Tag.jointTablePrefix = 'tag';
Tag.tableName = 'tags';

Tag.fields = new Map([
  ['name', 'String']
]);

Tag.belongsTo = new Map([
  
]);

Tag.hasMany = [
  
];

Tag.belongsToMany = [
  
];


module.exports = Tag;
