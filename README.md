# round-robin-database

In-memory Round Robin Database implementation for storing time-series data.
It's pertty much the same as [whisper](https://github.com/graphite-project/whisper).

## Usage

```js
var rrd = require('round-robin-database')
var DB = rrd.DB;
var Layer = rrd.Layer;

var db = new DB({
  layers: [
    new Layer('15s', '1w'), // 15s resolution for a week
    new Layer('1m', '3w'),  // 1m resolution for 3 weeks
    new Layer('1h', '5y')   // 1h resolution for 5 years
  ]
});

console.log(db.getSize()); // 914880, less than 1MB!

// ...

db.write(time, value);
```

## Under the Hood

Data is stored in a single `Buffer`, which holds `{time,value}` pairs,
every point has a size of 8 bytes (32 bit timestamp, 32 bit float value).

If you wan to store 15s precision values for a week, 1m precision values for 3 weeks,
1h precision values for 5 years, the `Buffer`s size will be
`(7*24*3600/15+21*24*3600/60+5*365*24*3600/3600)*8/1024 = 893KB`. That's pretty good.

On my 3 year old laptop (i5-m450) ~30 records/ms can be written.

## License

MIT
