const path = require('path');

describe('KohanaJS test', () => {
  let kohanaJS;
  const EXE_PATH = `${__dirname.replace(/\/tests$/, '')}/server`;

  beforeEach(() => {
    kohanaJS = require('../../KohanaJS');
  });

  test('APP Path', () => {
    kohanaJS.init({ EXE_PATH });
    expect(kohanaJS.APP_PATH).toBe(`${EXE_PATH}/application`);
  });

  test('kohanaJS.require', () => {
    const packagePath = `${__dirname}/test1/`;
    kohanaJS.init({ EXE_PATH: packagePath, MOD_PATH: `${packagePath}/modules` });

    expect(kohanaJS.MOD_PATH).toBe(`${packagePath}/modules`);

    const Test = kohanaJS.require('Test');
    const t = new Test();
    expect(t.getFoo()).toBe('bar');
  });

  test('switch package', () => {
    const testDir = __dirname;
    kohanaJS.init({ EXE_PATH: `${testDir}/test1`, MOD_PATH: `${testDir}/test1/modules` });
    expect(kohanaJS.MOD_PATH).toBe(`${testDir}/test1/modules`);

    let T = kohanaJS.require('Test');
    const t1 = new T();
    expect(t1.getFoo()).toBe('bar');

    const Foo1 = kohanaJS.require('Foo');
    const f1 = new Foo1();
    expect(f1.getFoo()).toBe('fooo');

    kohanaJS.init({ EXE_PATH: `${testDir}/test2`, MOD_PATH: `${testDir}/test2/modules` });
    expect(kohanaJS.MOD_PATH).toBe(`${testDir}/test2/modules`);

    T = kohanaJS.require('Test');
    const t2 = new T();
    expect(t2.getFoo()).toBe('tar');

    try {
      const Foo2 = kohanaJS.require('Foo');
      // eslint-disable-next-line no-unused-vars
      const f2 = new Foo2();
    } catch (e) {
      expect(e.message.replace(/ {[^}]+}/, '')).toBe('KohanaJS resolve path error: path Foo.js not found. classes , {} ');
    }
  });

  test('application folder', () => {
    const testDir = __dirname;
    kohanaJS.init({ EXE_PATH: `${testDir}/test1` });
    expect(kohanaJS.APP_PATH).toBe(`${testDir}/test1/application`);

    const Foo1 = kohanaJS.require('Foo');
    const f1 = new Foo1();
    expect(f1.getFoo()).toBe('fooo');

    kohanaJS.init({ EXE_PATH: `${testDir}/test2` });
    expect(kohanaJS.APP_PATH).toBe(`${testDir}/test2/application`);

    try {
      const Foo2 = kohanaJS.require('Foo');
      // eslint-disable-next-line no-unused-vars
      const f2 = new Foo2();
    } catch (e) {
      expect(e.message.replace(/ {[^}]+}/, '')).toBe('KohanaJS resolve path error: path Foo.js not found. classes , {} ');
    }
  });

  test('custom module folder', () => {
    const testDir = __dirname;
    kohanaJS.init({ EXE_PATH: `${testDir}/test1`, APP_PATH: `${testDir}/test3/application`, MOD_PATH: `${testDir}/test1/modules` });
    expect(kohanaJS.APP_PATH).toBe(`${testDir}/test3/application`);
    expect(kohanaJS.MOD_PATH).toBe(`${testDir}/test1/modules`);

    const Foo1 = kohanaJS.require('Foo');// test3/Foo
    const f1 = new Foo1();
    expect(f1.getFoo()).toBe('waa');

    const Test = kohanaJS.require('Test');
    const t = new Test();
    expect(t.getFoo()).toBe('bar');
  });

  test('path not found', () => {
    try {
      kohanaJS.require('NotFound');
    } catch (e) {
      expect(e.message.replace(/ {[^}]+}/, '')).toBe('KohanaJS resolve path error: path NotFound.js not found. classes , {} ');
    }
  });

  test('inline modules init', () => {
    const testDir = __dirname;
    expect(global.testInit).toBe(undefined);
    kohanaJS.init({ EXE_PATH: `${testDir}/test4`, MOD_PATH: `${testDir}/test4/modules` });
    expect(global.testInit).toBe(true);
    delete global.testInit;
  });

  test('npm modules init ', () => {
    const testDir = __dirname;
    expect(global.testInit).toBe(undefined);
    kohanaJS.init({ EXE_PATH: `${testDir}/test5` });
    expect(global.testInit).toBe(true);
  });

  test('clear cache', () => {
    const testDir = __dirname;
    kohanaJS.init({ EXE_PATH: `${testDir}/test6` });
    const Foo = kohanaJS.require('Foo');
    expect(Foo.id).toBe(1);

    const Foo2 = kohanaJS.require('Foo');
    expect(Foo2.id).toBe(1);

    kohanaJS.configForceUpdate = false;
    kohanaJS.config.classes.cache = true;
    kohanaJS.flushCache();

    const Foo3 = kohanaJS.require('Foo');
    expect(Foo3.id).toBe(1);

    kohanaJS.config.classes.cache = false;
    kohanaJS.config.view.cache = false;
    kohanaJS.flushCache();
    // jest override require, need to use reset modules to invalidate
    jest.resetModules();

    const Foo4 = kohanaJS.require('Foo');
    expect(Foo4.id).toBe(2);

    const ins = new Foo4();
    expect(ins.getFooId()).toBe(2);

    kohanaJS.config.classes.cache = true;
    kohanaJS.config.view.cache = true;
    kohanaJS.flushCache();
    // change config after validateCache. otherwise the config file will over write it.

    // jest override require, need to use reset modules to invalidate
    jest.resetModules();

    expect(kohanaJS.config.view.cache).toBe(true);

    kohanaJS.configForceUpdate = true;
  });

  test('resolveView', () => {
    kohanaJS.init({ EXE_PATH: `${__dirname}/test7` });
    const viewFile = kohanaJS.resolveView('test.html');
    expect(viewFile).toBe(`${__dirname}/test7/application/views/test.html`);
  });

  test('config path', () => {
    const fs = require('fs');

    kohanaJS.init({ EXE_PATH: `${__dirname}/test8` });

    if (fs.existsSync(`${kohanaJS.APP_PATH}/config/salt.js`)) {
      fs.unlinkSync(`${kohanaJS.APP_PATH}/config/salt.js`);
    }

    kohanaJS.configForceUpdate = true;
    try {
      kohanaJS.initConfig(new Map([['salt', '']]));
    } catch (e) {
      expect(e.message).toBe('KohanaJS resolve path error: path salt.js not found. config , {} ');
    }

    expect(kohanaJS.config.salt).toBe(undefined);

    fs.copyFileSync(path.normalize(`${kohanaJS.APP_PATH}/config/salt.default.js`), path.normalize(`${kohanaJS.APP_PATH}/config/salt.js`));
    jest.resetModules();
    kohanaJS.flushCache();
    expect(kohanaJS.config.salt.value).toBe('default salt 1');

    fs.unlinkSync(`${kohanaJS.APP_PATH}/config/salt.js`);
    jest.resetModules();

    try {
      kohanaJS.flushCache();
    } catch (e) {
      expect(e.message).toBe('KohanaJS resolve path error: path salt.js not found. config , {} ');
    }

    expect(kohanaJS.config.salt).toBe(undefined);
  });

  test('setPath default value', () => {
    kohanaJS.init();
    expect(path.normalize(`${kohanaJS.EXE_PATH}/`)).toBe(path.normalize(`${__dirname}/../../`));
  });

  test('set all init value', () => {
    kohanaJS.init({
      EXE_PATH: `${__dirname}/test1`,
      APP_PATH: `${__dirname}/test2/application`,
      MOD_PATH: `${__dirname}/test3/modules`,
    });
    expect(kohanaJS.EXE_PATH).toBe(`${__dirname}/test1`);
    expect(kohanaJS.APP_PATH).toBe(`${__dirname}/test2/application`);
    expect(kohanaJS.MOD_PATH).toBe(`${__dirname}/test3/modules`);
  });

  test('test default MODPATH ', () => {
    kohanaJS.init({
      EXE_PATH: `${__dirname}/test1`,
      APP_PATH: `${__dirname}/test2/application`,
    });
    expect(kohanaJS.EXE_PATH).toBe(`${__dirname}/test1`);
    expect(kohanaJS.APP_PATH).toBe(`${__dirname}/test2/application`);
    expect(kohanaJS.MOD_PATH).toBe(`${__dirname}/test2/application/modules`);
  });

  test('kohanaJS nodePackages without init', () => {
    const testDir = __dirname;
    kohanaJS.init({ EXE_PATH: `${testDir}/test9` });
    expect(kohanaJS.nodePackages.length).toBe(2);
    // kohanaJS will load bootstrap from test9/application/bootstrap.js
    //
  });

  test('kohanaJS require file with extension', () => {
    kohanaJS.init({ EXE_PATH: `${__dirname}/test10` });
    const Foo = kohanaJS.require('Foo.js');
    const ins = new Foo();
    expect(ins.getFoo()).toBe('bar');
  });

  test('test default SYMPATH ', () => {
    kohanaJS.init(
      {
        EXE_PATH: `${__dirname}/test1`,
        APP_PATH: `${__dirname}/test2/application`,
      },
    );

    expect(kohanaJS.SYM_PATH).toBe(`${__dirname}/test2/application/system`);
  });

  test('inline system init', () => {
    const testDir = __dirname;
    expect(global.testInit2).toBe(undefined);
    kohanaJS.init({ EXE_PATH: `${testDir}/test12`, SYM_PATH: `${testDir}/test12/system` });
    expect(global.testInit2).toBe(true);
    delete global.testInit2;

    const Woo = kohanaJS.require('Woo');
    const w = new Woo();
    expect(w.sayHi()).toBe('Hi!!!');
  });

  test('should fail if require contain ../ ', () => {
    try {
      kohanaJS.require('../hello');
      expect('this line should not run').toBe('');
    } catch (e) {
      expect(e.message).toBe('invalid require path');
    }

    try {
      kohanaJS.require('foo/../hello');
      expect('this line should not run').toBe('');
    } catch (e) {
      expect(e.message).toBe('invalid require path');
    }
  });

  test('specific kohanaJS.require file', () => {
    kohanaJS.classPath.set('foo/Bar.js', path.normalize(`${__dirname}/test14/Bar`));
    const Bar = kohanaJS.require('foo/Bar');
    const bar = new Bar();
    expect(bar.greeting()).toBe('Hello from Bar');

    kohanaJS.classPath.set('kaa/Tar.js', path.normalize(`${__dirname}/test14/Tar.js`));
    const Tar = kohanaJS.require('kaa/Tar.js');
    const tar = new Tar();
    expect(tar.greeting()).toBe('Hello from Tar');
  });

  test('explict set class to KohanaJS.require', async () => {
    const C = class Collection {};
    kohanaJS.classPath.set('model/Collection.js', C);
    const C2 = kohanaJS.require('model/Collection');

    expect(C === C2).toBe(true);
  });
});
