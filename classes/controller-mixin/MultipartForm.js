const {ControllerMixin} = require("@kohanajs/core-mvc");
const KohanaJS = require('../../KohanaJS');

const qs = require('qs');
const fs = require('fs');
const {v1: uuid} = require('uuid');
const path = require('path');

class HelperForm{
  static parseMultipartForm(request, $_POST, tempFolder){
    return new Promise((resolve, reject) =>{

      const mp = request.multipart(
        (field, file, filename, encoding, mimetype) => {},
        (err) => {if(err)reject(err);});

      mp.on('field', (key, value) => {
        if(/\[]$/.test(key)){
          const k = key.replace('[]', '');
          $_POST[k] = $_POST[k] || [];
          $_POST[k].push(value);
        }else{
          $_POST[key] = value;
        }
      });

      mp.on('file', (fieldname, file, filename, encoding, mimetype) => {
        const path = `${tempFolder}/${uuid()}`;
        file.pipe(fs.createWriteStream(path));

        file.on('data', data => {});

        file.on('end', ()=> {
          $_POST[fieldname] = {
            tmp: path,
            filename: filename,
            encoding: encoding,
            mimetype: mimetype
          };
        });
      });

      mp.on('finish', () => { resolve(); });
    });
  }

  static getFieldValue(scope, fieldName, fieldType = "", value = null){
    return {
      label : fieldName,
      name  : `${scope}:${fieldName}`,
      type  : fieldType.replace(/!$/,''),
      required : /!$/.test(fieldType),
      value : value
    }
  }
}

class MultipartForm extends ControllerMixin{
  static POST_DATA = '$_POST';
  static GET_DATA = '$_GET';
  static REQUEST_DATA = '$_REQUEST';
  static TEMP_FOLDER = 'tempFolder';

  static init(state){
    if(!state.get(this.TEMP_FOLDER))state.set(this.TEMP_FOLDER, path.normalize(KohanaJS.EXE_PATH + '/tmp'))
  }

  static async before(state){
    const request = state.get(ControllerMixin.CLIENT).request;
    if( !request.body && !request.multipart)return;

    const postData = (typeof request.body === 'object') ?
      Object.assign({}, request.body) :
      qs.parse(request.body);

    if(/^multipart\/form-data/.test(request.headers['content-type'])){
      await HelperForm.parseMultipartForm(request, postData, state.get(this.TEMP_FOLDER));
    }
    state.set(this.POST_DATA, postData);
    state.set(this.GET_DATA,  request.query);
    state.set(this.REQUEST_DATA, {...postData, ...request.query});
  }
}

module.exports = MultipartForm;