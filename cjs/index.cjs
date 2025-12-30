'use strict';

const mod = require('../dist/lib/index.cjs');
const exported = mod && mod.default ? mod.default : mod;

if (exported && (typeof exported === 'object' || typeof exported === 'function')) {
  Object.assign(exported, mod);
}

module.exports = exported;
module.exports.default = exported;
