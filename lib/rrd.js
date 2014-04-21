function DB(opts) {
  opts = opts || {};
  var size = opts.retentions.reduce(function(sum, archive) {
    return sum + archive.retention
  }, 0) * DB.POINT_SIZE;
  this.buffer = new Buffer(size);
  this.archives = opts.retentions; // silly names :(((
}

DB.POINT_SIZE = 8;

DB.prototype.write = function write(time, value) {
  var now = Date.now() / 1000;
  var highest = this.archives[0];
  var offset = 0;
  var baseOffset = 0;
  if(time < now - highest.retention * highest.resolution) {
    return; // Unable to handle old records
  }
  for(var i = 0; i < this.archives.length; i++) {
    var current = this.archives[i];
    var next = this.archives[i+1];
    var offset = Math.floor(time / current.resolution) % current.retention;
    // console.log('Writing %d @ %d to buffer %d (base: %d, length: %d)', value, offset, i, baseOffset);
    this.buffer.writeUInt32LE(time, (baseOffset + offset) * DB.POINT_SIZE);
    this.buffer.writeFloatLE(value, (baseOffset + offset) * DB.POINT_SIZE + 4);
    if(!next) break; // Don't propagate to next level, when there's no next level
    var start = Math.floor(offset / next.resolution) * next.resolution;
    value = this.aggregate(this.buffer.slice(start * DB.POINT_SIZE, (start + next.resolution) * DB.POINT_SIZE));
    baseOffset += current.retention;
  }
};

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
  for(var i = 0; i < this.archives.length; i++) {
    o[i] = [];
    for(var j = 0; j < this.archives[i].retention; j++) {
      o[i][j] = this.buffer.readFloatLE((baseOffset + j) * 8 + 4)
    }
    baseOffset += this.archives[i].retention;
  }
  return o;
}

module.exports = DB;
