const INPUT_SAMPLERATE = 16000;
const MCF_ScriptProcessor_SIZE = 256;
self.Module = {};


function MCPAudioSource() {
  this.silken_ectx = {};
}

MCPAudioSource.prototype.OnSilkData = function (e) {
}

MCPAudioSource.prototype.EnableMicrophone = function (cb) {
  var _this = this;
  navigator.mediaDevices.getUserMedia({audio: true}).then(
    function (stream) {
      cb(true);

      //Silk编码
      _this.silken_ectx = new SilkEncode(MCF_ScriptProcessor_SIZE);

      _this.silken_ectx.on_silkdata = function (vad, out_buff) {
        _this.OnSilkData(vad, out_buff)
      };


      var audioContext = window.AudioContext || window.webkitAudioContext;
      var audio_context = new audioContext({sampleRate: INPUT_SAMPLERATE});
      var audioInput = audio_context.createMediaStreamSource(stream);

      var scriptProcess;
      var gain_node = audio_context.createGain();
      audioInput.connect(gain_node);

      try {
        scriptProcess = audio_context.createScriptProcessor(MCF_ScriptProcessor_SIZE, 1, 1);
      } catch (error) {
        console.error("createScriptProcessor error");
        return;
      }

      scriptProcess.onaudioprocess = function (e) {
        var float32pcm = e.inputBuffer.getChannelData(0);
        _this.silken_ectx.postFloat32Pcm(float32pcm);
      };

      audioInput.connect(scriptProcess);
      scriptProcess.connect(audio_context.destination);
    }
  ).catch(function (error) {
    cb(false, '打开麦克风失败 mediaDevices.getUserMedia:' + (error.code || error.name));
    switch (error.code || error.name) {
      case 'PERMISSION_DENIED':
      case 'PermissionDeniedError':
        console.error('用户拒绝提供信息。');
        break;
      case 'NOT_SUPPORTED_ERROR':
      case 'NotSupportedError':
        console.error('浏览器不支持硬件设备。');
        break;
      case 'MANDATORY_UNSATISFIED_ERROR':
      case 'MandatoryUnsatisfiedError':
        console.error('无法发现指定的硬件设备。');
        break;
      default:
        console.error('无法打开麦克风。异常信息:' + (error.code || error.name));
        break;
    }
  });
}

export default MCPAudioSource;
