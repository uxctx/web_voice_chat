package main

import (
	"flag"
	"log"
	"net/http"
	"time"
)

const (
	writeWait  = 10 * time.Second
	readWait   = 120 * time.Second
	pingPeriod = 60 * time.Second
)

func main() {
	var addr = flag.String("addr", ":9090", "http service address")

	//vue编译
	http.HandleFunc("/dist/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, r.URL.Path[1:])
	})

	//其他静态
	http.HandleFunc("/static/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, r.URL.Path[1:])
	})

	http.HandleFunc("/chat_ws", func(w http.ResponseWriter, r *http.Request) {
		serveWs(w, r)
	})

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "assets/app.html")
	})

	//只一个房间
	main_room = NewRoom("大厅", 1)
	go main_room.RoomLoop()

	log.Println("start web socket server -> ", *addr)
	err := http.ListenAndServe(*addr, nil)
	if err != nil {
		log.Fatal("ListenAndServe error: ", err)
	}
}
