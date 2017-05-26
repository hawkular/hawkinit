'use strict';

const yaml = require('js-yaml');
const inflector = require('inflected');

const VERSION = '3';

const ServiceArrayProperties = ['ports', 'links', 'volumes', 'environment'];

const Service = function ServiceClass (json) {
  this._json = json;
  ServiceArrayProperties.forEach((property) => {
    if (typeof json[property] === 'undefined') {
      this._json[property] = [];
    }
  });
};

Object.defineProperty(Service, 'image', {
  get: () => this._json.image,
  set: (image) => {
    this._json.image = image;
    return this._json.image;
  }
});

ServiceArrayProperties.forEach((property) => {
  Service.prototype[`add${inflector.classify(property)}`] = (value) => {
    const index = this._json[property].indexOf(value);
    if (index === -1) {
      this._json[property].push(value);
    }
  };

  Service.prototype[`remove${inflector.classify(property)}`] = (value) => {
    const index = this._json[property].indexOf(value);
    this._json[property] = this._json[property].splice(index, 1);
  };

  Service.prototype[`has${inflector.classify(property)}`] = (value) => {
    const index = this._json[property].indexOf(value);
    return index !== -1;
  };

  Service.prototype[property] = () => this._json[property];
});

const Builder = function BuilderClass (template) {
  let templateArg = template;
  if (typeof templateArg === 'undefined') {
    templateArg = {
      version: VERSION,
      services: {},
      volumes: {}
    };
  }
  if (String(templateArg.version) !== VERSION) {
    throw new Error(`Docker-compose file format version is invalid, expected ${VERSION} got ${templateArg.version}`);
  }
  this._dockerCompose = templateArg;
};

Builder.prototype.version = () => VERSION;

Builder.prototype.dump = () => yaml.safeDump(this._dockerCompose);

Builder.prototype.service = function BuilderService (name) {
  if (!this.hasService(name)) {
    this._dockerCompose.services[name] = {};
  }
  return new Service(this._dockerCompose.services[name]);
};

Builder.prototype.hasService = function BuilderHasService (name) {
  return typeof this._dockerCompose.services[name] !== 'undefined';
};

module.exports = Builder;
