function DB(opts) {
  opts = opts || {};
  var size = opts.layers.reduce(function(sum, layer) {
    return sum + layer.points
  }, 0) * DB.POINT_SIZE;
  this.xff = opts.xff || 0.5;
  this.buffer = new Buffer(size);
  this.buffer.fill(0);
  for(var i = 0; i < this.buffer.length; i += DB.POINT_SIZE) {
    this.buffer.writeFloatLE(NaN, i + 4);
  }
  this.layers = opts.layers;
}

DB.POINT_SIZE = 8;


DB.prototype.write = function write(time, value) {
  var now = this.lastTime;
  var highest = this.layers[0];
  var offset = 0; // offset for the current datapoint in the current precision layer
  var baseOffset = 0; // offset for the current precision layer
  if(now && time < now - highest.points * highest.precision) {
    return; // Unable to handle old records
  }
  if(time > now) {
    this.backFill(time);
  }
  for(var i = 0; i < this.layers.length; i++) {
    var current = this.layers[i];
    var next = this.layers[i+1];
    var offset = Math.floor(time / current.precision) % current.points;
    this.buffer.writeUInt32LE(time, (baseOffset + offset) * DB.POINT_SIZE);
    this.buffer.writeFloatLE(value, (baseOffset + offset) * DB.POINT_SIZE + 4);
    // console.log('   ' + Array(offset*8).join(' ') + '    |');
    // console.log('%d: ' + Array(current.points).join(0).split(0).map(function(_, i) {
    //   var a = this.buffer.readFloatLE((baseOffset + i) * DB.POINT_SIZE + 4);
    //   return ('  ' + (isNaN(a) ? a : a.toFixed(2))).slice(-6); }, this).join(', '), i);
    if(!next) break; // Don't propagate to next layer, when there's no next layer
    var start = baseOffset + Math.floor(offset / next.precision * current.precision) * next.precision / current.precision;
    var target = this.buffer.slice(start * DB.POINT_SIZE, (start + next.precision / current.precision) * DB.POINT_SIZE);
    // console.log('   ' + Array(start - baseOffset + 1).join('        ') + '|' + Array(next.precision/current.precision + 1).join('________') + '|');
    if(!this.canPropagate(target)) break;
    value = this.aggregate(target);
    baseOffset += current.points;
  }
  this.lastTime = Math.max(time, now);
};

DB.prototype.backFill = function(time) {
  //
}

DB.prototype.canPropagate = function(buffer) {
  var unknowns = 0;
  for(var i = 0; i < buffer.length; i += DB.POINT_SIZE) {
    unknowns += isNaN(buffer.readFloatLE(i + 4));
  }
  return unknowns / buffer.length * DB.POINT_SIZE < this.xff;
}

DB.prototype.aggregate = function aggregate(buffer) {
  var s = 0;
  for(var offset = 0; offset < buffer.length - 4; offset += DB.POINT_SIZE) {
    s += buffer.readFloatLE(offset + 4);
  }
  return s / (buffer.length / DB.POINT_SIZE);
};

DB.prototype.toJSON = function() {
  var o = [];
  var offset = 0;
  var baseOffset = 0;
  for(var i = 0; i < this.layers.length; i++) {
    o[i] = [];
    for(var j = 0; j < this.layers[i].points; j++) {
      o[i][j] = this.buffer.readFloatLE((baseOffset + j) * 8 + 4)
    }
    baseOffset += this.layers[i].points;
  }
  return o;
}

module.exports = DB;
