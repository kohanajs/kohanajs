const {Controller} = require('@kohanajs/core-mvc');
const ControllerMixinMultipartForm = require('../../classes/controller-mixin/MultipartForm');
const $ = ref => (typeof ref === 'function')? ref() : ref;

describe('Controller Mixin Multipart Form test', ()=>{
  test('constructor', async ()=>{
      const c = new Controller({raw: {url: '/articles/recent.aspx'}, body:""});
      try{
        c.addMixin(new ControllerMixinMultipartForm(c, __dirname + '/temp'));
        await c.execute();
        expect('no error').toBe('no error');
      }catch(e){
        expect('should not run this').toBe('')
      }
  });
})