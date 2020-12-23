const {Controller} = require('@kohanajs/core-mvc');
const ControllerMixinDatabase = require('../../classes/controller-mixin/Database');
const $ = ref => (typeof ref === 'function')? ref() : ref;

describe('test mixin database', ()=>{
  test('test add mixin', async ()=>{
    const c = new Controller({});
    c.addMixin(new ControllerMixinDatabase(c, {databases: new Map([['session', '']])}));
    expect($(c.databases).get('session')).not.toBe(null);
  });

  test('test append', async ()=>{
    const c = new Controller({});
    c.addMixin(new ControllerMixinDatabase(c, {databases: new Map([['session', '']])}));
    c.addMixin(new ControllerMixinDatabase(c, {databases: new Map([['foo', '']]), append: c.databases}));
    expect(Array.from($(c.databases).keys()).join(',')).toBe('session,createdAt,foo');
  })

  test('virtual database drive', async ()=>{
    const db = new ControllerMixinDatabase.defaultDatabaseDriver('');
    await db.transaction(()=>{});
    await db.exec("");
    await db.close();

    const statement = db.prepare('sql');
    expect(statement.constructor.name).toBe('DatabaseStatement');

    await statement.run();
    await statement.get(1,2,3);
    await statement.all(1,2,3);
  })
})