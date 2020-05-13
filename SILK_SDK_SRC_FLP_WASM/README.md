## silk 

* sikl 是什么

sikl 是skype开源的音频编解码器。类似aac mp3。

*  sikl 编码器的特点是什么

为低采样率通话设计。
低延迟，最小编码延迟为20ms。
可在udp丢包环境下运行，丢包处理方式为丢弃掉坏的帧，从缓冲区里重新找最新的帧，保障实时，解码只需要单独帧。


## silk wasm

* silk_wasm.c

websocket不会丢包，所以不用考虑丢包问题。

## abuot vad

语音活动检测(Voice Activity Detection,VAD)

```
 in silk_wasm.c

 short silk_encode_float32(silk_encode_ctx *_ectx, float *input_floatpcm, int in_samples, unsigned char *out_silk, int max_out_byte)

return -2 vad

vad link:
https://github.com/cpuimage/WebRTC_VAD/

```

## Build 

``` bash
#Install emscripten before -> https://emscripten.org/

cd .

source you_emscripten_path/emsdk_env.sh

emcmake cmake .

emmake make 

-------out put--------
silk_wasm.js 
silk_wasm.wasm

```



## silk_wrap.js

简单的封装 编解码器

```
function SilkEncode 
function SilkDecode

/* 
在浏览器流畅播放float pcm buffer
Play float pcm buffer smoothly in the browser
*/
function PlayPcm
```

