const ORM = require('../../../../../classes/ORM');

class AliasModel extends ORM{
}

AliasModel.tableName = 'testmodels';
AliasModel.joinTablePrefix = 'testmodel';

module.exports = AliasModel;