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
    deserialize.cache.clear();
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
    deserialize.cache.clear();
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
    deserialize.cache.clear();
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

  it('should deserialize complex relations without going into an infinite loop with child/parent relations', () => {
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
    deserialize.cache.clear();
    expect(res.id).to.eql('1');
    expect(res.parentTopics).to.be.an('array');
    expect(res.childTopics).to.be.an('array');
    //expect(res.parentTopics.length).to.eql(2);
    //expect(res.parentTopics[0].id).to.eql('5');
    //expect(res.parentTopics[1].id).to.eql('9');
    //expect(res.childTopics.length).to.eql(0);
  });

  it('should deserialize heavy requests with many relations without include', () => {
    jsonApi.define('project', {
      id: '',
      name: '',
      spatialLevelIds: [],
      targetGroupIds: [],
      fundingSourceIds: [],
      financingStatusIds: [],
      contributorIds: [],
      projectStatus: {
        jsonApi: 'hasOne', //hasMany
        type: 'project_status'
      },
      priorityTypeSet: {
        jsonApi: 'hasOne',
        type: 'priority_type_sets'
      },
      taskStatusTypeSets: {
        jsonApi: 'hasMany',
        type: 'task_status_type_sets'
      },
      strategyReferences: {
        jsonApi: 'hasMany', //hasMany
        type: 'strategy_references'
      },
      spatialLevels: {
        jsonApi: 'hasMany',
        type: 'spatial_levels'
      },
      targetGroups: {
        jsonApi: 'hasMany',
        type: 'target_groups'
      },
      contributors: {
        jsonApi: 'hasMany',
        type: 'contributors'
      },
      tasks: {
        jsonApi: 'hasMany',
        type: 'tasks'
      },
      sourceProjectRelations: {
        jsonApi: 'hasMany',
        type: 'project_relations'
      },
      targetProjectRelations: {
        jsonApi: 'hasMany',
        type: 'project_relations'
      },
      unitRelations: {
        jsonApi: 'hasMany',
        type: 'unit_relations'
      },
      kpiRelations: {
        jsonApi: 'hasMany',
        type: 'kpi_relations'
      },
      financingStatuses: {
        jsonApi: 'hasMany',
        type: 'financing_statuses'
      },
      fundingSources: {
        jsonApi: 'hasMany',
        type: 'funding_sources'
      },
      projectStatusReports: {
        jsonApi: 'hasMany',
        type: 'project_status_reports'
      }
    });
    jsonApi.define('strategy_reference', {
      id: '',
      topicId: '',
      meaningId: '',
      comment: '',
      priorityId: '',
      projectId: '',
      strategyId: ''
    });
    jsonApi.define('priority_type_set', {
      id: '',
      name: '',
      description: '',
      prioritizationId: ''
    });
    jsonApi.define('spatial_level', {
      id: '',
      name: '',
      description: '',
      position: ''
    });
    jsonApi.define('target_group', {
      id: '',
      name: '',
      description: '',
      position: ''
    });
    jsonApi.define('contributor', {
      id: '',
      personId: '',
      role: '',
      entityType: '',
      name: '',
      projectId: '',
      roleId: ''
    });
    jsonApi.define('task_status_type_set', { id: '' });
    jsonApi.define('task', {
      personsAssignedIds: [],
      description: '',
      endDate: '',
      milestone: false,
      parentTaskId: '',
      position: 0,
      priorityId: '',
      projectId: '',
      startDate: '',
      taskStatusId: '',
      id: '',
      name: '',
      level: 0
    });
    jsonApi.define('project_status', {
      id: '',
      name: '',
      color: '',
      createdAt: '',
      description: '',
      position: 0,
      updatedAt: ''
    });
    jsonApi.define('project_type', {
      id: '',
      name: '',
      description: '',
      position: ''
    });
    const mockResponse = {
      data: {
        id: 'ab0bf729-61ff-4239-9007-ade7d49eecd3',
        type: 'projects',
        attributes: {
          id: 'ab0bf729-61ff-4239-9007-ade7d49eecd3',
          name: 'Alter Wein ist nicht lecker',
          creatorId: '30a42777-6715-4f56-8b62-5d90676888be',
          implementationEffortId: '57313cb4-f014-4fff-a35d-002c411ec012',
          projectStatusId: 'a1256be2-3f93-4b30-9d41-e44f02441beb',
          projectTypeId: '2b229fb3-601f-46f8-aebb-06e592406356',
          contactPersonId: '5b158783-af12-48d5-a1a4-710805e1e7ea'
        },
        relationships: {
          creator: {
            data: {
              id: '30a42777-6715-4f56-8b62-5d90676888be',
              type: 'persons'
            }
          },
          contactPerson: {
            data: {
              id: '5b158783-af12-48d5-a1a4-710805e1e7ea',
              type: 'persons'
            }
          },
          implementationEffort: {
            data: {
              id: '57313cb4-f014-4fff-a35d-002c411ec012',
              type: 'implementation_efforts'
            }
          },
          projectStatus: {
            data: {
              id: 'a1256be2-3f93-4b30-9d41-e44f02441beb',
              type: 'project_statuses'
            }
          },
          projectType: {
            data: {
              id: '2b229fb3-601f-46f8-aebb-06e592406356',
              type: 'project_types'
            }
          },
          priorityTypeSet: {
            data: {
              id: '897a7e7c-cbda-47dd-9d48-420ef04e2f31',
              type: 'priority_type_sets'
            }
          },
          activities: {
            data: [
              {
                id: '959720cf-aec4-4642-8668-4665cb7609b8',
                type: 'activities'
              },
              {
                id: '66997f59-baf8-4a0f-92d6-4cc87cbb506a',
                type: 'activities'
              },
              {
                id: '990d861a-1af2-4642-82ba-86ded7d43389',
                type: 'activities'
              },
              {
                id: 'c6aefd86-2fea-4f0c-8455-f64341aa22a7',
                type: 'activities'
              },
              {
                id: '76086d88-1629-4bc5-a129-7b31767cbf37',
                type: 'activities'
              },
              {
                id: 'cd10ab48-1d68-4c2e-bbc7-dd5bae0a3bd4',
                type: 'activities'
              },
              {
                id: '1ca5ae86-e9cc-4162-9c29-b78ba7532ffa',
                type: 'activities'
              },
              {
                id: '4127df32-9b30-4b25-bf74-525d61f8fdf4',
                type: 'activities'
              },
              {
                id: 'b4ff2d8e-54cc-4c6e-9190-865f3f301fbc',
                type: 'activities'
              }
            ]
          },
          contributors: {
            data: [
              {
                id: '1c74f784-8e7a-4ea9-86bb-bb3e574da8f9',
                type: 'contributors'
              },
              {
                id: '6f81cc2e-54ad-45b0-a873-b8ed9cfe834d',
                type: 'contributors'
              },
              {
                id: '156650ef-c1b9-4c45-8478-90b108533676',
                type: 'contributors'
              },
              {
                id: 'c7a9a690-f79d-4004-938a-46d50ad93386',
                type: 'contributors'
              }
            ]
          },
          strategyReferences: {
            data: [
              {
                id: '9dd93958-68b0-4394-82bc-a4ad70847052',
                type: 'strategy_references'
              },
              {
                id: '856ca846-7d60-49d1-8252-4cda4ecc3ae0',
                type: 'strategy_references'
              }
            ]
          },
          tags: {
            data: []
          },
          taskStatusTypeSets: {
            data: [
              {
                id: 'b1584bd5-cf9d-4c3e-831b-3c35381745d0',
                type: 'task_status_type_sets'
              }
            ]
          },
          tasks: {
            data: [
              {
                id: 'be295323-2b3a-4ff6-ba0b-4be9c7830484',
                type: 'tasks'
              },
              {
                id: '99a66ad9-c14e-40ef-b716-549aa2d4c082',
                type: 'tasks'
              },
              {
                id: '7fac0b93-ee99-495c-a3ec-4d27d778249d',
                type: 'tasks'
              },
              {
                id: '81bc8bd2-aa3b-4fd7-8e50-9a7de2fe3984',
                type: 'tasks'
              },
              {
                id: '0f04a656-4460-4452-95f3-a04ef8357026',
                type: 'tasks'
              },
              {
                id: '2be5852e-986e-4f99-8133-cd3d336bd127',
                type: 'tasks'
              }
            ]
          },
          unitRelations: {
            data: [
              {
                id: '12098c86-696f-4fff-bac4-1d8dc9d4fea5',
                type: 'unit_relations'
              },
              {
                id: 'a2e086d5-33bc-436e-bf1e-ee4c6be51b07',
                type: 'unit_relations'
              }
            ]
          },
          sourceProjectRelations: {
            data: [
              {
                id: 'd3d9665a-09b4-481e-82e8-858ddd4e4669',
                type: 'project_relations'
              },
              {
                id: '562c79de-00a8-4ad9-9447-407cb886c3d6',
                type: 'project_relations'
              },
              {
                id: '6de29218-cc2b-4377-b8b1-d7d7b8612b21',
                type: 'project_relations'
              }
            ]
          },
          targetProjectRelations: {
            data: [
              {
                id: '6092b7ae-7b8f-4769-a961-c46f121e8223',
                type: 'project_relations'
              },
              {
                id: '3c0dc87c-3f26-4439-8754-38a6aecf0424',
                type: 'project_relations'
              },
              {
                id: '7d46bcfa-1b9c-4bfc-90d9-c0b4860a4ce5',
                type: 'project_relations'
              }
            ]
          },
          integrations: {
            data: []
          },
          kpiRelations: {
            data: [
              {
                id: 'dd847aab-2b89-4ea0-9718-d05a92db7010',
                type: 'kpi_relations'
              },
              {
                id: '67f539f9-042a-4ca6-927f-beea5b4da567',
                type: 'kpi_relations'
              }
            ]
          },
          financingStatuses: {
            data: []
          },
          fundingSources: {
            data: []
          },
          spatialLevels: {
            data: []
          },
          targetGroups: {
            data: [
              {
                id: 'ce1a8b70-26d9-4c79-8254-1a20aee4c6aa',
                type: 'target_groups'
              }
            ]
          }
        },
        links: {
          self: 'https://some-api/projects/ab0bf729-61ff-4239-9007-ade7d49eecd3'
        }
      },
      meta: {
        pagination: {},
        requestId: 'b3b5243c-7960-4b5c-9d0c-9c06d3908753',
        roleName: 'admin'
      },
      links: {
        self: 'https://some-api/projects/ab0bf729-61ff-4239-9007-ade7d49eecd3'
      }
    };
    const res = deserialize.resource.call(jsonApi, mockResponse.data);
    deserialize.cache.clear();
    expect(res.id).to.eql('ab0bf729-61ff-4239-9007-ade7d49eecd3');
    expect(res.contributors).to.be.an('array');
    expect(res.contributors.length).to.eql(4);
    expect(res.tasks).to.be.an('array');
    expect(res.strategyReferences).to.be.an('array');
  });

  it('should deserialize heavy requests with many relations with include', () => {
    jsonApi.define('project', {
      id: '',
      name: '',
      spatialLevelIds: [],
      targetGroupIds: [],
      fundingSourceIds: [],
      financingStatusIds: [],
      contributorIds: [],
      projectStatus: {
        jsonApi: 'hasOne', //hasMany
        type: 'project_status'
      },
      priorityTypeSet: {
        jsonApi: 'hasOne',
        type: 'priority_type_sets'
      },
      taskStatusTypeSets: {
        jsonApi: 'hasMany',
        type: 'task_status_type_sets'
      },
      strategyReferences: {
        jsonApi: 'hasMany', //hasMany
        type: 'strategy_references'
      },
      spatialLevels: {
        jsonApi: 'hasMany',
        type: 'spatial_levels'
      },
      targetGroups: {
        jsonApi: 'hasMany',
        type: 'target_groups'
      },
      contributors: {
        jsonApi: 'hasMany',
        type: 'contributors'
      },
      tasks: {
        jsonApi: 'hasMany',
        type: 'tasks'
      },
      sourceProjectRelations: {
        jsonApi: 'hasMany',
        type: 'project_relations'
      },
      targetProjectRelations: {
        jsonApi: 'hasMany',
        type: 'project_relations'
      },
      unitRelations: {
        jsonApi: 'hasMany',
        type: 'unit_relations'
      },
      kpiRelations: {
        jsonApi: 'hasMany',
        type: 'kpi_relations'
      },
      financingStatuses: {
        jsonApi: 'hasMany',
        type: 'financing_statuses'
      },
      fundingSources: {
        jsonApi: 'hasMany',
        type: 'funding_sources'
      },
      projectStatusReports: {
        jsonApi: 'hasMany',
        type: 'project_status_reports'
      }
    });
    jsonApi.define('strategy_reference', {
      id: '',
      topicId: '',
      meaningId: '',
      comment: '',
      priorityId: '',
      projectId: '',
      strategyId: ''
    });
    jsonApi.define('priority_type_set', {
      id: '',
      name: '',
      description: '',
      prioritizationId: ''
    });
    jsonApi.define('spatial_level', {
      id: '',
      name: '',
      description: '',
      position: ''
    });
    jsonApi.define('target_group', {
      id: '',
      name: '',
      description: '',
      position: ''
    });
    jsonApi.define('contributor', {
      id: '',
      personId: '',
      role: '',
      entityType: '',
      name: '',
      projectId: '',
      roleId: ''
    });
    jsonApi.define('task_status_type_set', { id: '' });
    jsonApi.define('task', {
      personsAssignedIds: [],
      description: '',
      endDate: '',
      milestone: false,
      parentTaskId: '',
      position: 0,
      priorityId: '',
      projectId: '',
      startDate: '',
      taskStatusId: '',
      id: '',
      name: '',
      level: 0
    });
    jsonApi.define('project_status', {
      id: '',
      name: '',
      color: '',
      createdAt: '',
      description: '',
      position: 0,
      updatedAt: ''
    });
    jsonApi.define('project_type', {
      id: '',
      name: '',
      description: '',
      position: ''
    });
    const mockResponse = {
      data: {
        id: 'ab0bf729-61ff-4239-9007-ade7d49eecd3',
        type: 'projects',
        attributes: {
          id: 'ab0bf729-61ff-4239-9007-ade7d49eecd3',
          name: 'Alter Wein ist nicht lecker',
          creatorId: '30a42777-6715-4f56-8b62-5d90676888be',
          implementationEffortId: '57313cb4-f014-4fff-a35d-002c411ec012',
          projectStatusId: 'a1256be2-3f93-4b30-9d41-e44f02441beb',
          projectTypeId: '2b229fb3-601f-46f8-aebb-06e592406356',
          contactPersonId: '5b158783-af12-48d5-a1a4-710805e1e7ea'
        },
        relationships: {
          creator: {
            data: {
              id: '30a42777-6715-4f56-8b62-5d90676888be',
              type: 'persons'
            }
          },
          contactPerson: {
            data: {
              id: '5b158783-af12-48d5-a1a4-710805e1e7ea',
              type: 'persons'
            }
          },
          implementationEffort: {
            data: {
              id: '57313cb4-f014-4fff-a35d-002c411ec012',
              type: 'implementation_efforts'
            }
          },
          projectStatus: {
            data: {
              id: 'a1256be2-3f93-4b30-9d41-e44f02441beb',
              type: 'project_statuses'
            }
          },
          projectType: {
            data: {
              id: '2b229fb3-601f-46f8-aebb-06e592406356',
              type: 'project_types'
            }
          },
          priorityTypeSet: {
            data: {
              id: '897a7e7c-cbda-47dd-9d48-420ef04e2f31',
              type: 'priority_type_sets'
            }
          },
          activities: {
            data: [
              {
                id: '959720cf-aec4-4642-8668-4665cb7609b8',
                type: 'activities'
              },
              {
                id: '66997f59-baf8-4a0f-92d6-4cc87cbb506a',
                type: 'activities'
              },
              {
                id: '990d861a-1af2-4642-82ba-86ded7d43389',
                type: 'activities'
              },
              {
                id: 'c6aefd86-2fea-4f0c-8455-f64341aa22a7',
                type: 'activities'
              },
              {
                id: '76086d88-1629-4bc5-a129-7b31767cbf37',
                type: 'activities'
              },
              {
                id: 'cd10ab48-1d68-4c2e-bbc7-dd5bae0a3bd4',
                type: 'activities'
              },
              {
                id: '1ca5ae86-e9cc-4162-9c29-b78ba7532ffa',
                type: 'activities'
              },
              {
                id: '4127df32-9b30-4b25-bf74-525d61f8fdf4',
                type: 'activities'
              },
              {
                id: 'b4ff2d8e-54cc-4c6e-9190-865f3f301fbc',
                type: 'activities'
              }
            ]
          },
          contributors: {
            data: [
              {
                id: '1c74f784-8e7a-4ea9-86bb-bb3e574da8f9',
                type: 'contributors'
              },
              {
                id: '6f81cc2e-54ad-45b0-a873-b8ed9cfe834d',
                type: 'contributors'
              },
              {
                id: '156650ef-c1b9-4c45-8478-90b108533676',
                type: 'contributors'
              },
              {
                id: 'c7a9a690-f79d-4004-938a-46d50ad93386',
                type: 'contributors'
              }
            ]
          },
          strategyReferences: {
            data: [
              {
                id: '9dd93958-68b0-4394-82bc-a4ad70847052',
                type: 'strategy_references'
              },
              {
                id: '856ca846-7d60-49d1-8252-4cda4ecc3ae0',
                type: 'strategy_references'
              }
            ]
          },
          tags: {
            data: []
          },
          taskStatusTypeSets: {
            data: [
              {
                id: 'b1584bd5-cf9d-4c3e-831b-3c35381745d0',
                type: 'task_status_type_sets'
              }
            ]
          },
          tasks: {
            data: [
              {
                id: 'be295323-2b3a-4ff6-ba0b-4be9c7830484',
                type: 'tasks'
              },
              {
                id: '99a66ad9-c14e-40ef-b716-549aa2d4c082',
                type: 'tasks'
              },
              {
                id: '7fac0b93-ee99-495c-a3ec-4d27d778249d',
                type: 'tasks'
              },
              {
                id: '81bc8bd2-aa3b-4fd7-8e50-9a7de2fe3984',
                type: 'tasks'
              },
              {
                id: '0f04a656-4460-4452-95f3-a04ef8357026',
                type: 'tasks'
              },
              {
                id: '2be5852e-986e-4f99-8133-cd3d336bd127',
                type: 'tasks'
              }
            ]
          },
          unitRelations: {
            data: [
              {
                id: '12098c86-696f-4fff-bac4-1d8dc9d4fea5',
                type: 'unit_relations'
              },
              {
                id: 'a2e086d5-33bc-436e-bf1e-ee4c6be51b07',
                type: 'unit_relations'
              }
            ]
          },
          sourceProjectRelations: {
            data: [
              {
                id: 'd3d9665a-09b4-481e-82e8-858ddd4e4669',
                type: 'project_relations'
              },
              {
                id: '562c79de-00a8-4ad9-9447-407cb886c3d6',
                type: 'project_relations'
              },
              {
                id: '6de29218-cc2b-4377-b8b1-d7d7b8612b21',
                type: 'project_relations'
              }
            ]
          },
          targetProjectRelations: {
            data: [
              {
                id: '6092b7ae-7b8f-4769-a961-c46f121e8223',
                type: 'project_relations'
              },
              {
                id: '3c0dc87c-3f26-4439-8754-38a6aecf0424',
                type: 'project_relations'
              },
              {
                id: '7d46bcfa-1b9c-4bfc-90d9-c0b4860a4ce5',
                type: 'project_relations'
              }
            ]
          },
          integrations: {
            data: []
          },
          kpiRelations: {
            data: [
              {
                id: 'dd847aab-2b89-4ea0-9718-d05a92db7010',
                type: 'kpi_relations'
              },
              {
                id: '67f539f9-042a-4ca6-927f-beea5b4da567',
                type: 'kpi_relations'
              }
            ]
          },
          financingStatuses: {
            data: []
          },
          fundingSources: {
            data: []
          },
          spatialLevels: {
            data: []
          },
          targetGroups: {
            data: [
              {
                id: 'ce1a8b70-26d9-4c79-8254-1a20aee4c6aa',
                type: 'target_groups'
              }
            ]
          }
        },
        links: {
          self: 'https://some-api/projects/ab0bf729-61ff-4239-9007-ade7d49eecd3'
        }
      },
      meta: {
        pagination: {},
        requestId: 'b3b5243c-7960-4b5c-9d0c-9c06d3908753',
        roleName: 'admin'
      },
      links: {
        self: 'https://some-api/projects/ab0bf729-61ff-4239-9007-ade7d49eecd3'
      },
      included: [
        {
          id: '1c74f784-8e7a-4ea9-86bb-bb3e574da8f9',
          type: 'contributors',
          attributes: {
            id: '1c74f784-8e7a-4ea9-86bb-bb3e574da8f9',
            contributionType: 'Project',
            contributionId: 'ab0bf729-61ff-4239-9007-ade7d49eecd3',
            personId: '5b158783-af12-48d5-a1a4-710805e1e7ea',
            roleId: 'edc56d17-3dcb-46a2-aacd-bf51a61ae907',
            createdAt: '2023-04-27T20:13:54.632+02:00',
            updatedAt: '2023-07-20T01:43:51.202+02:00'
          },
          relationships: {
            role: {
              data: {
                id: 'edc56d17-3dcb-46a2-aacd-bf51a61ae907',
                type: 'roles'
              }
            },
            person: {
              data: {
                id: '5b158783-af12-48d5-a1a4-710805e1e7ea',
                type: 'persons'
              }
            },
            contribution: {
              data: {
                id: 'ab0bf729-61ff-4239-9007-ade7d49eecd3',
                type: 'projects'
              }
            }
          },
          links: {
            self: 'https://api.dev.beabee.net/api/v2/contributors/1c74f784-8e7a-4ea9-86bb-bb3e574da8f9'
          }
        },
        {
          id: '6f81cc2e-54ad-45b0-a873-b8ed9cfe834d',
          type: 'contributors',
          attributes: {
            id: '6f81cc2e-54ad-45b0-a873-b8ed9cfe834d',
            contributionType: 'Project',
            contributionId: 'ab0bf729-61ff-4239-9007-ade7d49eecd3',
            personId: '57c0da5b-5638-472d-a0b9-1a67be0a9ff3',
            roleId: '7b37e992-1947-4cce-8456-12c2e9975311',
            createdAt: '2023-04-26T14:19:37.441+02:00',
            updatedAt: '2023-07-19T20:43:13.510+02:00'
          },
          relationships: {
            role: {
              data: {
                id: '7b37e992-1947-4cce-8456-12c2e9975311',
                type: 'roles'
              }
            },
            person: {
              data: {
                id: '57c0da5b-5638-472d-a0b9-1a67be0a9ff3',
                type: 'persons'
              }
            },
            contribution: {
              data: {
                id: 'ab0bf729-61ff-4239-9007-ade7d49eecd3',
                type: 'projects'
              }
            }
          },
          links: {
            self: 'https://api.dev.beabee.net/api/v2/contributors/6f81cc2e-54ad-45b0-a873-b8ed9cfe834d'
          }
        },
        {
          id: '156650ef-c1b9-4c45-8478-90b108533676',
          type: 'contributors',
          attributes: {
            id: '156650ef-c1b9-4c45-8478-90b108533676',
            contributionType: 'Project',
            contributionId: 'ab0bf729-61ff-4239-9007-ade7d49eecd3',
            personId: 'd4fa6e24-fdc8-4604-bcc6-027d47cf82b0',
            roleId: 'edc56d17-3dcb-46a2-aacd-bf51a61ae907',
            createdAt: '2023-04-25T13:45:46.527+02:00',
            updatedAt: '2023-07-20T01:43:57.927+02:00'
          },
          relationships: {
            role: {
              data: {
                id: 'edc56d17-3dcb-46a2-aacd-bf51a61ae907',
                type: 'roles'
              }
            },
            person: {
              data: {
                id: 'd4fa6e24-fdc8-4604-bcc6-027d47cf82b0',
                type: 'persons'
              }
            },
            contribution: {
              data: {
                id: 'ab0bf729-61ff-4239-9007-ade7d49eecd3',
                type: 'projects'
              }
            }
          },
          links: {
            self: 'https://api.dev.beabee.net/api/v2/contributors/156650ef-c1b9-4c45-8478-90b108533676'
          }
        },
        {
          id: 'c7a9a690-f79d-4004-938a-46d50ad93386',
          type: 'contributors',
          attributes: {
            id: 'c7a9a690-f79d-4004-938a-46d50ad93386',
            contributionType: 'Project',
            contributionId: 'ab0bf729-61ff-4239-9007-ade7d49eecd3',
            personId: '11ab8957-6fdd-4f4e-8fa7-9ffb27765051',
            roleId: 'edc56d17-3dcb-46a2-aacd-bf51a61ae907',
            createdAt: '2024-02-02T13:52:04.859+01:00',
            updatedAt: '2024-02-02T17:22:21.638+01:00'
          },
          relationships: {
            role: {
              data: {
                id: 'edc56d17-3dcb-46a2-aacd-bf51a61ae907',
                type: 'roles'
              }
            },
            person: {
              data: {
                id: '11ab8957-6fdd-4f4e-8fa7-9ffb27765051',
                type: 'persons'
              }
            },
            contribution: {
              data: {
                id: 'ab0bf729-61ff-4239-9007-ade7d49eecd3',
                type: 'projects'
              }
            }
          },
          links: {
            self: 'https://api.dev.beabee.net/api/v2/contributors/c7a9a690-f79d-4004-938a-46d50ad93386'
          }
        },
        {
          id: 'be295323-2b3a-4ff6-ba0b-4be9c7830484',
          type: 'tasks',
          attributes: {
            id: 'be295323-2b3a-4ff6-ba0b-4be9c7830484',
            name: '1. Milestone',
            descriptionHtml: '',
            startDate: '2023-07-01T02:00:00.000+02:00',
            endDate: '2023-07-15T02:00:00.000+02:00',
            priorityId: '1cb35496-6ddf-415e-9d35-7d1f8dd88662',
            taskStatusId: '5613fd73-9d32-437d-a70a-12e49f44faae',
            parentTaskId: null,
            createdAt: '2023-07-22T18:34:17.869+02:00',
            updatedAt: '2023-07-25T13:00:24.021+02:00',
            milestone: true,
            projectId: 'ab0bf729-61ff-4239-9007-ade7d49eecd3',
            treePath: '/',
            level: 0,
            descriptionJson: {},
            position: 3,
            treeChanges: null
          },
          relationships: {
            parentTask: {
              data: null
            },
            priority: {
              data: {
                id: '1cb35496-6ddf-415e-9d35-7d1f8dd88662',
                type: 'priorities'
              }
            },
            project: {
              data: {
                id: 'ab0bf729-61ff-4239-9007-ade7d49eecd3',
                type: 'projects'
              }
            },
            taskStatus: {
              data: {
                id: '5613fd73-9d32-437d-a70a-12e49f44faae',
                type: 'task_statuses'
              }
            },
            activities: {
              data: []
            },
            checklists: {
              data: []
            },
            comments: {
              data: []
            },
            persons: {
              data: [
                {
                  id: '57c0da5b-5638-472d-a0b9-1a67be0a9ff3',
                  type: 'persons'
                }
              ]
            },
            childTasks: {
              data: [
                {
                  id: '2be5852e-986e-4f99-8133-cd3d336bd127',
                  type: 'tasks'
                }
              ]
            }
          },
          links: {
            self: 'https://api.dev.beabee.net/api/v2/tasks/be295323-2b3a-4ff6-ba0b-4be9c7830484'
          }
        },
        {
          id: '99a66ad9-c14e-40ef-b716-549aa2d4c082',
          type: 'tasks',
          attributes: {
            id: '99a66ad9-c14e-40ef-b716-549aa2d4c082',
            name: '3. Milestone',
            descriptionHtml: '',
            startDate: '2023-07-28T02:00:00.000+02:00',
            endDate: '2023-07-30T02:00:00.000+02:00',
            priorityId: '1cb35496-6ddf-415e-9d35-7d1f8dd88662',
            taskStatusId: '5613fd73-9d32-437d-a70a-12e49f44faae',
            parentTaskId: null,
            createdAt: '2023-07-27T09:54:51.154+02:00',
            updatedAt: '2023-07-27T09:54:51.154+02:00',
            milestone: false,
            projectId: 'ab0bf729-61ff-4239-9007-ade7d49eecd3',
            treePath: '/',
            level: 0,
            descriptionJson: {},
            position: 1,
            treeChanges: null
          },
          relationships: {
            parentTask: {
              data: null
            },
            priority: {
              data: {
                id: '1cb35496-6ddf-415e-9d35-7d1f8dd88662',
                type: 'priorities'
              }
            },
            project: {
              data: {
                id: 'ab0bf729-61ff-4239-9007-ade7d49eecd3',
                type: 'projects'
              }
            },
            taskStatus: {
              data: {
                id: '5613fd73-9d32-437d-a70a-12e49f44faae',
                type: 'task_statuses'
              }
            },
            activities: {
              data: []
            },
            checklists: {
              data: []
            },
            comments: {
              data: []
            },
            persons: {
              data: []
            },
            childTasks: {
              data: []
            }
          },
          links: {
            self: 'https://api.dev.beabee.net/api/v2/tasks/99a66ad9-c14e-40ef-b716-549aa2d4c082'
          }
        },
        {
          id: '7fac0b93-ee99-495c-a3ec-4d27d778249d',
          type: 'tasks',
          attributes: {
            id: '7fac0b93-ee99-495c-a3ec-4d27d778249d',
            name: 'asgasgasg',
            descriptionHtml: '',
            startDate: null,
            endDate: null,
            priorityId: '1cb35496-6ddf-415e-9d35-7d1f8dd88662',
            taskStatusId: '5613fd73-9d32-437d-a70a-12e49f44faae',
            parentTaskId: '81bc8bd2-aa3b-4fd7-8e50-9a7de2fe3984',
            createdAt: '2023-10-02T17:32:06.344+02:00',
            updatedAt: '2023-10-02T17:32:06.344+02:00',
            milestone: false,
            projectId: 'ab0bf729-61ff-4239-9007-ade7d49eecd3',
            treePath:
              '/0f04a656-4460-4452-95f3-a04ef8357026/81bc8bd2-aa3b-4fd7-8e50-9a7de2fe3984/',
            level: 2,
            descriptionJson: {},
            position: 0,
            treeChanges: null
          },
          relationships: {
            parentTask: {
              data: {
                id: '81bc8bd2-aa3b-4fd7-8e50-9a7de2fe3984',
                type: 'tasks'
              }
            },
            priority: {
              data: {
                id: '1cb35496-6ddf-415e-9d35-7d1f8dd88662',
                type: 'priorities'
              }
            },
            project: {
              data: {
                id: 'ab0bf729-61ff-4239-9007-ade7d49eecd3',
                type: 'projects'
              }
            },
            taskStatus: {
              data: {
                id: '5613fd73-9d32-437d-a70a-12e49f44faae',
                type: 'task_statuses'
              }
            },
            activities: {
              data: []
            },
            checklists: {
              data: []
            },
            comments: {
              data: [
                {
                  id: '4269afd6-ebeb-4931-9e23-aa86095d8b3a',
                  type: 'comments'
                }
              ]
            },
            persons: {
              data: []
            },
            childTasks: {
              data: []
            }
          },
          links: {
            self: 'https://api.dev.beabee.net/api/v2/tasks/7fac0b93-ee99-495c-a3ec-4d27d778249d'
          }
        },
        {
          id: '81bc8bd2-aa3b-4fd7-8e50-9a7de2fe3984',
          type: 'tasks',
          attributes: {
            id: '81bc8bd2-aa3b-4fd7-8e50-9a7de2fe3984',
            name: '1. TODO',
            descriptionHtml: '',
            startDate: '2023-07-28T02:00:00.000+02:00',
            endDate: null,
            priorityId: '1cb35496-6ddf-415e-9d35-7d1f8dd88662',
            taskStatusId: '5613fd73-9d32-437d-a70a-12e49f44faae',
            parentTaskId: '0f04a656-4460-4452-95f3-a04ef8357026',
            createdAt: '2023-07-27T09:54:26.647+02:00',
            updatedAt: '2023-10-02T17:32:06.371+02:00',
            milestone: false,
            projectId: 'ab0bf729-61ff-4239-9007-ade7d49eecd3',
            treePath: '/0f04a656-4460-4452-95f3-a04ef8357026/',
            level: 1,
            descriptionJson: {},
            position: 0,
            treeChanges: null
          },
          relationships: {
            parentTask: {
              data: {
                id: '0f04a656-4460-4452-95f3-a04ef8357026',
                type: 'tasks'
              }
            },
            priority: {
              data: {
                id: '1cb35496-6ddf-415e-9d35-7d1f8dd88662',
                type: 'priorities'
              }
            },
            project: {
              data: {
                id: 'ab0bf729-61ff-4239-9007-ade7d49eecd3',
                type: 'projects'
              }
            },
            taskStatus: {
              data: {
                id: '5613fd73-9d32-437d-a70a-12e49f44faae',
                type: 'task_statuses'
              }
            },
            activities: {
              data: []
            },
            checklists: {
              data: []
            },
            comments: {
              data: []
            },
            persons: {
              data: []
            },
            childTasks: {
              data: [
                {
                  id: '7fac0b93-ee99-495c-a3ec-4d27d778249d',
                  type: 'tasks'
                }
              ]
            }
          },
          links: {
            self: 'https://api.dev.beabee.net/api/v2/tasks/81bc8bd2-aa3b-4fd7-8e50-9a7de2fe3984'
          }
        },
        {
          id: '0f04a656-4460-4452-95f3-a04ef8357026',
          type: 'tasks',
          attributes: {
            id: '0f04a656-4460-4452-95f3-a04ef8357026',
            name: '2. Milestone',
            descriptionHtml: '',
            startDate: '2023-07-15T02:00:00.000+02:00',
            endDate: '2023-07-31T02:00:00.000+02:00',
            priorityId: '1cb35496-6ddf-415e-9d35-7d1f8dd88662',
            taskStatusId: '5613fd73-9d32-437d-a70a-12e49f44faae',
            parentTaskId: null,
            createdAt: '2023-07-22T18:34:39.391+02:00',
            updatedAt: '2023-10-02T17:32:06.378+02:00',
            milestone: false,
            projectId: 'ab0bf729-61ff-4239-9007-ade7d49eecd3',
            treePath: '/',
            level: 0,
            descriptionJson: {},
            position: 2,
            treeChanges: null
          },
          relationships: {
            parentTask: {
              data: null
            },
            priority: {
              data: {
                id: '1cb35496-6ddf-415e-9d35-7d1f8dd88662',
                type: 'priorities'
              }
            },
            project: {
              data: {
                id: 'ab0bf729-61ff-4239-9007-ade7d49eecd3',
                type: 'projects'
              }
            },
            taskStatus: {
              data: {
                id: '5613fd73-9d32-437d-a70a-12e49f44faae',
                type: 'task_statuses'
              }
            },
            activities: {
              data: []
            },
            checklists: {
              data: []
            },
            comments: {
              data: []
            },
            persons: {
              data: [
                {
                  id: '57c0da5b-5638-472d-a0b9-1a67be0a9ff3',
                  type: 'persons'
                }
              ]
            },
            childTasks: {
              data: [
                {
                  id: '81bc8bd2-aa3b-4fd7-8e50-9a7de2fe3984',
                  type: 'tasks'
                }
              ]
            }
          },
          links: {
            self: 'https://api.dev.beabee.net/api/v2/tasks/0f04a656-4460-4452-95f3-a04ef8357026'
          }
        },
        {
          id: '2be5852e-986e-4f99-8133-cd3d336bd127',
          type: 'tasks',
          attributes: {
            id: '2be5852e-986e-4f99-8133-cd3d336bd127',
            name: '1.TODO',
            descriptionHtml: '',
            startDate: '2023-07-06T02:00:00.000+02:00',
            endDate: null,
            priorityId: '1cb35496-6ddf-415e-9d35-7d1f8dd88662',
            taskStatusId: '5613fd73-9d32-437d-a70a-12e49f44faae',
            parentTaskId: 'be295323-2b3a-4ff6-ba0b-4be9c7830484',
            createdAt: '2023-07-25T13:00:24.003+02:00',
            updatedAt: '2023-07-25T13:00:24.003+02:00',
            milestone: false,
            projectId: 'ab0bf729-61ff-4239-9007-ade7d49eecd3',
            treePath: '/be295323-2b3a-4ff6-ba0b-4be9c7830484/',
            level: 1,
            descriptionJson: {},
            position: 0,
            treeChanges: null
          },
          relationships: {
            parentTask: {
              data: {
                id: 'be295323-2b3a-4ff6-ba0b-4be9c7830484',
                type: 'tasks'
              }
            },
            priority: {
              data: {
                id: '1cb35496-6ddf-415e-9d35-7d1f8dd88662',
                type: 'priorities'
              }
            },
            project: {
              data: {
                id: 'ab0bf729-61ff-4239-9007-ade7d49eecd3',
                type: 'projects'
              }
            },
            taskStatus: {
              data: {
                id: '5613fd73-9d32-437d-a70a-12e49f44faae',
                type: 'task_statuses'
              }
            },
            activities: {
              data: []
            },
            checklists: {
              data: []
            },
            comments: {
              data: []
            },
            persons: {
              data: []
            },
            childTasks: {
              data: []
            }
          },
          links: {
            self: 'https://api.dev.beabee.net/api/v2/tasks/2be5852e-986e-4f99-8133-cd3d336bd127'
          }
        },
        {
          id: '9dd93958-68b0-4394-82bc-a4ad70847052',
          type: 'strategy_references',
          attributes: {
            id: '9dd93958-68b0-4394-82bc-a4ad70847052',
            projectId: 'ab0bf729-61ff-4239-9007-ade7d49eecd3',
            strategyId: 'c53cfb62-802b-4aff-baf1-53e0f36dc9be',
            topicId: null,
            priorityId: null,
            meaningId: null,
            createdAt: '2023-11-06T15:37:06.305+01:00',
            updatedAt: '2023-11-06T15:37:06.305+01:00',
            commentHtml: '',
            commentJson: {},
            main: false
          },
          relationships: {
            meaning: {
              data: null
            },
            priority: {
              data: null
            },
            project: {
              data: {
                id: 'ab0bf729-61ff-4239-9007-ade7d49eecd3',
                type: 'projects'
              }
            },
            strategy: {
              data: {
                id: 'c53cfb62-802b-4aff-baf1-53e0f36dc9be',
                type: 'strategies'
              }
            },
            topic: {
              data: null
            }
          },
          links: {
            self: 'https://api.dev.beabee.net/api/v2/strategy_references/9dd93958-68b0-4394-82bc-a4ad70847052'
          }
        },
        {
          id: '856ca846-7d60-49d1-8252-4cda4ecc3ae0',
          type: 'strategy_references',
          attributes: {
            id: '856ca846-7d60-49d1-8252-4cda4ecc3ae0',
            projectId: 'ab0bf729-61ff-4239-9007-ade7d49eecd3',
            strategyId: '7d8986c7-7814-4546-980f-264c1f1830b5',
            topicId: '1ac7f05c-afa9-419d-a924-22a670b9ddc0',
            priorityId: 'bfd9a091-dc76-4436-addc-0a8902e04880',
            meaningId: 'f2e45cdf-ed0a-4843-9ba9-bc2d58ddeff6',
            createdAt: '2023-01-19T21:18:44.131+01:00',
            updatedAt: '2024-01-15T13:20:30.935+01:00',
            commentHtml: null,
            commentJson: null,
            main: false
          },
          relationships: {
            meaning: {
              data: {
                id: 'f2e45cdf-ed0a-4843-9ba9-bc2d58ddeff6',
                type: 'meanings'
              }
            },
            priority: {
              data: {
                id: 'bfd9a091-dc76-4436-addc-0a8902e04880',
                type: 'priorities'
              }
            },
            project: {
              data: {
                id: 'ab0bf729-61ff-4239-9007-ade7d49eecd3',
                type: 'projects'
              }
            },
            strategy: {
              data: {
                id: '7d8986c7-7814-4546-980f-264c1f1830b5',
                type: 'strategies'
              }
            },
            topic: {
              data: {
                id: '1ac7f05c-afa9-419d-a924-22a670b9ddc0',
                type: 'topics'
              }
            }
          },
          links: {
            self: 'https://api.dev.beabee.net/api/v2/strategy_references/856ca846-7d60-49d1-8252-4cda4ecc3ae0'
          }
        }
      ]
    };
    const res = deserialize.resource.call(
      jsonApi,
      mockResponse.data,
      mockResponse.included
    );
    deserialize.cache.clear();
    expect(res.id).to.eql('ab0bf729-61ff-4239-9007-ade7d49eecd3');
    expect(res.contributors).to.be.an('array');
    expect(res.contributors.length).to.eql(4);
    expect(res.tasks).to.be.an('array');
    expect(res.strategyReferences).to.be.an('array');
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
    deserialize.cache.clear();
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
    deserialize.cache.clear();
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
    deserialize.cache.clear();
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
    deserialize.cache.clear();
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
    deserialize.cache.clear();
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
    deserialize.cache.clear();
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
    deserialize.cache.clear();
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
    deserialize.cache.clear();
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
    deserialize.cache.clear();
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
