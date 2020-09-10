const {Controller} = require('@kohanajs/core-mvc');
const ControllerMixinMime = require('../../classes/controller-mixin/Mime');

describe('ControllerMime test', ()=>{
  test('constructor', async ()=>{
      const c = new Controller({raw: {url: '/articles/recent.aspx'}});
      c.addMixin(new ControllerMixinMime(c, c.headers));
      const r = await c.execute();
      expect(r.headers['Content-Type']).toBe('text/html; charset=utf-8');
  });

  test('javascript', async ()=>{
    const c = new Controller({raw: {url: '/articles/recent.js'}});
    c.addMixin(new ControllerMixinMime(c, c.headers));
    const r = await c.execute();
    expect(r.headers['Content-Type']).toBe('application/javascript; charset=utf-8');
  });

  test('html', async ()=>{
    const c = new Controller({raw: {url: '/articles/recent'}});
    c.addMixin(new ControllerMixinMime(c, c.headers));
    const r = await c.execute();
    expect(r.headers['Content-Type']).toBe('text/html; charset=utf-8');
  });

  test('javascript', async ()=>{
    const c = new Controller({raw: {url: '/articles/recent.json'}});
    c.addMixin(new ControllerMixinMime(c, c.headers));
    const r = await c.execute();
    expect(r.headers['Content-Type']).toBe('application/json; charset=utf-8');
  });
})