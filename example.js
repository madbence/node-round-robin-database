var co = require('co');
var DB = require('./lib/rrd');

function wait(ms) {
  return function(cb) {
    setTimeout(cb, ms);
  };
}

var db = new DB({
  layers: [{
    points: 20,
    precision: 1
  }, {
    points: 10,
    precision: 5
  }, {
    points: 25,
    precision: 10
  }]
});

var i = 0;
co(function*() {
  for(;i<100000;) {
    db.write(i++, Math.random()*100);
    //console.log('---');
    //yield wait(1);
  }
  console.log('whoop!')
})();
