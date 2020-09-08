const {ControllerMixin} = require("@kohanajs/core-mvc");
const $ = ref => (typeof ref === 'function')? ref() : ref;

class Mime extends ControllerMixin{
  constructor(client, headers) {
    super(client);
    this.headers = headers;

    const matchExtension = (/\.[0-9a-z]+($|\?)/i).exec(this.request.raw.url || '');
    const fileExtension = matchExtension ? matchExtension[0].replace(/[.?]/g, '') : 'html';

    switch(fileExtension){
      case 'js':
      case 'json':
        $(this.headers)['Content-Type'] = 'application/json; charset=utf-8';
        break;
      case 'png':
        $(this.headers)['Content-Type'] = 'image/png';
        break;
      case 'jpg':
      case 'jpeg':
        $(this.headers)['Content-Type'] = 'image/jpeg';
        break;
      default:
        $(this.headers)['Content-Type'] = 'text/html; charset=utf-8';
    }

    this.exports = {
      fileExtension : fileExtension,
    }
  }
}

module.exports = Mime;