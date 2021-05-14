const { Controller } = require('@kohanajs/core-mvc');
const ControllerMixinView = require('../../classes/controller-mixin/View');

describe('Controller Mixin View Test', () => {
  test('constructor', async () => {
    class C extends Controller.mixin([ControllerMixinView]) {}
    const c = new C({});

    expect(typeof c.getView).toBe('function');
    expect(typeof c.setTemplate).toBe('function');
    expect(typeof c.setErrorTemplate).toBe('function');
    expect(typeof c.state.get(ControllerMixinView.TEMPLATE)).toBe('undefined');
    expect(typeof c.state.get(ControllerMixinView.ERROR_TEMPLATE)).toBe('undefined');
    expect(typeof c.state.get(ControllerMixinView.LAYOUT)).toBe('object');
  });

  test('execute', async () => {
    class C extends Controller.mixin([ControllerMixinView]) {}
    const c = new C({});
    c.headers['Content-Type'] = 'text/html';

    Object.assign(c.state.get(ControllerMixinView.LAYOUT).data, { header: 'head', footer: 'foot' });

    const r = await c.execute();
    expect(r.body).toBe('{"header":"head","footer":"foot","main":""}');
  });

  test('set template', async () => {
    class C extends Controller.mixin([ControllerMixinView]) {}
    const c = new C({});
    c.headers['Content-Type'] = 'text/html';

    Object.assign(c.state.get('layout').data, { header: 'head', footer: 'foot' });
    c.setTemplate('', { content: 'hello' });

    expect(c.state.get('template').data.content).toBe('hello');
    expect(c.state.get('layout').data.header).toBe('head');

    const r = await c.execute();
    expect(r.body).toBe('{"header":"head","footer":"foot","main":"{\\"content\\":\\"hello\\"}"}');
  });

  test('getView', async () => {
    class C extends Controller.mixin([ControllerMixinView]) {}
    const c = new C({});
    c.headers['Content-Type'] = 'text/html';

    const v = c.getView('', { content: 'hello' });
    expect(v.data.content).toBe('hello');
  });

  test('coverage', async () => {
    class C extends Controller.mixin([ControllerMixinView]) {}
    const c = new C({});
    const v = c.getView('');
    expect(await v.render()).toBe('{}');

    c.setTemplate('');
  });

  test('errorTemplate', async () => {
    class C extends Controller.mixin([ControllerMixinView]) {}
    const c = new C({});
    c.headers['Content-Type'] = 'text/html';

    c.action_test = async () => {
      throw new Error('error throw');
    };

    Object.assign(c.state.get('layout').data, { header: 'head', footer: 'foot' });
    c.setErrorTemplate('', { content: 'error' });

    const errorTemplate = c.state.get('errorTemplate');
    expect(errorTemplate.data.content).toBe('error');

    const result = await c.execute('test');
    expect(result.body).toBe('{"header":"head","footer":"foot","main":"{\\"content\\":\\"error\\",\\"body\\":\\"error throw\\"}"}');
  });

  test('errorWithoutTemplate', async () => {
    class C extends Controller.mixin([ControllerMixinView]) {}
    const c = new C({});

    c.action_test = async () => {
      throw new Error('error throw');
    };

    Object.assign(c.state.get('layout').data, { header: 'head', footer: 'foot' });

    const result = await c.execute('test');
    expect(result.body).toBe('{"header":"head","footer":"foot","main":"error throw"}');
    //    const v = c.getView('')
    //    expect(await v.render()).toBe('{}');
  });

  test('set Layout', async () => {
    class C extends Controller.mixin([ControllerMixinView]) {}
    const c = new C({});
    c.headers['Content-Type'] = 'text/html';
    c.setLayout('layout', { foo: 'bar' });

    Object.assign(c.state.get('layout').data, { header: 'head', footer: 'foot' });
    c.setTemplate('', { content: 'hello' });

    expect(c.state.get('template').data.content).toBe('hello');
    expect(c.state.get('layout').data.header).toBe('head');

    const r = await c.execute();
    expect(r.body).toBe('{"foo":"bar","header":"head","footer":"foot","main":"{\\"content\\":\\"hello\\"}"}');
  });

  test('exit with 302', async () => {
    class C extends Controller.mixin([ControllerMixinView]) {}
    const c = new C({});
    c.headers['Content-Type'] = 'text/html';

    c.setLayout('layout', { hello: 'world' });
    c.setTemplate('tpl', { content: 'wow' });
    c.action_test = async () => { await c.exit(302); };

    const r = await c.execute();
    expect(r.body).toBe('{"hello":"world","main":"{\\"content\\":\\"wow\\"}"}');

    const c2 = new C({});
    c2.setLayout('layout', { hello: 'world' });
    c2.setTemplate('tpl', { content: 'wow' });
    c2.action_test = async () => { await c2.exit(302); };
    const r2 = await c2.execute('test');
    expect(r2.body).toBe('');

    const c3 = new C({});
    c3.setLayout('layout', { hello: 'world' });
    c3.setTemplate('tpl', { content: 'wow' });
    c3.action_test = async () => { await c3.exit(302); };
    const r3 = await c.execute();
    expect(r3.body).toBe('{"hello":"world","main":"{\\"content\\":\\"wow\\"}"}');
  });

  test('render json', async () => {
    class C extends Controller.mixin([ControllerMixinView]) {
      async action_test() {
        this.body = {
          foo: 'bar',
        };
      }
    }
    const c = new C({});
    c.headers['Content-Type'] = 'application/json';
    await c.execute('test');
    expect(c.body).toBe('{"foo":"bar"}');

    const c2 = new C({});
    c2.headers['Content-Type'] = 'application/json; charset=utf-8';
    await c.execute('test');
    expect(c.body).toBe('{"foo":"bar"}');
  });
});
