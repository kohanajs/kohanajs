const path = require('path');

describe('KOJS test', ()=>{
  let KOJS;
  const EXE_PATH = __dirname.replace(/\/tests$/, '') + '/server';

  beforeEach(()=>{
    KOJS = require('../../KohanaJS');
  });

  test('APP Path', () => {
      KOJS.init(EXE_PATH);
      expect(KOJS.APP_PATH).toBe(`${EXE_PATH}/application`);
  });

  test('KOJS.require', () => {
      const packagePath = `${__dirname}/test1/`;
      KOJS.init(packagePath);

      expect(KOJS.MOD_PATH).toBe(`${packagePath}/modules`);

      const Test = KOJS.require('Test');
      const t = new Test();
      expect(t.getFoo()).toBe('bar');
  });

  test('switch package', () => {
      let testDir = __dirname;
      KOJS.init(`${testDir}/test1`);
      expect(KOJS.MOD_PATH).toBe(`${testDir}/test1/modules`);

      let T = KOJS.require('Test');
      const t1 = new T();
      expect(t1.getFoo()).toBe('bar');

      const Foo1 = KOJS.require('Foo');
      const f1 = new Foo1();
      expect(f1.getFoo()).toBe('fooo');

      KOJS.init(`${testDir}/test2`);
      expect(KOJS.MOD_PATH).toBe(`${testDir}/test2/modules`);

      T = KOJS.require('Test');
      const t2 = new T();
      expect(t2.getFoo()).toBe('tar');

      try{
          const Foo2 = KOJS.require('Foo');
          const f2 = new Foo2();
      }catch(e){
          expect(e.message.replace(/ {[^}]+}/, '')).toBe('KohanaJS resolve path error: path Foo.js not found. classes , ');
      }
  });

  test('application folder', () => {
      let testDir = __dirname;
      KOJS.init(`${testDir}/test1`);
      expect(KOJS.APP_PATH).toBe(`${testDir}/test1/application`);

      const Foo1 = KOJS.require('Foo');
      const f1 = new Foo1();
      expect(f1.getFoo()).toBe('fooo');

      KOJS.init(`${testDir}/test2`);
      expect(KOJS.APP_PATH).toBe(`${testDir}/test2/application`);

      try{
          const Foo2 = KOJS.require('Foo');
          const f2 = new Foo2();
      }catch(e){
          expect(e.message.replace(/ {[^}]+}/, '')).toBe('KohanaJS resolve path error: path Foo.js not found. classes , {} ');
      }
  });

  test('custom module folder', () => {
      let testDir = __dirname;
      KOJS.init(`${testDir}/test1`, `${testDir}/test3/application`,`${testDir}/test1/modules`);
      expect(KOJS.APP_PATH).toBe(`${testDir}/test3/application`);
      expect(KOJS.MOD_PATH).toBe(`${testDir}/test1/modules`);

      const Foo1 = KOJS.require('Foo');//test3/Foo
      const f1 = new Foo1();
      expect(f1.getFoo()).toBe('waa');

      const Test = KOJS.require('Test');
      const t = new Test();
      expect(t.getFoo()).toBe('bar');

  });

  test('path not found', ()=>{
      try{
          KOJS.require('NotFound');
      }catch(e){
          expect(e.message.replace(/ {[^}]+}/, '')).toBe('KohanaJS resolve path error: path NotFound.js not found. classes , ');
      }
  });

  test('inline modules init', ()=>{
      let testDir = __dirname;
      expect(global.testInit).toBe(undefined);
      KOJS.init(`${testDir}/test4`);
      expect(global.testInit).toBe(true);
      delete global.testInit;
  });

  test('npm modules init ', ()=>{
      let testDir = __dirname;
      expect(global.testInit).toBe(undefined);
      KOJS.init(`${testDir}/test5`);
      expect(global.testInit).toBe(true);
  });

  test('clear cache', ()=>{
      let testDir = __dirname;
      KOJS.init(`${testDir}/test6`);
      const Foo = KOJS.require('Foo');
      expect(Foo.id).toBe(1);

      const Foo2 = KOJS.require('Foo');
      expect(Foo2.id).toBe(1);

      KOJS.config.cache.exports = true;
      KOJS.validateCache();

      const Foo3 = KOJS.require('Foo');
      expect(Foo3.id).toBe(1);

      KOJS.config.cache.exports = false;
      KOJS.config.cache.view = false;
      KOJS.validateCache();
      //jest override require, need to use reset modules to invalidate
      jest.resetModules();

      const Foo4 = KOJS.require('Foo');
      expect(Foo4.id).toBe(2);

      const ins = new Foo4();
      expect(ins.getFooId()).toBe(2);
  });

  test('resolveView', ()=>{
      KOJS.init(`${__dirname}/test7`);
      const viewFile = KOJS.resolveView('test.html');
      expect(viewFile).toBe(`${__dirname}/test7/application/views/test.html`);
  });

  test('config path', ()=>{
      const fs = require('fs');
      const EXE_PATH = `${__dirname}/test8`;
      const APP_PATH = EXE_PATH + '/application';

      if(fs.existsSync(APP_PATH + '/config/site.js')){
        fs.unlinkSync(APP_PATH+'/config/site.js');
      }

      KOJS.init(EXE_PATH);
      expect(KOJS.config.salt).toBe('theencryptsaltatleast32character');


      fs.copyFileSync(APP_PATH+'/config/site.default.js', APP_PATH+'/config/site.js');
      jest.resetModules();
      KOJS.validateCache();
      expect(KOJS.config.salt).toBe('default salt 1');

      fs.unlinkSync(APP_PATH+'/config/site.js');
      jest.resetModules();
      KOJS.validateCache();
      expect(KOJS.config.salt).toBe('theencryptsaltatleast32character');

/*      fs.copyFileSync(APP_PATH+'/config/site.default2.js', APP_PATH+'/config/site.js');
      jest.resetModules();
      KOJS.validateCache();
      expect(KOJS.config.salt).toBe('default salt 2');*/

      //clean up
//      fs.unlinkSync(path.normalize(APP_PATH+'/config/site.js'));
  });

  test('setPath default value', ()=>{
    const path = require('path');
    KOJS.init();
    expect(path.normalize(KOJS.EXE_PATH + '/')).toBe(path.normalize(__dirname+'/../../'));
  });

  test('set all init value', ()=>{
    KOJS.init(
      __dirname+'/test1',
      __dirname+'/test2/application',
      __dirname+'/test3/modules');
    expect(KOJS.EXE_PATH).toBe(__dirname+'/test1');
    expect(KOJS.APP_PATH).toBe(__dirname+'/test2/application');
    expect(KOJS.MOD_PATH).toBe(__dirname+'/test3/modules');
  });

  test('test default MODPATH ', ()=>{
    KOJS.init(
      __dirname+'/test1',
      __dirname+'/test2/application');
    expect(KOJS.EXE_PATH).toBe(__dirname+'/test1');
    expect(KOJS.APP_PATH).toBe(__dirname+'/test2/application');
    expect(KOJS.MOD_PATH).toBe(__dirname+'/test1/modules');
  });

  test('KOJS nodePackages without init', ()=>{
    let testDir = __dirname;
    KOJS.init(`${testDir}/test9`);
    expect(KOJS.nodePackages.length).toBe(2);
    //KOJS will load bootstrap from test9/application/bootstrap.js
    //
  });

  test('KOJS require file with extension', ()=>{
    KOJS.init(`${__dirname}/test10`);
    const Foo = KOJS.require('Foo.js');
    const ins = new Foo();
    expect(ins.getFoo()).toBe('bar');
  });

  test('test default SYMPATH ', ()=>{
    KOJS.init(
    __dirname+'/test1',
    __dirname+'/test2/application');

    expect(KOJS.SYM_PATH).toBe(__dirname+'/test1/system');
  });

  test('inline system init', ()=>{
    let testDir = __dirname;
    expect(global.testInit2).toBe(undefined);
    KOJS.init(`${testDir}/test12`);
    expect(global.testInit2).toBe(true);
    delete global.testInit2;

    const Woo = KOJS.require('Woo');
    const w = new Woo();
    expect(w.sayHi()).toBe('Hi!!!');
  });

  test('should fail if require contain ../ ', ()=>{
    try{
      KOJS.require('../hello');
      expect('this line should not run').toBe('');
    }catch(e){
      expect(e.message).toBe('invalid require path');
    }

    try{
      KOJS.require('foo/../hello');
      expect('this line should not run').toBe('');
    }catch(e){
      expect(e.message).toBe('invalid require path');
    }
  })
});