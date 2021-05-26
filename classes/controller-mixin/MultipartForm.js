const { ControllerMixin } = require('@kohanajs/core-mvc');

const querystring = require('querystring');
const fs = require('fs');
const { randomUUID } = require('crypto');
const path = require('path');
const KohanaJS = require('../../KohanaJS');

class HelperForm {
  static parseMultipartForm(request, $_POST, tempFolder) {
    const postData = { ...$_POST };
    return new Promise((resolve, reject) => {
      const mp = request.multipart(
        (field, file, filename, encoding, mimetype) => {},
        err => { if (err)reject(err); },
      );

      mp.on('field', (key, value) => {
        if (/\[]$/.test(key)) {
          const k = key.replace('[]', '');
          postData[k] = $_POST[k] || [];
          postData[k].push(value);
        } else {
          postData[key] = value;
        }
      });

      mp.on('file', (fieldname, file, filename, encoding, mimetype) => {
        const filePath = `${tempFolder}/${randomUUID()}`;
        file.pipe(fs.createWriteStream(filePath));

        file.on('data', data => {});

        file.on('end', () => {
          postData[fieldname] = {
            tmp: path,
            filename,
            encoding,
            mimetype,
          };
        });
      });

      mp.on('finish', () => { resolve(postData); });
    });
  }

  static getFieldValue(scope, fieldName, fieldType = '', value = null) {
    return {
      label: fieldName,
      name: `${scope}:${fieldName}`,
      type: fieldType.replace(/!$/, ''),
      required: /!$/.test(fieldType),
      value,
    };
  }
}

class MultipartForm extends ControllerMixin {
  static POST_DATA = '$_POST';

  static GET_DATA = '$_GET';

  static REQUEST_DATA = '$_REQUEST';

  static TEMP_FOLDER = 'tempFolder';

  static init(state) {
    if (!state.get(this.TEMP_FOLDER))state.set(this.TEMP_FOLDER, path.normalize(`${KohanaJS.EXE_PATH}/tmp`));
  }

  static async setup(state) {
    const { request } = state.get(ControllerMixin.CLIENT);
    if (!request.body && !request.multipart) return;

    state.set(this.GET_DATA, request.query || {});

    const postData = (typeof request.body === 'object')
      ? ({ ...request.body })
      : querystring.parse(request.body);

    state.set(this.POST_DATA, postData);
    if (/^multipart\/form-data/.test(request.headers['content-type'])) {
      const multipart = await HelperForm.parseMultipartForm(request, postData, state.get(this.TEMP_FOLDER));
      state.set(this.POST_DATA, multipart);
    }

    state.set(this.REQUEST_DATA, { ...state.get(this.POST_DATA), ...state.get(this.GET_DATA) });
  }
}

module.exports = MultipartForm;
