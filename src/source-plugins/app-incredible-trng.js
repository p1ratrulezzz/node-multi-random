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
const querystring = require('querystring');

/**
 * Constants
 * @private
 */
const APP_INCR_ENDPOINT = 'http://appincredible.com/controllers/randomnumbergenerator.php';

/**
 *
 * @param options
 * @constructor
 */
function APPIncredibleGeneratorPlugin(_options = {}) {
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
    poolSize: 512, // Size of pool (the real size will be this + 70% by default)
    buffPercent: 0.7, // 0.7 == 70% of pool will be counted as poor and poolKeeper will fill it again
    poolKeeperEnabled: true,
    poolKeeperInterval: 5000,
    timeout: 5000 // Seconds to wait for response from server
  }, self.options.pluginOptions);

  // Methods

  /**
   *
   * @returns {number} Number between 0 and 1
   */
  self.rand = function () {
    if (self.pool === false || self.pool.length == 0 || self.pool.length <= self.options.pluginOptions.poolSize * self.options.pluginOptions.buffPercent) {
      debug('Pool is poor. Size %d', self.pool.length);
      refillPool();

      if (self.pool !== false && self.options.blockingRand === true) {}
      else if (self.options.supportFallback === true) {
        if (self.pool === false || self.pool.length == 0) {
          debug('Return value from fallback');
          debug('Pool size is %d', self.pool.length);
          return Math.random();
        }
      }
      else if (self.options.supportFallback !== true && self.pool === false || self.pool.length == 0) {
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

  let _cidSalt = typeof self.options.id == 'string' ? self.options.id : JSON.stringify(self.options);
  let poolCid = crypto.createHash('sha1').update(__dirname + _cidSalt).digest('hex') + ':randomservice';
  let poolCidKeeper = crypto.createHash('sha1').update(__dirname + _cidSalt).digest('hex') + ':randomservice:keeper';
  let poolCidRefill = crypto.createHash('sha1').update(__dirname + _cidSalt).digest('hex') + ':randomservice:refill';

  function parseResponsePool(err, data) {
    let parsed = data;
    let pool = [];
    if (err === null && parsed.success == true && parsed.multiRandom !== undefined) {
      pool = parsed.multiRandom;
      pool.forEach(function(value, index) {
        let decimal = parseFloat(String('0.') + String(value));
        pool[index] = decimal;
      });

      // Merge with original pool
      pool = self.pool.concat(pool);
    }
    else if (self.options.supportFallback === true) {
      pool = false;
    }
    else {
      throw Error('Can\'t get entropy data from qrng-au. Some error occured');
    }

    debug('Got new pool. Merging into current');

    // Cache new pool value
    self.pool = pool;
    cache.put(poolCid, self.pool);

    debug('Pool size is %d', self.pool.length);

    // Unlock
    debug('Refill unlocked');
    self.refill = false;
    cache.put(poolCidRefill, self.refil);
  }

  function refillPool() {
    if (!self.isReady()) {
      return;
    }

    // Lock
    self.refill = true;
    cache.put(poolCidRefill, self.refill);

    // console.log('Getting new pool');
    if (self.options.blockingRand === true) {
      debug('Starting refill pool in sync mode');
      try {
        let res = srequest('POST', APP_INCR_ENDPOINT, {
          body: querystring.stringify({
            numMin: 1000000000,
            numMax: 9999999999,
            numTotal: self.options.pluginOptions.poolSize,
            numDecimal: 0,
            rbAlgorithm: 2,
            rbSeparator: 5,
            rbSort: 1
          }),
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: self.options.pluginOptions.timeout
        });

        parseResponsePool(null, JSON.parse(res.getBody('utf8')));
      }
      catch (e) {
        parseResponsePool(true, null);
      }

      // Unlock
      self.refill = false;
      cache.put(poolCidRefill, self.refil);
    }
    else {
      debug('Starting refill pool in async mode');
      request(APP_INCR_ENDPOINT, {
        method: 'POST',
        formData: {
          numMin: 1000000000,
          numMax: 9999999999,
          numTotal: self.options.pluginOptions.poolSize,
          numDecimal: 0,
          rbAlgorithm: 2,
          rbSeparator: 5,
          rbSort: 1
        },
        json: true,
        timeout: self.options.pluginOptions.timeout
      }, function(err, response) {
        parseResponsePool(err, err === null ? response.body : null);
      });
    }
  }

  if (self.options.pluginOptions.poolKeeperEnabled === true && self.options.blockingRand !== true) {
    if (cache.get(poolCidKeeper) === null) {
      debug('PoolKeeper started');
      let keeperInterval = setInterval(function poolKeeper() {
        if (self.isReady() && (self.pool.length == 0 || self.pool.length <= self.options.pluginOptions.poolSize * self.options.pluginOptions.buffPercent)) {
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

module.exports.plugin = APPIncredibleGeneratorPlugin;
