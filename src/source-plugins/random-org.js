'use strict';

/**
 * Modules
 * @private
 */
const cache = require('memory-cache');
const crypto = require('crypto');
const request = require('request');
const srequest = require('sync-request');
const debug = require('debug')('multi-random');

/**
 * Constants
 * @private
 */
const RANDOM_ORG_ENDPOINT = 'https://www.random.org';

/**
 *
 * @param options
 * @constructor
 */
function RandomOrg(_options = {}) {
  // Self reference.
  let self = this;

  // Properties

  /**
   * Pool to store values
   * @type {Array}
   */
  self.pool = [];

  /**
   * Flag if currently refilling pool
   * @type {null}
   */
  self.refill = null;

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

  // Methods

  /**
   *
   * @returns {number} Number between 0 and 1
   */
  self.rand = function () {
    if (self.pool.length == 0 || self.pool.length <= self.options.pluginOptions.poolSize * self.options.pluginOptions.buffPercent) {
      debug('Pool is poor. Size %d', self.pool.length);
      refillPool();

      if (self.options.blockingRand === true) {}
      else if (self.options.supportFallback === true) {
        if (self.pool.length == 0) {
          debug('Return value from fallback');
          debug('Pool size is %d', self.pool.length);
          return Math.random();
        }
      }
      else if (self.options.supportFallback !== true && self.pool.length == 0) {
        throw Error('Pool doesn\'t have values');
      }
    }

    debug('Return value from pool');
    debug('Pool size is %d', self.pool.length);
    return self.pool.pop();
  };

  self.capabilities = function() {
    return {
      rand: true,
      init: true,
      blockingRand: true,
      isReady: true
    };
  };

  let _cidSalt = JSON.stringify(self.options);
  let poolCid = crypto.createHash('sha1').update(__dirname + _cidSalt).digest('hex') + ':randomservice';
  let poolCidKeeper = crypto.createHash('sha1').update(__dirname + _cidSalt).digest('hex') + ':randomservice:keeper';
  let poolCidRefill = crypto.createHash('sha1').update(__dirname + _cidSalt).digest('hex') + ':randomservice:refill';

  function parseResponsePool(data) {
    let parsed = String(data).split('\n');
    let pool = [];
    if (parsed.length !== undefined && parsed.length > 1) {
      parsed.pop(); // Delete last empty element
      pool = parsed;
    }
    else if (self.options.supportFallback === true) {
      pool = false;
    }
    else {
      throw Error('Can\'t get entropy data from random.org. Your limit might be exceeded.');
    }

    debug('Got new pool. Merging into current');
    // Merge with original pool
    self.pool = self.pool.concat(pool);

    // Cache empty array in memory for global access
    cache.put(poolCid, self.pool);

    debug('Pool size is %d', self.pool.length);

    // Unlock
    debug('Refill unlocked');
    self.refill = false;
    cache.put(poolCidRefill, self.refil);
  }

  function refillPool() {
    if (self.refill === true) {
      return;
    }

    // Lock
    self.refill = true;
    cache.put(poolCidRefill, self.refill);

    // console.log('Getting new pool');
    if (self.options.blockingRand === true) {
      debug('Starting refill pool in sync mode');
      let res = srequest('GET', RANDOM_ORG_ENDPOINT + '/decimal-fractions' + '/', {
        qs: {
          num: self.options.pluginOptions.poolSize,
          dec: 6,
          col: 1,
          format: 'plain',
          rnd: 'new'
        }
      });

      parseResponsePool(res.getBody('utf8'));

      // Unlock
      self.refill = false;
      cache.put(poolCidRefill, self.refil);
    }
    else {
      debug('Starting refill pool in async mode');
      request(RANDOM_ORG_ENDPOINT + '/decimal-fractions' + '/', {
        method: 'GET',
        qs: {
          num: self.options.pluginOptions.poolSize,
          dec: 6,
          col: 1,
          format: 'plain',
          rnd: 'new'
        }
      }, function(err, response) {
        parseResponsePool(response.body);
      });
    }
  }

  if (self.options.pluginOptions.poolKeeperEnabled === true) {
    if (cache.get(poolCidKeeper) === null) {
      debug('PoolKeeper started');
      let keeperInterval = setInterval(function poolKeeper() {
        if (self.pool.length == 0 || self.pool.length <= self.options.pluginOptions.poolSize * self.options.pluginOptions.buffPercent) {
          debug('PoolKeeper found poor pool condition');
          refillPool();
        }
      }, self.options.pluginOptions.poolKeeperInterval);

      cache.put(poolCidKeeper, keeperInterval);
    }
  }

  self.init = function() {
    debug('RandomOrg plugin created');
    self.pool = cache.get(poolCid) || [];
    self.refill = cache.get(poolCidRefill) || false;
    if (self.pool !== false && (self.pool === null || (self.pool.length !== undefined && self.pool.length == 0))) {
      debug('Pool size is %d', self.pool.length);
      debug('Pool refill flag is %s', self.refill === true ? 'true' : 'false');
      refillPool();
    }
  };

  self.isReady = function () {
    return self.refill !== true;
  };
};

module.exports.plugin = RandomOrg;
