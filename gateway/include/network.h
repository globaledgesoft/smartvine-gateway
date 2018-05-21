#ifndef _NETWORKING_H_
#define _NETWORKING_H_

#include <stdio.h>
#include <unistd.h>
#include <sys/stat.h>
#include <sys/socket.h>
#include <string.h>
#include <netinet/ip.h>

#include "cJSON.h"

void create_buffer(char *buf);

int cloud_connect();
int cloud_send();

#endif
