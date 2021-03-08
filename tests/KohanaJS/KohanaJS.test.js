const path = require('path');

describe('KohanaJS test', ()=>{
  let kohanaJS;
  const EXE_PATH = __dirname.replace(/\/tests$/, '') + '/server';

  beforeEach(()=>{
    kohanaJS = require('../../KohanaJS');
  });

  test('APP Path', () => {
      kohanaJS.init(EXE_PATH);
      expect(kohanaJS.APP_PATH).toBe(`${EXE_PATH}/application`);
  });

  test('kohanaJS.require', () => {
      const packagePath = `${__dirname}/test1/`;
      kohanaJS.init(packagePath);

      expect(kohanaJS.MOD_PATH).toBe(`${packagePath}/modules`);

      const Test = kohanaJS.require('Test');
      const t = new Test();
      expect(t.getFoo()).toBe('bar');
  });

  test('switch package', () => {
      let testDir = __dirname;
      kohanaJS.init(`${testDir}/test1`);
      expect(kohanaJS.MOD_PATH).toBe(`${testDir}/test1/modules`);

      let T = kohanaJS.require('Test');
      const t1 = new T();
      expect(t1.getFoo()).toBe('bar');

      const Foo1 = kohanaJS.require('Foo');
      const f1 = new Foo1();
      expect(f1.getFoo()).toBe('fooo');

      kohanaJS.init(`${testDir}/test2`);
      expect(kohanaJS.MOD_PATH).toBe(`${testDir}/test2/modules`);

      T = kohanaJS.require('Test');
      const t2 = new T();
      expect(t2.getFoo()).toBe('tar');

      try{
          const Foo2 = kohanaJS.require('Foo');
          const f2 = new Foo2();
      }catch(e){
          expect(e.message.replace(/ {[^}]+}/, '')).toBe('KohanaJS resolve path error: path Foo.js not found. classes , {} ');
      }
  });

  test('application folder', () => {
      let testDir = __dirname;
      kohanaJS.init(`${testDir}/test1`);
      expect(kohanaJS.APP_PATH).toBe(`${testDir}/test1/application`);

      const Foo1 = kohanaJS.require('Foo');
      const f1 = new Foo1();
      expect(f1.getFoo()).toBe('fooo');

      kohanaJS.init(`${testDir}/test2`);
      expect(kohanaJS.APP_PATH).toBe(`${testDir}/test2/application`);

      try{
          const Foo2 = kohanaJS.require('Foo');
          const f2 = new Foo2();
      }catch(e){
          expect(e.message.replace(/ {[^}]+}/, '')).toBe('KohanaJS resolve path error: path Foo.js not found. classes , {} ');
      }
  });

  test('custom module folder', () => {
      let testDir = __dirname;
      kohanaJS.init(`${testDir}/test1`, `${testDir}/test3/application`,`${testDir}/test1/modules`);
      expect(kohanaJS.APP_PATH).toBe(`${testDir}/test3/application`);
      expect(kohanaJS.MOD_PATH).toBe(`${testDir}/test1/modules`);

      const Foo1 = kohanaJS.require('Foo');//test3/Foo
      const f1 = new Foo1();
      expect(f1.getFoo()).toBe('waa');

      const Test = kohanaJS.require('Test');
      const t = new Test();
      expect(t.getFoo()).toBe('bar');

  });

  test('path not found', ()=>{
      try{
          kohanaJS.require('NotFound');
      }catch(e){
          expect(e.message.replace(/ {[^}]+}/, '')).toBe('KohanaJS resolve path error: path NotFound.js not found. classes , {} ');
      }
  });

  test('inline modules init', ()=>{
      let testDir = __dirname;
      expect(global.testInit).toBe(undefined);
      kohanaJS.init(`${testDir}/test4`);
      expect(global.testInit).toBe(true);
      delete global.testInit;
  });

  test('npm modules init ', ()=>{
      let testDir = __dirname;
      expect(global.testInit).toBe(undefined);
      kohanaJS.init(`${testDir}/test5`);
      expect(global.testInit).toBe(true);
  });

  test('clear cache', ()=>{
      let testDir = __dirname;
      kohanaJS.init(`${testDir}/test6`);
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
      //jest override require, need to use reset modules to invalidate
      jest.resetModules();

      const Foo4 = kohanaJS.require('Foo');
      expect(Foo4.id).toBe(2);

      const ins = new Foo4();
      expect(ins.getFooId()).toBe(2);

      kohanaJS.config.classes.cache = true;
      kohanaJS.config.view.cache = true;
      kohanaJS.flushCache();
      //change config after validateCache. otherwise the config file will over write it.

      //jest override require, need to use reset modules to invalidate
      jest.resetModules();

      expect(kohanaJS.config.view.cache).toBe(true);

    kohanaJS.configForceUpdate = true;
  });

  test('resolveView', ()=>{
      kohanaJS.init(`${__dirname}/test7`);
      const viewFile = kohanaJS.resolveView('test.html');
      expect(viewFile).toBe(`${__dirname}/test7/application/views/test.html`);
  });

  test('config path', ()=>{
      const fs = require('fs');
      const EXE_PATH = `${__dirname}/test8`;
      const APP_PATH = EXE_PATH + '/application';

      if(fs.existsSync(APP_PATH + '/config/salt.js')){
        fs.unlinkSync(APP_PATH+'/config/salt.js');
      }

      kohanaJS.init(EXE_PATH);
      kohanaJS.configForceUpdate = true;
      kohanaJS.addConfigFile('salt');
      try{
          kohanaJS.updateConfig();
      }catch(e){
      }

      expect(kohanaJS.config.salt).toBe(undefined);

      fs.copyFileSync(path.normalize(APP_PATH+'/config/salt.default.js'), path.normalize(APP_PATH+'/config/salt.js'));
      jest.resetModules();
      kohanaJS.updateConfig();
      expect(kohanaJS.config.salt.value).toBe('default salt 1');

      fs.unlinkSync(APP_PATH+'/config/salt.js');
      jest.resetModules();
      try{
          kohanaJS.updateConfig();
      }catch(e){

      }

      try{
          kohanaJS.flushCache();
      }catch(e){

      }

      expect(kohanaJS.config.salt).toBe(undefined);

    /*
      fs.copyFileSync(APP_PATH+'/config/salt.default2.js', APP_PATH+'/config/salt.js');
      jest.resetModules();
      kohanaJS.validateCache();
      console.log(kohanaJS.config)
      expect(kohanaJS.config.salt).toBe('default salt 2');*/

      //clean up
//      fs.unlinkSync(path.normalize(APP_PATH+'/config/site.js'));
  });

  test('setPath default value', ()=>{
    const path = require('path');
    kohanaJS.init();
    expect(path.normalize(kohanaJS.EXE_PATH + '/')).toBe(path.normalize(__dirname+'/../../'));
  });

  test('set all init value', ()=>{
    kohanaJS.init(
      __dirname+'/test1',
      __dirname+'/test2/application',
      __dirname+'/test3/modules');
    expect(kohanaJS.EXE_PATH).toBe(__dirname+'/test1');
    expect(kohanaJS.APP_PATH).toBe(__dirname+'/test2/application');
    expect(kohanaJS.MOD_PATH).toBe(__dirname+'/test3/modules');
  });

  test('test default MODPATH ', ()=>{
    kohanaJS.init(
      __dirname+'/test1',
      __dirname+'/test2/application');
    expect(kohanaJS.EXE_PATH).toBe(__dirname+'/test1');
    expect(kohanaJS.APP_PATH).toBe(__dirname+'/test2/application');
    expect(kohanaJS.MOD_PATH).toBe(__dirname+'/test1/modules');
  });

  test('kohanaJS nodePackages without init', ()=>{
    let testDir = __dirname;
    kohanaJS.init(`${testDir}/test9`);
    expect(kohanaJS.nodePackages.length).toBe(2);
    //kohanaJS will load bootstrap from test9/application/bootstrap.js
    //
  });

  test('kohanaJS require file with extension', ()=>{
    kohanaJS.init(`${__dirname}/test10`);
    const Foo = kohanaJS.require('Foo.js');
    const ins = new Foo();
    expect(ins.getFoo()).toBe('bar');
  });

  test('test default SYMPATH ', ()=>{
    kohanaJS.init(
    __dirname+'/test1',
    __dirname+'/test2/application');

    expect(kohanaJS.SYM_PATH).toBe(__dirname+'/test1/system');
  });

  test('inline system init', ()=>{
    let testDir = __dirname;
    expect(global.testInit2).toBe(undefined);
    kohanaJS.init(`${testDir}/test12`);
    expect(global.testInit2).toBe(true);
    delete global.testInit2;

    const Woo = kohanaJS.require('Woo');
    const w = new Woo();
    expect(w.sayHi()).toBe('Hi!!!');
  });

  test('should fail if require contain ../ ', ()=>{
    try{
      kohanaJS.require('../hello');
      expect('this line should not run').toBe('');
    }catch(e){
      expect(e.message).toBe('invalid require path');
    }

    try{
      kohanaJS.require('foo/../hello');
      expect('this line should not run').toBe('');
    }catch(e){
      expect(e.message).toBe('invalid require path');
    }
  })

  test('specific kohanaJS.require file', ()=>{
    kohanaJS.classPath.set('foo/Bar.js' , path.normalize(__dirname + '/test14/Bar'));
    const Bar = kohanaJS.require('foo/Bar');
    const bar = new Bar();
    expect(bar.greeting()).toBe('Hello from Bar');

    kohanaJS.classPath.set('kaa/Tar.js', path.normalize(__dirname + '/test14/Tar.js'));
    const Tar = kohanaJS.require('kaa/Tar.js');
    const tar = new Tar();
    expect(tar.greeting()).toBe('Hello from Tar');
  })

  test('explict set class to KohanaJS.require', async ()=>{
    const C = class Collection{}
    kohanaJS.classPath.set('model/Collection.js', C);
    const C2 = kohanaJS.require('model/Collection')

    expect(C === C2).toBe(true);
  })
});