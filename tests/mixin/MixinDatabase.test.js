const {Controller} = require('@kohanajs/core-mvc');
const ControllerMixinDatabase = require('../../classes/controller-mixin/Database');
const $ = ref => (typeof ref === 'function')? ref() : ref;

describe('test mixin database', ()=>{
  test('test add mixin', async ()=>{
    class C extends Controller{
      constructor(request) {
        super(request);
        this.state.set('databaseMap', new Map([['session', '']]));
        C.mix(this, [ControllerMixinDatabase])
      }
    }

    const c = new C({}, );
    expect(c.get('databases').get('session')).not.toBe(null);
  });

  test('test append', async ()=>{
    class C extends Controller{
      constructor(request) {
        super(request);
        this.state.set('databaseMap', new Map([['session', '']]));
        C.mix(this, [ControllerMixinDatabase])
      }
    }

    class D extends C{
      constructor(request) {
        super(request);
        this.state.set('databaseMap', new Map([['foo', '']]));
        C.mix(this, [ControllerMixinDatabase])
      }
    }

    const c = new D({});

    expect(Array.from(c.get('databases').keys()).join(',')).toBe('session,createdAt,foo');
  })
})