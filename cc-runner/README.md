# node-cc-runner

Client for [Closure Compiler web runner](https://github.com/monai/cc-web-runner).

## Install

`npm install cc-runner`

## Usage

```js
var runner = require('cc-runner');
var compiler = runner.create();

compiler.on('listening', () => {
  compiler.status((error, res) => {
    console.log(res);
  });

  compiler.compile({
    optimizations: {
      level: "SIMPLE_OPTIMIZATIONS"
    },
    sources: [{
      fileName: 'bar.js',
      code: '(console.log(function(){return 42-9;}));'
    }]
  }, (error, res) => {
    console.log(res);
  });
});
```

## API

### create()

Returns compiler instance. Compiler is EventEmitter.

### compiler

#### Event: 'online'

Emitted when Closure Compiler child process is started.

#### Event: 'listening'

Emitted when Closure Compiler runner server is listening for connections.

#### Event: 'error'

Forwards all errors.

#### compiler.status(options, callback)

Options:

- `level` String - is of type [CompilationLevel](https://github.com/google/closure-compiler/blob/29bbd198f0bf4967e4f406674b3eaf302a1f16a4/src/com/google/javascript/jscomp/CompilationLevel.java), compilation level
- `debug` Boolean - whether to call `setDebugOptionsForCompilationLevel`
- `typeBased` Boolean - whether to call `setTypeBasedOptimizationOptions`
- `wrappedOutput` Boolean - whether to call `setWrappedOutputOptimizations`

Callback arguments:

- `error`
- `object`
  - `options` Object - is of type [CompilerOptions](https://github.com/google/closure-compiler/blob/v20160208/src/com/google/javascript/jscomp/CompilerOptions.java), compiler options
  - `compilerVersions` String - Closure Compiler version

#### compile.externs(callback)

Callback arguments:

- `error`
- `object`
  - `externs` Array - is of type List&lt;[SourceFile](https://github.com/google/closure-compiler/blob/master/src/com/google/javascript/jscomp/SourceFile.java)&gt;, array of extern files

#### compiler.compile(data, callback)

Data:

- `externs` Array - `[{ fileName: String, code: String }]`, array of extern files
- `sources` Array - `[{ fileName: String, code: String }]`, array of source files to compile
- `optimizations`
  - `level` String - is of type [CompilationLevel](https://github.com/google/closure-compiler/blob/29bbd198f0bf4967e4f406674b3eaf302a1f16a4/src/com/google/javascript/jscomp/CompilationLevel.java), compilation level
  - `debug` Boolean - whether to call `setDebugOptionsForCompilationLevel`
  - `typeBased` Boolean - whether to call `setTypeBasedOptimizationOptions`
  - `wrappedOutput` Boolean - whether to call `setWrappedOutputOptimizations`
- `options` Object - is of type [CompilerOptions](https://github.com/google/closure-compiler/blob/v20160208/src/com/google/javascript/jscomp/CompilerOptions.java), compiler options

Callback arguments:

- `error`
- `object`
  - `result` Object - is of type [Result](https://github.com/google/closure-compiler/blob/v20160208/src/com/google/javascript/jscomp/Result.java), compilations results
  - `source` String - compiled source
  - `status` String - SUCCESS|ERROR
  - `message` String - error message if status is 'ERROR'
  - `exception` Object - is of type Throwable, occurred exception

#### compiler.kill()

Kill Closure Compiler child process.

## License

ISC
