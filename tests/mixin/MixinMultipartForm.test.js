const path = require('path');
const { Controller } = require('@kohanajs/core-mvc');
const ControllerMixinMultipartForm = require('../../classes/controller-mixin/MultipartForm');

class C extends Controller.mixin([ControllerMixinMultipartForm]) {
  constructor(request) {
    super(request);
    this.state.set(ControllerMixinMultipartForm.TEMP_FOLDER, path.normalize(`${__dirname}/temp`));
  }
}

describe('Controller Mixin Multipart Form test', () => {
  test('constructor', async () => {
    const c = new C({ raw: { url: '/articles/recent.aspx' }, body: '' });

    try {
      await c.execute();
      expect('no error').toBe('no error');
    } catch (e) {
      expect('should not run this').toBe('');
    }
  });

  test('get data', async ()=>{
    const c = new C({
      raw: { url: '/articles/recent.aspx?foo=bar' },
      query: {foo:'bar'},
      body: 'hello=world&tar=sha' }
    );
    await c.execute();
    const $_GET = c.state.get(ControllerMixinMultipartForm.GET_DATA);
    expect($_GET['foo']).toBe('bar');
  })

  test('post data', async ()=>{
    const c = new C({
      raw: { url: '/articles/recent.aspx?foo=bar' },
      query: {foo:'bar'},
      body: 'hello=world&tar=sha' }
    );
    await c.execute();
    const $_POST = c.state.get(ControllerMixinMultipartForm.POST_DATA);
    expect($_POST['hello']).toBe('world');
    expect($_POST['tar']).toBe('sha');
  });

  test('multipart data', async ()=>{
    const c = new C({
      raw: { url: '/articles/recent.aspx?foo=bar' },
      headers: {
        "content-type": "multipart/form-data"
      },
      query: {foo:'bar'},
      body: 'hello=world&tar=sha',
      multipart : (handler, next) => {
        handler();
        return {
          on: (type, callback)=>{
            if(type === 'finish')callback({test:'done'});
            if(type === 'field'){
              callback('zoo', 'zebra');
              callback('person[]', 'alice');
              callback('person[]', 'bob');
            }
            if(type === 'file'){
              const file = {
                pipe:()=>{},
                on: (type, callback)=>{
                  if(type === 'data')callback('');
                  if(type === 'end')callback();
                }
              }
              callback('picture', file, 'test_filename', 'test-encoding', 'test-mime')
            }
          }
        }
      }
    });

    await c.execute();
    const $_POST = c.state.get(ControllerMixinMultipartForm.POST_DATA);
    expect($_POST['hello']).toBe('world');
    expect($_POST['tar']).toBe('sha');
    expect($_POST['zoo']).toBe('zebra');
    expect($_POST['person'].length).toBe(2);
  })

  test('multipart data error', async ()=>{
    const c = new C({
      headers: {
        "content-type": "multipart/form-data"
      },
      multipart : (handler, next) => {
        next(new Error('test error'));
      }
    });

    await c.execute();
    const $_POST = c.state.get(ControllerMixinMultipartForm.POST_DATA);
    console.log($_POST);
  })
});
