'use strict';

const yaml = require('js-yaml');
const inflector = require('inflected');

const VERSION = '3';

const ServiceArrayProperties = ['ports', 'links', 'volumes', 'environment'];

const Deploy = function DeployClass(json) {
  this._json = json;
};

Object.defineProperty(Deploy.prototype, 'replicas', {
  get() { return this._json.replicas; },
  set(replicas) { this._json.replicas = replicas; }
});

const Service = function ServiceClass(json) {
  this._json = json;
  ServiceArrayProperties.forEach((property) => {
    if (typeof json[property] === 'undefined') {
      this._json[property] = [];
    }
  });
};

Object.defineProperty(Service.prototype, 'image', {
  get() { return this._json.image; },
  set(image) { this._json.image = image; }
});

Object.defineProperty(Service.prototype, 'deploy', {
  get() {
    if (typeof this._json.deploy === 'undefined') {
      this._json.deploy = {};
    }
    return new Deploy(this._json.deploy);
  }
});

ServiceArrayProperties.forEach((property) => {
  Service.prototype[`add${inflector.classify(property)}`] = function addProperty(value) {
    const index = this._json[property].indexOf(value);
    if (index === -1) {
      this._json[property].push(value);
    }
  };

  Service.prototype[`remove${inflector.classify(property)}`] = function removeProperty(value) {
    const index = this._json[property].indexOf(value);
    if (index !== -1) {
      this._json[property].splice(index, 1);
      return true;
    }
    return false;
  };

  Service.prototype[`has${inflector.classify(property)}`] = function hasProperty(value) {
    const index = this._json[property].indexOf(value);
    return index !== -1;
  };

  Service.prototype[property] = function getProperty() {
    return this._json[property];
  };
});

const Builder = function BuilderClass(template) {
  let templateArg = template;
  if (typeof templateArg === 'undefined') {
    templateArg = {
      version: VERSION,
      services: {},
      volumes: {}
    };
  } else if (typeof templateArg === 'string') {
    templateArg = yaml.safeLoad(templateArg);
  }

  if (String(templateArg.version) !== VERSION) {
    throw new Error(`Docker-compose file format version is invalid, expected ${VERSION} got ${templateArg.version}`);
  }
  this._dockerCompose = templateArg;
};

Builder.prototype.version = () => VERSION;

Builder.prototype.dump = function BuilderDump() {
  return yaml.safeDump(this._dockerCompose);
};

Builder.prototype.service = function BuilderService(name) {
  if (!this.hasService(name)) {
    this._dockerCompose.services[name] = {};
  }
  return new Service(this._dockerCompose.services[name]);
};

Builder.prototype.hasService = function BuilderHasService(name) {
  return typeof this._dockerCompose.services[name] !== 'undefined';
};

Builder.prototype.removeService = function BuilderRemoveService(name) {
  delete this._dockerCompose.services[name];
};

module.exports = Builder;
