# round-robin-database

In-memory Round Robin Database implementation for storing time-series data.
It's pertty much the same as [whisper](https://github.com/graphite-project/whisper).

## Usage

*Do not use, it's not stable yet*

```js
var db = new DB({
  retentions: [{      // store 15s precision for a week
    retention: 40320,
    resolution: 15,
  }, {
    retention: 30240, // 1m precision for 3 weeks
    resolution: 60,
  }, {
    retention: 43800, // 1h precision for 5 years
    resolution: 3600
  }]
})

// ...

db.write(time, value);
```

## Under the Hood

Data is stored in a single `Buffer`, which holds `{time,value}` pairs,
every point has a size of 8 bytes (32 bit timestamp, 32 bit float value).

If you wan to store 15s precision values for a week, 1m precision values for 3 weeks,
1h precision values for 5 years, the `Buffer`s size will be
`(7*24*3600/15+21*24*3600/60+5*365*24*3600/3600)*8/1024 = 893KB`. That's pretty good.

## TODO

- Persistence backend
- Write some tests

## License MIT
