# chat-server

> 聊天室 websocket go server

```bash
main.go 
room.go [room loop]
chatuser.go [readloop writeloop]
cmd.go

use gorilla/websocket

>go get github.com/gorilla/websocket 
```

```bash
[protocol]

[javascript]
this.websocket.binaryType = "arraybuffer";


request [uint32(cmd)+byte[]]

response [uint32(cmd)+uint32(user_id)+byte[]]

----in cmd.go file---cmd list----
CMD_USER_LOGIN_SELF_INFO = 11
CMD_ROOM_USER_JOIN_MESSAGE  = 21
CMD_ROOM_USER_LEAVE_MESSAGE = 22
CMD_USER_MESSAGE_TEXT  = 31
CMD_USER_MESSAGE_VOICE = 32
CMD_ROOM_USERLIST_REQUEST  = 101
CMD_ROOM_USERLIST_RESPONSE = 102

```





