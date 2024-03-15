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
    expect(res.parentTopics.length).to.eql(2);
    expect(res.parentTopics[0].id).to.eql('5');
    expect(res.parentTopics[1].id).to.eql('9');
    expect(res.childTopics.length).to.eql(0);
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
        id: '34',
        type: 'projects',
        attributes: {
          id: '34',
          name: 'Alter Wein ist nicht lecker',
          creatorId: '2',
          implementationEffortId: '13',
          projectStatusId: '24',
          projectTypeId: '35',
          contactPersonId: '9'
        },
        relationships: {
          creator: {
            data: {
              id: '2',
              type: 'persons'
            }
          },
          contactPerson: {
            data: {
              id: '9',
              type: 'persons'
            }
          },
          implementationEffort: {
            data: {
              id: '13',
              type: 'implementation_efforts'
            }
          },
          projectStatus: {
            data: {
              id: '24',
              type: 'project_statuses'
            }
          },
          projectType: {
            data: {
              id: '35',
              type: 'project_types'
            }
          },
          priorityTypeSet: {
            data: {
              id: '23',
              type: 'priority_type_sets'
            }
          },
          activities: {
            data: [
              {
                id: '1',
                type: 'activities'
              },
              {
                id: '38',
                type: 'activities'
              },
              {
                id: '5',
                type: 'activities'
              },
              {
                id: '36',
                type: 'activities'
              },
              {
                id: '16',
                type: 'activities'
              },
              {
                id: '18',
                type: 'activities'
              },
              {
                id: '6',
                type: 'activities'
              },
              {
                id: '10',
                type: 'activities'
              },
              {
                id: '33',
                type: 'activities'
              }
            ]
          },
          contributors: {
            data: [
              {
                id: '39',
                type: 'contributors'
              },
              {
                id: '41',
                type: 'contributors'
              },
              {
                id: '25',
                type: 'contributors'
              },
              {
                id: '26',
                type: 'contributors'
              }
            ]
          },
          strategyReferences: {
            data: [
              {
                id: '17',
                type: 'strategy_references'
              },
              {
                id: '11',
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
                id: '3',
                type: 'task_status_type_sets'
              }
            ]
          },
          tasks: {
            data: [
              {
                id: '7',
                type: 'tasks'
              },
              {
                id: '19',
                type: 'tasks'
              },
              {
                id: '31',
                type: 'tasks'
              },
              {
                id: '15',
                type: 'tasks'
              },
              {
                id: '29',
                type: 'tasks'
              },
              {
                id: '27',
                type: 'tasks'
              }
            ]
          },
          unitRelations: {
            data: [
              {
                id: '30',
                type: 'unit_relations'
              },
              {
                id: '37',
                type: 'unit_relations'
              }
            ]
          },
          sourceProjectRelations: {
            data: [
              {
                id: '12',
                type: 'project_relations'
              },
              {
                id: '21',
                type: 'project_relations'
              },
              {
                id: '14',
                type: 'project_relations'
              }
            ]
          },
          targetProjectRelations: {
            data: [
              {
                id: '28',
                type: 'project_relations'
              },
              {
                id: '4',
                type: 'project_relations'
              },
              {
                id: '32',
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
                id: '20',
                type: 'kpi_relations'
              },
              {
                id: '8',
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
                id: '22',
                type: 'target_groups'
              }
            ]
          }
        },
        links: {
          self: 'https://some-api/projects/34'
        }
      },
      meta: {
        pagination: {},
        requestId: '40',
        roleName: 'admin'
      },
      links: {
        self: 'https://some-api/projects/34'
      }
    };
    const res = deserialize.resource.call(jsonApi, mockResponse.data);
    deserialize.cache.clear();
    expect(res.id).to.eql('34');
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
        id: '46',
        type: 'projects',
        attributes: {
          id: '46',
          name: 'Alter Wein ist nicht lecker',
          creatorId: '2',
          implementationEffortId: '16',
          projectStatusId: '31',
          projectTypeId: '47',
          contactPersonId: '12'
        },
        relationships: {
          creator: {
            data: {
              id: '2',
              type: 'persons'
            }
          },
          contactPerson: {
            data: {
              id: '12',
              type: 'persons'
            }
          },
          implementationEffort: {
            data: {
              id: '16',
              type: 'implementation_efforts'
            }
          },
          projectStatus: {
            data: {
              id: '31',
              type: 'project_statuses'
            }
          },
          projectType: {
            data: {
              id: '47',
              type: 'project_types'
            }
          },
          priorityTypeSet: {
            data: {
              id: '30',
              type: 'priority_type_sets'
            }
          },
          activities: {
            data: [
              {
                id: '1',
                type: 'activities'
              },
              {
                id: '50',
                type: 'activities'
              },
              {
                id: '5',
                type: 'activities'
              },
              {
                id: '48',
                type: 'activities'
              },
              {
                id: '21',
                type: 'activities'
              },
              {
                id: '23',
                type: 'activities'
              },
              {
                id: '6',
                type: 'activities'
              },
              {
                id: '13',
                type: 'activities'
              },
              {
                id: '45',
                type: 'activities'
              }
            ]
          },
          contributors: {
            data: [
              {
                id: '51',
                type: 'contributors'
              },
              {
                id: '54',
                type: 'contributors'
              },
              {
                id: '32',
                type: 'contributors'
              },
              {
                id: '33',
                type: 'contributors'
              }
            ]
          },
          strategyReferences: {
            data: [
              {
                id: '22',
                type: 'strategy_references'
              },
              {
                id: '14',
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
                id: '3',
                type: 'task_status_type_sets'
              }
            ]
          },
          tasks: {
            data: [
              {
                id: '7',
                type: 'tasks'
              },
              {
                id: '24',
                type: 'tasks'
              },
              {
                id: '43',
                type: 'tasks'
              },
              {
                id: '19',
                type: 'tasks'
              },
              {
                id: '39',
                type: 'tasks'
              },
              {
                id: '35',
                type: 'tasks'
              }
            ]
          },
          unitRelations: {
            data: [
              {
                id: '40',
                type: 'unit_relations'
              },
              {
                id: '49',
                type: 'unit_relations'
              }
            ]
          },
          sourceProjectRelations: {
            data: [
              {
                id: '15',
                type: 'project_relations'
              },
              {
                id: '26',
                type: 'project_relations'
              },
              {
                id: '17',
                type: 'project_relations'
              }
            ]
          },
          targetProjectRelations: {
            data: [
              {
                id: '38',
                type: 'project_relations'
              },
              {
                id: '4',
                type: 'project_relations'
              },
              {
                id: '44',
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
                id: '25',
                type: 'kpi_relations'
              },
              {
                id: '8',
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
                id: '28',
                type: 'target_groups'
              }
            ]
          }
        },
        links: {
          self: 'https://some-api/projects/46'
        }
      },
      meta: {
        pagination: {},
        requestId: '53',
        roleName: 'admin'
      },
      links: {
        self: 'https://some-api/projects/46'
      },
      included: [
        {
          id: '51',
          type: 'contributors',
          attributes: {
            id: '51',
            contributionType: 'Project',
            contributionId: '46',
            personId: '12',
            roleId: '9',
            createdAt: '2023-04-27T20:13:54.632+02:00',
            updatedAt: '2023-07-20T01:43:51.202+02:00'
          },
          relationships: {
            role: {
              data: {
                id: '9',
                type: 'roles'
              }
            },
            person: {
              data: {
                id: '12',
                type: 'persons'
              }
            },
            contribution: {
              data: {
                id: '46',
                type: 'projects'
              }
            }
          },
          links: {
            self: 'https://some-api/contributors/51'
          }
        },
        {
          id: '54',
          type: 'contributors',
          attributes: {
            id: '54',
            contributionType: 'Project',
            contributionId: '46',
            personId: '36',
            roleId: '41',
            createdAt: '2023-04-26T14:19:37.441+02:00',
            updatedAt: '2023-07-19T20:43:13.510+02:00'
          },
          relationships: {
            role: {
              data: {
                id: '41',
                type: 'roles'
              }
            },
            person: {
              data: {
                id: '36',
                type: 'persons'
              }
            },
            contribution: {
              data: {
                id: '46',
                type: 'projects'
              }
            }
          },
          links: {
            self: 'https://some-api/contributors/54'
          }
        },
        {
          id: '32',
          type: 'contributors',
          attributes: {
            id: '32',
            contributionType: 'Project',
            contributionId: '46',
            personId: '20',
            roleId: '9',
            createdAt: '2023-04-25T13:45:46.527+02:00',
            updatedAt: '2023-07-20T01:43:57.927+02:00'
          },
          relationships: {
            role: {
              data: {
                id: '9',
                type: 'roles'
              }
            },
            person: {
              data: {
                id: '20',
                type: 'persons'
              }
            },
            contribution: {
              data: {
                id: '46',
                type: 'projects'
              }
            }
          },
          links: {
            self: 'https://some-api/contributors/32'
          }
        },
        {
          id: '33',
          type: 'contributors',
          attributes: {
            id: '33',
            contributionType: 'Project',
            contributionId: '46',
            personId: '10',
            roleId: '9',
            createdAt: '2024-02-02T13:52:04.859+01:00',
            updatedAt: '2024-02-02T17:22:21.638+01:00'
          },
          relationships: {
            role: {
              data: {
                id: '9',
                type: 'roles'
              }
            },
            person: {
              data: {
                id: '10',
                type: 'persons'
              }
            },
            contribution: {
              data: {
                id: '46',
                type: 'projects'
              }
            }
          },
          links: {
            self: 'https://some-api/contributors/33'
          }
        },
        {
          id: '7',
          type: 'tasks',
          attributes: {
            id: '7',
            name: '1. Milestone',
            descriptionHtml: '',
            startDate: '2023-07-01T02:00:00.000+02:00',
            endDate: '2023-07-15T02:00:00.000+02:00',
            priorityId: '29',
            taskStatusId: '11',
            parentTaskId: null,
            createdAt: '2023-07-22T18:34:17.869+02:00',
            updatedAt: '2023-07-25T13:00:24.021+02:00',
            milestone: true,
            projectId: '46',
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
                id: '29',
                type: 'priorities'
              }
            },
            project: {
              data: {
                id: '46',
                type: 'projects'
              }
            },
            taskStatus: {
              data: {
                id: '11',
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
                  id: '36',
                  type: 'persons'
                }
              ]
            },
            childTasks: {
              data: [
                {
                  id: '35',
                  type: 'tasks'
                }
              ]
            }
          },
          links: {
            self: 'https://some-api/tasks/7'
          }
        },
        {
          id: '24',
          type: 'tasks',
          attributes: {
            id: '24',
            name: '3. Milestone',
            descriptionHtml: '',
            startDate: '2023-07-28T02:00:00.000+02:00',
            endDate: '2023-07-30T02:00:00.000+02:00',
            priorityId: '29',
            taskStatusId: '11',
            parentTaskId: null,
            createdAt: '2023-07-27T09:54:51.154+02:00',
            updatedAt: '2023-07-27T09:54:51.154+02:00',
            milestone: false,
            projectId: '46',
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
                id: '29',
                type: 'priorities'
              }
            },
            project: {
              data: {
                id: '46',
                type: 'projects'
              }
            },
            taskStatus: {
              data: {
                id: '11',
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
            self: 'https://some-api/tasks/24'
          }
        },
        {
          id: '43',
          type: 'tasks',
          attributes: {
            id: '43',
            name: 'asgasgasg',
            descriptionHtml: '',
            startDate: null,
            endDate: null,
            priorityId: '29',
            taskStatusId: '11',
            parentTaskId: '19',
            createdAt: '2023-10-02T17:32:06.344+02:00',
            updatedAt: '2023-10-02T17:32:06.344+02:00',
            milestone: false,
            projectId: '46',
            treePath: '/39/19/',
            level: 2,
            descriptionJson: {},
            position: 0,
            treeChanges: null
          },
          relationships: {
            parentTask: {
              data: {
                id: '19',
                type: 'tasks'
              }
            },
            priority: {
              data: {
                id: '29',
                type: 'priorities'
              }
            },
            project: {
              data: {
                id: '46',
                type: 'projects'
              }
            },
            taskStatus: {
              data: {
                id: '11',
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
                  id: '18',
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
            self: 'https://some-api/tasks/43'
          }
        },
        {
          id: '19',
          type: 'tasks',
          attributes: {
            id: '19',
            name: '1. TODO',
            descriptionHtml: '',
            startDate: '2023-07-28T02:00:00.000+02:00',
            endDate: null,
            priorityId: '29',
            taskStatusId: '11',
            parentTaskId: '39',
            createdAt: '2023-07-27T09:54:26.647+02:00',
            updatedAt: '2023-10-02T17:32:06.371+02:00',
            milestone: false,
            projectId: '46',
            treePath: '/39/',
            level: 1,
            descriptionJson: {},
            position: 0,
            treeChanges: null
          },
          relationships: {
            parentTask: {
              data: {
                id: '39',
                type: 'tasks'
              }
            },
            priority: {
              data: {
                id: '29',
                type: 'priorities'
              }
            },
            project: {
              data: {
                id: '46',
                type: 'projects'
              }
            },
            taskStatus: {
              data: {
                id: '11',
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
                  id: '43',
                  type: 'tasks'
                }
              ]
            }
          },
          links: {
            self: 'https://some-api/tasks/19'
          }
        },
        {
          id: '39',
          type: 'tasks',
          attributes: {
            id: '39',
            name: '2. Milestone',
            descriptionHtml: '',
            startDate: '2023-07-15T02:00:00.000+02:00',
            endDate: '2023-07-31T02:00:00.000+02:00',
            priorityId: '29',
            taskStatusId: '11',
            parentTaskId: null,
            createdAt: '2023-07-22T18:34:39.391+02:00',
            updatedAt: '2023-10-02T17:32:06.378+02:00',
            milestone: false,
            projectId: '46',
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
                id: '29',
                type: 'priorities'
              }
            },
            project: {
              data: {
                id: '46',
                type: 'projects'
              }
            },
            taskStatus: {
              data: {
                id: '11',
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
                  id: '36',
                  type: 'persons'
                }
              ]
            },
            childTasks: {
              data: [
                {
                  id: '19',
                  type: 'tasks'
                }
              ]
            }
          },
          links: {
            self: 'https://some-api/tasks/39'
          }
        },
        {
          id: '35',
          type: 'tasks',
          attributes: {
            id: '35',
            name: '1.TODO',
            descriptionHtml: '',
            startDate: '2023-07-06T02:00:00.000+02:00',
            endDate: null,
            priorityId: '29',
            taskStatusId: '11',
            parentTaskId: '7',
            createdAt: '2023-07-25T13:00:24.003+02:00',
            updatedAt: '2023-07-25T13:00:24.003+02:00',
            milestone: false,
            projectId: '46',
            treePath: '/7/',
            level: 1,
            descriptionJson: {},
            position: 0,
            treeChanges: null
          },
          relationships: {
            parentTask: {
              data: {
                id: '7',
                type: 'tasks'
              }
            },
            priority: {
              data: {
                id: '29',
                type: 'priorities'
              }
            },
            project: {
              data: {
                id: '46',
                type: 'projects'
              }
            },
            taskStatus: {
              data: {
                id: '11',
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
            self: 'https://some-api/tasks/35'
          }
        },
        {
          id: '22',
          type: 'strategy_references',
          attributes: {
            id: '22',
            projectId: '46',
            strategyId: '37',
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
                id: '46',
                type: 'projects'
              }
            },
            strategy: {
              data: {
                id: '37',
                type: 'strategies'
              }
            },
            topic: {
              data: null
            }
          },
          links: {
            self: 'https://some-api/strategy_references/22'
          }
        },
        {
          id: '14',
          type: 'strategy_references',
          attributes: {
            id: '14',
            projectId: '46',
            strategyId: '52',
            topicId: '34',
            priorityId: '42',
            meaningId: '27',
            createdAt: '2023-01-19T21:18:44.131+01:00',
            updatedAt: '2024-01-15T13:20:30.935+01:00',
            commentHtml: null,
            commentJson: null,
            main: false
          },
          relationships: {
            meaning: {
              data: {
                id: '27',
                type: 'meanings'
              }
            },
            priority: {
              data: {
                id: '42',
                type: 'priorities'
              }
            },
            project: {
              data: {
                id: '46',
                type: 'projects'
              }
            },
            strategy: {
              data: {
                id: '52',
                type: 'strategies'
              }
            },
            topic: {
              data: {
                id: '34',
                type: 'topics'
              }
            }
          },
          links: {
            self: 'https://some-api/strategy_references/14'
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
    expect(res.id).to.eql('46');
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
