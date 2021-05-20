const mime = require('mime');
const { ControllerMixin, View } = require('@kohanajs/core-mvc');

class ControllerMixinView extends ControllerMixin {
  static PLACEHOLDER = 'placeHolder';

  static VIEW_CLASS = 'viewClass';

  static THEME_PATH = 'themePath';

  static LAYOUT = 'layout';

  static LAYOUT_FILE = 'layoutPath';

  static TEMPLATE = 'template';

  static ERROR_TEMPLATE = 'errorTemplate';

  static init(state) {
    if (!state.get(this.LAYOUT_FILE))state.set(this.LAYOUT_FILE, 'layout/default');
    if (!state.get(this.PLACEHOLDER))state.set(this.PLACEHOLDER, 'main');
    if (!state.get(this.VIEW_CLASS))state.set(this.VIEW_CLASS, View.DefaultViewClass);
    if (!state.get(this.LAYOUT))state.set(this.LAYOUT, this.#getView(state.get(this.LAYOUT_FILE), {}, state.get(this.THEME_PATH), state.get(this.VIEW_CLASS)));

    const client = state.get('client');
    const defaultViewData = {
      language: client.language,
    };

    client.getView = (file, data = {}) => this.#getView(file, data, state.get(this.THEME_PATH), state.get(this.VIEW_CLASS));

    client.setTemplate = (file, data = {}) => state.set(this.TEMPLATE, (typeof file === 'string')
      ? this.#getView(file, Object.assign(data, defaultViewData), state.get(this.THEME_PATH), state.get(this.VIEW_CLASS))
      : file);

    client.setLayout = (file, data = {}) => state.set(this.LAYOUT, (typeof file === 'string')
      ? this.#getView(file, Object.assign(data, defaultViewData), state.get(this.THEME_PATH), state.get(this.VIEW_CLASS))
      : file);

    client.setErrorTemplate = (file, data = {}) => state.set(this.ERROR_TEMPLATE, (typeof file === 'string')
      ? this.#getView(file, Object.assign(data, defaultViewData), state.get(this.THEME_PATH), state.get(this.VIEW_CLASS))
      : file);
  }

  static async setup(state) {
    const layoutView = state.get(this.LAYOUT);
    if (state.get(this.LAYOUT_FILE) !== layoutView.file) {
      state.set(this.LAYOUT, this.#getView(state.get(this.LAYOUT_FILE), layoutView.data, state.get(this.THEME_PATH), state.get(this.VIEW_CLASS)));
    }
  }

  static async after(state) {
    const client = state.get('client');

    // .json return json content;
    if (/^application\/json/.test(client.headers['Content-Type'])) {
      client.body = JSON.stringify(client.body);
      return;
    }

    // do not render non text content, eg, no need to render when controller read protected pdf
    if (client.headers['Content-Type'] && /^text/.test(client.headers['Content-Type']) === false) {
      return;
    }

    // render template and put into layout's main output.
    // no template, replace the controller body string into layout.
    const template = state.get(this.TEMPLATE);
    const layout = state.get(this.LAYOUT);
    layout.data[state.get(this.PLACEHOLDER)] = template ? await template.render() : client.body;
    client.body = await layout.render();
  }

  static async exit(state) {
    const client = state.get('client');
    const code = client.status;
    if (code === 302) return;
    if (client.headers && client.headers['Content-Type'] === 'application/json; charset=utf-8') {
      client.body = JSON.stringify(client.body);
      return;
    }
    const errorTemplate = state.get(this.ERROR_TEMPLATE);
    const layout = state.get(this.LAYOUT);
    const placeHolder = state.get(this.PLACEHOLDER);

    if (errorTemplate) {
      Object.assign(errorTemplate.data, { body: client.body });
      layout.data[placeHolder] = await errorTemplate.render();
    } else {
      layout.data[placeHolder] = client.body;
    }
    client.body = await layout.render();
  }

  static #getView(path, data, themePath, ViewClass) {
    return new ViewClass(path, data, themePath);
  }
}

module.exports = ControllerMixinView;
