# round-robin-database

In-memory Round Robin Database implementation for storing time-series data.
It's pertty much the same as [whisper](https://github.com/graphite-project/whisper).

## Usage

*Do not use, it's not stable yet*

## Under the Hood

Data is stored in a single `Buffer`, which holds `{time,value}` pairs,
every point has a size of 8 bytes (32 bit timestamp, 32 bit float value).

On write, the given value propagates through every layer.

## TODO

- Persistence backend
- Write some tests

## License MIT
