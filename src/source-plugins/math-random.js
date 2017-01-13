'use strict';

/**
 * Modules
 * @private
 */

function MathRandom(_options = {}) {
  // Self reference.
  let self = this;

  // Properties
  /**
   *
   * @type {Object}
   */
  self.options = _options;

  // Merge defaults
  self.options.pluginOptions = Object.assign({
    poolSize: 64,
    buffPercent: 0.5,
    poolKeeperEnabled: true,
    poolKeeperInterval: 5000
  }, self.options.pluginOptions);

  /*
   * Methods
   */

  /**
   *
   * @returns {number}
   */
  self.rand = function () {
    return Math.random();
  };

  self.capabilities = function() {
    return {
      rand: true,
      blockingRand: true
    };
  };
}

module.exports.plugin = MathRandom;
