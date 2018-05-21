#include <stdio.h>
#include <stdlib.h>
#include <linux/i2c-dev.h>
#include <sys/ioctl.h>
#include <fcntl.h>
#include <math.h>
#include <unistd.h>
#include <errno.h>

extern double temperature;
int flag ;
extern int quitFlag;

static int file;
void initTemperature(void)
{
	// Create I2C bus
	char *bus = "/dev/i2c-3";

	if((file = open(bus, O_RDWR)) < 0) {
		printf("Failed to open the bus. \n");
		flag = -1;
	}

	// Get I2C device, BMP280 I2C address is 0x77(108)
	ioctl(file, I2C_SLAVE, 0x77);
	
}

void getTemperature(void) 
{

	// Select control measurement register(0xF4)
	// Normal mode, temp and pressure over sampling rate = 1(0x27)
	char config[2] = {0};

	char reg[1] = {0x88};
	char data[24] = {0};
	// Read 24 bytes of data from address(0x88)
	write(file, reg, 1);
	if(read(file, data, 24) != 24) {
		if (errno == EIO) {
			flag = -1;
		}
		//sleep(1);
		return;
	}
	// Convert the data
	// temp coefficent
	int dig_T1 = data[1] * 256 + data[0];
	int dig_T2 = data[3] * 256 + data[2];
	if(dig_T2 > 32767) {
		dig_T2 -= 65536;
	}

	int dig_T3 = data[5] * 256 + data[4];
	if(dig_T3 > 32767) {
		dig_T3 -= 65536;
	}
	
	config[0] = 0xF4;
	config[1] = 0x27;
	write(file, config, 2);

	// Select config register(0xF5)
	// Stand_by time = 1000 ms(0xA0)
	config[0] = 0xF5;
	config[1] = 0xA0;
	write(file, config, 2);
	//sleep(1);

	// Read 8 bytes of data from register(0xF7)
	// pressure msb1, pressure msb, pressure lsb, temp msb1, temp msb, temp lsb, humidity lsb, humidity msb
	reg[0] = 0xF7;
	write(file, reg, 1);
	if(read(file, data, 8) != 8) {
		if(errno == EIO){
			flag = -1;
		}
		//sleep(1);
		return;
	}
	
	// Convert temperature data to 19-bits
	long adc_t = (((long)data[3] * 65536) + ((long)data[4] * 256) + (long)(data[5] & 0xF0)) / 16;
		
	// Temperature offset calculations
	double var1 = (((double)adc_t) / 16384.0 - ((double)dig_T1) / 1024.0) * ((double)dig_T2);
	double var2 = ((((double)adc_t) / 131072.0 - ((double)dig_T1) / 8192.0) *(((double)adc_t)/131072.0 - ((double)dig_T1)/8192.0)) * ((double)dig_T3);
	double t_fine = (long)(var1 + var2);
	temperature = (var1 + var2) / 5120.0;
	flag = 1;
	
	//printf("Temperature in Celsius : %.2f C \n", temperature);
	//sleep(1);
}
