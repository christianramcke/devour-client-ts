import { Logger } from '../../logger';
import {
  filter,
  find,
  flatten,
  forOwn,
  get,
  includes,
  isArray,
  isPlainObject,
  isUndefined,
  map,
  matches
} from 'lodash';

interface RelationConfig {
  attribute: string;
  relation: any;
}

interface CachedItem {
  type: string;
  id: string;
  deserialized: any;
}

export const visitedNodes = new Set<string>();

export const cache = new (class {
  _cache: CachedItem[];

  constructor() {
    this._cache = [];
  }

  set(type, id, deserializedData) {
    this._cache.push({
      type: type,
      id: id,
      deserialized: deserializedData
    });
  }

  get(type, id) {
    const match = find(this._cache, (r) => r.type === type && r.id === id);
    return match && match.deserialized;
  }

  clear() {
    this._cache = [];
  }
})();

export function collection(items, included, useCache = false) {
  visitedNodes.clear();
  return items.map((item) => {
    return resource.call(this, item, included, useCache);
  });
}

export function resource(item, included, useCache = false) {
  const deserializedModel = { id: item.id, type: item.type };

  if (useCache) {
    const cachedItem = cache.get(item.type, item.id);
    if (cachedItem) return cachedItem;
  }

  const model = this.modelFor(this.pluralize.singular(item.type));
  if (model.options.deserializer) {
    return model.options.deserializer.call(this, item, included);
  }

  forOwn(item.attributes, (value, attr) => {
    let attrConfig = model.attributes[attr];

    if (isUndefined(attrConfig) && attr !== 'id') {
      attr = attr.replace(/-([a-z])/g, function (g) {
        return g[1].toUpperCase();
      });
      attrConfig = model.attributes[attr];
    }

    if (isUndefined(attrConfig) && attr !== 'id') {
      Logger.warn(
        `Resource response for type "${item.type}" contains attribute "${attr}", but it is not present on model config and therefore not deserialized.`
      );
    } else {
      deserializedModel[attr] = value;
    }
  });

  // Important: cache before parsing relationships to avoid infinite loop
  if (useCache) cache.set(item.type, item.id, deserializedModel);

  forOwn(item.relationships, (value, rel) => {
    let relConfig: RelationConfig = {
      attribute: rel,
      relation: model.attributes[rel]
    };
    const key = rel;

    if (isUndefined(relConfig.relation)) {
      rel = rel.replace(/-([a-z])/g, function (g) {
        return g[1].toUpperCase();
      });
      relConfig = {
        attribute: rel,
        relation: model.attributes[rel]
      };
    }

    if (isUndefined(relConfig.relation)) {
      Logger.warn(
        `Resource response for type "${item.type}" contains relationship "${rel}", but it is not present on model config and therefore not deserialized.`
      );
    } else if (!isRelationship(relConfig.relation)) {
      Logger.warn(
        `Resource response for type "${item.type}" contains relationship "${rel}", but it is present on model config as a plain attribute.`
      );
    } else {
      deserializedModel[rel] = attachRelationsFor.call(
        this,
        model,
        relConfig,
        item,
        included,
        key
      );
    }
  });

  const params = ['meta', 'links'];
  params.forEach(function (param) {
    if (item[param]) {
      deserializedModel[param] = item[param];
    }
  });

  return deserializedModel;
}

function attachRelationsFor(
  model,
  attribute: RelationConfig,
  item,
  included,
  key
) {
  if (attribute.relation.jsonApi === 'hasOne') {
    return attachHasOneFor.call(this, model, attribute, item, included, key);
  }
  if (attribute.relation.jsonApi === 'hasMany') {
    return attachHasManyFor.call(this, model, attribute, item, included, key);
  }
}

function attachHasOneFor(
  model,
  attribute: RelationConfig,
  item,
  included,
  key
) {
  if (!item.relationships) {
    return null;
  }

  const relatedItems = relatedItemsFor(model, attribute, item, included, key);
  if (relatedItems && relatedItems[0]) {
    return resource.call(this, relatedItems[0], included, true);
  }

  const relationshipData = get(item.relationships, [key, 'data'], false);
  if (relationshipData) {
    return relationshipData;
  }
  return null;
}

function attachHasManyFor(
  model,
  attribute: RelationConfig,
  item,
  included,
  key
) {
  const nodeIdentifier = `${item.type}:${item.id}`;
  if (visitedNodes.has(nodeIdentifier)) {
    return null;
  }
  visitedNodes.add(nodeIdentifier);

  if (!item.relationships) {
    return null;
  }

  const relatedItems = relatedItemsFor(model, attribute, item, included, key);
  if (relatedItems && relatedItems.length > 0) {
    return collection.call(this, relatedItems, included, false);
  }

  const relationshipData = get(item.relationships, [key, 'data'], false);
  if (relationshipData) {
    return relationshipData;
  }

  return [];
}

function isRelationship(attribute) {
  return (
    isPlainObject(attribute) &&
    includes(['hasOne', 'hasMany'], attribute.jsonApi)
  );
}

/**
 * Returns unserialized related items.
 * @param model
 * @param attribute
 * @param item
 * @param included
 * @param key
 */
function relatedItemsFor(
  model,
  attribute: RelationConfig,
  item,
  included,
  key
) {
  const relationMap = get(item.relationships, [key, 'data'], false);
  if (!relationMap) {
    return [];
  }

  if (isArray(relationMap)) {
    return flatten(
      map(relationMap, function (relationMapItem) {
        return filter(included, (includedItem) => {
          return isRelatedItemFor(attribute, includedItem, relationMapItem);
        });
      })
    );
  } else {
    return filter(included, (includedItem) => {
      return isRelatedItemFor(attribute, includedItem, relationMap);
    });
  }
}

function isRelatedItemFor(
  attribute: RelationConfig,
  relatedItem,
  relationMapItem
) {
  let passesFilter = true;
  if (attribute.relation.filter) {
    passesFilter = matches(relatedItem.attributes)(attribute.relation.filter);
  }
  return (
    relatedItem.id === relationMapItem.id &&
    relatedItem.type === relationMapItem.type &&
    passesFilter
  );
}
