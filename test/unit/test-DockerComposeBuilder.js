const assert = require('assert');
const mocha = require('mocha');
const describe = mocha.describe;
const it = mocha.it;

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
    it('should not fail if version is an integer', function () {
      const template = {
        version: 3
      };
      assert.doesNotThrow(() => new DockerComposeBuilder(template));
    });
    it('should fail if passing a template with wrong version', function () {
      const template = {
        version: 1
      };
      assert.throws(() => new DockerComposeBuilder(template), Error);
    });
  });
});
