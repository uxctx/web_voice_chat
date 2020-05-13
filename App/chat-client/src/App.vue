<template>
  <div class="container">
    <div class="card">
      <div class="card-body">
        <h4>{{title_text}}</h4>

        <p>
          {{title_text_e}}
          <button
            type="button"
            v-on:click="jmp_github"
            class="btn btn-outline-primary btn-sm"
          >jmp github</button>
        </p>
      </div>
    </div>

    <p></p>
    <!--input self info-->
    <div class="container" :style="show_main?'display:none':''">
      <form>
        <div class="form-group row">
          <label class="col-sm-1 col-form-label">Name</label>
          <div class="col-sm-3">
            <input type="text" v-model="input_self_name" class="form-control" value="张三" />
          </div>
          <button type="button" v-on:click="StartJoin" class="btn btn-primary col-sm-2">Join加入</button>
        </div>
      </form>
    </div>

    <!---->
    <div class="container" :style="show_main?'':'display:none'">
      <div class="row">
        <div class="col-sm-4">
          <div class="card">
            <div class="card-header">online user ({{ online_count }})</div>
            <div class="card-body">
              <ul class="list-group list-group-flush">
                <li class="list-group-item" v-for="item in room_users" :key="item.UserId">
                  <div class="row">
                    <div class="col-sm-3">
                      <img
                        :src="item.HeadImgUrl"
                        :class="item.SpeakIng?'list-chatitem-image list-chatitem-image-an':'list-chatitem-image'"
                      />
                    </div>
                    <div class="col-sm-9" style="font-size:14px">
                      <span>{{ item.UserName }}</span>
                      <div class="row">
                        <div class="col-sm-10">ip:{{ item.IP }}</div>
                        <div class="col-sm-2">
                          <div
                            :UserId="item.UserId"
                            v-on:click="SetPlay"
                            class="list-chatitem-playbtn"
                            :class="item.CanPlay?'list-chatitem-playbtn-y':'list-chatitem-playbtn-n'"
                            title="不播放它的语音 Do not play its voice"
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div class="col-sm-8">
          <div class="card">
            <!-- <div class="card-header">消息</div> -->
            <div class="card-body">
              <div style="height: 300px;" class="x-scrollbar">
                <div v-for="message in message_list" :key="message.id">
                  <div
                    v-if="message.type==0"
                    class="alert"
                    :class="message.alertclass"
                    role="alert"
                  >{{message.body}}</div>

                  <div v-if="message.type==1">{{message.body}}</div>
                </div>
              </div>
            </div>
            <hr />
            <div class="card-body text-center">
              <img src="./assets/img/mcf.svg" class="me_mcf" :class="me_SpeakIng?'me_mcf_an':''" />
            </div>
            <div class="card-body">
              <div class="row">
                <div class="col-sm-10">
                  <input
                    type="input"
                    class="form-control"
                    style="outline: none;"
                    placeholder="text message"
                    v-model="input_textmessage"
                    @keyup.enter="SendTextMessage"
                  />
                </div>
                <div class="col-sm-2">
                  <button
                    type="button"
                    v-on:click="SendTextMessage"
                    class="btn btn-secondary btn-sm"
                  >Send</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
//UserId UserName
//ip
import ChatService from "./ChatService.js";
class User {
  constructor(userId, userName) {
    this.UserId = userId;
    this.UserName = userName;
    this.IP = "0.0.0.0";
    this.HeadImgUrl = "";
    this.SpeakIng = true;
    this.CanPlay = true;
    this.LastSpeakTime = Date.now();
  }
}

class ui_message {
  constructor(type, body) {
    this.type = type;
    this.body = body;
    this.alertclass = "";
  }
}

