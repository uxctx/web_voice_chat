# chat-client

> 聊天室 vue ui



```bash

static/ 为静态目录

silk_wasm.js 

silk_wasm.wasm 

silk_wrap.js -> wrap [decode encode playpcm]

static/tx/ head imgs

```

## Build Setup

``` bash
# install dependencies
npm install

# serve with hot reload at localhost:8080
npm run dev

# build for production with minification
npm run build

cp -r ./dist/ ../
```



`# in index.html config`
```javascript
    self.Config = {
      ws_host: "ws://127.0.0.1:9090/chat_ws"
    }
```


