describe('orm test', ()=>{
  let KohanaJS;
  let ORM;

  beforeEach( () => {
    KohanaJS = require('../../KohanaJS');
    KohanaJS.init(__dirname, __dirname+'/orm/application', __dirname+'/test1/modules');
    ORM = require('../../classes/ORM');
    ORM.defaultAdapter = require('./orm/application/classes/ORMAdapterTest');
  });

  afterEach( () => {
    KohanaJS = null;
    ORM = null;
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
        expect(TestModel.tableName).toBe(null); //table name is null before instantiate
        new TestModel();

        expect(TestModel.tableName).toBe('testmodels');
    });

    test('ORM test adapter', async ()=>{

        const TestModel = require('./orm/application/classes/TestModel');

        const m = await new TestModel( 1).read();
        const m2 = await new TestModel(2).read();

        expect(TestModel.tableName).toBe('testmodels');

        expect(m.created_at).toBe(1);
        expect(m2.created_at).toBe(2);

    });

    test('alias model', async ()=>{
        const AliasModel = require('./orm/application/classes/AliasModel');
        expect(AliasModel.tableName).toBe('testmodels');

        new AliasModel();
        expect(AliasModel.joinTablePrefix).toBe('testmodel');

        const model = await ORM.factory(AliasModel, 1);
        expect(model.id).toBe(1);
    });

    test('belongsTo', async () =>{
        const Address = ORM.require('Address');
        const Person = ORM.require('Person');

        const peter = await new Person(1).read();
        expect(peter.id).toBe(1);

        const home = await new Address(100).read();
        home.person_id = 1;
        expect(home.id).toBe(100);

        const owner = await home.parent('person_id');
        expect(owner.id).toBe(1);
    });

    test('belongsToMany', async () =>{
        const Product = ORM.require('Product');
        const Tag     = ORM.require('Tag');

        const product = await ORM.factory(Product, 1);

        expect(product.id).toBe(1);
        const tags = await product.siblings(Tag);
        expect(Array.isArray(tags)).toBe(true);

    });

    test('add belongsToMany', async ()=>{
      const Product = KohanaJS.require('model/Product');
      const Tag     = KohanaJS.require('model/Tag');

      const tagA = new Tag(null);
      tagA.name = 'white';
      tagA.write();

      const tagB = new Tag(null);
      tagB.name = 'liquid';
      tagB.write();

      const product = new Product(null);
      product.name = 'milk';
      product.write();
      product.add(tagA);
      product.write();
    })

  test('add duplicate belongsToMany', async ()=>{
    const Product = KohanaJS.require('model/Product');
    const Tag     = KohanaJS.require('model/Tag');

    const tagA = new Tag(null);
    tagA.name = 'white';
    await tagA.write();

    const product = new Product(null);
    product.name = 'milk';
    await product.write();
    await product.add(tagA);
    await product.write();
    await product.add(tagA);
    await product.write();
  });

  test('remove belongsToMany', async ()=>{
    const Product = KohanaJS.require('model/Product');
    const Tag     = KohanaJS.require('model/Tag');

    const tagA = new Tag(null);
    tagA.name = 'white';
    tagA.write();

    const product = new Product(null);
    product.name = 'milk';
    await product.write();
    await product.add(tagA);
    await product.write();

    await product.remove(tagA);
    await product.write();
  });

  test('delete', async ()=>{
    const Product = KohanaJS.require('model/Product');
    const product = new Product(null);
    product.name = 'milk';
    product.write();
    product.delete();
  });

  test('delete and remove links', async ()=>{

  });

  test('lazy loading', async ()=>{
    const Product = KohanaJS.require('model/Product');

    const product = new Product(null);
    try{
      await product.read();
      expect('this line should not be loaded').toBe(false);
    }catch (e){
      expect(e.message).toBe('Product: No id and no value to read');
    }

    expect(product.name).toBe(null);

    product.id = 1;
    await product.read();

    expect(product.created_at).toBe(1);

  });

  test('delete unsaved object', async ()=>{
    const Product = KohanaJS.require('model/Product');
    const product = new Product(null);
    try{
      await product.delete();
      expect('this line should not exec').toBe('');
    }catch(e){
      expect(e.message).toBe('ORM delete Error, no id defined');
    }
  })

  test('abstract ORM adapter function coverage', async ()=>{
    const Person = KohanaJS.require('model/Person');
    const Adapter = require('../../classes/ORMAdapter');
    const p = ORM.create(Person);
    const a = new Adapter(p, null);
    a.defaultID();
    a.processValues();

    await a.read();
    await a.update([]);
    await a.insert([]);
    await a.delete();

    await a.hasMany('test', 'key');
    await a.belongsToMany('test', 'test', 'lk', 'fk');
    await a.add(p, 0, 'test', 'lk', 'fk');
    await a.remove(p, 'test', 'lk', 'fk');
    await a.removeAll('test', 'lk');

    await a.readAll();
    await a.readAll(new Map());
    await a.readBy('id', [1,2,3,4])
    await a.readWith([['', 'id', 'EQUAL', 1], ['AND', 'name', 'EQUAL', 'test']]);

    await a.deleteAll();
    await a.deleteAll(new Map());
    await a.deleteBy('id', [1,2,3,4])
    await a.deleteWith([['', 'id', 'EQUAL', 1], ['AND', 'name', 'EQUAL', 'test']]);

    await a.updateAll();
    await a.updateAll(new Map());
    await a.updateBy('id', [1,2,3,4])
    await a.updateWith([['', 'id', 'EQUAL', 1], ['AND', 'name', 'EQUAL', 'test']]);
    await a.insertAll([],[],[]);

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

  test('ORM require', async ()=>{
    KohanaJS.init(__dirname+'/test15');
    const Person = ORM.require('Person');
    const p = new Person();
    expect(!!p).toBe(true);

    const P2 = KohanaJS.require('model/Person');
    expect(Person === P2).toBe(true);
  });

  test('ORM snapshot', async () => {
    KohanaJS.init(__dirname+'/test15');
    const Person = ORM.require('Person');
    const p = new Person();
    p.name = 'Alice';

    p.snapshot();
    p.name = 'Bob';
    p.snapshot();
    p.name = 'Charlie';

    expect(p.states[0].name).toBe('Alice');
    expect(p.states[1].name).toBe('Bob');
  })
});