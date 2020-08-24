const {AND, EQUAL, OR, TRUE, FALSE, START_GROUP, END_GROUP} = require('@kohanajs/constants').SQL;
const ORM = require('../../classes/ORM');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

describe('orm test', ()=>{
  let KohanaJS;

  beforeEach( () => {
    KohanaJS = require('../../KohanaJS');
    KohanaJS.init(__dirname, __dirname+'/orm/application', __dirname+'/test1/modules');
  });

  afterEach( () => {
    KohanaJS = null;
  });

    test('orm', ()=>{
        const KOJSORM = KohanaJS.require('ORM');
        expect(KOJSORM).toBe(ORM);

        const obj = new ORM();
        const className = obj.constructor.name;

        expect(className).toBe('ORM');
        expect(ORM.tableName).toBe(null);
        //ORM is abstract class, should not found lowercase and tableName
    });

    test('extends ORM', ()=>{
        const TestModel = require('./orm/application/classes/TestModel');
        new TestModel();

        expect(TestModel.tableName).toBe('testmodels');
    });

    test('DB test', () =>{
        const dbPath = path.normalize(__dirname+'/orm/db/db.sqlite');
        if(fs.existsSync(dbPath))fs.unlinkSync(dbPath);
        const db = new Database(dbPath);

        const sql = `CREATE TABLE tests( id INTEGER UNIQUE PRIMARY KEY AUTOINCREMENT NOT NULL , text TEXT NOT NULL)`;
        db.prepare(sql).run();

        const tmpValue = Math.random().toString();
        db.prepare('INSERT INTO tests(text) VALUES (?)').run(tmpValue);

        const result = db.prepare('SELECT * from tests WHERE text = ?').get(tmpValue);
        expect(result.text).toBe(tmpValue);
    });

    test('ORM.setDB', async ()=>{
        const dbPath = path.normalize(__dirname+'/orm/db/db1.sqlite');
        if(fs.existsSync(dbPath))fs.unlinkSync(dbPath);
        const db = new Database(dbPath);

        const ORM = require('../../classes/ORM');
        ORM.database = db;

        const tableName = 'testmodels';
        db.prepare(`CREATE TABLE ${tableName}( id INTEGER UNIQUE PRIMARY KEY AUTOINCREMENT NOT NULL , created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL , updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL , text TEXT NOT NULL)`).run();
        db.prepare(`CREATE TRIGGER ${tableName}_updated_at AFTER UPDATE ON ${tableName} WHEN old.updated_at < CURRENT_TIMESTAMP BEGIN UPDATE ${tableName} SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id; END;`).run();
        db.prepare(`INSERT INTO ${tableName} (text) VALUES (?)`).run('Hello');
        db.prepare(`INSERT INTO ${tableName} (text) VALUES (?)`).run('Foo');

        const TestModel = require('./orm/application/classes/TestModel');
        const m = await new TestModel( 1).load();
        const m2 = await new TestModel(2).load();

        expect(TestModel.tableName).toBe('testmodels');

        expect(m.text).toBe('Hello');
        expect(m2.text).toBe('Foo');

    });

    test('ORM instance setDB', async ()=>{
      const dbPath = path.normalize(__dirname+'/orm/db/db2.sqlite');
      if(fs.existsSync(dbPath))fs.unlinkSync(dbPath);
      const db = new Database(dbPath);

      const tableName = 'testmodels';
      db.prepare(`CREATE TABLE ${tableName}( id INTEGER UNIQUE PRIMARY KEY AUTOINCREMENT NOT NULL , created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL , updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL , text TEXT NOT NULL)`).run();
      db.prepare(`CREATE TRIGGER ${tableName}_updated_at AFTER UPDATE ON ${tableName} WHEN old.updated_at < CURRENT_TIMESTAMP BEGIN UPDATE ${tableName} SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id; END;`).run();
      db.prepare(`INSERT INTO ${tableName} (text) VALUES (?)`).run('Hello');
      db.prepare(`INSERT INTO ${tableName} (text) VALUES (?)`).run('Foo');

      const TestModel = require('./orm/application/classes/TestModel');

      const m = await new TestModel(1, {database: db}).load();
      const m2 = await ORM.factory(TestModel, 2, {database: db});

      expect(TestModel.tableName).toBe('testmodels');

      expect(m.text).toBe('Hello');
      expect(m2.text).toBe('Foo');

    });


    test('alias model', async ()=>{
        const dbPath = path.normalize(__dirname+'/orm/db/db3.sqlite');
        if(fs.existsSync(dbPath))fs.unlinkSync(dbPath);
        const db = new Database(dbPath);

        const tableName = 'testmodels';
        db.prepare(`CREATE TABLE ${tableName}( id INTEGER UNIQUE PRIMARY KEY AUTOINCREMENT NOT NULL , created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL , updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL , text TEXT NOT NULL)`).run();
        db.prepare(`CREATE TRIGGER ${tableName}_updated_at AFTER UPDATE ON ${tableName} WHEN old.updated_at < CURRENT_TIMESTAMP BEGIN UPDATE ${tableName} SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id; END;`).run();
        db.prepare(`INSERT INTO ${tableName} (text) VALUES (?)`).run('Hello');
        db.prepare(`INSERT INTO ${tableName} (text) VALUES (?)`).run('Foo');

        const AliasModel = require('./orm/application/classes/AliasModel');

        expect(AliasModel.tableName).toBe('testmodels');

        new AliasModel();
        expect(AliasModel.jointTablePrefix).toBe('testmodel');

        const model = await ORM.factory(AliasModel, 1, {database:db});
        expect(model.text).toBe('Hello');
    });

    test('belongsTo', async () =>{
        const dbPath = path.normalize(__dirname+'/orm/db/belongsTo4.sqlite');
        if(fs.existsSync(dbPath))fs.unlinkSync(dbPath);
        fs.copyFileSync(__dirname+'/orm/db/belongsTo.default.sqlite', dbPath);
        const db = new Database(dbPath);
        db.prepare('INSERT INTO persons (id, first_name, last_name) VALUES (?, ?, ?)').run(1, 'Peter', 'Pan');
        db.prepare('INSERT INTO addresses (person_id, address1) VALUES (?, ?)').run(1, 'Planet X');

        const ORM = require('../../classes/ORM');
        ORM.database = db;

        const Address = KohanaJS.require('model/Address');
        const Person = KohanaJS.require('model/Person');

        const peter = await new Person(1).load();
        expect(peter.first_name).toBe('Peter');

        const home = await new Address(1).load();
        expect(home.address1).toBe('Planet X');

        const owner = await home.parent('person_id');
        expect(owner.first_name).toBe('Peter');

        const office = new Address();
        office.address1 = 'Planet Y';
        office.person_id = peter.id;
        await office.save();

        expect(office.address1).toBe('Planet Y');

        const addresses = await peter.children('person_id', Address);
        expect(addresses.length).toBe(2);

        try{
          const addresses2 = await peter.children('person_id');
          expect('should not run this line').toBe(false);
        }catch (e){
          expect(e.message).toBe('children fk have multiple Models, please specific which Model will be used');
        }

    });

    test('instance belongsTo', async () =>{
        const dbPath = path.normalize(__dirname+'/orm/db/belongsTo5.sqlite');
        if(fs.existsSync(dbPath))fs.unlinkSync(dbPath);
        fs.copyFileSync(__dirname+'/orm/db/belongsTo.default.sqlite', dbPath);
        const db = new Database(dbPath);
        db.prepare('INSERT INTO persons (first_name, last_name) VALUES (?, ?)').run('Peter', 'Pan');
        db.prepare('INSERT INTO addresses (person_id, address1) VALUES (?, ?)').run(1, 'Planet X');

        const Address = KohanaJS.require('model/Address');
        const Person = KohanaJS.require('model/Person');

        const peter = await ORM.factory(Person, 1, {database: db});
        expect(peter.first_name).toBe('Peter');

        const home = await ORM.factory(Address, 1, {database: db});
        expect(home.address1).toBe('Planet X');

        const owner = await home.parent('person_id');
        expect(owner.first_name).toBe('Peter');

        expect(owner.db).toStrictEqual(home.db);
    });

    test('belongsToMany', async () =>{
        const dbPath = path.normalize(__dirname+'/orm/db/belongsToMany6.sqlite');
        if(fs.existsSync(dbPath))fs.unlinkSync(dbPath);
        fs.copyFileSync(__dirname+'/orm/db/belongsToMany.default.sqlite', dbPath);
        const db = new Database(dbPath);

        db.prepare('INSERT INTO products (name) VALUES (?)').run('bar');
        db.prepare('INSERT INTO tags (name) VALUES (?)').run('foo');
        db.prepare('INSERT INTO tags (name) VALUES (?)').run('tar');
        db.prepare('INSERT INTO product_tags (product_id, tag_id) VALUES (?,?)').run(1, 1);
        db.prepare('INSERT INTO product_tags (product_id, tag_id) VALUES (?,?)').run(1, 2);

        const ORM = require('../../classes/ORM');
        ORM.database = db;

        const Product = KohanaJS.require('model/Product');
        const Tag     = KohanaJS.require('model/Tag');

        const product = await ORM.factory(Product, 1);

        expect(product.name).toBe('bar');
        const tags = await product.siblings(Tag);

        expect(tags[0].name).toBe('foo');
        expect(tags[1].name).toBe('tar');
    });

    test('instance belongsToMany', async () =>{
        const dbPath = path.normalize(__dirname+'/orm/db/belongsToMany7.sqlite');
        if(fs.existsSync(dbPath))fs.unlinkSync(dbPath);
        fs.copyFileSync(__dirname+'/orm/db/belongsToMany.default.sqlite', dbPath);
        const db = new Database(dbPath);

        db.prepare('INSERT INTO products (name) VALUES (?)').run('bar');
        db.prepare('INSERT INTO tags (name) VALUES (?)').run('foo');
        db.prepare('INSERT INTO tags (name) VALUES (?)').run('tar');
        db.prepare('INSERT INTO product_tags (product_id, tag_id) VALUES (?,?)').run(1, 1);
        db.prepare('INSERT INTO product_tags (product_id, tag_id) VALUES (?,?)').run(1, 2);

        const Product = KohanaJS.require('model/Product');
        const Tag     = KohanaJS.require('model/Tag');

        const product = await ORM.factory(Product, 1, {database: db});

        expect(product.name).toBe('bar');
        const tags = await product.siblings(Tag);

        expect(tags[0].name).toBe('foo');
        expect(tags[1].name).toBe('tar');

        expect(tags[0].db).toStrictEqual(product.db);
        expect(tags[1].db).toStrictEqual(product.db);
    });

    test('ORM get all from model', async ()=>{
        const dbPath = path.normalize(__dirname+'/orm/db/belongsToMany8.sqlite');
        if(fs.existsSync(dbPath))fs.unlinkSync(dbPath);
        fs.copyFileSync(__dirname+'/orm/db/belongsToMany.default.sqlite', dbPath);
        const db = new Database(dbPath);

        db.prepare('INSERT INTO tags (name) VALUES (?)').run('foo');
        db.prepare('INSERT INTO tags (name) VALUES (?)').run('tar');

        const ORM = require('../../classes/ORM');
        ORM.database = db;

        const Tag = KohanaJS.require('model/Tag');
        const tags = await ORM.loadAll(Tag, null, {database: db});

        expect(tags[0].name).toBe('foo');
        expect(tags[1].name).toBe('tar');

        const tags2 = await ORM.loadAll(Tag, null);
        expect(tags2[0].name).toBe('foo');
        expect(tags2[1].name).toBe('tar');
    });

    test('enumerate', async ()=>{
      const dbPath = path.normalize(__dirname+'/orm/db/belongsToMany10.sqlite');
      if(fs.existsSync(dbPath))fs.unlinkSync(dbPath);
      fs.copyFileSync(__dirname+'/orm/db/belongsToMany.default.sqlite', dbPath);
      const db = new Database(dbPath);

      db.prepare('INSERT INTO tags (id, name) VALUES (?, ?)').run(1, 'foo');
      db.prepare('INSERT INTO tags (id, name) VALUES (?, ?)').run(2, 'tar');

      const Tag = KohanaJS.require('model/Tag');
      const t = await ORM.factory(Tag, 1, {database: db});

      expect(t.name).toBe('foo');
    });

    test('save', async ()=>{
      const dbPath = path.normalize(__dirname+'/orm/db/belongsTo11.sqlite');
      if(fs.existsSync(dbPath))fs.unlinkSync(dbPath);
      fs.copyFileSync(__dirname+'/orm/db/belongsTo.default.sqlite', dbPath);
      const db = new Database(dbPath);
      db.prepare('INSERT INTO persons (first_name, last_name) VALUES (?, ?)').run('Peter', 'Pan');
      db.prepare('INSERT INTO addresses (person_id, address1) VALUES (?, ?)').run(1, 'Planet X');

      const Person = KohanaJS.require('model/Person');

      const peter = await ORM.factory(Person, 1, {database: db} );
      peter.last_name = 'Panther';
      peter.save();

      const data = db.prepare('SELECT last_name FROM persons WHERE id = 1').get();
      expect(data.last_name).toBe('Panther');
    });

    test('create new record', async ()=>{
      const dbPath = path.normalize(__dirname+'/orm/db/belongsTo12.sqlite');
      if(fs.existsSync(dbPath))fs.unlinkSync(dbPath);
      fs.copyFileSync(__dirname+'/orm/db/belongsTo.default.sqlite', dbPath);
      const db = new Database(dbPath);
      db.prepare('INSERT INTO persons (first_name, last_name) VALUES (?, ?)').run('Peter', 'Pan');
      db.prepare('INSERT INTO addresses (person_id, address1) VALUES (?, ?)').run(1, 'Planet X');

      const Person = KohanaJS.require('model/Person');
      const alice = ORM.create(Person, {database: db});
      alice.first_name = 'Alice';
      alice.last_name = 'Lee';
      await alice.save();

      const data = db.prepare('SELECT * FROM persons WHERE first_name = ?').get('Alice');
      expect(data.last_name).toBe('Lee');

      ORM.database = db;
      const bob = ORM.create(Person);
      bob.first_name = 'Bob';
      bob.last_name = 'Chan';
      await bob.save();

      const data2 = db.prepare('SELECT * FROM persons WHERE first_name = ?').get('Bob');
      expect(data2.last_name).toBe('Chan');
    });


    test('add belongsToMany', async ()=>{
      const dbPath = path.normalize(__dirname+'/orm/db/belongsToMany13.sqlite');
      if(fs.existsSync(dbPath))fs.unlinkSync(dbPath);
      fs.copyFileSync(__dirname+'/orm/db/belongsToMany.default.sqlite', dbPath);
      const db = new Database(dbPath);

      const Product = KohanaJS.require('model/Product');
      const Tag     = KohanaJS.require('model/Tag');

      const tagA = new Tag(null, {database: db});
      tagA.name = 'white';
      tagA.save();

      const tagB = new Tag(null, {database: db});
      tagB.name = 'liquid';
      tagB.save();

      const product = new Product(null, {database : db});
      product.name = 'milk';
      product.save();
      product.add(tagA);
      product.save();

      const result1 = db.prepare('SELECT * from product_tags WHERE product_id = ?').all(product.id);
      expect(result1.length).toBe(1);

      product.add(tagB);
      product.save();
      const result2 = db.prepare('SELECT * from product_tags WHERE product_id = ?').all(product.id);
      expect(result2.length).toBe(2);
    })

  test('add duplicate belongsToMany', async ()=>{
    const dbPath = path.normalize(__dirname+'/orm/db/belongsToMany14.sqlite');
    if(fs.existsSync(dbPath))fs.unlinkSync(dbPath);
    fs.copyFileSync(__dirname+'/orm/db/belongsToMany.default.sqlite', dbPath);
    const db = new Database(dbPath);

    const Product = KohanaJS.require('model/Product');
    const Tag     = KohanaJS.require('model/Tag');

    const tagA = new Tag(null, {database: db});
    tagA.name = 'white';
    await tagA.save();

    const product = new Product(null, {database : db});
    product.name = 'milk';
    await product.save();
    await product.add(tagA);
    await product.save();

    const result1 = db.prepare('SELECT * from product_tags WHERE product_id = ?').all(product.id);
    expect(result1.length).toBe(1);

    await product.add(tagA);
    await product.save();
    const result2 = db.prepare('SELECT * from product_tags WHERE product_id = ?').all(product.id);
    expect(result2.length).toBe(1);
  });

  test('remove belongsToMany', async ()=>{
    const dbPath = path.normalize(__dirname+'/orm/db/belongsToMany15.sqlite');
    if(fs.existsSync(dbPath))fs.unlinkSync(dbPath);
    fs.copyFileSync(__dirname+'/orm/db/belongsToMany.default.sqlite', dbPath);
    const db = new Database(dbPath);

     const Product = KohanaJS.require('model/Product');
    const Tag     = KohanaJS.require('model/Tag');

    const tagA = new Tag(null, {database: db});
    tagA.name = 'white';
    tagA.save();

    const product = new Product(null, {database : db});
    product.name = 'milk';
    await product.save();
    await product.add(tagA);
    await product.save();

    const result1 = db.prepare('SELECT * from product_tags WHERE product_id = ?').all(product.id);
    expect(result1.length).toBe(1);

    await product.remove(tagA);
    await product.save();
    const result2 = db.prepare('SELECT * from product_tags WHERE product_id = ?').all(product.id);
    expect(result2.length).toBe(0);
  });

  test('delete', async ()=>{
    const dbPath = path.normalize(__dirname+'/orm/db/belongsToMany16.sqlite');
    if(fs.existsSync(dbPath))fs.unlinkSync(dbPath);
    fs.copyFileSync(__dirname+'/orm/db/belongsToMany.default.sqlite', dbPath);
    const db = new Database(dbPath);

    const Product = KohanaJS.require('model/Product');
    const product = new Product(null, {database : db});
    product.name = 'milk';
    product.save();

    const result1 = db.prepare('SELECT * from products').all();
    expect(result1.length).toBe(1);

    product.delete();
    const result2 = db.prepare('SELECT * from products').all();
    expect(result2.length).toBe(0);
  });

  test('delete and remove links', async ()=>{
    const dbPath = path.normalize(__dirname+'/orm/db/belongsToMany17.sqlite');
    if(fs.existsSync(dbPath))fs.unlinkSync(dbPath);
    fs.copyFileSync(__dirname+'/orm/db/belongsToMany.default.sqlite', dbPath);
    const db = new Database(dbPath);

    const Product = KohanaJS.require('model/Product');
    const Tag     = KohanaJS.require('model/Tag');

    const tagA = new Tag(null, {database: db});
    tagA.name = 'white';
    await tagA.save();

    const tagB = new Tag(null, {database: db});
    tagB.name = 'liquid';
    await tagB.save();

    const product = new Product(null, {database : db});
    product.name = 'milk';
    await product.save();
    await product.add(tagA);
    await product.add(tagB);
    await product.save();

    const result1 = db.prepare('SELECT * from product_tags WHERE product_id = ?').all(product.id);
    expect(result1.length).toBe(2);

    await product.delete();
    const result2 = db.prepare('SELECT * from product_tags WHERE product_id = ?').all(product.id);
    expect(result2.length).toBe(0);

    const product2 = ORM.create(Product, {database: db});
    product2.name = 'coffee';
    await product2.save();
    await product2.add(tagA);
    await product2.add(tagB);
    await product2.add(tagB);
    const result3 = db.prepare('SELECT * from product_tags WHERE product_id = ?').all(product2.id);
    expect(result3.length).toBe(2);

    await product2.removeAll(Tag);
    const result4 = db.prepare('SELECT * from product_tags WHERE product_id = ?').all(product2.id);
    expect(result4.length).toBe(0);
  });

  test('lazy load', async ()=>{
    const dbPath = path.normalize(__dirname+'/orm/db/belongsToMany18.sqlite');
    if(fs.existsSync(dbPath))fs.unlinkSync(dbPath);
    fs.copyFileSync(__dirname+'/orm/db/belongsToMany.default.sqlite', dbPath);
    const db = new Database(dbPath);
    db.prepare('INSERT INTO products (name) VALUES (?)').run('bar');

    const Product = KohanaJS.require('model/Product');

    const product = new Product(null, {database : db});
    try{
      await product.load();
      expect('this line should not be loaded').toBe(false);
    }catch (e){
      expect(e.message).toBe('Product: No id and no value to load');
    }

    expect(product.name).toBe(null);

    product.id = 1;
    await product.load();

    expect(product.name).toBe('bar');

  });

  test('delete unsaved object', async ()=>{
    const dbPath = path.normalize(__dirname+'/orm/db/belongsToMany19.sqlite');
    if(fs.existsSync(dbPath))fs.unlinkSync(dbPath);
    fs.copyFileSync(__dirname+'/orm/db/belongsToMany.default.sqlite', dbPath);
    const db = new Database(dbPath);
    db.prepare('INSERT INTO products (name) VALUES (?)').run('bar');

    const Product = KohanaJS.require('model/Product');
    const product = new Product(null, {database : db});
    try{
      await product.delete();
      expect('this line should not exec').toBe('');
    }catch(e){
      expect(e.message).toBe('ORM delete Error, no id defined');
    }
  })

  test('handle hasMany target without tableName', async ()=>{
    const dbPath = path.normalize(__dirname+'/orm/db/belongsTo20.sqlite');
    if(fs.existsSync(dbPath))fs.unlinkSync(dbPath);
    fs.copyFileSync(__dirname+'/orm/db/belongsTo.default.sqlite', dbPath);
    const db = new Database(dbPath);
    db.prepare('INSERT INTO persons (first_name, last_name) VALUES (?, ?)').run('Peter', 'Pan');
    db.prepare('INSERT INTO addresses (person_id, address1) VALUES (?, ?)').run(1, 'Planet X');

    const Address = KohanaJS.require('model/Address');
    const Person = KohanaJS.require('model/Person');

    const peter = await ORM.factory(Person, 1, {database:db});
    expect(peter.first_name).toBe('Peter');

    const home = await ORM.factory(Address, 1, {database:db});
    expect(home.address1).toBe('Planet X');

    const owner = await home.parent('person_id');
    expect(owner.first_name).toBe('Peter');


    const office = new Address(null, {database:db});
    office.address1 = 'Planet Y';
    office.person_id = peter.id;
    await office.save();

    expect(office.address1).toBe('Planet Y');

    Address.tableName = null;
    try{
      const addresses = await peter.children('product_id', Address);
    }catch(e){
      expect(e.message).toBe('near "null": syntax error');
    }

  });

  test('no database', async ()=>{
    const ORM = require('../../classes/ORM');
    ORM.database = null;

    const Person = KohanaJS.require('model/Person');
    const peter = new Person();

    try{
      await peter.save();
      expect('this line should not be run').toBe('');
    }catch(e){
      expect(e.message).toBe("Cannot read property 'prepare' of null")
    }

  });

  test('ORM load fail', async ()=>{
    const dbPath = path.normalize(__dirname+'/orm/db/belongsTo22.sqlite');
    if(fs.existsSync(dbPath))fs.unlinkSync(dbPath);
    fs.copyFileSync(__dirname+'/orm/db/belongsTo.default.sqlite', dbPath);

    const db = new Database(dbPath);
    db.prepare('INSERT INTO persons (first_name, last_name) VALUES (?, ?)').run('Peter', 'Pan');

    const Person = KohanaJS.require('model/Person');
    const a = new Person('1000', {database: db});

    try{
      await a.load();
      expect('this line should not be loaded').toBe(false);
    }catch (e){
      expect(e.message).toBe(`Record not found. Person id:1000{
    "created_at": null,
    "updated_at": null,
    "id": "1000"
}`)
    }

    expect(a.created_at).toBe(null);
  })

  test('ORM convert boolean to TRUE and FALSE when save', async() => {
    KohanaJS.init(__dirname+'/test13');

    //idx is autoincrement primary key
    const targetPath = path.normalize(__dirname+'/test13/db/empty.sqlite');
    const sourcePath = path.normalize(__dirname+'/orm/db/empty.default.sqlite');
    if(fs.existsSync(targetPath))fs.unlinkSync(targetPath);

    fs.copyFileSync(sourcePath, targetPath);

    const db = new Database(targetPath);
    db.exec(`
CREATE TABLE persons(
id INTEGER UNIQUE DEFAULT ((( strftime('%s','now') - 1563741060 ) * 100000) + (RANDOM() & 65535)) NOT NULL ,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL ,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL ,
enable BOOLEAN ); 

CREATE TRIGGER persons_updated_at AFTER UPDATE ON persons WHEN old.updated_at < CURRENT_TIMESTAMP BEGIN
UPDATE persons SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id;
END;
`);

    const Person = KohanaJS.require('model/Person');
    const p = ORM.create(Person, {database: db });
    p.enable = true;
    await p.save();

    const r = await ORM.factory(Person, p.id, {database: db});

    expect(r.enable ? true : false).toBe(true);

    const p2 = ORM.create(Person, {database: db});
    p2.enable = false;
    await p2.save();

    const r2 = await ORM.factory(Person, p.id, {database: db});
    expect(r2.enable ? true : false).toBe(true);
  })

  test('ORM find', async () => {
    KohanaJS.init(__dirname+'/test15');

    //idx is autoincrement primary key
    const targetPath = path.normalize(__dirname+'/test15/db/empty.sqlite');
    const sourcePath = path.normalize(__dirname+'/orm/db/empty.default.sqlite');
    if(fs.existsSync(targetPath))fs.unlinkSync(targetPath);

    fs.copyFileSync(sourcePath, targetPath);

    const db = new Database(targetPath);
    db.exec(`
CREATE TABLE persons(
id INTEGER UNIQUE DEFAULT ((( strftime('%s','now') - 1563741060 ) * 100000) + (RANDOM() & 65535)) NOT NULL ,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL ,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL ,
enable BOOLEAN,
name TEXT,
email TEXT); 

CREATE TRIGGER persons_updated_at AFTER UPDATE ON persons WHEN old.updated_at < CURRENT_TIMESTAMP BEGIN
UPDATE persons SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id;
END;
`);

    const Person = KohanaJS.require('model/Person');
    const p = ORM.create(Person, {database: db });
    p.name = 'Alice';
    p.email = 'alice@example.com'
    p.enable = true;
    await p.save();

    const p2 = ORM.create(Person, {database: db});
    p2.name = 'Bob';
    p2.enable = false;
    await p2.save();

    const r = ORM.create(Person, {database: db});
    r.name = 'Alice';
    await r.load();
    expect(r.id).toBe(p.id);

    const r2 = ORM.create(Person, {database: db});
    try{
      await r2.load();
      expect('this line shoulld not be loaded').toBe(false);
    }catch (e){
      expect(e.message).toBe('Person: No id and no value to load');
    }

    expect(r2.id).toBe(null);
  })

  test('abstract ORM adapter function coverage', async ()=>{
    const Person = KohanaJS.require('model/Person');
    const Adapter = require('../../classes/ORMAdapter');
    const p = ORM.create(Person);
    const a = new Adapter(p, null);
    a.defaultID();
    a.processValues();

    await a.load();
    await a.update([]);
    await a.insert([]);
    await a.delete();

    await a.hasMany('test', 'key');
    await a.belongsToMany('test', 'test', 'lk', 'fk');
    await a.add(p, 0, 'test', 'lk', 'fk');
    await a.remove(p, 'test', 'lk', 'fk');
    await a.removeAll('test', 'lk');

    await a.loadAll();
    await a.loadAll(new Map());
    await a.loadBy('id', [1,2,3,4])
    await a.loadWith([['', 'id', 'EQUAL', 1], ['AND', 'name', 'EQUAL', 'test']]);

    await a.deleteAll();
    await a.deleteAll(new Map());
    await a.deleteBy('id', [1,2,3,4])
    await a.deleteWith([['', 'id', 'EQUAL', 1], ['AND', 'name', 'EQUAL', 'test']]);

    await a.updateAll();
    await a.updateAll(new Map());
    await a.updateBy('id', [1,2,3,4])
    await a.updateWith([['', 'id', 'EQUAL', 1], ['AND', 'name', 'EQUAL', 'test']]);

    a.defaultID();
    a.op('');
    a.formatCriteria([[]]);
    a.processValues();
    a.translateValue([]);
    expect(true).toBe(true);
  })

  test('prepend model prefix path', async ()=>{
    KohanaJS.init(__dirname+'/test15');
    const Person = KohanaJS.require(ORM.classPrefix + 'Person');
    const p = new Person();
    expect(!!p).toBe(true);

    try{
      ORM.classPrefix = 'models/';
      const P2 = KohanaJS.require(ORM.classPrefix + 'Person');
      expect('this line should not be run').expect(true);
    }catch (e){
      ORM.classPrefix = 'model/';
      expect(e.message).toBe('KohanaJS resolve path error: path models/Person.js not found. classes , {} ');
    }
  })

  test('filter by', async ()=>{
    KohanaJS.init(__dirname+'/test16');

    //idx is autoincrement primary key
    const targetPath = path.normalize(__dirname+'/test16/db/empty.sqlite');
    const sourcePath = path.normalize(__dirname+'/orm/db/empty.default.sqlite');
    if(fs.existsSync(targetPath))fs.unlinkSync(targetPath);

    fs.copyFileSync(sourcePath, targetPath);

    const db = new Database(targetPath);
    db.exec(`
CREATE TABLE persons(
id INTEGER UNIQUE DEFAULT ((( strftime('%s','now') - 1563741060 ) * 100000) + (RANDOM() & 65535)) NOT NULL ,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL ,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL ,
enable BOOLEAN,
name TEXT,
email TEXT); 

CREATE TRIGGER persons_updated_at AFTER UPDATE ON persons WHEN old.updated_at < CURRENT_TIMESTAMP BEGIN
UPDATE persons SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id;
END;
`);

    ORM.database = db;

    const Person = KohanaJS.require('model/Person');
    const p = ORM.create(Person);
    p.name = 'Alice';
    p.email = 'alice@example.com'
    p.enable = true;
    await p.save();

    const p2 = ORM.create(Person);
    p2.name = 'Bob';
    p2.email = 'bob@example.com';
    p2.enable = true;
    await p2.save();

    const p3 = ORM.create(Person);
    p3.name = 'Charlie';
    p3.email = 'charlie@example.com';
    p3.enable = false;
    await p3.save();

    const p4 = ORM.create(Person);
    p4.name = 'Danny';
    p4.email = 'danny@example.com';
    p4.enable = true;
    await p4.save();

    const p5 = ORM.create(Person);
    p5.name = 'Eric';
    p5.email = 'eric@example.com';
    p5.enable = false;
    await p5.save();

    const px = ORM.create(Person);
    px.name = 'Eric';
    await px.load();
    expect(px.email).toBe('eric@example.com');

    const people = await ORM.loadBy(Person, 'name', ["Alice", "Bob", "Eric", "Frank"], {database: db});
    expect(people.length).toBe(3);

    const falsy = await ORM.loadBy(Person, 'enable', [false]);
    expect(falsy.length).toBe(2);
  })

  test('filter', async ()=>{
    KohanaJS.init(__dirname+'/test17');

    //idx is autoincrement primary key
    const targetPath = path.normalize(__dirname+'/test17/db/empty.sqlite');
    const sourcePath = path.normalize(__dirname+'/orm/db/empty.default.sqlite');
    if(fs.existsSync(targetPath))fs.unlinkSync(targetPath);

    fs.copyFileSync(sourcePath, targetPath);

    const db = new Database(targetPath);
    db.exec(`
CREATE TABLE persons(
id INTEGER UNIQUE DEFAULT ((( strftime('%s','now') - 1563741060 ) * 100000) + (RANDOM() & 65535)) NOT NULL ,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL ,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL ,
enable BOOLEAN,
name TEXT,
email TEXT); 

CREATE TRIGGER persons_updated_at AFTER UPDATE ON persons WHEN old.updated_at < CURRENT_TIMESTAMP BEGIN
UPDATE persons SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id;
END;

INSERT INTO persons (id, enable, name, email) VALUES (1, 1, 'Alice', 'alice@example.com');
INSERT INTO persons (id, enable, name, email) VALUES (2, 1, 'Bob', 'bob@example.com');
INSERT INTO persons (id, enable, name, email) VALUES (3, 0, 'Charlie', 'charlie@example.com');
INSERT INTO persons (id, enable, name, email) VALUES (4, 0, 'Dennis', 'dennis@example.com');
INSERT INTO persons (id, enable, name, email) VALUES (5, 1, 'Eric', 'eric@example.com');
INSERT INTO persons (id, enable, name, email) VALUES (6, 0, 'Frank', 'frank@example.com');
`);

    ORM.database = db;
    //const res = db.prepare("SELECT * FROM persons WHERE enable = 1 AND (name = 'Alice' OR name = 'Bob' OR name = 'Charlie' OR name = 'Eric')").all();
    const Person = KohanaJS.require('model/Person');

    const people = await ORM.loadWith(Person, [
      ['', 'enable', EQUAL, TRUE],
      [AND],
      [START_GROUP],
      ['', 'name', EQUAL, 'Alice'],
      [OR, 'name', EQUAL, 'Bob'],
      [OR, 'name', EQUAL, 'Charlie'],
      [OR, 'name', EQUAL, 'Eric'],
      [END_GROUP]
    ], {database: db});
    expect(people.length).toBe(3);

    const empty = await ORM.loadWith(Person, [], {adapter: require('../../classes/ORMAdapter/SQLite')});
    expect(empty.length).toBe(0);

    Person.defaultAdapter = require('../../classes/ORMAdapter/SQLite');
    const empty2 = await ORM.loadWith(Person);
    expect(empty2.length).toBe(0);

    const dennis = await ORM.loadWith(Person, [['', 'id', EQUAL, 4]]);
    expect(dennis[0].email).toBe('dennis@example.com');

    try{
      await ORM.loadWith(Person, ['', 'id', EQUAL, 4]);
      expect('this line should not be run').toBe(false);
    }catch(e){
      expect(e.message).toBe('criteria must group by array.');
    }

    const res = await ORM.loadWith(Person);
    expect(res.length).toBe(0);
  })
});