/* global describe, it, beforeEach, afterEach */
/* eslint-disable no-unused-expressions */
import { JsonApi } from '../../src';
import mockError from '../helpers/mock-error';
import { expect } from 'chai';

describe('Custom Error Builder', () => {
  let jsonApi = null;
  beforeEach(() => {
    jsonApi = new JsonApi({
      apiUrl: 'http://myapi.com',
      errorBuilder: (error) => {
        const { title, detail, meta } = error;
        return {
          customTitle: `Custom title: ${title}`,
          customDetail: `Custom detail: ${detail}`,
          meta
        };
      }
    });

    // mock errors
    mockError(
      jsonApi,
      {
        data: {
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
      },
      [
        {
          status: 422,
          source: { pointer: '/data/attributes/first-name' },
          title: 'Invalid Attribute',
          detail: 'First name must contain at least three characters.',
          meta: {
            created: '2019-07-15T13:23:21.177Z',
            author: 'user@example.com'
          }
        }
      ]
    );

    // define model
    jsonApi.define('product', {
      title: ''
    });
  });

  afterEach(() => {
    jsonApi.resetBuilder();
  });

  it('should fail by mocked errors', (done) => {
    try {
      expect(jsonApi.findAll('product')).to.throws();
    } finally {
      done();
    }
  });

  it('should include custom errors on response objects', (done) => {
    jsonApi.findAll('product').subscribe({
      next: () => {
        new Error('Expected method to reject');
        done();
      },
      error: (error) => {
        expect(error).to.be.exist;
        expect(error).to.be.an('object');
        error = error['first-name'];
        expect(error).to.be.exist;
        expect(error).to.be.an('object');
        expect(error.title).not.to.be.exist;
        expect(error.details).not.to.be.exist;
        expect(error.customTitle).to.be.a('string');
        expect(error.customTitle).to.equal('Custom title: Invalid Attribute');
        expect(error.customDetail).to.be.a('string');
        expect(error.customDetail).to.equal(
          'Custom detail: First name must contain at least three characters.'
        );
        expect(error.meta).to.be.a('object');
        expect(error.meta.created).to.equal('2019-07-15T13:23:21.177Z');
        expect(error.meta.author).to.equal('user@example.com');
        done();
      }
    });
  });
});
