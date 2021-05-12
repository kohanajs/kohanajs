const {Controller} = require('@kohanajs/core-mvc');
const ControllerMixinDatabase = require('../../classes/controller-mixin/Database');

describe('test mixin database', ()=>{
  test('test add mixin', async ()=>{
    class C extends Controller.mixin([ControllerMixinDatabase]){
      constructor(request) {
        super(request);
        this.state.get(ControllerMixinDatabase.DATABASE_MAP).set('session', '');
      }
    }

    const c = new C({}, );
    await c.execute();
    expect(c.get('databases').get('session')).not.toBe(null);
  });

  test('test append', async ()=>{
    class C extends Controller.mixin([ControllerMixinDatabase]){
      constructor(request) {
        super(request);
        this.state.get(ControllerMixinDatabase.DATABASE_MAP).set('session', '');
      }
    }

    class D extends C{
      constructor(request) {
        super(request);
        this.state.get(ControllerMixinDatabase.DATABASE_MAP).set('foo', '');
      }
    }

    const d = new D({});
    await d.execute();

    expect(Array.from(d.get('databases').keys()).join(',')).toBe('session,foo,createdAt');
  })
})