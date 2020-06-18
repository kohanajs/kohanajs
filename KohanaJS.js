/*
MIT License

Copyright (c) 2020 Kojin Nakana

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/

//KohanaJS is singleton
const fs = require('fs');
const {View} = require('@kohanajs/core-mvc');
const path = require('path');

//private methods
const resolve = (kohana, pathToFile, prefixPath, store)=>{
  if(/\.\./.test(pathToFile)){
    throw new Error('invalid require path');
  }

  if(!store[pathToFile]){
    //search application, then modules, then system
    const fetchList = [pathToFile, `${kohana.APP_PATH}/${prefixPath}/${pathToFile}`];

    //load from app/modules
    if(kohana.bootstrap.modules){
      [...kohana.bootstrap.modules].reverse().forEach(x => fetchList.push(`${kohana.MOD_PATH}/${x}/${prefixPath}/${pathToFile}`));
    }

    //load from app/system
    if(kohana.bootstrap.system){
      [...kohana.bootstrap.system].reverse().forEach(x => fetchList.push(`${kohana.SYM_PATH}/${x}/${prefixPath}/${pathToFile}`));
    }

    fetchList.push(`${kohana.SYS_PATH}/${prefixPath}/${pathToFile}`);
    [...kohana.nodePackages].reverse().forEach(x => fetchList.push(`${x}/${prefixPath}/${pathToFile}`));

    for(let i=0; i<fetchList.length; i++){
      const x = fetchList[i];
      if(fs.existsSync(path.normalize(x))){
        store[pathToFile] = x;
        break;
      }
    }

    if(!store[pathToFile]){
      throw new Error(`KohanaJS resolve path error: path ${pathToFile} not found. ${prefixPath} , ${JSON.stringify(store)} `);
    }
  }

  return store[pathToFile];
};

const setPath = (kohana, EXE_PATH, APP_PATH, MOD_PATH, SYM_PATH) => {
  kohana.EXE_PATH = EXE_PATH || fs.realpathSync('./');
  kohana.APP_PATH = APP_PATH || KohanaJS.EXE_PATH + '/application';
  kohana.MOD_PATH = MOD_PATH || KohanaJS.EXE_PATH + '/modules';
  kohana.SYM_PATH = SYM_PATH || KohanaJS.EXE_PATH + '/system';
};

const loadBootStrape = (kohana) => {
  const bootstrapFile = `${kohana.APP_PATH}/bootstrap.js`;
  if(fs.existsSync(path.normalize(bootstrapFile))){
    kohana.bootstrap = require(bootstrapFile);
  }
}

const updateConfig = (kohana) => {
  kohana.configPath['site.js'] = null; // never cache site config file.
  const file = resolve(kohana, 'site.js', 'config', kohana.configPath);

  kohana.config = require(file);
  delete require.cache[path.normalize(file)];
};

const clearRequireCache = (kohana)=>{
  for(let name in kohana.classPath){
    delete require.cache[path.normalize(kohana.classPath[name])];
  }
  kohana.classPath = {};
  kohana.configPath = {};
};

const clearViewCache = (kohana)=>{
  kohana.viewPath = {};
  View.defaultViewClass.clearCache();
};

const reloadModuleInit = (kohana) => {
  //activate init.js in modules
  if(kohana.bootstrap.modules){
    kohana.bootstrap.modules.forEach(x => {
      const initPath = `${kohana.MOD_PATH}/${x}/init.js`;

      if(fs.existsSync(path.normalize(initPath))){
        require(initPath);
        delete require.cache[path.normalize(initPath)];
      }
    });
  }

  if(kohana.bootstrap.system){
    kohana.bootstrap.system.forEach(x => {
      const initPath = `${kohana.SYM_PATH}/${x}/init.js`;
      if(fs.existsSync(path.normalize(initPath))){
        require(initPath);
        delete require.cache[path.normalize(initPath)];
      }
    });
  }

  //activate init.js in require('KOJSmvc-sample-module')
  kohana.nodePackages.forEach(x =>{
    const initPath = `${x}/init.js`;
    if(fs.existsSync(path.normalize(initPath))){
      require(initPath);
      delete require.cache[path.normalize(initPath)];
    }
  })
};

if(!global.kohanaJS){
  const KOJS = {};
  global.kohanaJS = KOJS;

  KOJS.SYS_PATH = module.filename.replace(/[\/\\]KohanaJS\.js$/, '');
  KOJS.EXE_PATH = KOJS.SYS_PATH;
  KOJS.APP_PATH = KOJS.SYS_PATH;
  KOJS.APP_PATH = KOJS.SYS_PATH;
  KOJS.MOD_PATH = KOJS.SYS_PATH;
  KOJS.SYM_PATH = KOJS.SYS_PATH;
  KOJS.config   = require('./config/site');
  KOJS.nodePackages = [];
  KOJS.classPath  = {}; //{'ORM'          => 'APP_PATH/classes/ORM.js'}
  KOJS.viewPath   = {}; //{'layout/index' => 'APP_PATH/views/layout/index'}
  KOJS.configPath = {}; //{'site.js       => 'APP_PATH/config/site.js'}
  KOJS.bootstrap  = {modules: [], system: []};

  KOJS.init = (EXE_PATH = null, APP_PATH = null, MOD_PATH = null, SYM_PATH = null) => {
    KOJS.classPath = {};
    KOJS.viewPath = {};
    KOJS.nodePackages = [];

    //set paths
    setPath(KOJS, EXE_PATH, APP_PATH, MOD_PATH, SYM_PATH);
    loadBootStrape(KOJS);
    updateConfig(KOJS);
    reloadModuleInit(KOJS);

    return KOJS;
  }

  KOJS.addNodeModules = (packageFolder) => {
    //register by require('KOJSmvc-module');
    KOJS.nodePackages.push(packageFolder.replace(/[\/\\]index\.js$/, ''));
  }

  KOJS.validateCache = () => {
    updateConfig(KOJS);
    if(KOJS.config.cache.exports === false){
      clearRequireCache(KOJS);
    }

    if(KOJS.config.cache.view === false){
      clearViewCache(KOJS);
    }

    reloadModuleInit(KOJS);
  }

  KOJS.require = (pathToFile) => {
    //pathToFile may include file extension;
    pathToFile = /\..*$/.test(pathToFile)? pathToFile : (pathToFile + '.js');
    const file = resolve(KOJS, pathToFile, 'classes', KOJS.classPath);
    return require(file);
  }

  KOJS.resolveView = (pathToFile) => {
    return resolve(KOJS, pathToFile, 'views', KOJS.viewPath);
  }

  KOJS.VERSION  = '1.0.0';
}

const KohanaJS = global.kohanaJS;
module.exports = KohanaJS;