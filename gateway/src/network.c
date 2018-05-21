#include "main.h"
#include "network.h"
#include <stdlib.h>

extern int *RSSI_val;
extern double temperature;
extern int flag;

extern int num_of_beacons;
extern char server_ip[32];
extern char gateway_id[64];
extern int buflen;
extern short int port;

int sockfd;	
struct sockaddr_in servaddr;
socklen_t serv_len = sizeof(servaddr);
extern int count;
void create_ble_buffer(char *buf)
{
	cJSON *root = NULL;
	cJSON *device = NULL;
	cJSON *beacon = NULL;
	int i = 0;
	char cDevId[64] = {'\0'};
	int *val = RSSI_val;

	device = malloc(sizeof(cJSON *) * num_of_beacons);
	root = cJSON_CreateObject();
	cJSON_AddStringToObject(root, "gatewayId", gateway_id);
	cJSON_AddStringToObject(root, "deviceType", BEACON_DEV_TYPE);
	device =  cJSON_CreateArray();

	cJSON_AddItemToObject(root, "beaconValues", device);

//	for(i = 0; i < num_of_beacons; i++)	{
		i =2;
		cJSON_AddItemToObject(device, NULL, beacon = cJSON_CreateObject());
		sprintf(cDevId, "%d", i+1);
		cJSON_AddStringToObject(beacon, "beaconId", cDevId);
		cJSON_AddNumberToObject(beacon, "rssi", val[i]);
		beacon++;
//	}

	strcpy(buf, cJSON_Print(root));
	printf("%s\n", buf);
}

void create_sensor_buffer(char *buf)
{
	cJSON* root = NULL;
	char temp_val[16] = {'\0'};
	
	sprintf(temp_val, "%.2f", temperature);	
	root = cJSON_CreateObject();

	cJSON_AddStringToObject(root, "gatewayId", gateway_id);
	cJSON_AddStringToObject(root, "deviceType", TEMPERATURE_DEV_TYPE);
	cJSON_AddStringToObject(root, "temperature", temp_val);

	strcpy(buf, cJSON_Print(root));
	printf("%s\n", buf);
}

int cloud_connect()
{
	servaddr.sin_family = AF_INET;
	servaddr.sin_addr.s_addr = inet_addr(server_ip);
	servaddr.sin_port = htons(port);
	printf("IP : %s Port : %d\n", server_ip, port);	
	if ((sockfd = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP)) == -1) {
		perror("Error while creating socket:");
		return -1;
	}
	return 1;
}

int ble_cloud_send()
{
	char *buf = NULL;
	int len = -1;
	
	buf = malloc(sizeof(char) * buflen);

	memset(buf, '\0', buflen);
	create_ble_buffer(buf);
	if ((len = sendto(sockfd, buf, strlen(buf), 0, (struct sockaddr *)&servaddr, serv_len)) == -1) {
		perror("send:");
		return -1;
	}

	return len;
}

int temp_cloud_send()
{
	char *buf = NULL;
	int len = -1;
	
	buf = malloc(sizeof(char) * buflen);

	memset(buf, '\0', buflen);

	if (flag > 0) {
		create_sensor_buffer(buf);

		if ((len = sendto(sockfd, buf, strlen(buf), 0, (struct sockaddr *)&servaddr, serv_len)) == -1) {
			perror("send:");
			return -1;
		}
		count++;
	} else {
		printf("Temperature value not found\n");
	}
	
	return len;
}
