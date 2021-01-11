const path = require('path');
const {Controller} = require('@kohanajs/core-mvc');
const ControllerMixinMultipartForm = require('../../classes/controller-mixin/MultipartForm');

describe('Controller Mixin Multipart Form test', ()=>{
  test('constructor', async ()=>{
    class C extends Controller{
      constructor(request) {
        super(request, false);
        C.mix(this, [ControllerMixinMultipartForm]);
        this.state.set('tempFolder', path.normalize(__dirname + '/temp'))
      }
    }

    const c = new C({raw: {url: '/articles/recent.aspx'}, body:""});

    try{
      await c.execute();
      expect('no error').toBe('no error');
    }catch(e){
      expect('should not run this').toBe('')
    }
  });
})