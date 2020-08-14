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
const resolve = (kohana, pathToFile, prefixPath, store, forceUpdate= false)=>{
  if(/\.\./.test(pathToFile)){
    throw new Error('invalid require path');
  }

  if(!store.get(pathToFile) || forceUpdate){
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
        store.set(pathToFile,  x);
        break;
      }
    }

    if(!store.get(pathToFile)){
      throw new Error(`KohanaJS resolve path error: path ${pathToFile} not found. ${prefixPath} , ${JSON.stringify(store)} `);
    }
  }

  return store.get(pathToFile);
};

const setPath = (kohana, EXE_PATH, APP_PATH, MOD_PATH, SYM_PATH) => {
  kohana.EXE_PATH = EXE_PATH || fs.realpathSync('./');
  kohana.APP_PATH = APP_PATH || KohanaJS.EXE_PATH + '/application';
  kohana.MOD_PATH = MOD_PATH || KohanaJS.EXE_PATH + '/modules';
  kohana.SYM_PATH = SYM_PATH || KohanaJS.EXE_PATH + '/system';
};

const loadBootStrap = (kohana) => {
  const bootstrapFile = `${kohana.APP_PATH}/bootstrap.js`;
  if(!fs.existsSync(path.normalize(bootstrapFile)))return;

  kohana.bootstrap = require(bootstrapFile);
}

const updateConfig = (kohana) => {
  kohana.config = {};
  //search all config files
  kohana.configs.forEach(key =>{
    const fileName = `${key}.js`;
    kohana.configPath.set(fileName, null); // never cache site config file.
    try{
      const file = resolve(kohana, fileName, 'config', kohana.configPath, kohana.configForceUpdate);
      kohana.config[key] = require(file);
      delete require.cache[path.normalize(file)];
    }catch(e){
      //file not found.
      kohana.config[key] = undefined;
    }
  })
};

const clearRequireCache = (kohana)=>{
  kohana.classPath.forEach(v =>{
    delete require.cache[v];
  })

  kohana.classPath = new Map();
  kohana.configPath = new Map();
};

const clearViewCache = (kohana)=>{
  kohana.viewPath = new Map();
  View.defaultViewClass.clearCache();
};

const reloadModuleInit = (kohana) => {
  //activate init.js in modules
  if(kohana.bootstrap.modules){
    kohana.bootstrap.modules.forEach(x => {
      const initPath = `${kohana.MOD_PATH}/${x}/init.js`;
      const filePath = path.normalize(initPath);
      if(!fs.existsSync(filePath))return;

      //load the init file
      require(initPath);
      //do not cache it.
      delete require.cache[filePath];
    });
  }

  //activate init.js in system
  if(kohana.bootstrap.system){
    kohana.bootstrap.system.forEach(x => {
      const initPath = `${kohana.SYM_PATH}/${x}/init.js`;
      const filePath = path.normalize(initPath);
      if(!fs.existsSync(filePath))return;

      require(initPath);
      delete require.cache[filePath];
    });
  }

  //activate init.js in require('KOJSmvc-sample-module')
  kohana.nodePackages.forEach(x =>{
    const initPath = `${x}/init.js`;
    const filePath = path.normalize(initPath);
    if(!fs.existsSync(filePath))return;

    require(initPath);
    delete require.cache[filePath];
  })
};

if(!global.kohanaJS){
  const KOJS = {};
  global.kohanaJS = KOJS;

  KOJS.SYS_PATH = module.filename.replace(/[\/\\]KohanaJS\.js$/, '');
  KOJS.EXE_PATH = KOJS.SYS_PATH;
  KOJS.APP_PATH = KOJS.SYS_PATH;
  KOJS.MOD_PATH = KOJS.SYS_PATH;
  KOJS.SYM_PATH = KOJS.SYS_PATH;
  KOJS.config   = {classes:{}, view:{}};
  KOJS.configs  = new Set();
  KOJS.configForceUpdate = true;
  KOJS.nodePackages = [];
  KOJS.classPath  = new Map(); //{'ORM'          => 'APP_PATH/classes/ORM.js'}
  KOJS.viewPath   = new Map(); //{'layout/index' => 'APP_PATH/views/layout/index'}
  KOJS.configPath = new Map(); //{'site.js       => 'APP_PATH/config/site.js'}
  KOJS.bootstrap  = {modules: [], system: []};

  KOJS.init = (EXE_PATH = null, APP_PATH = null, MOD_PATH = null, SYM_PATH = null) => {
    KOJS.configs   = new Set(['classes', 'view']);
    KOJS.classPath = new Map();
    KOJS.viewPath = new Map();
    KOJS.nodePackages = [];

    //set paths
    setPath(KOJS, EXE_PATH, APP_PATH, MOD_PATH, SYM_PATH);
    loadBootStrap(KOJS);
    updateConfig(KOJS);
    reloadModuleInit(KOJS);

    return KOJS;
  }

  KOJS.addNodeModule = dirname => {
    KOJS.nodePackages.push(dirname);
  }

  KOJS.validateCache = () => {
    updateConfig(KOJS);
    if(KOJS.config.classes.cache === false){
      clearRequireCache(KOJS);
    }

    if(KOJS.config.view.cache === false){
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