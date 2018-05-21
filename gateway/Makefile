all : bt_scan

bt_scan : src/*.c
	@gcc -o bt_scan src/*.c -I include -I. -lpthread -lrt /usr/lib/libbluetooth.so.3

clean :
	-rm bt_scan
