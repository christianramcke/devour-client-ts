/* global describe, context, it, beforeEach, afterEach */
/* eslint-disable no-unused-expressions */

import { JsonApi } from '../../src';
import { expect } from 'chai';
import sinon from 'ts-sinon';
import * as pluralize from 'pluralize';
import { jsonApiHttpBasicAuthMiddleware } from '../../src/middleware/json-api/req-http-basic-auth';
import { bearerTokenMiddleware } from '../../src/middleware/json-api/req-bearer';
import { jsonApiGetMiddleware } from '../../src/middleware/json-api/req-get';
import { jsonApiDeleteMiddleware } from '../../src/middleware/json-api/req-delete';
import { jsonApiPatchMiddleware } from '../../src/middleware/json-api/req-patch';
import mockResponse from '../helpers/mock-response';
import { last } from 'lodash';
import { Middleware } from '../../src/middleware/interfaces/middleware';
import { Payload } from '../../src/middleware/interfaces/payload';
import { mergeMap } from 'rxjs';

describe('JsonApi', () => {
  let jsonApi = null;
  beforeEach(() => {
    jsonApi = new JsonApi({ apiUrl: 'http://myapi.com' });
  });

  afterEach(() => {
    jsonApi.resetBuilder();
  });

  describe('Constructors', () => {
    it('should allow object constructor to be used', () => {
      const jsonApi = new JsonApi({ apiUrl: 'http://myapi.com' });
      expect(jsonApi).to.be.an('object');
    });

    it('should allow apiUrl to be set via the initializer object', () => {
      const jsonApi = new JsonApi({ apiUrl: 'http://myapi.com' });
      expect(jsonApi['apiUrl']).to.eql('http://myapi.com');
    });

    it('should allow middleware to be set via the initializer object', () => {
      const middleware = [
        {
          name: 'm1',
          req: function (req) {
            return req;
          },
          res: function (res) {
            return res;
          }
        },
        {
          name: 'm2',
          req: function (req) {
            return req;
          },
          res: function (res) {
            return res;
          }
        }
      ];

      const jsonApi = new JsonApi({
        apiUrl: 'http://myapi.com',
        middleware: middleware
      });
      expect(jsonApi['middleware']).to.eql(middleware);
      expect(jsonApi['apiUrl']).to.eql('http://myapi.com');
    });

    it('should set the apiUrl during setup', () => {
      expect(jsonApi.apiUrl).to.eql('http://myapi.com');
    });

    it('should have a empty models and middleware properties after instantiation', () => {
      expect(jsonApi.models).to.be.an('object');
      expect(jsonApi.middleware).to.be.an('array');
    });

    it('should initialize with an empty headers object', () => {
      expect(jsonApi.headers).to.be.an('object');
      expect(jsonApi.headers).to.eql({});
    });

    it('should allow users to add headers', () => {
      jsonApi.headers['A-Header-Name'] = 'a value';
      expect(jsonApi.headers).to.eql({
        'A-Header-Name': 'a value'
      });
    });

    it('should allow users to add HTTP Basic Auth options', (done) => {
      jsonApi = new JsonApi({
        apiUrl: 'http://myapi.com',
        auth: { username: 'admin', password: 'cheesecake' }
      });

      jsonApi.define('foo', { title: '' });

      const inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.auth).to.be.eql({
            username: 'admin',
            password: 'cheesecake'
          });
          return {};
        }
      };

      jsonApi.middleware = [
        jsonApiHttpBasicAuthMiddleware,
        inspectorMiddleware
      ];

      jsonApi
        .one('foo', 1)
        .get()
        .subscribe(() => done());
    });

    it('should allow users to add Authorization header (bearer token)', (done) => {
      jsonApi = new JsonApi({ apiUrl: 'http://myapi.com', bearer: 'abc' });
      jsonApi.define('foo', { title: '' });

      const inspectorMiddleware: Middleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.headers.Authorization).to.be.eql('Bearer abc');
          return {} as Payload;
        }
      };

      jsonApi.middleware = [bearerTokenMiddleware, inspectorMiddleware];

      jsonApi
        .one('foo', 1)
        .get()
        .subscribe(() => done());
    });

    it('should allow users to enable/disable logger', () => {
      const jsonApiWithLogger = new JsonApi({
        apiUrl: 'http://myapi.com',
        logger: true
      });
      expect(jsonApiWithLogger['logger']).to.be.true;
      const jsonApiWithoutLogger = new JsonApi({
        apiUrl: 'http://myapi.com',
        logger: false
      });
      expect(jsonApiWithoutLogger['logger']).to.be.false;
    });

    it('should not add HTTP Authorization header if not set and from the moment when set it should be added', (done) => {
      jsonApi = new JsonApi({ apiUrl: 'http://myapi.com' });
      jsonApi.define('foo', { title: '' });

      const inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.headers).to.be.eql(undefined);
          return {};
        }
      };

      jsonApi.middleware = [bearerTokenMiddleware, inspectorMiddleware];

      const inspectorMiddlewareBearer = {
        name: 'inspector-middleware-bearer',
        req: (payload) => {
          expect(payload.req.headers.Authorization).to.be.eql('Bearer abc');
          return {};
        }
      };

      jsonApi
        .one('foo', 1)
        .get()
        .subscribe(() => {
          jsonApi.bearer = 'abc';
          jsonApi.middleware = [
            bearerTokenMiddleware,
            inspectorMiddlewareBearer
          ];

          jsonApi
            .one('foo', 2)
            .get()
            .subscribe(() => done());
        });
    });

    describe('Pluralize options', () => {
      context('no options passed -- default behavior', () => {
        it('should use the pluralize package', () => {
          jsonApi = new JsonApi({ apiUrl: 'http://myapi.com' });
          expect(jsonApi.pluralize).to.eql(pluralize);
        });
      });

      context('false -- no pluralization', () => {
        it('should not pluralize text', () => {
          jsonApi = new JsonApi({
            apiUrl: 'http://myapi.com',
            pluralize: false
          });
          expect(jsonApi.pluralize('model')).to.eql('model');
          expect(jsonApi.pluralize.singular('models')).to.eql('models');
        });
      });

      context('custom pluralization', () => {
        it('should pluralize as requested', () => {
          const pluralizer = (s) => 'Q' + s;
          pluralizer.singular = (s) => s.replace(/^Q/, '');
          jsonApi = new JsonApi({
            apiUrl: 'http://myapi.com',
            pluralize: pluralizer
          });
          expect(jsonApi.pluralize('model')).to.eql('Qmodel');
          expect(jsonApi.pluralize.singular('Qmodel')).to.eql('model');
        });
      });
    });

    describe('Trailing Slash options', () => {
      context('no options passed -- default behavior', () => {
        it('should use the default of no slashes for either url type', () => {
          jsonApi = new JsonApi({ apiUrl: 'http://myapi.com' });
          expect(jsonApi.trailingSlash).to.eql({
            collection: false,
            resource: false
          });
        });
      });

      context('option to add slashes to all urls', () => {
        it('should use slashes for both url types', () => {
          jsonApi = new JsonApi({
            apiUrl: 'http://myapi.com',
            trailingSlash: true
          });
          expect(jsonApi.trailingSlash).to.eql({
            collection: true,
            resource: true
          });
        });
      });

      context('option to add slashes to only collection urls', () => {
        it('should only use slashes for collection urls', () => {
          jsonApi = new JsonApi({
            apiUrl: 'http://myapi.com',
            trailingSlash: { collection: true }
          });
          expect(jsonApi.trailingSlash).to.eql({
            collection: true,
            resource: false
          });
        });
      });

      context('option to add slashes to only resource urls', () => {
        it('should only use slashes for resource urls', () => {
          jsonApi = new JsonApi({
            apiUrl: 'http://myapi.com',
            trailingSlash: { resource: true }
          });
          expect(jsonApi.trailingSlash).to.eql({
            collection: false,
            resource: true
          });
        });
      });
    });

    it.skip('should throw Exception if the constructor does not receive proper arguments', () => {
      expect(function () {
        throw new Error('boom!');
      }).to.throw(/boom/);
    });
  });

  describe('urlFor, pathFor and path builders', () => {
    context('default no trailing slashes', () => {
      it('should construct collection paths for models', () => {
        jsonApi.define('product', {});
        expect(jsonApi.collectionPathFor('product')).to.eql('products');
      });

      it('should allow overrides for collection paths', () => {
        jsonApi.define('product', {}, { collectionPath: 'my-products' });
        expect(jsonApi.collectionPathFor('product')).to.eql('my-products');
      });

      it('should allow arbitrary collections without a model', () => {
        expect(jsonApi.collectionPathFor('foo')).to.eql('foos');
      });

      it('should construct single resource paths for models', () => {
        jsonApi.define('product', {});
        expect(jsonApi.resourcePathFor('product', 1)).to.eql('products/1');
      });

      it('should construct collection urls for models', () => {
        jsonApi.define('product', {});
        expect(jsonApi.collectionUrlFor('product')).to.eql(
          'http://myapi.com/products'
        );
      });

      it('should construct single resource urls for models', () => {
        jsonApi.define('product', {});
        expect(jsonApi.resourceUrlFor('product', 1)).to.eql(
          'http://myapi.com/products/1'
        );
      });

      it('should refuse to construct single resource urls for models containing `null`', () => {
        jsonApi.define('product', {});
        expect(function () {
          jsonApi.resourceUrlFor('product', null);
        }).to.throws(/^No ID specified/);
      });

      it('should construct single resource urls for models with the string "null"', () => {
        jsonApi.define('product', {});
        expect(jsonApi.resourceUrlFor('product', 'null')).to.eql(
          'http://myapi.com/products/null'
        );
      });

      it('should refuse to construct single resource urls for models containing `undefined`', () => {
        jsonApi.define('product', {});
        expect(function () {
          jsonApi.resourceUrlFor('product', undefined);
        }).to.throws(/^No ID specified/);
      });

      it('should construct single resource urls for models with the string "undefined"', () => {
        jsonApi.define('product', {});
        expect(jsonApi.resourceUrlFor('product', 'undefined')).to.eql(
          'http://myapi.com/products/undefined'
        );
      });

      it('should allow urlFor to be called with various options', () => {
        expect(jsonApi.urlFor({ model: 'foo', id: 1 })).to.eql(
          'http://myapi.com/foos/1'
        );
        expect(jsonApi.urlFor({ model: 'foo' })).to.eql(
          'http://myapi.com/foos'
        );
        expect(jsonApi.urlFor({})).to.eql('http://myapi.com/');
        expect(jsonApi.urlFor()).to.eql('http://myapi.com/');
        expect(jsonApi.all('foo').urlFor()).to.eql('http://myapi.com/foos');
      });

      it('should allow pathFor to be called with various options', () => {
        expect(jsonApi.pathFor({ model: 'foo', id: 1 })).to.eql('foos/1');
        expect(jsonApi.pathFor({ model: 'foo' })).to.eql('foos');
        expect(jsonApi.pathFor({})).to.eql('');
        expect(jsonApi.pathFor()).to.eql('');
        expect(jsonApi.all('foo').pathFor()).to.eql('foos');
      });
    });

    context('with collection and resource trailing slashes', () => {
      beforeEach(() => {
        jsonApi = new JsonApi({
          apiUrl: 'http://myapi.com',
          trailingSlash: { collection: true, resource: true }
        });
      });

      afterEach(() => {
        jsonApi.resetBuilder();
      });

      it('should construct collection urls', () => {
        jsonApi.define('product', {});
        expect(jsonApi.collectionUrlFor('product')).to.eql(
          'http://myapi.com/products/'
        );
      });

      it('should construct resource urls', () => {
        jsonApi.define('product', {});
        expect(jsonApi.resourceUrlFor('product', 1)).to.eql(
          'http://myapi.com/products/1/'
        );
      });

      it('should construct collection urls with urlFor', () => {
        expect(jsonApi.urlFor({ model: 'foo' })).to.eql(
          'http://myapi.com/foos/'
        );
        expect(jsonApi.all('foo').urlFor()).to.eql('http://myapi.com/foos/');
      });

      it('should construct complex collection urls with urlFor', () => {
        expect(jsonApi.urlFor({ model: 'foo' })).to.eql(
          'http://myapi.com/foos/'
        );
        expect(jsonApi.one('bar', '1').all('foo').urlFor()).to.eql(
          'http://myapi.com/bars/1/foos/'
        );
      });

      it('should construct the relationships URL', () => {
        expect(
          jsonApi.one('bar', '1').relationships().all('foo').urlFor()
        ).to.eql('http://myapi.com/bars/1/relationships/foos/');
      });

      context('with relationships which arent named after their type', () => {
        beforeEach(() => {
          jsonApi.define('product');
          jsonApi.define('order', {
            items: { jsonApi: 'hasMany', type: 'product' }
          });
        });

        it('should construct the relationship URL', () => {
          const url = jsonApi.one('order', 1).relationships('items').urlFor();

          expect(url).to.eql('http://myapi.com/orders/1/relationships/items/');
        });

        it('should be able to update the relationships', (done) => {
          const inspectorMiddleware = {
            name: 'inspector-middleware',
            req: (payload) => {
              expect(payload.req.method).to.be.eql('PATCH');
              expect(payload.req.url).to.be.eql(
                'http://myapi.com/orders/1/relationships/items/'
              );
              expect(payload.req.data).to.be.eql([{ id: 2 }]);
              return {};
            }
          };

          jsonApi.middleware = [inspectorMiddleware];

          jsonApi
            .one('order', 1)
            .relationships('items')
            .patch([{ id: 2 }])
            .subscribe({
              next: () => done(),
              error: (error) => done(error)
            });
        });

        it('should be able to delete the relationships', (done) => {
          const inspectorMiddleware = {
            name: 'inspector-middleware',
            req: (payload) => {
              expect(payload.req.method).to.be.eql('DELETE');
              expect(payload.req.url).to.be.eql(
                'http://myapi.com/orders/1/relationships/items/'
              );
              expect(payload.req.data).to.be.eql([{ id: 2 }]);
              return {};
            }
          };
          jsonApi.middleware = [inspectorMiddleware];

          jsonApi
            .one('order', 1)
            .relationships('items')
            .destroy([{ id: 2 }])
            .subscribe({
              next: () => done(),
              error: (error) => done(error)
            });
        });

        it('sets the model correctly for serialization', () => {
          jsonApi.one('order', 1).relationships('items');

          expect(last(jsonApi.builderStack)['model']).to.eql('product');
        });

        it('complains if the relationship is not defined', () => {
          expect(function (done) {
            jsonApi
              .one('order', 1)
              .relationships('baz')
              .patch({})
              .subscribe({
                next: () => done(),
                error: () => done()
              });
          }).to.throws(
            /API resource definition on model "order" for relationship "baz"/
          );
        });

        it('complains if relationships is called without a model', () => {
          expect(function (done) {
            jsonApi.relationships('baz').patch({}).then(done).catch(done);
          }).to.throws(/Relationships must be called with a preceding model/);
        });
      });

      it('should construct resource urls with urlFor', () => {
        expect(jsonApi.urlFor({ model: 'foo', id: '1' })).to.eql(
          'http://myapi.com/foos/1/'
        );
        expect(jsonApi.one('foo', '1').urlFor()).to.eql(
          'http://myapi.com/foos/1/'
        );
      });
      it('should construct complex resource urls with urlFor', () => {
        expect(jsonApi.all('bars').one('foo', '1').urlFor()).to.eql(
          'http://myapi.com/bars/foos/1/'
        );
      });
    });

    context('with only collection trailing slashes', () => {
      beforeEach(() => {
        jsonApi = new JsonApi({
          apiUrl: 'http://myapi.com',
          trailingSlash: { collection: true, resource: false }
        });
      });

      afterEach(() => {
        jsonApi.resetBuilder();
      });

      it('should construct resource urls with urlFor without trailing slashes', () => {
        expect(jsonApi.urlFor({ model: 'foo', id: '1' })).to.eql(
          'http://myapi.com/foos/1'
        );
        expect(jsonApi.one('foo', '1').urlFor()).to.eql(
          'http://myapi.com/foos/1'
        );
      });
    });

    context('with only resource trailing slashes', () => {
      beforeEach(() => {
        jsonApi = new JsonApi({
          apiUrl: 'http://myapi.com',
          trailingSlash: { collection: false, resource: true }
        });
      });

      afterEach(() => {
        jsonApi.resetBuilder();
      });

      it('should construct collection urls with urlFor without trailing slashes', () => {
        expect(jsonApi.urlFor({ model: 'foo' })).to.eql(
          'http://myapi.com/foos'
        );
        expect(jsonApi.all('foo').urlFor()).to.eql('http://myapi.com/foos');
      });
    });
  });

  describe('Middleware', () => {
    it('should allow users to register middleware', () => {
      const catMiddleWare = {
        name: 'cat-middleware',
        req: function (req) {
          return req;
        },
        res: function (res) {
          return res;
        }
      };
      jsonApi.middleware.unshift(catMiddleWare);
      expect(jsonApi.middleware[0].name).to.eql('cat-middleware');
    });

    it('should allow users to register middleware before or after existing middleware', () => {
      const responseMiddleware = jsonApi.middleware.filter(
        (middleware) => middleware.name === 'response'
      )[0];
      const beforeMiddleware = {
        name: 'before'
      };
      const afterMiddleware = {
        name: 'after'
      };
      const index = jsonApi.middleware.indexOf(responseMiddleware);
      jsonApi.insertMiddlewareBefore('response', beforeMiddleware);
      jsonApi.insertMiddlewareAfter('response', afterMiddleware);
      expect(jsonApi.middleware.indexOf(beforeMiddleware)).to.eql(index);
      expect(jsonApi.middleware.indexOf(afterMiddleware)).to.eql(index + 2);
    });

    it('should not allow users to register the same middleware twice', () => {
      const responseMiddleware = jsonApi.middleware.filter(
        (middleware) => middleware.name === 'response'
      )[0];
      const catMiddleWare = {
        name: 'cat-middleware',
        req: function (req) {
          return req;
        },
        res: function (res) {
          return res;
        }
      };
      const index = jsonApi.middleware.indexOf(responseMiddleware);
      jsonApi.insertMiddlewareBefore('response', catMiddleWare);
      expect(jsonApi.middleware.indexOf(catMiddleWare)).to.eql(index);
      jsonApi.insertMiddlewareAfter('response', catMiddleWare);
      expect(jsonApi.middleware.indexOf(catMiddleWare)).to.not.eql(index + 2);
      expect(jsonApi.middleware.indexOf(catMiddleWare)).to.eql(index);
    });

    it('should allow users to remove existing middleware', () => {
      const catMiddleWare = {
        name: 'cat-middleware',
        req: function (req) {
          return req;
        },
        res: function (res) {
          return res;
        }
      };
      jsonApi.insertMiddlewareBefore('response', catMiddleWare);
      const middlewareLength = jsonApi.middleware.length;
      jsonApi.removeMiddleware('cat-middleware');
      expect(jsonApi.middleware.length).to.eql(middlewareLength - 1);
      expect(
        jsonApi.middleware.findIndex(
          (middleware) => middleware.name === 'cat-middleware'
        )
      ).to.eql(-1);
    });
  });

  describe('Models and serializers', () => {
    it('should expose the serialize and deserialize objects', () => {
      expect(jsonApi.serialize.collection).to.be.a('function');
      expect(jsonApi.serialize.resource).to.be.a('function');
      expect(jsonApi.deserialize.collection).to.be.a('function');
      expect(jsonApi.deserialize.resource).to.be.a('function');
    });

    it('should allow users to define models', () => {
      jsonApi.define('product', {
        id: '',
        title: ''
      });
      expect(jsonApi.models.product).to.be.an('object');
      expect(jsonApi.models.product.attributes).to.have.keys(['id', 'title']);
    });
  });

  describe('Basic API calls', () => {
    it('should make basic find calls', (done) => {
      mockResponse(jsonApi, {
        data: {
          data: {
            id: '1',
            type: 'products',
            attributes: {
              title: 'Some Title'
            }
          }
        }
      });
      jsonApi.define('product', {
        title: ''
      });
      jsonApi.find('product', 1).subscribe({
        next: ({ data, _errors, _meta, _links }) => {
          expect(data.id).to.eql('1');
          expect(data.title).to.eql('Some Title');
          done();
        },
        error: (err) => console.log(err)
      });
    });

    it('should make basic findAll calls', (done) => {
      mockResponse(jsonApi, {
        data: {
          data: [
            {
              id: '1',
              type: 'products',
              attributes: {
                title: 'Some Title'
              }
            },
            {
              id: '2',
              type: 'products',
              attributes: {
                title: 'Another Title'
              }
            }
          ]
        }
      });
      jsonApi.define('product', {
        title: ''
      });
      jsonApi.findAll('product').subscribe({
        next: ({ data, _errors, _meta, _links }) => {
          expect(data[0].id).to.eql('1');
          expect(data[0].title).to.eql('Some Title');
          expect(data[1].id).to.eql('2');
          expect(data[1].title).to.eql('Another Title');
          done();
        },
        error: (err) => console.log(err)
      });
    });

    it('should make basic create call', (done) => {
      const inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('POST');
          expect(payload.req.url).to.be.eql('http://myapi.com/foos');
          expect(payload.req.data).to.be.eql({ title: 'foo' });
          expect(payload.req.params).to.be.eql({ include: 'something' });
          return {};
        }
      };

      jsonApi.middleware = [inspectorMiddleware];

      jsonApi.define('foo', {
        title: ''
      });

      jsonApi
        .create('foo', { title: 'foo' }, { include: 'something' })
        .subscribe({
          next: () => {
            done();
          },
          error: (error) => done(error)
        });
    });

    it('should make basic create call with many request middlewares', (done) => {
      const inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('POST');
          expect(payload.req.url).to.be.eql('http://myapi.com/foos');
          expect(payload.req.data).to.be.eql({ title: 'foo' });
          expect(payload.req.params).to.be.eql({ include: 'something' });
          return payload;
        }
      };

      const secondMiddleware = {
        name: 'post-middleware',
        req: (payload) => {
          payload.req.meta = { foo: 'bar' };
          return payload;
        }
      };

      const thirdMiddleware = {
        name: 'validate-middleware',
        req: (payload) => {
          expect(payload.req.data).to.be.eql({ title: 'foo' });
          expect(payload.req.meta).to.be.eql({ foo: 'bar' });
          return {};
        }
      };

      jsonApi.middleware = [
        inspectorMiddleware,
        secondMiddleware,
        thirdMiddleware
      ];

      jsonApi.define('foo', {
        title: ''
      });

      jsonApi
        .create('foo', { title: 'foo' }, { include: 'something' })
        .subscribe({
          next: () => {
            done();
          },
          error: (error) => done(error)
        });
    });

    it('should make basic update call', (done) => {
      const inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('PATCH');
          expect(payload.req.url).to.be.eql('http://myapi.com/foos');
          expect(payload.req.data).to.be.eql({ title: 'foo' });
          expect(payload.req.params).to.be.eql({ include: 'something' });
          return {};
        }
      };

      jsonApi.middleware = [inspectorMiddleware];

      jsonApi.define('foo', {
        title: ''
      });

      jsonApi
        .update('foo', { title: 'foo' }, { include: 'something' })
        .subscribe({
          next: () => {
            done();
          },
          error: (error) => done(error)
        });
    });

    it('should include meta information on response objects', (done) => {
      mockResponse(jsonApi, {
        data: {
          meta: {
            totalObjects: 1
          },
          data: [
            {
              id: '1',
              type: 'products',
              attributes: {
                title: 'Some Title'
              }
            }
          ]
        }
      });
      jsonApi.define('product', {
        title: ''
      });
      jsonApi.findAll('product').subscribe({
        next: ({ data, _errors, meta, _links }) => {
          expect(meta.totalObjects).to.eql(1);
          expect(data[0].id).to.eql('1');
          expect(data[0].title).to.eql('Some Title');
          done();
        },
        error: (err) => console.log(err)
      });
    });

    it('should include meta information on response data objects', (done) => {
      mockResponse(jsonApi, {
        data: {
          meta: {
            totalObjects: 1
          },
          data: [
            {
              id: '1',
              type: 'products',
              attributes: {
                title: 'Some Title'
              },
              meta: {
                totalAttributes: 1
              }
            }
          ]
        }
      });
      jsonApi.define('product', {
        title: ''
      });
      jsonApi.findAll('product').subscribe({
        next: ({ data, _errors, _meta, _links }) => {
          expect(data[0].meta.totalAttributes).to.eql(1);
          expect(data[0].id).to.eql('1');
          expect(data[0].title).to.eql('Some Title');
          done();
        },
        error: (err) => console.log(err)
      });
    });

    it('should include links information on response objects', (done) => {
      mockResponse(jsonApi, {
        data: {
          meta: {
            totalObjects: 13
          },
          data: [
            {
              id: '1',
              type: 'products',
              attributes: {
                title: 'Some Title'
              }
            }
          ],
          links: {
            self: 'http://example.com/products?page[number]=3&page[size]=1',
            first: 'http://example.com/products?page[number]=1&page[size]=1',
            prev: 'http://example.com/products?page[number]=2&page[size]=1',
            next: 'http://example.com/products?page[number]=4&page[size]=1',
            last: 'http://example.com/products?page[number]=13&page[size]=1'
          }
        }
      });
      jsonApi.define('product', {
        title: ''
      });
      jsonApi.findAll('product').subscribe({
        next: ({ data, _errors, _meta, links }) => {
          expect(links.self).to.eql(
            'http://example.com/products?page[number]=3&page[size]=1'
          );
          expect(links.first).to.eql(
            'http://example.com/products?page[number]=1&page[size]=1'
          );
          expect(links.prev).to.eql(
            'http://example.com/products?page[number]=2&page[size]=1'
          );
          expect(links.next).to.eql(
            'http://example.com/products?page[number]=4&page[size]=1'
          );
          expect(links.last).to.eql(
            'http://example.com/products?page[number]=13&page[size]=1'
          );
          expect(data[0].id).to.eql('1');
          expect(data[0].title).to.eql('Some Title');
          done();
        },
        error: (err) => console.log(err)
      });
    });

    it('should include links information on response data objects', (done) => {
      mockResponse(jsonApi, {
        data: {
          meta: {
            totalObjects: 13
          },
          data: [
            {
              id: '1',
              type: 'products',
              attributes: {
                title: 'Some Title'
              },
              links: {
                self: 'http://example.com/products/1'
              }
            }
          ],
          links: {
            self: 'http://example.com/products?page[number]=3&page[size]=1',
            first: 'http://example.com/products?page[number]=1&page[size]=1',
            prev: 'http://example.com/products?page[number]=2&page[size]=1',
            next: 'http://example.com/products?page[number]=4&page[size]=1',
            last: 'http://example.com/products?page[number]=13&page[size]=1'
          }
        }
      });
      jsonApi.define('product', {
        title: ''
      });
      jsonApi.findAll('product').subscribe({
        next: ({ data, _errors, _meta, _links }) => {
          expect(data[0].links.self).to.eql('http://example.com/products/1');
          expect(data[0].id).to.eql('1');
          expect(data[0].title).to.eql('Some Title');
          done();
        },
        error: (err) => console.log(err)
      });
    });

    it('should include errors information on response objects', (done) => {
      mockResponse(jsonApi, {
        data: {
          data: [
            {
              id: '1',
              type: 'products',
              attributes: {
                title: 'Some Title'
              }
            }
          ],
          errors: [
            {
              status: 422,
              source: { pointer: '/data/attributes/first-name' },
              title: 'Invalid Attribute',
              detail: 'First name must contain at least three characters.'
            }
          ]
        }
      });
      jsonApi.define('product', {
        title: ''
      });
      jsonApi.findAll('product').subscribe({
        next: ({ data, errors, _meta, _links }) => {
          expect(errors[0].status).to.eql(422);
          expect(errors[0].source.pointer).to.eql(
            '/data/attributes/first-name'
          );
          expect(errors[0].title).to.eql('Invalid Attribute');
          expect(errors[0].detail).to.eql(
            'First name must contain at least three characters.'
          );
          expect(data[0].id).to.eql('1');
          expect(data[0].title).to.eql('Some Title');
          done();
        },
        error: (err) => console.log(err)
      });
    });

    it('should expose a method for arbitrary HTTP calls', () => {
      const url = 'https://example.com';
      const method = 'PATCH';
      const params = { id: 3 };
      const data = { body: 'something different' };

      const spy = sinon.spy(jsonApi, 'runMiddleware');

      jsonApi.request(url, method, params, data);

      sinon.assert.calledOnce(spy);
      sinon.assert.calledWith(spy, { url, method, params, data });
    });

    it('should handle null primary data', (done) => {
      mockResponse(jsonApi, {
        data: {
          data: null
        }
      });
      jsonApi.define('product', {
        title: ''
      });
      jsonApi.find('product', 1).subscribe({
        next: ({ data, _errors, _meta, _links }) => {
          expect(data).to.eql(null);
          done();
        },
        error: (err) => console.log(err)
      });
    });

    it('should have an empty body on GET requests', (done) => {
      const inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('GET');
          expect(payload.req.data).to.eql(undefined);
          expect(payload.req.url).to.be.eql('http://myapi.com/foos/1');
          return {};
        }
      };

      jsonApi.middleware = [jsonApiGetMiddleware, inspectorMiddleware];

      jsonApi
        .one('foo', 1)
        .find()
        .subscribe({
          next: () => done(),
          error: (error) => done(error)
        });
    });

    it('should have an empty body on DELETE requests', (done) => {
      const inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('DELETE');
          expect(payload.req.data).to.eql(undefined);
          expect(payload.req.url).to.be.eql('http://myapi.com/foos/1');
          return {};
        }
      };

      jsonApi.middleware = [jsonApiDeleteMiddleware, inspectorMiddleware];

      jsonApi.destroy('foo', 1).subscribe({
        next: () => done(),
        error: (error) => done(error)
      });
    });

    it('should accept a data payload on DELETE requests when provided as a third argument', (done) => {
      const inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('DELETE');
          expect(payload.req.data).to.be.an('object');
          expect(payload.req.data.data).to.be.an('array');
          expect(payload.req.url).to.be.eql('http://myapi.com/foos/1');
          return {};
        }
      };

      jsonApi.middleware = [jsonApiDeleteMiddleware, inspectorMiddleware];

      const payload = [
        { type: 'bar', id: 2 },
        { type: 'bar', id: 3 }
      ];

      jsonApi.destroy('foo', 1, payload).subscribe({
        next: () => done(),
        error: (error) => done(error)
      });
    });

    it('should accept a meta and data payload on DELETE requests when provided as a third and fourth arguments', (done) => {
      const inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('DELETE');
          expect(payload.req.data).to.be.an('object');
          expect(payload.req.data.data).to.be.an('array');
          expect(payload.req.url).to.be.eql('http://myapi.com/foos/1');
          expect(payload.req.meta.totalObjects).to.eql(1);

          return {};
        }
      };

      jsonApi.middleware = [jsonApiDeleteMiddleware, inspectorMiddleware];

      const payload = [
        { type: 'bar', id: 2 },
        { type: 'bar', id: 3 }
      ];

      const meta = {
        totalObjects: 1
      };

      jsonApi.destroy('foo', 1, payload, meta).subscribe({
        next: () => done(),
        error: (error) => done(error)
      });
    });

    it('should accept a data payload on DELETE requests when provided as a single argument', (done) => {
      const inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('DELETE');
          expect(payload.req.data).to.be.an('object');
          expect(payload.req.data.data).to.be.an('array');
          expect(payload.req.url).to.be.eql(
            'http://myapi.com/foos/1/relationships/bars'
          );
          return {};
        }
      };

      jsonApi.middleware = [jsonApiDeleteMiddleware, inspectorMiddleware];

      const payload = [
        { type: 'bar', id: 2 },
        { type: 'bar', id: 3 }
      ];

      jsonApi
        .one('foo', 1)
        .relationships()
        .all('bar')
        .destroy(payload)
        .subscribe({
          next: () => done(),
          error: (error) => done(error)
        });
    });

    it.skip('should throw an error while attempting to access undefined model', function (done) {
      expect(function () {
        jsonApi.findAll('derp').then(done).catch(done);
      }).to.throws(/API resource definition for model/);
    });

    it('should not throw any errors accessing undefined models while the disableErrorsForMissingResourceDefinitions flag is enabled.', function () {
      jsonApi.disableErrorsForMissingResourceDefinitions = true;
      expect(jsonApi.modelFor('derp')).to.be.an('object').and.to.eql({
        attributes: {},
        options: {}
      });
    });
  });

  describe('Complex API calls', () => {
    it('should work on bidirectional connected entities', (done) => {
      mockResponse(jsonApi, {
        data: {
          data: {
            id: '1',
            type: 'product',
            attributes: {
              title: 'Some Title'
            },
            relationships: {
              company: {
                data: {
                  type: 'company',
                  id: '42'
                }
              }
            }
          },
          included: [
            {
              type: 'company',
              id: '42',
              attributes: {
                brand: 'Cool Company'
              },
              relationships: {
                products: {
                  data: [
                    {
                      type: 'product',
                      id: '1'
                    },
                    {
                      type: 'product',
                      id: '2'
                    }
                  ]
                }
              }
            },
            {
              id: '1',
              type: 'product',
              attributes: {
                title: 'Some Title'
              },
              relationships: {
                company: {
                  data: {
                    type: 'company',
                    id: '42'
                  }
                }
              }
            }
          ]
        }
      });

      jsonApi.define('product', {
        title: '',
        company: {
          jsonApi: 'hasOne',
          type: 'company'
        }
      });
      jsonApi.define('company', {
        brand: '',
        products: {
          jsonApi: 'hasMany',
          type: 'product'
        }
      });
      jsonApi
        .find('product', 42, { include: 'company,company.products' })
        .subscribe({
          next: ({ data, _errors, _meta, _links }) => {
            expect(data.id).to.eql('1');
            expect(data.title).to.eql('Some Title');
            expect(data.company.id).to.eql('42');
            expect(data.company.brand).to.eql('Cool Company');
            expect(data.company.products[0].id).to.eql('1');
            expect(data.company.products[0].title).to.eql('Some Title');
            done();
          },
          error: (err) => console.log(err)
        });
    });

    it('should not cache the second request', (done) => {
      mockResponse(jsonApi, {
        data: {
          data: [
            {
              id: '42',
              type: 'clan',
              attributes: {
                title: 'MyClan'
              },
              relationships: {
                leader: {
                  data: {
                    type: 'player',
                    id: '5'
                  }
                },
                memberships: {
                  data: [
                    {
                      type: 'clanMembership',
                      id: '15'
                    },
                    {
                      type: 'clanMembership',
                      id: '16'
                    }
                  ]
                }
              }
            }
          ],
          included: [
            {
              type: 'clanMembership',
              id: '15',
              relationships: {
                clan: {
                  data: {
                    type: 'clan',
                    id: '42'
                  }
                },
                player: {
                  data: {
                    type: 'player',
                    id: '5'
                  }
                }
              }
            },
            {
              type: 'clanMembership',
              id: '16',
              relationships: {
                clan: {
                  data: {
                    type: 'clan',
                    id: '42'
                  }
                },
                player: {
                  data: {
                    type: 'player',
                    id: '6'
                  }
                }
              }
            },
            {
              type: 'player',
              id: '5',
              attributes: {
                name: 'Dragonfire'
              }
            }
          ]
        }
      });

      jsonApi.define('clan', {
        title: '',
        leader: {
          jsonApi: 'hasOne',
          type: 'player'
        },
        memberships: {
          jsonApi: 'hasMany',
          type: 'clanMembership'
        }
      });
      jsonApi.define('clanMembership', {
        clan: {
          jsonApi: 'hasOne',
          type: 'clan'
        },
        player: {
          jsonApi: 'hasOne',
          type: 'player'
        }
      });
      jsonApi.define('player', {
        name: ''
      });

      jsonApi.findAll('clan', { include: 'memberships' }).subscribe({
        next: ({ data, _errors, _meta, _links }) => {
          // console.log('request 1', clans);
          // console.log('memberships', clans[0].memberships);
          expect(data[0].memberships.length).to.eql(2);
          // expect(clans[0].memberships[0].clan.id).to.eql("42")
          // expect(clans[0].memberships[1].clan.id).to.eql("42")
          // second request
          mockResponse(jsonApi, {
            data: {
              data: {
                id: '42',
                type: 'clan',
                attributes: {
                  title: 'MyClan'
                },
                relationships: {
                  memberships: {
                    data: [
                      {
                        type: 'clanMembership',
                        id: '15'
                      },
                      {
                        type: 'clanMembership',
                        id: '16'
                      }
                    ]
                  }
                }
              },
              included: [
                {
                  type: 'clanMembership',
                  id: '15',
                  relationships: {
                    clan: {
                      data: {
                        type: 'clan',
                        id: '42'
                      }
                    },
                    player: {
                      data: {
                        type: 'player',
                        id: '5'
                      }
                    }
                  }
                },
                {
                  type: 'clanMembership',
                  id: '16',
                  relationships: {
                    clan: {
                      data: {
                        type: 'clan',
                        id: '42'
                      }
                    },
                    player: {
                      data: {
                        type: 'player',
                        id: '6'
                      }
                    }
                  }
                },
                {
                  type: 'player',
                  id: '5',
                  attributes: {
                    name: 'Dragonfire'
                  }
                },
                {
                  type: 'player',
                  id: '6',
                  attributes: {
                    name: 'nicooga'
                  }
                }
              ]
            }
          });
          jsonApi
            .find('clan', 42, { include: 'memberships,memberships.player' })
            .subscribe({
              next: ({ data, _errors, _meta, _links }) => {
                // console.log('request 2: ', clan);
                expect(data.memberships[0].player.name).to.eql('Dragonfire');
                // expect(clan.memberships[0].clan.id).to.eql('42')
                expect(data.memberships[1].player.name).to.eql('nicooga');
                // expect(clan.memberships[1].clan.id).to.eql('42')
                done();
              },
              error: (err) => console.log(err)
            });
        },
        error: (err) => console.log(err)
      });
    });
  });

  describe('Builder pattern for route construction', () => {
    beforeEach(() => {
      jsonApi.define('foo', { title: '', subtitle: '' });
      jsonApi.define('bar', { title: '' });
      jsonApi.define('baz', { title: '' });
    });

    it('should respect resetBuilderOnCall', (done) => {
      const inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('GET');
          expect(payload.req.url).to.be.eql('http://myapi.com/');
          return {};
        }
      };
      jsonApi.middleware = [inspectorMiddleware];
      jsonApi
        .get()
        .pipe(
          mergeMap(() => {
            const inspectorMiddleware = {
              name: 'inspector-middleware',
              req: (payload) => {
                expect(payload.req.method).to.be.eql('GET');
                expect(payload.req.url).to.be.eql('http://myapi.com/foos');
                return {};
              }
            };
            jsonApi.middleware = [inspectorMiddleware];
            return jsonApi.all('foo').get();
          })
        )
        .subscribe({
          next: () => {
            done();
          },
          error: (error) => done(error)
        });

      expect(jsonApi.buildUrl()).to.eql('http://myapi.com/');
    });

    it('should respect resetBuilderOnCall when it is disabled', (done) => {
      jsonApi = new JsonApi({
        apiUrl: 'http://myapi.com',
        resetBuilderOnCall: false
      });
      const inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('GET');
          expect(payload.req.url).to.be.eql('http://myapi.com/foos/1');
          return {};
        }
      };

      jsonApi.middleware = [inspectorMiddleware];

      jsonApi
        .one('foo', 1)
        .get()
        .subscribe({
          next: () => {
            const inspectorMiddleware = {
              name: 'inspector-middleware',
              req: (payload) => {
                expect(payload.req.method).to.be.eql('GET');
                expect(payload.req.url).to.be.eql(
                  'http://myapi.com/foos/1/bars'
                );
                return {};
              }
            };

            jsonApi.middleware = [inspectorMiddleware];

            return jsonApi
              .all('bar')
              .get()
              .subscribe(() => done());
          },
          error: (error) => done(error)
        });
    });

    it('should allow builders to be used', () => {
      expect(jsonApi.buildUrl()).to.eql('http://myapi.com/');
    });

    it('should allow builders on all', () => {
      expect(jsonApi.all('foo').all('bar').all('baz').pathFor()).to.eql(
        'foos/bars/bazs'
      );

      jsonApi.resetBuilder();

      expect(jsonApi.all('foos').all('bars').all('bazs').pathFor()).to.eql(
        'foos/bars/bazs'
      );
    });

    it('should allow builders on one', () => {
      expect(
        jsonApi.one('foo', 1).one('bar', 2).one('baz', 3).pathFor()
      ).to.eql('foos/1/bars/2/bazs/3');

      jsonApi.resetBuilder();

      expect(
        jsonApi.one('foos', 1).one('bars', 2).one('bazs', 3).pathFor()
      ).to.eql('foos/1/bars/2/bazs/3');
    });

    it('should allow builders on all and one', () => {
      expect(jsonApi.one('foo', 1).one('bar', 2).all('baz').pathFor()).to.eql(
        'foos/1/bars/2/bazs'
      );

      jsonApi.resetBuilder();

      expect(
        jsonApi.one('foos', 1).one('bars', 2).all('bazs').pathFor()
      ).to.eql('foos/1/bars/2/bazs');
    });

    it('should allow builders to be called to the base url', (done) => {
      mockResponse(jsonApi, {
        data: {
          data: [
            {
              id: '1',
              type: 'foo',
              attributes: {
                title: 'foo 1'
              }
            }
          ]
        }
      });

      jsonApi.get().subscribe({
        next: ({ data, _errors, _meta, _links }) => {
          expect(data[0].id).to.eql('1');
          expect(data[0].title).to.eql('foo 1');
          done();
        },
        error: (err) => console.log(err)
      });
    });

    it('should allow builders to be called with get', (done) => {
      const inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('GET');
          expect(payload.req.url).to.be.eql('http://myapi.com/');
          return {};
        }
      };

      jsonApi.middleware = [inspectorMiddleware];

      jsonApi.get().subscribe({
        next: () => done(),
        error: (error) => done(error)
      });
    });

    it('should allow builders to be called with get with query params', (done) => {
      const inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('GET');
          expect(payload.req.url).to.be.eql('http://myapi.com/');
          expect(payload.req.params).to.be.eql({ page: { number: 2 } });
          return {};
        }
      };

      jsonApi.middleware = [inspectorMiddleware];

      jsonApi.get({ page: { number: 2 } }).subscribe({
        next: () => done(),
        error: (error) => done(error)
      });
    });

    it('should allow builders to be called with get on all', (done) => {
      const inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('GET');
          expect(payload.req.url).to.be.eql('http://myapi.com/foos');
          expect(payload.req.model).to.be.eql('foo');
          return {};
        }
      };

      jsonApi.middleware = [inspectorMiddleware];

      jsonApi
        .all('foo')
        .get()
        .subscribe({
          next: () => done(),
          error: (error) => done(error)
        });
    });

    it('should allow builders to be called with get on one', (done) => {
      const inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('GET');
          expect(payload.req.url).to.be.eql('http://myapi.com/foos/1');
          expect(payload.req.model).to.be.eql('foo');
          return {};
        }
      };

      jsonApi.middleware = [inspectorMiddleware];

      jsonApi
        .one('foo', 1)
        .get()
        .subscribe({
          next: () => done(),
          error: (error) => done(error)
        });
    });

    it('should allow builders to be called with post', (done) => {
      const inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('POST');
          expect(payload.req.url).to.be.eql('http://myapi.com/foos');
          expect(payload.req.data).to.be.eql({ title: 'foo' });
          expect(payload.req.model).to.be.eql('foo');
          return {};
        }
      };

      jsonApi.middleware = [inspectorMiddleware];

      jsonApi
        .all('foo')
        .post({ title: 'foo' })
        .subscribe({
          next: () => done(),
          error: (error) => done(error)
        });
    });

    it('should allow builders to be called with post with nested one', (done) => {
      const inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('POST');
          expect(payload.req.url).to.be.eql('http://myapi.com/foos/1/bars');
          expect(payload.req.data).to.be.eql({ title: 'foo' });
          expect(payload.req.model).to.be.eql('bar');
          return {};
        }
      };

      jsonApi.middleware = [inspectorMiddleware];

      jsonApi
        .one('foo', 1)
        .all('bar')
        .post({ title: 'foo' })
        .subscribe({
          next: () => done(),
          error: (error) => done(error)
        });
    });

    it('should allow builders to be called with patch', (done) => {
      const inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('PATCH');
          expect(payload.req.url).to.be.eql('http://myapi.com/foos/1');
          expect(payload.req.data).to.be.eql({ title: 'bar' });
          expect(payload.req.model).to.be.eql('foo');
          return {};
        }
      };

      jsonApi.middleware = [inspectorMiddleware];

      jsonApi
        .one('foo', 1)
        .patch({ title: 'bar' })
        .subscribe({
          next: () => done(),
          error: (error) => done(error)
        });
    });

    it('should allow builders to be called with patch with nested one', (done) => {
      const inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('PATCH');
          expect(payload.req.url).to.be.eql('http://myapi.com/foos/1/bars');
          expect(payload.req.data).to.be.eql({ title: 'bar' });
          expect(payload.req.model).to.be.eql('bar');
          return {};
        }
      };

      jsonApi.middleware = [inspectorMiddleware];

      jsonApi
        .one('foo', 1)
        .all('bar')
        .patch({ title: 'bar' })
        .subscribe({
          next: () => done(),
          error: (error) => done(error)
        });
    });

    it('should allow builders to be called with destroy', (done) => {
      const inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('DELETE');
          expect(payload.req.url).to.be.eql('http://myapi.com/foos/1');
          expect(payload.req.model).to.be.eql('foo');
          return {};
        }
      };

      jsonApi.middleware = [inspectorMiddleware];

      jsonApi
        .one('foo', 1)
        .destroy()
        .subscribe({
          next: () => done(),
          error: (error) => done(error)
        });
    });
    it('should allow builders to be called with destroy with nested one', (done) => {
      const inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('DELETE');
          expect(payload.req.url).to.be.eql('http://myapi.com/foos/1/bars/2');
          expect(payload.req.model).to.be.eql('bar');
          return {};
        }
      };

      jsonApi.middleware = [inspectorMiddleware];

      jsonApi
        .one('foo', 1)
        .one('bar', 2)
        .destroy()
        .subscribe({
          next: () => done(),
          error: (error) => done(error)
        });
    });

    it('should Wacky Waving Inflatable Arm-Flailing Tubeman! Wacky Waving Inflatable Arm-Flailing Tubeman! Wacky Waving Inflatable Arm-Flailing Tubeman!', () => {
      jsonApi
        .one('foo', 1)
        .one('bar', 2)
        .all('foo')
        .one('bar', 3)
        .all('baz')
        .one('baz', 1)
        .one('baz', 2)
        .one('baz', 3);
      expect(jsonApi.pathFor()).to.be.eql(
        'foos/1/bars/2/foos/bars/3/bazs/bazs/1/bazs/2/bazs/3'
      );
      expect(jsonApi.urlFor()).to.be.eql(
        'http://myapi.com/foos/1/bars/2/foos/bars/3/bazs/bazs/1/bazs/2/bazs/3'
      );
    });

    it('should not serialize empty attributes', (done) => {
      const inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('PATCH');
          expect(payload.req.url).to.be.eql('http://myapi.com/foos/1');
          expect(payload.req.data).to.be.eql({
            data: {
              type: 'foos'
              // notice that attributes are not serialized
            },
            meta: {}
          });
          return {};
        }
      };

      jsonApi.middleware = [jsonApiPatchMiddleware, inspectorMiddleware];
      jsonApi
        .one('foo', 1)
        .patch({ title: undefined })
        .subscribe({
          next: () => done(),
          error: (error) => done(error)
        });
    });

    it('should serialize only specified attributes', (done) => {
      const inspectorMiddleware = {
        name: 'inspector-middleware',
        req: (payload) => {
          expect(payload.req.method).to.be.eql('PATCH');
          expect(payload.req.url).to.be.eql('http://myapi.com/foos/1');
          expect(payload.req.data).to.be.eql({
            data: {
              type: 'foos',
              attributes: {
                title: 'bar'
                // notice that subtitle is not serialized
              }
            },
            meta: {}
          });
          return {};
        }
      };

      jsonApi.middleware = [jsonApiPatchMiddleware, inspectorMiddleware];
      jsonApi
        .one('foo', 1)
        .patch({ title: 'bar' })
        .subscribe({
          next: () => done(),
          error: (error) => done(error)
        });
    });
  });
});
