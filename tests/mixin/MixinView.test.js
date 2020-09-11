const {Controller} = require('@kohanajs/core-mvc');
const ControllerMixinView = require('../../classes/controller-mixin/View');
const $ = ref => (typeof ref === 'function')? ref() : ref;

describe('Controller Mixin View Test', function () {
  test('constructor', async ()=>{
    const c = new Controller({});
    c.addMixin(new ControllerMixinView(c));
    expect(typeof c.getView).toBe('function');
    expect(typeof c.setTemplate).toBe('function');
    expect(typeof c.template).toBe('function');
    expect(typeof c.layout).toBe('function');
  });

  test('execute', async ()=>{
    const c = new Controller({});
    c.addMixin(new ControllerMixinView(c));
    Object.assign($(c.layout).data, {header: 'head', footer: 'foot'});
    const r = await c.execute();
    expect(r.body).toBe('{"header":"head","footer":"foot","main":""}');
  });

  test('set template', async ()=>{
    const c = new Controller({});
    c.addMixin(new ControllerMixinView(c));
    Object.assign($(c.layout).data, {header: 'head', footer: 'foot'});
    c.setTemplate('', {content: 'hello'})

    expect($(c.template).data.content).toBe('hello');
    expect($(c.layout).data.header).toBe('head');

    const r = await c.execute();
    expect(r.body).toBe('{"header":"head","footer":"foot","main":"{\\\"content\\\":\\\"hello\\\"}"}');

  })

  test('getView', async ()=>{
    const c = new Controller({});
    c.addMixin(new ControllerMixinView(c));
    const v = c.getView('', {content: 'hello'})
    expect(v.data.content).toBe('hello');
  });

  test('coverage', async ()=>{
    const c = new Controller({});
    c.addMixin(new ControllerMixinView(c));
    const v = c.getView('')
    expect(await v.render()).toBe('{}');

    c.setTemplate('');
  })
});