'use strict';

var POINT_SIZE = 8;
var VALUE_OFFSET = 4;

function parse(str) {
  var map = {
    s: 1,
    m: 60,
    h: 60*60,
    d: 60*60*24,
    w: 60*60*24*7,
    mon: 60*60*24*30,
    y: 60*60*24*365
  };
  var match = str.match(/^(\d+)(\w+)$/);
  if(!match) {
    throw new Error(str + ' is not valid format!');
  }
  var unit = match[2];
  var n = match[1];
  return n * map[unit];
}

/**
 * Creates a new Layer
 * @param {Number} precision Timestamp resolution
 * @param {Number} points    Stored datapoints
 */
function Layer(precision, points) {
  if(typeof precision == 'string') {
    precision = parse(precision);
  }
  if(typeof points == 'string') {
    points = parse(points);
  }
  this.precision = precision;
  this.points = points / precision;
}

/**
 * Get layer size
 *
 * @return {Number} Layer size in bytes.
 */
Layer.prototype.getSize = function getSize() {
  return POINT_SIZE * this.points;
};

/**
 * Write value onto the layer
 * @param {Number} time  Event timestamp
 * @param {Number} value Event value
 */
Layer.prototype.write = function write(time, value) {
  this._write(time, value);
  this.propagate(time);
};

/**
 * Propagate current values to the next layer
 * @api private
 * @param {Number} time Event timestamp
 */
Layer.prototype.propagate = function propagate(time) {
  if(!this.next) {
    return;
  }
  var startTime = this.getAggregateStartTime(time);
  var start = this.getIndex(startTime);
  var end = this.getIndex(time + this.precision);
  var aggregated;
  if(end < start) {
    aggregated = this.aggregate(
      this._slice(start, this.points),
      this._slice(0, end)
    );
  } else {
    aggregated = this.aggregate(
      this._slice(start, end)
    );
  }
  this.next.write(time, aggregated);
};

/**
 * Aggregate the propagating data
 * @api private
 * @param {Buffer} buf1 Data
 * @param {Buffer} buf2 Data
 * @return {Number} Aggregated value
 */
Layer.prototype.aggregate = function aggregate(buf1, buf2) {
  var initial;
  var length = buf1.length / POINT_SIZE + (buf2 ? buf2.length / POINT_SIZE : 0);
  for(var i = 0; i < buf1.length / POINT_SIZE; i++) {
    var value = buf1.readFloatLE(i * POINT_SIZE + VALUE_OFFSET);
    initial = this.db.aggregate(initial, value, length);
  }
  if(buf2) {
    for(var i = 0; i < buf2.length / POINT_SIZE; i++) {
      var value = buf2.readFloatLE(i * POINT_SIZE + VALUE_OFFSET);
      initial = this.db.aggregate(initial, value, length);
    }
  }
  return initial;
};

Layer.prototype.getAggregateStartTime = function getAggregateStartTime(time) {
  return time - this.next.precision + this.precision;
};

Layer.prototype._write = function _write(time, value) {
  if(!this.buffer) {
    throw new Error('Layer needs a buffer to write on!');
  }
  var index = this.getIndex(time);
  var timePos = this._getPos(index, 0);
  var valuePos = this._getPos(index, 1);
  this.buffer.writeUInt32LE(time, timePos);
  this.buffer.writeFloatLE(value, valuePos);
};

Layer.prototype._read = function _read(index) {
  if(!this.buffer) {
    throw new Error('Layer needs a buffer to read from!');
  }
  var pos = this._getPos(index, 1);
  return this.buffer.readFloatLE(pos);
};

Layer.prototype._slice = function _slice(start, end) {
  return this.buffer.slice(this._getPos(start), this._getPos(end));
};

Layer.prototype._getPos = function _getPos(index, isValue) {
  isValue = isValue || 0;
  return index * POINT_SIZE + isValue * VALUE_OFFSET;
};

Layer.prototype.getIndex = function getIndex(time) {
  return Math.floor(this.points + time / this.precision) % this.points;
};

Layer.prototype.toString = function toString(time) {
  /*
--------------
----|
 100.000 | 100.000 | 100.00 |
----|---------*---------|
  */
  var c = this.getIndex(time);
  var str = '';
  str += Array(c + 1).join('          ') + '    v\n';
  for(var i = 0; i < this.points; i++) {
    var p = i * POINT_SIZE + VALUE_OFFSET;
    var v = this.buffer.readFloatLE(p);
    str += ('    ' + v.toFixed(3)).slice(-8) + ' |';
  }
  str += '\n';
  if(!this.next) {
    return str;
  }
  var s = this.getAggregateStartTime(time);
  var spos = this.getIndex(s);
  console.log(s, spos);
  var tpos = c;
  if(tpos > spos) {
    str += Array(spos + 1).join('          ');
    str += '    |';
    str += Array(Math.min(this.points - spos, this.next.precision / this.precision - 1)).join('_________*');
    str += '_________|';
  } else {
    if(tpos == 0) {
      str += '____|';
    } else {
      str += '____*';
      str += Array(tpos).join('_________*');
      str += '_________|';
    }
    str += Array(spos - tpos).join('          ');
    str += '         |';
    str += Array(this.points - spos).join('_________*')
    str += '_____';
  }
  return str;
};

module.exports = Layer;
