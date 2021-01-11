const {View, Controller} = require('@kohanajs/core-mvc');
const ControllerMixinView = require('../../classes/controller-mixin/View');

describe('Controller Mixin View Test', function () {
  test('constructor', async ()=>{
    class C extends Controller{
      constructor(request) {
        super(request);
        C.mix(this, [ControllerMixinView]);
      }
    }
    const c = new C({});

    expect(typeof c.getView).toBe('function');
    expect(typeof c.setTemplate).toBe('function');
    expect(typeof c.setErrorTemplate).toBe('function');
    expect(typeof c.get('template')).toBe('undefined');
    expect(typeof c.get('errorTemplate')).toBe('undefined');
    expect(typeof c.get('layout')).toBe('object');
  });

  test('execute', async ()=>{
    class C extends Controller{
      constructor(request) {
        super(request);
        C.mix(this, [ControllerMixinView]);
      }
    }
    const c = new C({});

    Object.assign(c.get('layout').data, {header: 'head', footer: 'foot'});
    const r = await c.execute();
    expect(r.body).toBe('{"header":"head","footer":"foot","main":""}');
  });

  test('set template', async ()=>{
    class C extends Controller{
      constructor(request) {
        super(request);
        C.mix(this, [ControllerMixinView]);
      }
    }
    const c = new C({});

    Object.assign(c.get('layout').data, {header: 'head', footer: 'foot'});
    c.setTemplate('', {content: 'hello'})

    expect(c.get('template').data.content).toBe('hello');
    expect(c.get('layout').data.header).toBe('head');

    const r = await c.execute();
    expect(r.body).toBe('{"header":"head","footer":"foot","main":"{\\\"content\\\":\\\"hello\\\"}"}');

  })

  test('getView', async ()=>{
    class C extends Controller{
      constructor(request) {
        super(request);
        C.mix(this, [ControllerMixinView]);
      }
    }
    const c = new C({});
    const v = c.getView('', {content: 'hello'})
    expect(v.data.content).toBe('hello');
  });

  test('coverage', async ()=>{
    class C extends Controller{
      constructor(request) {
        super(request);
        C.mix(this, [ControllerMixinView]);
      }
    }
    const c = new C({});
    const v = c.getView('')
    expect(await v.render()).toBe('{}');

    c.setTemplate('');
  });

  test('errorTemplate', async ()=>{
    class C extends Controller{
      constructor(request) {
        super(request);
        C.mix(this, [ControllerMixinView]);
      }
    }
    const c = new C({});

    c.action_test = async () =>{
      throw new Error('error throw');
    }

    Object.assign(c.get('layout').data, {header: 'head', footer: 'foot'});
    c.setErrorTemplate('', {content: 'error'});

    const errorTemplate = c.get('errorTemplate');
    expect(errorTemplate.data.content).toBe('error');

    const result = await c.execute('test');
    expect(result.body).toBe(`{"header":"head","footer":"foot","main":"{\\"content\\":\\"error\\",\\"body\\":\\"<pre>500 / error throw</pre>\\"}"}`)
  })

  test('errorWithoutTemplate', async ()=>{
    class C extends Controller{
      constructor(request) {
        super(request);
        C.mix(this, [ControllerMixinView]);
      }
    }
    const c = new C({});

    c.action_test = async () =>{
      throw new Error('error throw');
    }

    Object.assign(c.get('layout').data, {header: 'head', footer: 'foot'});

    const result = await c.execute('test');
    expect(result.body).toBe(`{"header":"head","footer":"foot","main":"<pre>500 / error throw</pre>"}`)
//    const v = c.getView('')
//    expect(await v.render()).toBe('{}');
  })

  test('set Layout', async ()=>{
    class C extends Controller{
      constructor(request) {
        super(request);
        C.mix(this, [ControllerMixinView]);
      }
    }
    const c = new C({});
    c.setLayout('layout', {"foo": "bar"});

    Object.assign(c.get('layout').data, {header: 'head', footer: 'foot'});
    c.setTemplate('', {content: 'hello'})

    expect(c.get('template').data.content).toBe('hello');
    expect(c.get('layout').data.header).toBe('head');

    const r = await c.execute();
    expect(r.body).toBe('{"foo":"bar","header":"head","footer":"foot","main":"{\\\"content\\\":\\\"hello\\\"}"}');

  });

  test('exit with 302', async ()=>{
    class C extends Controller{
      constructor(request) {
        super(request);
        C.mix(this, [ControllerMixinView]);
      }
    }
    const c = new C({});

    c.setLayout('layout', {"hello": "world"});
    c.setTemplate('tpl', {"content" : "wow"});
    c.action_test = async () =>{await c.exit(302);}

    const r = await c.execute();
    expect(r.body).toBe('{"hello":"world","main":"{\\\"content\\\":\\\"wow\\\"}"}');

    const c2 = new C({});
    c2.setLayout('layout', {"hello": "world"});
    c2.setTemplate('tpl', {"content" : "wow"});
    c2.action_test = async () =>{await c2.exit(302);}
    const r2 = await c2.execute('test');
    expect(r2.body).toBe('');

    const c3 = new C({});
    c3.setLayout('layout', {"hello": "world"});
    c3.setTemplate('tpl', {"content" : "wow"});
    c3.action_test = async () =>{await c3.exit(302);}
    const r3 = await c.execute();
    expect(r3.body).toBe('{"hello":"world","main":"{\\\"content\\\":\\\"wow\\\"}"}');
  })
});