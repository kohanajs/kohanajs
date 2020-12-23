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

        const home = await new Address(20).read();
        home.person_id = 1;
        expect(home.id).toBe(20);

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
  });

  test('ORM Eager Load', async ()=>{
    KohanaJS.init(__dirname+'/orm');
    const Address = ORM.require('Address');

    const a = await ORM.factory(Address, 11);
    expect(a.person).toBe(undefined);
    await a.eagerLoad({
      with: ['Person'],
      person:{
        with:['Address'],
        addresses: {
          with: null
        }
      }
    });

    expect(a.person.id).toBe(2);

    const Product = ORM.require('Product');
    const p = await ORM.factory(Product, 22);
    expect(p.tags).toBe(undefined);

    await p.eagerLoad({
      with: ['Tag'],
      tags: {with: null}
    })

    expect(p.tags.length).toBe(2);

  })

  test('no record on read', async ()=>{
    const Product = ORM.require('Product');
    try{
      await ORM.factory(Product, 200);
      expect('this line not run').toBe('');
    }catch (e){
      expect(e.message).toBe('Record not found. Product id:200');
    }
  })

  test('read By Value', async ()=>{
      const Product = ORM.require('Product');
      const p = ORM.create(Product);
      p.name = 'Foo';
      await p.read();

      expect(p.id).toBe(88);
  })

  test('parent is undefined', async ()=>{
    const Address = ORM.require('Address');
    const a = ORM.create(Address);
    try{
      await a.parent('tag_id');
      expect('this line should not run').toBe('')
    }catch(e){
      expect(e.message).toBe('tag_id is not foreign key in Address');
    }

  });

  test('not have many to many relationship', async ()=>{
    const Product = ORM.require('Product');
    const Tag = ORM.require('Tag');
    const Person = ORM.require('Person');
    const p = ORM.create(Product);
    await p.siblings(Tag);

    const t = ORM.create(Tag);
    await t.siblings(Product);

    try{
      await t.siblings(Person);
      expect('not run').toBe('');
    }catch(e){
      expect(e.message).toBe('Tag and Person not have many to many relationship')
    }
  });

  test('remove all siblings', async ()=>{
    const Product = ORM.require('Product');
    const Tag = ORM.require('Tag');
    const p = ORM.create(Product);

    try{
      await p.removeAll(Tag);
      expect('not run').toBe('');
    }catch(e){
      expect(e.message).toBe('Cannot remove Tag. Product not have id');
    }

    p.id = 1;
    await p.removeAll(Tag);

  });

  test('static methods', async ()=>{
    const Product = ORM.require('Product');
    const noResult = await ORM.readAll(Product);
    expect(noResult).toStrictEqual(null);

    const result = await ORM.readAll(Product, {kv: new Map([['name', 'one']])})
    expect(result.id).toBe(55);

    const results = await ORM.readAll(Product, {kv: new Map([['name', 'test']])})
    expect(results.length).toBe(3);

    const r4 = await ORM.readBy(Product, 'name', ['empty']);
    expect(r4).toStrictEqual(null);

    const r5 = await ORM.readBy(Product, 'name', ['test']);
    expect(r5.length).toBe(2);

    const r6 = await ORM.readWith(Product, [['', 'price', 'EQUAL', '1'], ['AND', 'name', 'EQUAL', 'peter']]);
    expect(r6).toStrictEqual(null);

    const r7 = await ORM.readWith(Product, [['', 'price', 'EQUAL', '100'], ['AND', 'name', 'EQUAL', 'peter']]);
    expect(r7.length).toBe(2);

    const c = await ORM.count(Product);
    expect(c).toBe(0);

    await ORM.deleteAll(Product);
    await ORM.deleteBy(Product, 'name', ['test']);
    await ORM.deleteWith(Product, [['', 'price', 'EQUAL', '100'], ['AND', 'name', 'EQUAL', 'peter']]);
    await ORM.updateAll(Product, new Map([['name', ['test', 'one']]]), new Map([['price', 100]]));
    await ORM.updateBy(Product, "name", ["test", "one"],  new Map([['price', 100]]));
    await ORM.updateWith(Product, [['', 'price', 'EQUAL', '1'], ['AND', 'name', 'EQUAL', 'peter']], new Map([['price', 100]]));

    await ORM.insertAll(Product, ['name', 'available'], [['foo', true], ['bar', true], ['tar', false]]);
  });

});