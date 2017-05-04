'use strict';

const objectPath = require('object-path');

/**
* Transform properties of objects with a given template.
* Given object:
* { "a" : { "b" : "c" } }
* the template:
* [ { "path" : ["a", "b"], "value" : "d" } ]
* yields:
* { "a" : { "b" : "d" } }
*
* Note that we could have used '"path" : "a.b"' but there is
*  ambiguity since we could be reffering to a property named "a.b".
*/
const transform = (object, template) => {
  const clone = Object.assign({}, object);
  for (let i = 0; i < template.length; i += 1) {
    const rule = template[i];
    objectPath.set(clone, rule.path, rule.value);
  }
  return clone;
};

module.exports = transform;
