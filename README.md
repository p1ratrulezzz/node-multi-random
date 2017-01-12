# node-multi-random

# Install
    npm install multi-random
    
# Example of using Random-Org to transparently get random values

In order to see a lot of debug information, please add DEBUG="multi-random" to your ENV variables.

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