export default {
  name: "chat-panel",
  data() {
    return {
      title_text: "低延迟语音聊天室",
      title_text_e: "not webrtc,Low latency,Voice chat in browser -test",
      room_users: [],
      online_count: 0,
      message_list: [],
      me_SpeakIng: false,
      input_textmessage: "",
      input_self_name: "李四",
      show_main: false
    };
  },
  mounted() {
    //console.log("start~");
    //this.cmain();

    var randomString = function(len) {
      len = len || 32;
      var $chars = "ABCDEFGHJKMNPQRSTWXYZ";
      var maxPos = $chars.length;
      var pwd = "";
      for (var i = 0; i < len; i++) {
        pwd += $chars.charAt(Math.floor(Math.random() * maxPos));
      }
      return pwd;
    };
    this.input_self_name = randomString(8);
  },
  created() {},
  methods: {
    showDanger(text) {
      let t = new ui_message(0, text);
      t.alertclass = "alert-danger";
      this.message_list.push(t);
    },
    showWarning(text) {
      let t = new ui_message(0, text);
      t.alertclass = "alert-warning";
      this.message_list.push(t);
    },
    showSuccess(text) {
      let t = new ui_message(0, text);
      t.alertclass = "alert-success";
      this.message_list.push(t);
    },

    Test: function() {
      var audioContext = window.AudioContext || window.webkitAudioContext;
      if (typeof audioContext == "undefined") {
        var str = "不支持 AudioContext，无法正常工作";
        console.error(str);
        this.showDanger(str);
        return false;
      }
      if (window.WebAssembly == "undefined") {
        var str = "不支持 WebAssembly，无法正常工作";
        console.error(str);
        this.showDanger(str);
        return false;
      }
      return true;
    },

    cmain: function() {
      if (!this.Test()) {
        return;
      }
      var _this = this;
      this.chat = new ChatService(this.input_self_name);

      this.chat.UI_Error = function(err) {
        _this.showDanger("error:" + err);
      };
      this.chat.UI_Info = function(txt) {
        _this.showSuccess(txt);
      };

      setInterval(function() {
        var now = Date.now();
        for (var i = 0; i < _this.room_users.length; i++) {
          if (now - _this.room_users[i].LastSpeakTime > 500) {
            _this.room_users[i].SpeakIng = false;
          }
        }
      }, 300);

      this.chat.ON_UserSpeak = function(id) {
        for (var i = 0; i < _this.room_users.length; i++) {
          if (_this.room_users[i].UserId == id) {
            _this.room_users[i].SpeakIng = true;
            _this.room_users[i].LastSpeakTime = Date.now();
            return;
          }
        }
      };

      this.chat.OnTextMesage = function(id, message) {
        for (var i = 0; i < _this.room_users.length; i++) {
          if (_this.room_users[i].UserId == id) {
            let t = new ui_message(
              1,
              _this.room_users[i].UserName + " : " + message
            );
            _this.message_list.push(t);
            return;
          }
        }
      };

      this.chat.UI_MCF_S_CHANGE = function(vad) {
        if (_this.me_SpeakIng != vad) _this.me_SpeakIng = vad;
      };

      this.chat.OnUserlist = function(list) {
        //console.log("OnUserlist" + JSON.stringify(list));
        _this.room_users.length = 0;
        list.forEach(function(value, key) {
          //console.log("list.forEach" + JSON.stringify(index));
          var u = new User();
          u.UserId = value.ID;
          u.UserName = value.Name;
          u.IP = value.IP;
          u.HeadImgUrl = value.HeadImgUrl;
          u.CanPlay = true;
          u.SpeakIng = false;
          _this.room_users.push(u);
          _this.online_count++;
        });
      };

      this.chat.OnJoinLeaveUser = function(user, is_join) {
        if (is_join == true) {
          for (var i = 0; i < _this.room_users.length; i++) {
            if (_this.room_users[i].UserId == user.ID) {
              return;
            }
          }
          var u = new User();
          u.UserId = user.ID;
          u.UserName = user.Name;
          u.IP = user.IP;
          u.HeadImgUrl = user.HeadImgUrl;
          u.CanPlay = true;
          u.SpeakIng = false;
          _this.room_users.push(u);
          _this.online_count++;
          let t = new ui_message(1, user.Name + " join .");
          _this.message_list.push(t);
        } else {
          for (var i = 0; i < _this.room_users.length; i++) {
            if (_this.room_users[i].UserId == user.ID) {
              _this.room_users.splice(i, 1);
              _this.online_count--;
              let t = new ui_message(1, user.Name + " leave .");
              _this.message_list.push(t);
              return;
            }
          }
        }
      };

      //----------start run------------
      this.chat.Main();
    },
    StartJoin: function() {
      this.show_main = true;
      this.cmain();
    },
    SendTextMessage: function() {
      if (this.input_textmessage.length > 0) {
        this.chat.SendTextMessage(this.input_textmessage);
        this.input_textmessage = "";
      }
    },
    jmp_github: function() {
      //console.log("jmp_github");
      window.open(Config.github_url);
    },
    SetPlay: function(event) {
      var _this = this;
      let _userid = event.target.getAttribute("UserId");
      if (!_userid) return;

      this.room_users.forEach(function(item, index) {
        if (item.UserId == _userid) {
          item.CanPlay = !item.CanPlay;
          _this.chat.SetCPlay(item.UserId, item.CanPlay);
        }
      });
    }
  }
};
</script>

<style>
html body {
  margin: 20px 10px 10px 10px;
  font-family: "Consolas", "Courier New", Courier, monospace;
}

.form-control:focus,
.btn:focus {
  outline: none;
  box-shadow: none;
}

.me_mcf {
  height: 70px;
  width: 70px;
  border-radius: 35px;
  background-color: rgb(238, 237, 237);
  padding: 10px;
}
.me_mcf_an {
  animation: mcf_yan 0.4s linear infinite alternate;
  background-color: rgb(215, 245, 215);
}
@keyframes mcf_yan {
  0% {
    box-shadow: 0px 0px 4px 4px rgb(99, 231, 99);
  }
  100% {
    box-shadow: 0px 0px 8px 12px rgb(101, 208, 101);
  }
}

.list-chatitem-image {
  height: 55px;
  width: 55px;
  border-radius: 27px;
  margin-right: 5px;
  /* box-shadow: 0px 0px 7px 5px rgba(6, 155, 6, 0.733); */
}

.list-chatitem-image-an {
  animation: list-chatitem-image-ankes 0.5s linear infinite alternate;
}

@keyframes list-chatitem-image-ankes {
  0% {
    box-shadow: 0px 0px 4px 4px rgb(101, 208, 101);
  }
  100% {
    box-shadow: 0px 0px 7px 9px rgb(101, 208, 101);
  }
}

.micpimg {
  height: 20px;
  width: 20px;
}

.list-chatitem-playbtn {
  width: 30px;
  height: 30px;
  border-radius: 5px;
  cursor: pointer;
  border: 1px solid #d7d4d4;
  outline: none;
}
.list-chatitem-playbtn-y {
  background: url(./assets/img/speak.svg) center center no-repeat;
  background-size: 24px 24px;
}
.list-chatitem-playbtn-n {
  background: url(./assets/img/nospeak.svg) center center no-repeat;
  background-size: 24px 24px;
}

.x-scrollbar {
  overflow: auto;
}
.x-scrollbar::-webkit-scrollbar {
  width: 10px;
  height: 1px;
}

.x-scrollbar::-webkit-scrollbar-thumb {
  border-radius: 10px;
  -webkit-box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2);
  background: #d3d1d1;
}

.x-scrollbar::-webkit-scrollbar-track {
  -webkit-box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  background: #ffffff;
}
</style>
