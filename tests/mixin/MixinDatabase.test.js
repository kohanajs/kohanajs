const {Controller} = require('@kohanajs/core-mvc');
const ControllerMixinDatabase = require('../../classes/controller-mixin/Database');
const $ = ref => (typeof ref === 'function')? ref() : ref;

describe('test mixin database', ()=>{
  test('test add mixin', async ()=>{
    class C extends Controller{
      constructor(request) {
        super(request, false);
        this.state.set('databaseMap', new Map([['session', '']]));
        this.init();
      }
    }
    C.mixin([ControllerMixinDatabase]);

    const c = new C({}, );
    expect(c.get('databases').get('session')).not.toBe(null);
  });

  test('test append', async ()=>{
    class C extends Controller{
      static mixins = [ControllerMixinDatabase];
      constructor(request) {
        super(request, false);
        this.state.set('databaseMap', new Map([['session', '']]));
        this.init();
      }
    }

    class D extends C{
      static mixins = [ControllerMixinDatabase];
      constructor(request) {
        super(request);
        this.state.set('databaseMap', new Map([['foo', '']]));
        this.init();
      }
    }

    const c = new D({});

    expect(Array.from(c.get('databases').keys()).join(',')).toBe('session,createdAt,foo');
  })
})