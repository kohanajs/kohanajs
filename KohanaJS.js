/*
MIT License

Copyright (c) 2021 Kojin Nakana

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

// KohanaJS is singleton

const fs = require('fs');
const { View } = require('@kohanajs/core-mvc');
const path = require('path');

class KohanaJS {
  static #configs = new Set();

  static #configSources = new Map();

  static VERSION = '6.1.2';

  static SYS_PATH = __dirname;

  static EXE_PATH = KohanaJS.SYS_PATH;

  static APP_PATH = KohanaJS.SYS_PATH;

  static MOD_PATH = KohanaJS.SYS_PATH;

  static SYM_PATH = KohanaJS.SYS_PATH;

  static VIEW_PATH = KohanaJS.SYS_PATH;

  static ENV = '';
  static ENV_DEVE = 'dev';
  static ENV_TEST = 'uat';
  static ENV_STAG = 'stg';
  static ENV_PROD = 'prd';

  static config = { classes: {}, view: {} };

  static configForceUpdate = true;

  static nodePackages = [];

  static classPath = new Map(); // {'ORM'          => 'APP_PATH/classes/ORM.js'}

  static viewPath = new Map(); // {'layout/index' => 'APP_PATH/views/layout/index'}

  static configPath = new Map(); // {'site.js       => 'APP_PATH/config/site.js'}

  static bootstrap = { modules: [], system: [] };

  static init(opts = {}) {
    const options = {
      EXE_PATH: null,
      APP_PATH: null,
      MOD_PATH: null,
      SYM_PATH: null,
      VIEW_PATH: null,
      ...opts,
    };

    KohanaJS.#configs = new Set();
    KohanaJS.classPath = new Map();
    KohanaJS.viewPath = new Map();
    KohanaJS.nodePackages = [];

    // set paths
    KohanaJS.#setPath(options);
    KohanaJS.#loadBootStrap();
    KohanaJS.initConfig(new Map([
      ['classes', require('./config/classes')],
      ['view', require('./config/view')],
    ]));
    KohanaJS.#reloadModuleInit();

    return KohanaJS;
  }

  static #setPath(opts) {
    KohanaJS.EXE_PATH = opts.EXE_PATH || __dirname;
    KohanaJS.APP_PATH = opts.APP_PATH || `${KohanaJS.EXE_PATH}/application`;
    KohanaJS.MOD_PATH = opts.MOD_PATH || `${KohanaJS.APP_PATH}/modules`;
    KohanaJS.SYM_PATH = opts.SYM_PATH || `${KohanaJS.APP_PATH}/system`;
    KohanaJS.VIEW_PATH = opts.VIEW_PATH || `${KohanaJS.APP_PATH}/views`;
  }

  static #loadBootStrap() {
    const bootstrapFile = `${KohanaJS.APP_PATH}/bootstrap.js`;
    if (!fs.existsSync(path.normalize(bootstrapFile))) return;

    KohanaJS.bootstrap = require(bootstrapFile);
  }

  /**
   *
   * @param {Map} configMap
   */
  static initConfig(configMap) {
    configMap.forEach((v, k) => {
      this.#configs.add(k);

      const existConfigSource = KohanaJS.#configSources.get(k);
      if (v) KohanaJS.#configSources.set(k, { ...existConfigSource, ...v });
    });

    KohanaJS.#updateConfig();
  }

  static #reloadModuleInit() {
    // activate init.js in require('kohanajs-sample-module')
    KohanaJS.nodePackages.forEach(x => {
      const initPath = `${x}/init.js`;
      const filePath = path.normalize(initPath);
      if (!fs.existsSync(filePath)) return;

      require(initPath);
      delete require.cache[filePath];
    });

    // activate init.js in system
    if (KohanaJS.bootstrap.system) {
      KohanaJS.bootstrap.system.forEach(x => {
        const initPath = `${KohanaJS.SYM_PATH}/${x}/init.js`;
        const filePath = path.normalize(initPath);
        if (!fs.existsSync(filePath)) return;

        require(initPath);
        delete require.cache[filePath];
      });
    }

    // activate init.js in modules
    if (KohanaJS.bootstrap.modules) {
      KohanaJS.bootstrap.modules.forEach(x => {
        const initPath = `${KohanaJS.MOD_PATH}/${x}/init.js`;
        const filePath = path.normalize(initPath);
        if (!fs.existsSync(path.normalize(filePath))) return;

        // load the init file
        require(initPath);
        // do not cache it.
        delete require.cache[filePath];
      });
    }
  }

  static addNodeModule(dirname) {
    KohanaJS.nodePackages.push(dirname);
    return KohanaJS;
  }

  static flushCache() {
    if (KohanaJS.configForceUpdate) KohanaJS.#updateConfig();
    if (!KohanaJS.config.classes?.cache) KohanaJS.#clearRequireCache();
    if (!KohanaJS.config.view?.cache) KohanaJS.#clearViewCache();
    if (!KohanaJS.config.classes?.cache) KohanaJS.#reloadModuleInit();
  }

  static require(pathToFile) {
    // pathToFile may include file extension;
    const adjustedPathToFile = /\..*$/.test(pathToFile) ? pathToFile : (`${pathToFile}.js`);

    // if explicit set classPath to Class or required object, just return it.
    const c = KohanaJS.classPath.get(adjustedPathToFile);

    if (c && typeof c !== 'string') {
      return c;
    }

    const file = KohanaJS.#resolve(adjustedPathToFile, 'classes', KohanaJS.classPath);
    return require(file);
  }

  static resolveView(pathToFile) {
    return KohanaJS.#resolve(pathToFile, 'views', KohanaJS.viewPath);
  }

  // private methods
  static #resolve(pathToFile, prefixPath, store, forceUpdate = false) {
    if (/\.\./.test(pathToFile)) {
      throw new Error('invalid require path');
    }

    if (!store.get(pathToFile) || forceUpdate) {
      // search application, then modules, then system
      const fetchList = [];
      if (prefixPath === 'views')fetchList.push(`${KohanaJS.VIEW_PATH}/${pathToFile}`);
      fetchList.push(`${KohanaJS.APP_PATH}/${prefixPath}/${pathToFile}`);
      fetchList.push(pathToFile);

      // load from app/modules
      if (KohanaJS.bootstrap?.modules) {
        [...KohanaJS.bootstrap.modules].reverse().forEach(x => fetchList.push(`${KohanaJS.MOD_PATH}/${x}/${prefixPath}/${pathToFile}`));
      }

      // load from app/system
      if (KohanaJS.bootstrap?.system) {
        [...KohanaJS.bootstrap.system].reverse().forEach(x => fetchList.push(`${KohanaJS.SYM_PATH}/${x}/${prefixPath}/${pathToFile}`));
      }

      fetchList.push(`${KohanaJS.SYS_PATH}/${prefixPath}/${pathToFile}`);
      [...KohanaJS.nodePackages].reverse().forEach(x => fetchList.push(`${x}/${prefixPath}/${pathToFile}`));

      fetchList.some(x => {
        if (fs.existsSync(path.normalize(x))) {
          store.set(pathToFile, x);
          return true;
        }
        return false;
      });

      if (!store.get(pathToFile)) {
        throw new Error(`KohanaJS resolve path error: path ${pathToFile} not found. ${prefixPath} , ${JSON.stringify(store)} `);
      }
    }

    return store.get(pathToFile);
  }

  static #updateConfig() {
    KohanaJS.config = {};
    // search all config files
    KohanaJS.#configs.forEach(key => {
      KohanaJS.config[key] = {...KohanaJS.#configSources.get(key)}

      const fileName = `${key}.js`;

      try{
        KohanaJS.configPath.set(fileName, null); // never cache config file path.
        const file = KohanaJS.#resolve(fileName, 'config', KohanaJS.configPath, true);
        Object.assign(KohanaJS.config[key], require(file));
        delete require.cache[path.normalize(file)];
      }catch(e){
        //config file not found;
      }
    });
  }

  static #clearRequireCache() {
    KohanaJS.classPath.forEach((v, k) => {
      if (typeof v === 'string') {
        delete require.cache[path.normalize(v)];
        KohanaJS.classPath.delete(k);
      }
    });

    KohanaJS.configPath = new Map();
  }

  static #clearViewCache() {
    KohanaJS.viewPath = new Map();
    View.DefaultViewClass.clearCache();
  }
}

global.kohanaJS = global.kohanaJS || KohanaJS;
module.exports = global.kohanaJS;
