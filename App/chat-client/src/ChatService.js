import MCPAudioSource from "./MCPAudioSource.js"

const CMD_USER_LOGIN_SELF_INFO = 11;

//房间进入离开消息
const CMD_ROOM_USER_JOIN_MESSAGE = 21;
const CMD_ROOM_USER_LEAVE_MESSAGE = 22;

//用户发送消息 文本   语音
const CMD_USER_MESSAGE_TEXT = 31;
const CMD_USER_MESSAGE_VOICE = 32;

//const CMD_ROOM_USERLIST_REQUEST = 101;
const CMD_ROOM_USERLIST_RESPONSE = 102;

const ID_SYSTEM = 0

const INPUT_SAMPLES = 320;

function String2ArrayBuffer(str, cb) {
  var b = new Blob([str]);
  var f = new FileReader();
  f.onload = function (e) {
    cb(e.target.result);
  }
  f.readAsArrayBuffer(b);
}

function Buffer2String(array, cb) {
  var blob = new Blob([array]);
  var reader = new FileReader();
  reader.readAsText(blob, 'utf-8');
  reader.onload = function (e) {
    cb(reader.result)
  }
}

function PlayItem() {
  var _this = this;
  this.pcm_play = new PlayPcm(INPUT_SAMPLES, 256);
  this.silken_dctx = new SilkDecode();
  this.silken_dctx.on_floatpcm_data = function (floatpcmarr) {
    _this.pcm_play.postPcm(floatpcmarr);
  }
}

PlayItem.prototype.postSilkData = function (silkbuff) {
  this.silken_dctx.postSilkData(silkbuff)
}

function PlayFunction() {
  var _this = this;
  this.paly_map = {};
}

PlayFunction.prototype.SetCPlay = function (id, can) {
  id = (id).toString();
  var _play = this.paly_map[id];
  if (_play == undefined) {
    _play = new PlayItem();
    this.paly_map[id] = _play;
  }
  _play.can = can;
}

PlayFunction.prototype.Play = function (id, silkbuff) {
  id = (id).toString();
  var _play = this.paly_map[id];
  if (_play == undefined) {
    _play = new PlayItem();
    _play.can = true;
    this.paly_map[id] = _play;
  } else {
    if (_play.can == false)
      return;
  }

  _play.postSilkData(silkbuff);
}

PlayFunction.prototype.Delete = function (id) {
  id = (id).toString();
  var _play = this.paly_map[id];
  if (_play != undefined) {
    _play.pcm_play.disponse();
    _play.silken_dctx.disponse();
    this.paly_map[id] = undefined;
  }
}

var wasm_init = false;
self.Module.onRuntimeInitialized = function () {
  wasm_init = true;
}

export default class ChatService {
  constructor(name) {
    this.u_name = name;
    this.run = 0;
    this.mcp_source = new MCPAudioSource();


    this.UI_Info = function () {
    }

    this.UI_Error = function () {
    }

    this.UI_MCF_S_CHANGE = function (vad) {
    }

    this.ON_UserSpeak = function (id) {
    }

    this.UI_MCP_IN = false;

    this.conn_good = false;

    this.playfun = new PlayFunction();

  }

  SetCPlay(id, can) {
    this.playfun.SetCPlay(id, can)
  }

  MCPSilkData(vad, buff) {
    if (vad != this.UI_MCP_IN) {
      this.UI_MCP_IN = vad;
      this.UI_MCF_S_CHANGE(vad);
    }
    if (vad == true) {
      this.SendVoiceMessage(buff);
    }

  }

  Main() {
    var _this = this;
    if (wasm_init == true)
      _this._Main();
    else
      console.error("wasm not load")
  }

  _Main() {
    var _this = this;
    _this.mcp_source.OnSilkData = function (vad, buff) {
      _this.MCPSilkData(vad, buff);
    };
    _this.mcp_source.EnableMicrophone(function (ok, msg) {
      if (!ok) {
        _this.UI_Error(msg);
        return;
      }
      _this.ConnServer();
    });
  }


  makeSendMessage(cmd, data) {
    var buff = new Uint8Array(1024 * 2)
    var u32 = new Uint32Array(buff.buffer);
    u32[0] = cmd;
    buff.set(data, 4)
    if (this.conn_good == true)
      this.conn.send(buff.subarray(0, 4 + data.length))
  }

  sendTextMessageByCmd(cmd, text) {
    var _this = this;
    String2ArrayBuffer(text, function (buf) {
      var u8 = new Uint8Array(buf);
      _this.makeSendMessage(cmd, u8);
    })
  }

  SendTextMessage(text) {
    this.sendTextMessageByCmd(CMD_USER_MESSAGE_TEXT, text);
  }

  SendVoiceMessage(vioce) {
    this.makeSendMessage(CMD_USER_MESSAGE_VOICE, vioce);
  }

  OnVoiceMesage(create_id, bu8body) {
    this.playfun.Play(create_id, bu8body);
    if (this.ON_UserSpeak)
      this.ON_UserSpeak(create_id);
  }

  ConnServer() {
    //var ws_host = "ws://" + document.location.host + "" + "/chat_ws";
    this.conn = new WebSocket(Config.ws_host);
    var _this = this;
    this.conn.binaryType = "arraybuffer";
    this.conn.onopen = function () {
      //console.log("ws conn.onopen")
      _this.UI_Info("success connected to server");
      _this.conn_good = true;
      var uinfo = {Name: _this.u_name};
      var u_json = JSON.stringify(uinfo)
      _this.sendTextMessageByCmd(CMD_USER_LOGIN_SELF_INFO, u_json);

    }

    this.conn.onclose = function (evt) {
      _this.conn_good = false;
      _this.UI_Error("Disconnect from server");

    };

    this.conn.onmessage = function (e) {
      var bu8 = new Uint8Array(e.data);
      var sbu8 = new Uint8Array(8);
      sbu8.set(bu8.subarray(0, 8));
      var bu32 = new Uint32Array(sbu8.buffer);

      var cmd = bu32[0];
      var create_id = bu32[1];
      var bu8body = bu8.subarray(8, bu8.length);

      //console.log("cmd " + cmd + "  create_id " + create_id + " data_len " + (bu8.length - 8))

      switch (cmd) {
        case CMD_USER_MESSAGE_VOICE:
          if (_this.OnVoiceMesage)
            _this.OnVoiceMesage(create_id, bu8body)
          break;
        case CMD_ROOM_USER_JOIN_MESSAGE:
        case CMD_ROOM_USER_LEAVE_MESSAGE:
          Buffer2String(bu8body, function (text) {
            var user = JSON.parse(text);
            if (cmd == CMD_ROOM_USER_LEAVE_MESSAGE) {
              _this.playfun.Delete(user.ID);
            }
            if (_this.OnJoinLeaveUser)
              _this.OnJoinLeaveUser(user, cmd == CMD_ROOM_USER_JOIN_MESSAGE ? true : false)
          })
          break;
        case CMD_USER_MESSAGE_TEXT:
          Buffer2String(bu8body, function (text) {
            if (_this.OnTextMesage)
              _this.OnTextMesage(create_id, text)
          })
          break;
        case CMD_ROOM_USERLIST_RESPONSE:
          Buffer2String(bu8body, function (text) {
            var list = JSON.parse(text);
            if (_this.OnUserlist)
              _this.OnUserlist(list)
          });

          break;
      }
    };
  }
}

