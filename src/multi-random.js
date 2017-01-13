'use strict';

/**
 * Modules
 * @private
 */

/**
 *
 * @param name
 * @returns {Object}
 */
function getPlugin(name, options = {}) {
  try {
    let plugin;

    if (typeof name !== 'string') {
      plugin = name;
    }
    else {
      plugin = require('./source-plugins/' + name);
    }

    if (plugin === undefined || plugin.plugin === undefined) {
      throw Error();
    }

    return new plugin.plugin(options);
  }
  catch (e) {
    throw Error('Couldn\'t create plugin ' + name + ' Error message ' + e.message);
  }
}

/**
 *
 * @param options
 * @constructor
 */
function MultiRandom(options = {}) {
  // Self reference.
  let self = this;

  // Merge defaults
  options = Object.assign({
    'plugin': 'math-random',
    'pluginOptions': {},
    'blockingRand': false,
    'supportFallback': true,
  }, options);

  /*
   * Properties
   */

  /**
   *
   * @type Plugin
   */
  self.plugin = null;

  /*
   * Methods
   */

  /**
   *
   * @param min
   * @param max
   */
  self.random = function (min, max) {
    // Call random
    if (self.plugin.capabilities().random === true) {
      return self.plugin.random(min, max, params);
    }
    else {
      return Math.round(self.plugin.rand() * (max - min)) + min;
    }
  };

  // Constructor
  self.plugin = getPlugin(options.plugin, options);

  if (self.plugin.capabilities().init === true) {
    self.plugin.init();
  }
}

module.exports = MultiRandom;
