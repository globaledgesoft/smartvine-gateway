#include <stdio.h>
#include <errno.h>
#include <fcntl.h>
#include <unistd.h>
#include <stdlib.h>
#include <string.h>
#include <poll.h>
#include <time.h>
#include <signal.h>
#include <pthread.h>

#include <sys/param.h>
#include <sys/uio.h>
#include <sys/types.h>
#include <sys/ioctl.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>

#include <bluetooth/bluetooth.h>
#include <bluetooth/hci.h>
#include <bluetooth/hci_lib.h>

#include "main.h"
#include "bt_scan.h"
#include "network.h"

int *RSSI_val = NULL;
int quitFlag = 0;
int count;
double temperature = 0; 
extern int flag;

FILE *fp = NULL;
unsigned int sleep_time = 0;
char gateway_id[64] = {'\0'};
unsigned int num_of_beacons = 0;
char server_ip[32] = {'\0'};
unsigned short int port = 0;
unsigned int buflen = 0;
void initTemperature();
void getTemperature();

void handleSIGINT(int signum)
{
	printf("\nGot Interrupted\n");
	if(signum == SIGINT) {
		quitFlag = 1;
	}
	exit(0);
}

void* get_data()
{
	signal(SIGINT, handleSIGINT);

	memset(RSSI_val, '\0', num_of_beacons);
	bt_start();
}

void *get_temperature()
{
	signal(SIGINT, handleSIGINT);
	printf("In get temp\n");
	temperature = 0;
	getTemperature();
}

int main()
{
	pthread_t th_id[2];
	char *buf = NULL;

	signal(SIGINT, handleSIGINT);

	fp = (FILE *) malloc(sizeof(FILE));
	if (NULL == fp) {
		perror("malloc ");
		exit(0);
	}

	buf = (char *) malloc(sizeof(char) * 4096);
	if (NULL == buf) {
		perror("malloc ");
		exit(0);
	}

	fp = fopen("./configure", "r+");
	if (NULL == fp) {
		perror("file open ");
		exit(0);
	}

	while(!feof(fp)) {
		fgets(buf, 4096, fp);
		
		sscanf(buf, "GATEWAY_ID %s", gateway_id);		
		sscanf(buf, "SLEEP_INTERVAL %d", &sleep_time);		
		sscanf(buf, "NUMBER_OF_BEACONS %d", &num_of_beacons);		
		sscanf(buf, "SERVER_IP %s", server_ip);		
		sscanf(buf, "SERVER_PORT %d", &port);		
		sscanf(buf, "BUFFER_LENGTH %d", &buflen);		
	}
	
	RSSI_val = (int *)malloc(sizeof(int) * num_of_beacons);
	if(NULL == RSSI_val) {
		perror("malloc ");
		exit(0);
	}

	initTemperature();

	if(0 != pthread_create(&th_id[0], NULL, get_data, NULL)) {
		perror("Thread creation failed : ");
		exit(0);
	}
	printf("Sleep for %d sec\n",sleep_time);	
	if(cloud_connect()) {
		while(!quitFlag) {
			getTemperature();
			if(!temp_cloud_send()) {
				printf("Failed to send data to server!\n");
				continue;
			}
			sleep(sleep_time);
		printf("Count : %d\n", count);
		}
	} else {
		printf("Failed to connect cloud server!\n");
	}
	printf("Count : %d\n", count);
	return 0;
}

