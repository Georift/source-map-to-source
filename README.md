## source-map-to-source

Small cli tool to extract the original source code from a source map file.

### Usage
```
npx source-map-to-source <source map file>
```

Files will be output to a directory along side with the name `./<source map file>-sources/`,
but this can be configured with `--output` if required.