package main

import (
	"encoding/json"
	"log"
)

type RoomInfo struct {
	Name string `json:"Name"`
	ID   uint32 `json:"ID"`
}

type BroadcastMsg struct {
	CreateID uint32
	Data     []byte
}

type Room struct {
	info RoomInfo
	//UsersRW    sync.RWMutex
	Users      map[*ChatUser]bool
	BroadcastC chan *BroadcastMsg

	Register   chan *ChatUser
	Unregister chan *ChatUser
	ShutDown   chan uint32
}

func NewRoom(name string, id uint32) *Room {
	return &Room{
		info:       RoomInfo{Name: name, ID: id},
		Users:      make(map[*ChatUser]bool),
		BroadcastC: make(chan *BroadcastMsg),
		Register:   make(chan *ChatUser),
		Unregister: make(chan *ChatUser),
		ShutDown:   make(chan uint32),
	}
}

func (room *Room) GetUserlistJson() []byte {
	tmplist := []*ChatUserInfo{}
	//room.UsersRW.RLock()
	for k, _ := range room.Users {
		tmplist = append(tmplist, k.info)
	}
	//room.UsersRW.RUnlock()

	jsonbyte, err := json.Marshal(tmplist)
	if err != nil {
		log.Println("GetUserlistJson json.Marshal(tmplist) error")
		return []byte{}
	}
	return jsonbyte
}

var main_room *Room

func (room *Room) RoomLoop() {
	defer func() {
		close(room.BroadcastC)
		close(room.Register)
		close(room.Unregister)
		close(room.ShutDown)

		log.Println("RoomLoop end")
	}()

	for {
		select {
		case user, ok := <-room.Register:
			if !ok {
				log.Println("<-room.Register: error")
				break
			}
			user.JoinRoom = room

			log.Println("room.Register " + user.info.Name)

			//room.UsersRW.Lock()
			room.Users[user] = true
			//room.UsersRW.Unlock()

			jsonbyte, err := json.Marshal(user.info)
			if err != nil {
				log.Println("jsonbyte, err :=json.Marshal error")
				continue
			}

			//主动发送一份用户列表
			user.SendMessageC <- MakeBinaryMessage(CMD_ROOM_USERLIST_RESPONSE, ID_SYSTEM,
				user.JoinRoom.GetUserlistJson())

			join_msg := MakeBinaryMessage(CMD_ROOM_USER_JOIN_MESSAGE, ID_SYSTEM, jsonbyte)
			for k, _ := range room.Users {
				k.SendMessageC <- join_msg
			}
		case user, ok := <-room.Unregister:
			if !ok {
				log.Println("<-room.Unregister: error")
				break
			}
			user.JoinRoom = nil
			//room.UsersRW.Lock()
			delete(room.Users, user)
			//room.UsersRW.Unlock()
			log.Println("room.Unregister " + user.info.Name)
			jsonbyte, err := json.Marshal(user.info)
			if err != nil {
				log.Println("jsonbyte, err :=json.Marshal error")
				continue
			}

			leave_msg := MakeBinaryMessage(CMD_ROOM_USER_LEAVE_MESSAGE, ID_SYSTEM, jsonbyte)
			for k, _ := range room.Users {
				k.SendMessageC <- leave_msg
			}

		case <-room.ShutDown:
			log.Println("room.ShutDown" + room.info.Name)
			for k, _ := range room.Users {
				k.Socket.Close()
			}
			break
		case broadcastMsg, ok := <-room.BroadcastC:
			if !ok {
				log.Println("<-room.BroadcastC: error")
				break
			}
			for k, _ := range room.Users {
				if k.info.ID == broadcastMsg.CreateID {
					continue
				}
				k.SendMessageC <- broadcastMsg.Data
			}
		}
	}
}
