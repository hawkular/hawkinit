const chai = require('chai');
const expect = chai.expect;

const inflector = require('inflected');

const DockerComposeBuilder = require('../../lib/dockerComposeBuilder.js');

describe('DockerComposeBuilder', function () {
  describe('Constructor', function () {
    it('should work', function () {
      expect(() => new DockerComposeBuilder()).to.not.throw();
    });
    it('should work by passing a template', function () {
      const template = {
        version: '3'
      };
      expect(() => new DockerComposeBuilder(template)).to.not.throw();
    });

    it('should work if version is an integer', function () {
      const template = {
        version: 3
      };
      expect(() => new DockerComposeBuilder(template)).to.not.throw();
    });

    it('should fail if passing a template with not supported version', function () {
      const template = {
        version: 1
      };
      expect(() => new DockerComposeBuilder(template)).to.throw(Error);
    });

    it('should load from string template', function () {
      const template = 'version: \'3\'\nservices:\n  hawkular: {}';
      const builder = new DockerComposeBuilder(template);
      expect(builder.hasService('hawkular')).to.equal(true);
    });
  });

  describe('Service', function () {
    let builder = null;
    let service = null;

    beforeEach(function () {
      builder = new DockerComposeBuilder();
      service = builder.service('service');
    });

    it('should add a service', function () {
      builder.service('service');
      expect(builder.hasService('service')).to.equal(true);
    });

    it('should delete a service', function () {
      builder.removeService('service');
      expect(builder.hasService('service')).to.equal(false);
    });

    describe('Parameters', function () {
      describe('Image', function () {
        it('should set', function () {
          const imageName = 'image_name';
          service.image = imageName;
          expect(service.image).to.equal(imageName);
        });
      });

      const tests = [
        { context: 'ports', data: ['8090:8090', '8080:8080'], notFound: ['9090:9090'] },
        { context: 'links', data: ['myCassandra', 'hawkular'], notFound: ['metrics'] },
        { context: 'volumes', data: ['/tmp/opt/hawkular:/opt/data'], notFound: ['/notfound'] },
        { context: 'environment', data: ['HAWKULAR_BACKEND=remote', 'CASSANDRA_NODES=myCassandra'], notFound: ['HAWKULAR_USE_SSL=1'] }
      ];
      tests.forEach(function (test) {
        describe(`${inflector.capitalize(inflector.pluralize(test.context))}`, function () {
          it('should be able to add', function () {
            test.data.forEach(function (data) {
              service[`add${inflector.classify(test.context)}`](data);
            });
            test.data.forEach(function (data) {
              expect(service[`has${inflector.classify(test.context)}`](data)).to.equal(true);
            });
            test.notFound.forEach(function (notFound) {
              expect(service[`has${inflector.classify(test.context)}`](notFound)).to.equal(false);
            });
          });

          it('should be able to retrieve all', function () {
            test.data.forEach(function (data) {
              service[`add${inflector.classify(test.context)}`](data);
            });
            expect(service[tests.context]).to.equal(tests.data);
          });

          it('should be able to remove', function () {
            test.data.forEach(function (data) {
              service[`add${inflector.classify(test.context)}`](data);
            });
            test.data.forEach(function (data) {
              expect(service[`remove${inflector.classify(test.context)}`](data)).to.equal(true);
            });
            test.data.forEach(function (data) {
              expect(service[`has${inflector.classify(test.context)}`](data)).to.equal(false);
            });
          });
        });
      });
    });

    describe('Deploy', function () {
      it('Should be able to get one', function () {
        expect(service.deploy).to.not.be.undefined;
      });
      it('Should be able to set replicas', function () {
        const replicas = 5;
        const deploy = service.deploy;
        deploy.replicas = replicas;
        expect(deploy.replicas).to.equal(replicas);
      });
    });
  });
});
