/* global describe, it, before */
/* eslint-disable no-unused-expressions */

import { JsonApi } from '../../src';
import * as deserialize from '../../src/middleware/json-api/_deserialize';
import { expect } from 'chai';

describe('deserialize', () => {
  let jsonApi = null;
  before(() => {
    jsonApi = new JsonApi({ apiUrl: 'http://myapi.com' });
  });

  it('should deserialize single resource items', () => {
    jsonApi.define('product', {
      title: '',
      about: '',
      kebabCaseDescription: ''
    });
    const mockResponse = {
      data: {
        id: '1',
        type: 'products',
        attributes: {
          title: 'Some Title',
          about: 'Some about',
          'kebab-case-description': 'Lorem ipsum'
        },
        meta: {
          info: 'Some meta data'
        },
        links: {
          arbitrary: 'arbitrary link'
        }
      }
    };
    const product = deserialize.resource.call(jsonApi, mockResponse.data);
    expect(product.id).to.eql('1');
    expect(product.type).to.eql('products');
    expect(product.title).to.eql('Some Title');
    expect(product.about).to.eql('Some about');
    expect(product.kebabCaseDescription).to.eql('Lorem ipsum');
    expect(product.meta.info).to.eql('Some meta data');
    expect(product.links.arbitrary).to.eql('arbitrary link');
  });

  it('should deserialize hasMany relations', () => {
    jsonApi.define('product', {
      title: '',
      tags: {
        jsonApi: 'hasMany',
        type: 'tags'
      }
    });
    jsonApi.define('tag', {
      name: ''
    });
    const mockResponse = {
      data: {
        id: '1',
        type: 'products',
        attributes: {
          title: 'hello'
        },
        relationships: {
          tags: {
            data: [
              { id: '10', type: 'tags' },
              { id: '11', type: 'tags' }
            ]
          }
        }
      },
      included: [
        { id: '10', type: 'tags', attributes: { name: 'one' } },
        { id: '11', type: 'tags', attributes: { name: 'two' } }
      ]
    };
    const productWithTags = deserialize.resource.call(
      jsonApi,
      mockResponse.data,
      mockResponse.included
    );
    expect(productWithTags.id).to.eql('1');
    expect(productWithTags.type).to.eql('products');
    expect(productWithTags.title).to.eql('hello');
    expect(productWithTags.tags).to.be.an('array');
    expect(productWithTags.tags[0].id).to.eql('10');
    expect(productWithTags.tags[0].type).to.eql('tags');
    expect(productWithTags.tags[0].name).to.eql('one');
    expect(productWithTags.tags[1].id).to.eql('11');
    expect(productWithTags.tags[1].type).to.eql('tags');
    expect(productWithTags.tags[1].name).to.eql('two');
  });

  it('should deserialize many hasMany relations', () => {
    jsonApi.define('product', {
      title: '',
      parentTag: {
        jsonApi: 'hasOne',
        type: 'tags'
      },
      parentTags: {
        jsonApi: 'hasMany',
        type: 'tags'
      },
      childTags: {
        jsonApi: 'hasMany',
        type: 'tags'
      }
    });
    jsonApi.define('tag', {
      name: ''
    });
    const mockResponse = {
      data: {
        id: '1',
        type: 'products',
        attributes: {
          title: 'hello'
        },
        relationships: {
          parentTag: {
            data: { id: '10', type: 'tags' }
          },
          parentTags: {
            data: [
              { id: '10', type: 'tags' },
              { id: '11', type: 'tags' },
              { id: '9', type: 'tags' }
            ]
          },
          childTags: {
            data: [
              { id: '9', type: 'tags' },
              { id: '8', type: 'tags' },
              { id: '11', type: 'tags' }
            ]
          }
        }
      },
      included: [
        { id: '8', type: 'tags', attributes: { name: 'zero' } },
        { id: '9', type: 'tags', attributes: { name: 'zero zero' } },
        { id: '10', type: 'tags', attributes: { name: 'one' } },
        { id: '11', type: 'tags', attributes: { name: 'two' } }
      ]
    };
    const productWithTags = deserialize.resource.call(
      jsonApi,
      mockResponse.data,
      mockResponse.included
    );
    expect(productWithTags.id).to.eql('1');
    expect(productWithTags.type).to.eql('products');
    expect(productWithTags.title).to.eql('hello');
    expect(productWithTags.parentTag.id).to.eql('10');
    expect(productWithTags.parentTag.type).to.eql('tags');
    expect(productWithTags.parentTag.name).to.eql('one');
    expect(productWithTags.parentTags).to.be.an('array');
    expect(productWithTags.parentTags[0].id).to.eql('10');
    expect(productWithTags.parentTags[0].type).to.eql('tags');
    expect(productWithTags.parentTags[0].name).to.eql('one');
    expect(productWithTags.parentTags[1].id).to.eql('11');
    expect(productWithTags.parentTags[1].type).to.eql('tags');
    expect(productWithTags.parentTags[1].name).to.eql('two');
    expect(productWithTags.parentTags[2].id).to.eql('9');
    expect(productWithTags.parentTags[2].type).to.eql('tags');
    expect(productWithTags.parentTags[2].name).to.eql('zero zero');
    expect(productWithTags.childTags).to.be.an('array');
    expect(productWithTags.childTags[0].id).to.eql('9');
    expect(productWithTags.childTags[0].type).to.eql('tags');
    expect(productWithTags.childTags[0].name).to.eql('zero zero');
    expect(productWithTags.childTags[1].id).to.eql('8');
    expect(productWithTags.childTags[1].type).to.eql('tags');
    expect(productWithTags.childTags[1].name).to.eql('zero');
    expect(productWithTags.childTags[2].id).to.eql('11');
    expect(productWithTags.childTags[2].type).to.eql('tags');
    expect(productWithTags.childTags[2].name).to.eql('two');
  });

  it('should deserialize complex relations without going into an infinite loop with depth >2', () => {
    jsonApi.define('topic', {
      id: '',
      name: '',
      parentTopicId: '',
      frameworkId: '',
      topicTypeId: '',
      topicTypeLevel: -1,
      topicTypeName: '',
      parentTopic: {
        jsonApi: 'hasOne',
        type: 'topics'
      },
      parentTopics: {
        jsonApi: 'hasMany',
        type: 'topics'
      },
      childTopics: {
        jsonApi: 'hasMany',
        type: 'topics'
      },
      framework: {
        jsonApi: 'hasOne',
        type: 'frameworks'
      },
      strategyReferences: {
        jsonApi: 'hasMany',
        type: 'strategy_references'
      }
    });
    jsonApi.define('framework', {
      id: '',
      name: '',
      topicTypes: {
        jsonApi: 'hasMany',
        type: 'topic_types'
      },
      topics: {
        jsonApi: 'hasMany',
        type: 'topics'
      }
    });
    jsonApi.define('strategy_reference', {
      id: '',
      topicId: '',
      meaningId: '',
      commentHtml: '',
      commentJson: {} as JSON,
      priorityId: '',
      projectId: '',
      strategyId: ''
    });
    const mockResponse = {
      data: {
        id: '1',
        type: 'topics',
        attributes: {
          level: 2,
          id: '1',
          name: 'Subsubtopic',
          parentTopicId: '5',
          topicTypeId: '8',
          topicTypeName: 'Subsubtopic-Type',
          topicTypeLevel: 2
        },
        relationships: {
          framework: {
            data: {
              id: '11',
              type: 'frameworks'
            }
          },
          topicType: {
            data: {
              id: '8',
              type: 'topic_types'
            }
          },
          parentTopic: {
            data: {
              id: '5',
              type: 'topics'
            }
          },
          parentTopics: {
            data: [
              {
                id: '5',
                type: 'topics'
              },
              {
                id: '9',
                type: 'topics'
              }
            ]
          },
          childTopics: {
            data: []
          },
          strategyReferences: {
            data: []
          },
          topicKpiRelations: {
            data: []
          }
        },
        links: {
          self: 'https://some-api/topics/1'
        }
      },
      meta: {
        pagination: {},
        requestId: '2',
        roleName: 'admin'
      },
      links: {
        self: 'https://some-api/topics/1?include=parentTopics%2CstrategyReferences%2CchildTopics%2Cframework'
      },
      included: [
        {
          id: '5',
          type: 'topics',
          attributes: {
            level: 1,
            id: '5',
            name: 'Subtopic',
            parentTopicId: '9',
            topicTypeId: '14',
            topicTypeName: 'Subtopic-Type',
            topicTypeLevel: 1
          },
          relationships: {
            framework: {
              data: {
                id: '11',
                type: 'frameworks'
              }
            },
            topicType: {
              data: {
                id: '14',
                type: 'topic_types'
              }
            },
            parentTopic: {
              data: {
                id: '9',
                type: 'topics'
              }
            },
            parentTopics: {
              data: [
                // possible loop with 5
                {
                  id: '9',
                  type: 'topics'
                }
              ]
            },
            childTopics: {
              data: [
                {
                  id: '1',
                  type: 'topics'
                }
              ]
            },
            strategyReferences: {
              data: []
            },
            topicKpiRelations: {
              data: []
            }
          },
          links: {
            self: 'https://some-api/topics/5'
          }
        },
        {
          id: '9',
          type: 'topics',
          attributes: {
            level: 0,
            id: '9',
            name: 'Topic',
            parentTopicId: null,
            topicTypeId: '18',
            topicTypeName: 'Topic-Type',
            topicTypeLevel: 0
          },
          relationships: {
            framework: {
              data: {
                id: '11',
                type: 'frameworks'
              }
            },
            topicType: {
              data: {
                id: '18',
                type: 'topic_types'
              }
            },
            parentTopic: {
              data: null
            },
            parentTopics: {
              data: []
            },
            childTopics: {
              data: [
                // possible loop with 9
                {
                  id: '5',
                  type: 'topics'
                }
              ]
            },
            strategyReferences: {
              data: [
                {
                  id: '22',
                  type: 'strategy_references'
                }
              ]
            },
            topicKpiRelations: {
              data: []
            }
          },
          links: {
            self: 'https://some-api/topics/9'
          }
        },
        {
          id: '11',
          type: 'frameworks',
          attributes: {
            id: '11',
            name: 'Some framework'
          },
          relationships: {
            contributors: {
              data: []
            },
            strategies: {
              data: [
                {
                  id: '19',
                  type: 'strategies'
                }
              ]
            },
            topics: {
              data: [
                {
                  id: '1',
                  type: 'topics'
                },
                {
                  id: '5',
                  type: 'topics'
                },
                {
                  id: '9',
                  type: 'topics'
                },
                {
                  id: '30',
                  type: 'topics'
                },
                {
                  id: '32',
                  type: 'topics'
                }
              ]
            },
            topicTypes: {
              data: [
                {
                  id: '18',
                  type: 'topic_types'
                },
                {
                  id: '14',
                  type: 'topic_types'
                },
                {
                  id: '8',
                  type: 'topic_types'
                }
              ]
            }
          },
          links: {
            self: 'https://some-api/frameworks/11'
          }
        }
      ]
    };
    const res = deserialize.resource.call(
      jsonApi,
      mockResponse.data,
      mockResponse.included
    );
    expect(res.id).to.eql('1');
  });

  it('should deserialize hasMany relations', () => {
    jsonApi.define('product', {
      title: '',
      tags: {
        jsonApi: 'hasMany',
        type: 'tags'
      }
    });
    jsonApi.define('tag', {
      name: ''
    });
    const mockResponse = {
      data: {
        id: '1',
        type: 'products',
        attributes: {
          title: 'hello'
        },
        relationships: {
          tags: {
            data: [
              { id: '10', type: 'tags' },
              { id: '11', type: 'tags' }
            ]
          }
        }
      },
      included: [
        { id: '10', type: 'tags', attributes: { name: 'one' } },
        { id: '11', type: 'tags', attributes: { name: 'two' } }
      ]
    };
    const productWithTags = deserialize.resource.call(
      jsonApi,
      mockResponse.data,
      mockResponse.included
    );
    expect(productWithTags.id).to.eql('1');
    expect(productWithTags.type).to.eql('products');
    expect(productWithTags.title).to.eql('hello');
    expect(productWithTags.tags).to.be.an('array');
    expect(productWithTags.tags[0].id).to.eql('10');
    expect(productWithTags.tags[0].type).to.eql('tags');
    expect(productWithTags.tags[0].name).to.eql('one');
    expect(productWithTags.tags[1].id).to.eql('11');
    expect(productWithTags.tags[1].type).to.eql('tags');
    expect(productWithTags.tags[1].name).to.eql('two');
  });

  it('should deserialize deep hasMany relations', () => {
    jsonApi.define('product', {
      title: '',
      parentTag: {
        jsonApi: 'hasOne',
        type: 'tags'
      },
      parentTags: {
        jsonApi: 'hasMany',
        type: 'tags'
      },
      childTags: {
        jsonApi: 'hasMany',
        type: 'tags'
      }
    });
    jsonApi.define('tag', {
      name: ''
    });
    const mockResponse = {
      data: {
        id: '1',
        type: 'products',
        attributes: {
          title: 'hello'
        },
        relationships: {
          parentTag: {
            data: { id: '10', type: 'tags' }
          },
          parentTags: {
            data: [
              { id: '10', type: 'tags' },
              { id: '11', type: 'tags' },
              { id: '9', type: 'tags' }
            ]
          },
          childTags: {
            data: [
              { id: '9', type: 'tags' },
              { id: '8', type: 'tags' },
              { id: '11', type: 'tags' }
            ]
          }
        }
      },
      included: [
        { id: '8', type: 'tags', attributes: { name: 'zero' } },
        { id: '9', type: 'tags', attributes: { name: 'zero zero' } },
        {
          id: '10',
          type: 'tags',
          attributes: { name: 'one' },
          relationships: { parentTag: { data: { id: '11', type: 'tags' } } }
        },
        {
          id: '11',
          type: 'tags',
          attributes: { name: 'two' },
          relationships: { parentTag: { data: { id: '9', type: 'tags' } } }
        }
      ]
    };
    const productWithTags = deserialize.resource.call(
      jsonApi,
      mockResponse.data,
      mockResponse.included
    );
    expect(productWithTags.id).to.eql('1');
    expect(productWithTags.type).to.eql('products');
    expect(productWithTags.title).to.eql('hello');
    expect(productWithTags.parentTag.id).to.eql('10');
    expect(productWithTags.parentTag.type).to.eql('tags');
    expect(productWithTags.parentTag.name).to.eql('one');
    expect(productWithTags.parentTags).to.be.an('array');
    expect(productWithTags.parentTags[0].id).to.eql('10');
    expect(productWithTags.parentTags[0].type).to.eql('tags');
    expect(productWithTags.parentTags[0].name).to.eql('one');
    expect(productWithTags.parentTags[1].id).to.eql('11');
    expect(productWithTags.parentTags[1].type).to.eql('tags');
    expect(productWithTags.parentTags[1].name).to.eql('two');
    expect(productWithTags.parentTags[2].id).to.eql('9');
    expect(productWithTags.parentTags[2].type).to.eql('tags');
    expect(productWithTags.parentTags[2].name).to.eql('zero zero');
    expect(productWithTags.childTags).to.be.an('array');
    expect(productWithTags.childTags[0].id).to.eql('9');
    expect(productWithTags.childTags[0].type).to.eql('tags');
    expect(productWithTags.childTags[0].name).to.eql('zero zero');
    expect(productWithTags.childTags[1].id).to.eql('8');
    expect(productWithTags.childTags[1].type).to.eql('tags');
    expect(productWithTags.childTags[1].name).to.eql('zero');
    expect(productWithTags.childTags[2].id).to.eql('11');
    expect(productWithTags.childTags[2].type).to.eql('tags');
    expect(productWithTags.childTags[2].name).to.eql('two');
  });

  it('should deserialize complex relations without going into an infinite loop', () => {
    jsonApi.define('course', {
      title: '',
      instructor: {
        jsonApi: 'hasOne',
        type: 'instructors'
      },
      lessons: {
        jsonApi: 'hasMany',
        type: 'lessons'
      }
    });
    jsonApi.define('lesson', {
      title: '',
      course: {
        jsonApi: 'hasOne',
        type: 'courses'
      },
      instructor: {
        jsonApi: 'hasOne',
        type: 'instructors'
      }
    });
    jsonApi.define('instructor', {
      name: '',
      lessons: {
        jsonApi: 'hasMany',
        type: 'lessons'
      }
    });

    const mockResponse = {
      data: {
        id: '1',
        type: 'courses',
        attributes: {
          title: 'hello'
        },
        relationships: {
          lessons: {
            data: [
              {
                id: '42',
                type: 'lessons'
              },
              {
                id: '43',
                type: 'lessons'
              }
            ]
          },
          instructor: {
            data: {
              id: '5',
              type: 'instructors'
            }
          }
        }
      },
      included: [
        {
          id: '42',
          type: 'lessons',
          attributes: { title: 'sp-one' },
          relationships: {
            course: {
              data: {
                id: '1',
                type: 'courses'
              }
            },
            instructor: {
              data: {
                id: '5',
                type: 'instructors'
              }
            }
          }
        },
        {
          id: '43',
          type: 'lessons',
          attributes: { title: 'sp-two' },
          relationships: {
            course: {
              data: {
                id: '1',
                type: 'courses'
              }
            },
            instructor: {
              data: {
                id: '5',
                type: 'instructors'
              }
            }
          }
        },
        {
          id: '5',
          type: 'instructors',
          attributes: { name: 'instructor one' },
          relationships: {
            lessons: {
              data: [
                {
                  id: '42',
                  type: 'lessons'
                },
                {
                  id: '43',
                  type: 'lessons'
                }
              ]
            }
          }
        }
      ]
    };
    const course = deserialize.resource.call(
      jsonApi,
      mockResponse.data,
      mockResponse.included
    );
    expect(course.id).to.eql('1');
    expect(course.instructor.type).to.eql('instructors');
    expect(course.instructor.lessons).to.be.an('array');
    expect(course.instructor.lessons.length).to.equal(2);
    expect(course.lessons).to.be.an('array');
    expect(course.lessons.length).to.equal(2);
    expect(course.lessons[0].type).to.eql('lessons');
    expect(course.lessons[0].id).to.eql('42');
    expect(course.lessons[0].instructor.id).to.eql('5');
    expect(course.lessons[1].type).to.eql('lessons');
    expect(course.lessons[1].id).to.eql('43');
    expect(course.lessons[1].instructor.id).to.eql('5');
  });

  it('should deserialize collections of resource items', () => {
    jsonApi.define('product', {
      title: '',
      about: ''
    });
    const mockResponse = {
      data: [
        {
          id: '1',
          type: 'products',
          attributes: {
            title: 'Some Title',
            about: 'Some about'
          }
        },
        {
          id: '2',
          type: 'products',
          attributes: {
            title: 'Another Title',
            about: 'Another about'
          }
        }
      ]
    };
    const products = deserialize.collection.call(jsonApi, mockResponse.data);
    expect(products[0].id).to.eql('1');
    expect(products[0].type).to.eql('products');
    expect(products[0].title).to.eql('Some Title');
    expect(products[0].about).to.eql('Some about');
    expect(products[1].id).to.eql('2');
    expect(products[1].type).to.eql('products');
    expect(products[1].title).to.eql('Another Title');
    expect(products[1].about).to.eql('Another about');
  });

  it('should allow for custom deserialization if present on the resource definition', () => {
    jsonApi.define(
      'product',
      { title: '' },
      {
        deserializer: (_rawItem) => {
          return {
            custom: true
          };
        }
      }
    );
    const mockResponse = {
      data: {
        id: '1',
        type: 'products',
        attributes: {
          title: 'Some Title',
          about: 'Some about'
        }
      }
    };
    const product = deserialize.resource.call(jsonApi, mockResponse.data);
    expect(product.custom).to.eql(true);
  });

  it('uses custom deserialization for each resource in a collection', () => {
    jsonApi.define(
      'product',
      { title: '' },
      {
        deserializer: () => {
          return {
            custom: true
          };
        }
      }
    );
    const mockResponse = {
      data: [
        {
          id: '1',
          type: 'products',
          attributes: {
            title: 'Some Title',
            about: 'Some about'
          }
        },
        {
          id: '2',
          type: 'products',
          attributes: {
            title: 'Another Title',
            about: 'Another about'
          }
        }
      ]
    };
    const products = deserialize.collection.call(jsonApi, mockResponse.data);
    expect(products[0].custom).to.eql(true);
    expect(products[1].custom).to.eql(true);
  });

  it('should deserialize resources in data without attributes', () => {
    jsonApi.define('product', {
      title: '',
      about: ''
    });
    const mockResponse = {
      data: [
        {
          id: '1',
          type: 'products'
        },
        {
          id: '2',
          type: 'products',
          attributes: {
            title: 'Another Title',
            about: 'Another about'
          }
        }
      ]
    };
    const products = deserialize.collection.call(jsonApi, mockResponse.data);
    expect(products[0].title).to.be.undefined;
    expect(products[0].about).to.be.undefined;
    expect(products[1].title).to.be.eql('Another Title');
    expect(products[1].about).to.be.eql('Another about');
  });

  it('should deserialize resources in include without attributes', () => {
    jsonApi.define('product', {
      title: '',
      tags: {
        jsonApi: 'hasMany',
        type: 'tags'
      }
    });
    jsonApi.define('tag', {
      name: ''
    });
    const mockResponse = {
      data: {
        id: '2',
        type: 'products',
        attributes: {
          title: 'hello world'
        },
        relationships: {
          tags: {
            data: [
              { id: '5', type: 'tags' },
              { id: '6', type: 'tags' },
              { id: '7', type: 'tags' },
              { id: '10', type: 'tags' }
            ]
          }
        }
      },
      included: [
        { id: '5', type: 'tags' },
        { id: '6', type: 'tags', attributes: { name: 'four' } },
        { id: '7', type: 'tags' },
        { id: '10', type: 'tags', attributes: { name: 'five' } }
      ]
    };
    const product = deserialize.resource.call(
      jsonApi,
      mockResponse.data,
      mockResponse.included
    );
    expect(product.id).to.eql('2');
    expect(product.title).to.eql('hello world');
    expect(product.tags).to.be.an('array');
    expect(product.tags[0].id).to.eql('5');
    expect(product.tags[0].name).to.be.undefined;
    expect(product.tags[1].id).to.eql('6');
    expect(product.tags[1].name).to.eql('four');
    expect(product.tags[2].id).to.eql('7');
    expect(product.tags[2].name).to.be.undefined;
    expect(product.tags[3].id).to.eql('10');
    expect(product.tags[3].name).to.eql('five');
  });

  it('should deserialize types and ids of related resources that are not included', () => {
    jsonApi.define('product', {
      title: '',
      tags: {
        jsonApi: 'hasMany',
        type: 'tags'
      }
    });
    jsonApi.define('tag', {
      name: ''
    });
    const mockResponse = {
      data: {
        id: '1',
        type: 'products',
        attributes: {
          title: 'hello'
        },
        relationships: {
          tags: {
            data: [
              { id: '5', type: 'tags' },
              { id: '6', type: 'tags' }
            ]
          }
        }
      }
    };
    const product = deserialize.resource.call(jsonApi, mockResponse.data);
    expect(product.id).to.eql('1');
    expect(product.title).to.eql('hello');
    expect(product.tags).to.be.an('array');
    expect(product.tags.length).to.eql(2);

    expect(product.tags[0]).to.be.an('object');
    expect(product.tags[0].id).to.eql('5');
    expect(product.tags[0].type).to.eql('tags');

    expect(product.tags[1]).to.be.an('object');
    expect(product.tags[1].id).to.eql('6');
    expect(product.tags[1].type).to.eql('tags');
  });
});
