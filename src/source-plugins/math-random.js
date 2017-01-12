'use strict';

/**
 * Modules
 * @private
 */

function MathRandom(options = {}) {
  // Self reference.
  let self = this;

  // Merge defaults
  options = Object.assign({}, options);

  /*
   * Properties
   */
  /*
   * Methods
   */

  self.rand = function () {
    return Math.random();
  };

  self.capabilities = function() {
    return {
      rand: true
    };
  };
}

module.exports.plugin = MathRandom;
