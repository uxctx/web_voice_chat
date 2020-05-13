package main

import (
	"fmt"
	"io/ioutil"
	"os"
	"strconv"
	"strings"
)

func main() {
	txpath:="/home/xxx/go_projects/mycode/bclient-ui/chat-client/static/tx/";
	dir, err := ioutil.ReadDir(txpath)
	if err!=nil{
		fmt.Println("ioutil.ReadDir errr")
		return
	}
	 tx_index:=0
	for _, fi := range dir {
		if fi.IsDir() { // 目录

		} else {

			ok := strings.HasSuffix(fi.Name(), ".jpg")
			if ok {
				tx_index_str := strconv.Itoa(tx_index)
				os.Rename(txpath+fi.Name(), txpath+tx_index_str+".jpg")
				tx_index++
				fmt.Println(fi.Name())
			}else{
				fmt.Println("not jpg??"+fi.Name())
			}
		}
	}
}
