var Layer = require('lib/layer');

/**
 * Creates a new round-robin database
 * @param {Object} opts        DB options
 * @param {Array}  opts.layers `Layer` instances, it has sensible defaults
 * @param {Number} opts.xff    X-Files Factor, defaults to 0.5
 */
function Database(opts) {
  var opts = opts || {};
  opts.layers = opts.layers || [
    new Layer('15s', '1w'),
    new Layer('1m', '3w'),
    new Layer('1h', '5y')
  ];
  opts.xff = opts.xff === undefined ? 0.5 : opts.xff;

  this.layers = opts.layers;
  this.buffer = opts.buffer || new Buffer(this.getSize());
  if(!opts.buffer) {
    this.buffer.fill(0);
  }
  this.lastWrite = opts.lastWrite;
  this.delegateLayers();
}

/**
 * Get database size in bytes
 *
 * The size is calculated from layer sizes
 * @return {Number} Database size
 */
Database.prototype.getSize = function getSize() {
  var sum = 0;
  for(var i = 0; i < this.layers.length; i++) {
    sum += this.layers[i].getSize();
  }
  return sum;
};

/**
 * Delegate main buffer to layers
 *
 * @api private
 */
Database.prototype.delegateLayers = function delegateLayers() {
  var pos = 0;
  for(var i = 0; i < this.layers.length; i++) {
    var layer = this.layers[i];
    layer.db = this;
    layer.next = this.layers[i + 1];
    var size = layer.getSize();
    layer.buffer = this.buffer.slice(pos, pos + size);
    pos += size;
  }
};

Database.prototype.write = function write(time, value) {
  this.layers[0].write(time, value);
};

Database.prototype.aggregate = function aggregate(prev, curr, length) {
  prev = prev || 0;
  return prev + curr / length;
};

module.exports = Database;
