## web voice chat 

>浏览器低延迟语音通讯

在浏览器端低延迟语音通讯的尝试。

![img](https://github.com/uxctx/web_voice_chat/blob/master/cp.png)

#### 技术栈

* wasm c silk

* vue js

* golang 

* websocket

#### 项目结构 projects tree

```
#golang websocket server
./App/ 

#Browser Vue UI
./App/chat-client 

#silk wasm build wrap
./SILK_SDK_SRC_FLP_WASM

```

#### Build & Use

```bash
build

./App/README.md
./App/chat-client/README.md
./SILK_SDK_SRC_FLP_WASM/README.md

```


```bash
use

>git clone 
>cd App
>go get github.com/gorilla/websocket 
>go run *.go

open http://:9090

```

更好的体验
```
最好有耳机，因为没有做回音消除

测试最好是多台电脑，不然实际情况是，两个浏览器tab相互发数据
```

## 实时音频通讯相关


#### 低延迟从哪里开始计算？

* 麦克风采集延迟

从麦克风采集也是有延迟的，一般需提供一个缓冲区给系统采集接口，这个缓冲区的大小，也就是最开始的采集延迟大小。
在浏览器端，为createScriptProcessor的buffer参数大小。

* 编码解码延迟

音频是没有帧的概念，就是pcm流，但编码器有单次编码的大小的概念，就是音频帧。

编解码延迟是实时通讯的关键。silk提供最小20ms的帧大小，意思就是以20ms时间内的所有采集样本为一个帧。

像是libfaac 的aac-lc编码，在16000采样率下最小编码帧为1024，那么它的延迟就是64ms，但libfaac是需要预先帧，要输入好几帧之后才会有输出，并不是单次编码，所以延迟是64*(2~)。

在实际情况中往往延迟会比理论延迟更高，比如浏览器的createScriptProcessor buffer和编码器的输入buffer不等大小，需要重新去组装。

选择一个合适的编解码对音频实时通讯是很有必要的。

* 网络传输延迟

在实际音视频实时通讯，基本都是基于udp，因tcp有一定延迟。但udp会丢包。

如若是在udp上建立可靠的协议，需要在发送和接收端要定义一个缓冲区，当udp包序号不对，就需要重传。

但实际处理往往更复杂，如若你请求重传的包丢了，或者是继续重传数据还是丢了。在复杂情况就会导致发送缓冲区阻塞，以至于通讯延迟。

可以去参考 [kcp](https://github.com/skywind3000/kcp)和quic。

`在单纯的音频通话急需要实时的情况下，udp丢包，可以不管。如若你需要重传，在很差网络下重传造成的后续效应很不划算的。应该是在缓冲区里，直接找最新的完整包，坏掉的包直接丢掉`。

但是在视频通讯里，实时编码的帧一般都很大，`所以实时视频通讯可以考虑在udp上建立可靠协议，不然很多视频包都不是完好的包,花屏严重`。

websocket是tcp上的协议，不会丢包，所以不用考虑。

* 其它延迟
 


#### 浏览器编解码

浏览器是没有自带的编码器的，可以对部分格式解码。

但浏览器支持wasm，可以将c/c++或者其他语言的代码编译为WebAssembly给js提供调用。

https://emscripten.org/


#### silk vs aac-ld vs pcm

 aac-ld也是低延迟音频通讯的一个选择，但是aac-ld libfdkaac编码器体积很大，编译为wasm差不多1m，远大于silk。，而且libfdkaac-ld的编码延迟大于silk。

 虽然aac-ld也是属于aac编码，但和aac-lc不同，不能存为aac文件，只能是流格式，浏览器支持不好，只能存在于m4a之类的mp4文件里。

 单纯的传pcm流，可以吗，可以，但是pcm流的数据实在是太大了，就算是低采样下的pcm流也很大。

 #### 实时音频通话相关的技术

- VAD  语音活动检测。检测是否是有效音频，一般可以判断人是否在说话。

- AECM AEC 自适应回声消除

- NS 降噪

- AGC 自动增益控制

  等等


在这个项目中，勉强使用了[vad](https://github.com/cpuimage/WebRTC_VAD)来减少websocket传输的流量。



#### 为什么不中意webrtc？

首先webrtc的代码真的很强，集齐了N多音视频通讯相关的技术。

但是webrtc的设计概念稍微复杂，很少有性能比较强支持完善的开源webrtc服务器。`你要在webrtc上做优秀和更灵活接口的产品，很难`。

zoom是全球出名的视频会议产品，它在web端就没有用webrtc，而是wasm+websocket，虽然效果不理想，占用cpu很高，但至少说明了，wasm也是可以一定程度上做webrtc的部分事情。







