const {ControllerMixin, View} = require("@kohanajs/core-mvc");

class ControllerMixinView extends ControllerMixin{
  /** @type {View} */
  #template = null;
  /** @type {View} */
  #errorTemplate = null;
  #placeHolder;
  #layout;

  constructor(client, layout='layout/default', placeHolder = 'main', themePath= null, viewClass = View.defaultViewClass) {
    super(client);

    this.#layout = ControllerMixinView.getView(layout, {}, themePath, viewClass);
    this.#placeHolder = placeHolder;

    this.exports = {
      getView          : (file, data= {}) => ControllerMixinView.getView(file, data, themePath, viewClass),
      setTemplate      : (file, data= {}) => (this.#template      = (typeof file === 'string') ? ControllerMixinView.getView(file, data, themePath, viewClass) : file),
      setLayout        : (file, data= {}) => (this.#layout        = (typeof file === 'string') ? ControllerMixinView.getView(file, data, themePath, viewClass) : file),
      setErrorTemplate : (file, data= {}) => (this.#errorTemplate = (typeof file === 'string') ? ControllerMixinView.getView(file, data, themePath, viewClass) : file),
      template         : () => this.#template,
      errorTemplate    : () => this.#errorTemplate,
      layout           : () => this.#layout,
    }
  }

  async after(){
    //render template and put into layout's main output.
    //no template, replace the controller body string into layout.
    this.#layout.data[this.#placeHolder] = (this.#template) ? await this.#template.render() : this.client.body;
    this.client.body = await this.#layout.render();
  }

  async exit(code){
    if(code === 302) return;
    if(this.#errorTemplate){
      Object.assign(this.#errorTemplate.data, {body: this.client.body});
      this.#layout.data[this.#placeHolder] = await this.#errorTemplate.render();
    }else{
      this.#layout.data[this.#placeHolder] = this.client.body;
    }
    this.client.body = await this.#layout.render();
  }

  static getView(path, data, themePath, viewClass){
    return new viewClass(path, data, themePath);
  }
}

module.exports = ControllerMixinView;