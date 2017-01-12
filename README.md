# Node MultiRandom generator

# Descrtiption

This module allows to use different random generators in easy way. This can be used as just a wrapper for default Pseudo-Random generator in javascript allowing you to set maximum and minimum values to return random value.

# Install
    npm install multi-random

# Usage

```javascript
const MultiRandom = require('multi-random');

// Create object
let randGen = new MultiRandom({
  'plugin': 'math-random', // Driver to use. Defaults to math-random
  'pluginOptions': {}, // Options passed to plugin. Can be different for different plugins
  'blockingRand': false, // If set to true this means that calling randGen.random(min, max)  will block process until it is ready to return numbers
  'supportFallback': true // If set to true, it will return data using Pseudo-Random generator Math.Random() if external data pool is not yet filled. This has no effect on math-random driver at all.
});

// Generate random number between 6 and 256
// Note: values below zero or floating values are not yet supported.
randGen.random(6, 256);

// Note: Creating MultiRandom object with SAME settings will use same pool for RandomOrg driver. See example below.
```


# Example of using Random-Org to transparently get random values

In order to see a lot of debug information, please add DEBUG="multi-random" to your ENV variables.

```javascript
const MultiRandom = require('multi-random');

let prandom = new MultiRandom(); // This will use default Math.random()
let trandom = new MultiRandom({ // Creating Random-Org driver with custom pool size 
  'plugin': 'random-org',
  'pluginOptions': {
    poolSize: 128,
  }
});

let trandom2 = new MultiRandom({ // One more random generator using Random-Org values
  'plugin': 'random-org',
});

// Printing first random. It will be swapned from Math.random() because
// pool of random data is empty so it uses Math.random() as fallback.
// If you are aware of having ONLY true random numbers set supportFallback to false
// And it won't permit to get random number if pool is empty and an error will be thrown.
console.log('First random is: ' + trandom.random(128, 512));

// Wait 10 seconds (the pool must be filled already).
setTimeout(function() {
  for (let i=0; i<256; i++) {
    let min = prandom.random(0, 256); // We dont spend RandomOrg data here. Use wrapper for default Math.random()
    let max = prandom.random(257, 65535);

    // Example of creating new object with SAME settings as trandom created before.
    // It WON'T fill pool again because it is already filled by first call with same parameters.
    let trandom = new MultiRandom({
      'plugin': 'random-org',
      'pluginOptions': {
        poolSize: 128,
      }
    });
    console.log('Random between ' + min + ' and ' + max + ': ' + trandom.random(min, max));
  }
}, 10000);
```

# Bugs, support, disclaimer

Please, feel free to create issues via github and describe faced problems or suggest ideas. I am not node js developer and this is my first module, I might not be experienced in node js programming but I'm experienced in web development and in development on PHP so every comment will be useful for me.
