const {ControllerMixin} = require("@kohanajs/core-mvc");

const qs = require('qs');
const fs = require('fs');
const {v1: uuid} = require('uuid');

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
  constructor(client, tempFolder) {
    super(client);
    this.tempFolder = tempFolder;

    this.exports = {
      '$_GET'     : this.request.query,
      '$_POST'    : () => this.postData,
      '$_REQUEST' : () => Object.assign({}, this.request.query, this.postData)
    }
  }
  async before(){
    //no request body
    if( !this.request.body && !this.request.multipart)return;

    const postData = (typeof this.request.body === 'object') ?
      Object.assign({}, this.request.body) :
      qs.parse(this.request.body);

    if(/^multipart\/form-data/.test(this.request.headers['content-type'])){
      await HelperForm.parseMultipartForm(this.request, postData, this.tempFolder);
    }

    this.postData = postData;
  }
}

module.exports = MultipartForm;