const assert = require('assert');

const DockerComposeBuilder = require('../../lib/dockerComposeBuilder.js');

describe('DockerComposeBuilder', function () {
  describe('Constructor', function () {
    it('should work', function () {
      assert.doesNotThrow(() => new DockerComposeBuilder());
    });
    it('should work by passing a template', function () {
      const template = {
        version: '3'
      };
      assert.doesNotThrow(() => new DockerComposeBuilder(template));
    });
    it('should work if version is an integer', function () {
      const template = {
        version: 3
      };
      assert.doesNotThrow(() => new DockerComposeBuilder(template));
    });
    it('should fail if passing a template with not supported version', function () {
      const template = {
        version: 1
      };
      assert.throws(() => new DockerComposeBuilder(template), Error);
    });
  });

  describe('Service', function () {
    it('should add a service', function () {
      const builder = new DockerComposeBuilder();
      builder.service('service');
      assert(builder.hasService('service'));
    });

    describe('Parameters', function () {
      let builder = null;
      let service = null;

      beforeEach(function () {
        builder = new DockerComposeBuilder();
        service = builder.service('service');
      });

      it('should accept one image', function () {
        const imageName = 'image_name';
        service.image = imageName;
        assert(service.image === imageName);
      });
    });
  });
});
