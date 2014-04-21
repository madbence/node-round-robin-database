var co = require('co');
var DB = require('./lib/rrd');

function wait(ms) {
  return function(cb) {
    setTimeout(cb, ms);
  };
}

var db = new DB({
  retentions: [{
    retention: 20,
    resolution: 1
  }, {
    retention: 10,
    resolution: 5
  }, {
    retention: 50,
    resolution: 10
  }]
});

var i = 0;
co(function*() {
  for(;;) {
    db.write(Math.floor(Date.now()/1000), Math.random()*100);
    yield wait(1000);
  }
})();
