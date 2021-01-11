const {Controller} = require('@kohanajs/core-mvc');
const ControllerMixinMime = require('../../classes/controller-mixin/Mime');

describe('ControllerMime test', ()=>{
  test('constructor', async ()=>{
    class C extends Controller{}
    C.mixin([ControllerMixinMime]);
    const c = new C({raw: {url: '/articles/recent.aspx'}});
    const r = await c.execute();
    expect(r.headers['Content-Type']).toBe('text/html; charset=utf-8');
  });

  test('javascript', async ()=>{
    class C extends Controller{}
    C.mixin([ControllerMixinMime]);
    const c = new C({raw: {url: '/articles/recent.js'}});
    const r = await c.execute();
    expect(r.headers['Content-Type']).toBe('application/javascript; charset=utf-8');
  });

  test('html', async ()=>{
    class C extends Controller{}
    C.mixin([ControllerMixinMime]);
    const c = new C({raw: {url: '/articles/recent'}});
    const r = await c.execute();
    expect(r.headers['Content-Type']).toBe('text/html; charset=utf-8');
  });

  test('javascript', async ()=>{
    class C extends Controller{}
    C.mixin([ControllerMixinMime]);
    const c = new C({raw: {url: '/articles/recent.json'}});
    const r = await c.execute();
    expect(r.headers['Content-Type']).toBe('application/json; charset=utf-8');
  });
})