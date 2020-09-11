const {ControllerMixin, View} = require("@kohanajs/core-mvc");

class ControllerMixinView extends ControllerMixin{
  /** @type {View} */
  template = null;
  /** @type {View} */
  errorTemplate = null;

  constructor(client, layout='layout/default', themePath= null, viewClass = View.defaultViewClass) {
    super(client);

    this.layout = this.getView(layout, {}, themePath, viewClass);

    this.exports = {
      getView          : (file, data= {}) => this.getView(file, data, themePath, viewClass),
      setTemplate      : (file, data= {}) => (this.template = this.getView(file, data, themePath, viewClass)),
      setErrorTemplate : (file, data= {}) => (this.errorTemplate = this.getView(file, data, themePath, viewClass)),
      template         : () => this.template,
      layout           : () => this.layout,
    }
  }

  async after(){
    //render template and put into layout's main output.
    //no template, replace the controller body string into layout.
    this.layout.data.main = (this.template) ? await this.template.render() : this.client.body;
    this.client.body = await this.layout.render();
  }

  async exit(code){
    if(code!==404 || code !== 403 || code !== 500)return;

    (this.errorTemplate) ? await this.errorTemplate.render() : this.client.body
    this.client.body = await this.layout.render();
  }

  getView(path, data, themePath, viewClass){
    return new viewClass(path, data, themePath);
  }
}

module.exports = ControllerMixinView;