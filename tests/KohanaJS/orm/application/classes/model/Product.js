const ORM = require('../../../../../../classes/ORM');

class Product extends ORM{
  constructor(id, db) {
    super(id, db);

    if(id)return;

    //foreignKeys
    this.default_image_id = null;
    this.type_id = null;
    this.vendor_id = null;

    //fields
    this.name = null;
    this.content = null;
    this.handle = null;
    this.title = null;
    this.description = null;
    this.template_suffix = null;
    this.available = null;
  }
}

Product.jointTablePrefix = 'product';
Product.tableName = 'products';

Product.fields = new Map([
  ['name', 'String'],
  ['content', 'String'],
  ['handle', 'String'],
  ['title', 'String'],
  ['description', 'String'],
  ['template_suffix', 'String'],
  ['available', 'Boolean!'],
]);

Product.belongsTo = new Map([
  ['default_image_id', 'Image'],
  ['type_id', 'Type'],
  ['vendor_id', 'Vendor']
]);

Product.hasMany = [
  ['product_id', 'Variant'],
  ['product_id', 'LineItem'],
  ['product_id', 'GiftCard']
];

Product.belongsToMany = [
  'Tag',
];


module.exports = Product;
