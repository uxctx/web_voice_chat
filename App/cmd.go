package main

import (
	"bytes"
	"encoding/binary"
)

const (
	CMD_USER_LOGIN_SELF_INFO = 11

	//房间进入离开消息
	CMD_ROOM_USER_JOIN_MESSAGE  = 21
	CMD_ROOM_USER_LEAVE_MESSAGE = 22

	//用户发送消息 文本 或者  语音
	CMD_USER_MESSAGE_TEXT  = 31
	CMD_USER_MESSAGE_VOICE = 32

	CMD_ROOM_USERLIST_REQUEST  = 101
	CMD_ROOM_USERLIST_RESPONSE = 102

	CMD_SERVER_RESPONSE_ERROR_MESSAGE  = 999
)
const
(
	//uint32 max
	ID_SYSTEM = 0
)

/*
[uint32(cmd)|uint32(create_id)|data([]byte)]
*/
//简单的封装从服务器发出去的消息
func MakeBinaryMessage(cmd uint32, id uint32, _data []byte) []byte {
	bytebuf := bytes.NewBuffer([]byte{})
	binary.Write(bytebuf, binary.LittleEndian, cmd)
	binary.Write(bytebuf, binary.LittleEndian, id)

	bytebuf.Write(_data)

	return bytebuf.Bytes()
}

//简单的读取从客户端发来的消息
func ReadBinaryMssage(in_data []byte) (cmd uint32, bodydata []byte) {
	bytebuf := bytes.NewBuffer(in_data)
	var _cmd uint32

	binary.Read(bytebuf, binary.LittleEndian, &_cmd)

	return _cmd, in_data[4:]
}