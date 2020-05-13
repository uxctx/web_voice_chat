package main

import (
	"encoding/json"
	"github.com/gorilla/websocket"
	"log"
	"math/rand"
	"net/http"
	"strconv"
	"sync/atomic"
	"time"
)

type ChatUserInfo struct {
	Name       string `json:"Name"`
	ID         uint32 `json:"ID"`
	IP         string `json:"IP"`
	HeadImgUrl string `json:"HeadImgUrl"`
}

type ChatUser struct {
	info         *ChatUserInfo
	JoinRoom     *Room
	Socket       *websocket.Conn
	SendMessageC chan []byte
}

func (user *ChatUser) MessageHandle(messagebyte []byte) {
	cmd, bodybyte := ReadBinaryMssage(messagebyte)

	switch cmd {
	case CMD_USER_LOGIN_SELF_INFO:
		var _info ChatUserInfo
		if err := json.Unmarshal(bodybyte, &_info); err != nil {
			log.Println("CMD_USER_LOGIN_SELF_INFO json error")
			return
		}
		if len(_info.Name) == 0 {
			log.Println("CMD_USER_LOGIN_SELF_INFO name null")
			user.Socket.Close()
			return
		}
		user.info.Name = _info.Name

		rand.Seed(time.Now().Unix())
		randNum := rand.Intn(99-0) + 0
		randNumStr := strconv.Itoa(randNum)
		head_img := "/static/tx/" + randNumStr + ".jpg"
		user.info.HeadImgUrl = head_img

		log.Println("CMD_USER_LOGIN_SELF_INFO name:" + user.info.Name)
		main_room.Register <- user

	//case CMD_ROOM_USERLIST_REQUEST:
	//这个消息改为从room Register主动发
	//if user.JoinRoom != nil {
	//	user.SendMessageC <- MakeBinaryMessage(CMD_ROOM_USERLIST_RESPONSE, ID_SYSTEM,
	//		user.JoinRoom.GetUserlistJson())
	//}
	case CMD_USER_MESSAGE_TEXT:
		if user.JoinRoom != nil {
			data := MakeBinaryMessage(CMD_USER_MESSAGE_TEXT, user.info.ID, bodybyte)
			user.JoinRoom.BroadcastC <- &BroadcastMsg{ID_SYSTEM, data}
		}
	case CMD_USER_MESSAGE_VOICE:
		if user.JoinRoom != nil {
			data := MakeBinaryMessage(CMD_USER_MESSAGE_VOICE, user.info.ID, bodybyte)
			user.JoinRoom.BroadcastC <- &BroadcastMsg{user.info.ID, data}
		}
	default:
		log.Println("error cmd~")
	}
}

func (user *ChatUser) UserReadLoop() {
	defer func() {
		if user.JoinRoom != nil {
			user.JoinRoom.Unregister <- user
		}
		user.Socket.Close()
		close(user.SendMessageC)
		log.Println("UserReadLoop end")
	}()

	user.Socket.SetReadLimit(1024 * 6)

	user.Socket.SetPongHandler(func(string) error {
		user.Socket.SetReadDeadline(time.Now().Add(readWait))
		return nil
	})

	for {
		user.Socket.SetReadDeadline(time.Now().Add(readWait))
		messageType, messageBytes, err := user.Socket.ReadMessage()
		if err != nil || messageType == websocket.CloseMessage {
			log.Printf("user.Socket.ReadMessage error: %v", err)
			break
		}
		user.MessageHandle(messageBytes)
	}
}

func (user *ChatUser) UserWriteLoop() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		user.Socket.Close()
		//close(user.SendMessageC)
		log.Println("UserWriteLoop end")
	}()

	for {
		select {
		case <-ticker.C:
			user.Socket.SetWriteDeadline(time.Now().Add(writeWait))
			if err := user.Socket.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		case message, ok := <-user.SendMessageC:
			user.Socket.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				return
			}
			err := user.Socket.WriteMessage(websocket.BinaryMessage, message)
			if err != nil {
				return
			}
		}
	}
}

var _atomic_id uint32 = 1

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024 * 2,
	WriteBufferSize: 1024 * 2,
	CheckOrigin: func(r *http.Request) bool {
		//允许跨域
		return true
	},
}

func serveWs(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}

	user := &ChatUser{
		info: &ChatUserInfo{
			Name:       "unknown",
			IP:         r.RemoteAddr,
			ID:         atomic.AddUint32(&_atomic_id, 1),
			HeadImgUrl: "static/tx/99.jpg",
		},
		Socket: conn,

		SendMessageC: make(chan []byte),
		JoinRoom:     nil,
	}

	if user.info.ID == ID_SYSTEM {
		user.info.ID = atomic.AddUint32(&_atomic_id, 1)
	}

	go user.UserReadLoop()
	go user.UserWriteLoop()
}
