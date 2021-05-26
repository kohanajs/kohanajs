const path = require('path');
const { Controller } = require('@kohanajs/core-mvc');
const ControllerMixinMultipartForm = require('../../classes/controller-mixin/MultipartForm');

describe('Controller Mixin Multipart Form test', () => {
  test('constructor', async () => {
    class C extends Controller.mixin([ControllerMixinMultipartForm]) {
      constructor(request) {
        super(request);
        this.state.set(ControllerMixinMultipartForm.TEMP_FOLDER, path.normalize(`${__dirname}/temp`));
      }
    }

    const c = new C({ raw: { url: '/articles/recent.aspx' }, body: '' });

    try {
      await c.execute();
      expect('no error').toBe('no error');
    } catch (e) {
      expect('should not run this').toBe('');
    }
  });

  //  test('get data', async ()=>{})
  //  test('post data', async ()=>{})
  //  test('multipart data', async ()=>{})
});
