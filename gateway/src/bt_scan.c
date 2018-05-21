#include <stdio.h>
#include <errno.h>
#include <fcntl.h>
#include <unistd.h>
#include <stdlib.h>
#include <string.h>
#include <poll.h>
#include <time.h>

#include <sys/param.h>
#include <sys/uio.h>
#include <sys/types.h>
#include <sys/ioctl.h>
#include <sys/socket.h>

#include <bluetooth/bluetooth.h>
#include <bluetooth/hci.h>
#include <bluetooth/hci_lib.h>
//#include <lib/bluetooth.h>
#include "bt_scan.h"
#include "main.h"

extern int num_of_dev;
extern int *RSSI_val;
extern int quitFlag;

static void eir_parse_name(uint8_t *eir, size_t eir_len, char *buf, size_t buf_len)    
{                                                                         
        size_t offset;                                                    
                                                                          
        offset = 0;                                                       
        while (offset < eir_len) {                                        
                uint8_t field_len = eir[0];                               
                size_t name_len;                                          
                                                                          
                /* Check for the end of EIR */                  
                if (field_len == 0)                          
                        break;                
                                              
                if (offset + field_len > eir_len)     
                        goto failed;             
                                                    
                switch (eir[1]) {                                 
                case EIR_NAME_SHORT:                                            
                case EIR_NAME_COMPLETE:          
                        name_len = field_len - 1;     
                        if (name_len > buf_len)  
                                goto failed;     
                                                 
                        memcpy(buf, &eir[2], name_len);
                        return;                        
                }                                                      
                                                         
                offset += field_len + 1;               
                eir += field_len + 1;                  
        }                                              
                                                       
failed:                                                
        snprintf(buf, buf_len, "(unknown)");
}           

static uint8_t eir_parse_uuid(uint8_t *eir, size_t eir_len)
{                                                                         
        size_t offset;                                                    
                                                                          
        offset = 0;                                                  
        while (offset < eir_len) {                                             
                uint8_t field_len = eir[0];                                   
                size_t name_len;                                            
                                                    
                /* Check for the end of EIR */                 
                if (field_len == 0)                                    
                        break;                   
                                                      
                if (offset + field_len > eir_len)
                        goto failed;                
                                                     
                switch (eir[1]) {                                                      
                case EIR_UUID16_ALL:                                      
                        if (eir[2] == 0x12 && eir[3] == 0x12)                                                
                        	return 1;                                          
                }                                                                
                                                                       
                offset += field_len + 1;                                                                                            
                eir += field_len + 1;                        
        }                                         
                                                            
failed:                                       
	return 0; 
}


static uint8_t eir_parse_DevId(uint8_t *eir, size_t eir_len)
{                  
        size_t offset;
                 
        offset = 0;
        while (offset < eir_len) {
                uint8_t field_len = eir[0];
                size_t name_len;
                      
                /* Check for the end of EIR */
                if (field_len == 0)
                        break;
                                
                if (offset + field_len > eir_len)
                        goto failed;
                            
                switch (eir[1]) {
                case 0xFF:
			return eir[2];
                }                                                         
 
                offset += field_len + 1;
                eir += field_len + 1;
        }          
                                  
failed:                                    
        return 0;               
}


static int __other_bdaddr(int dd, int dev_id, long arg)
{
        struct hci_dev_info di = { .dev_id = dev_id };

        if (ioctl(dd, HCIGETDEVINFO, (void *) &di))
                return 0;

        if (hci_test_bit(HCI_RAW, &di.flags))
                return 0;

        return bacmp((bdaddr_t *) arg, &di.bdaddr);
}

static int __same_bdaddr(int dd, int dev_id, long arg)
{
        struct hci_dev_info di = { .dev_id = dev_id };

        if (ioctl(dd, HCIGETDEVINFO, (void *) &di))
                return 0;

        return !bacmp((bdaddr_t *) arg, &di.bdaddr);
}

/* HCI functions that do not require open device */
int hci_for_each_dev(int flag, int (*func)(int dd, int dev_id, long arg), long arg)
{
	struct hci_dev_list_req *dl;
	struct hci_dev_req *dr;
	int dev_id = -1;
	int i, sk, err = 0;

	sk = socket(AF_BLUETOOTH, SOCK_RAW | SOCK_CLOEXEC, BTPROTO_HCI);
	if (sk < 0)
		return -1;

	dl = malloc(HCI_MAX_DEV * sizeof(*dr) + sizeof(*dl));
	if (!dl) {
		err = errno;
		goto done;
	}

	memset(dl, 0, HCI_MAX_DEV * sizeof(*dr) + sizeof(*dl));

	dl->dev_num = HCI_MAX_DEV;
	dr = dl->dev_req;

	if (ioctl(sk, HCIGETDEVLIST, (void *) dl) < 0) {
		err = errno;
		goto free;
	}

	for (i = 0; i < dl->dev_num; i++, dr++) {
		if (hci_test_bit(flag, &dr->dev_opt))
			if (!func || func(sk, dr->dev_id, arg)) {
				dev_id = dr->dev_id;
				break;
			}
	}

	if (dev_id < 0)
		err = ENODEV;

free:
	free(dl);

done:
	close(sk);
	errno = err;

	return dev_id;
}

static int read_flags(uint8_t *flags, const uint8_t *data, size_t size)
{
        size_t offset;

        if (!flags || !data)
                return -EINVAL;

        offset = 0;
        while (offset < size) {
                uint8_t len = data[offset];
                uint8_t type;

                /* Check if it is the end of the significant part */
                if (len == 0)
                        break;

                if (len + offset > size)
                        break;

                type = data[offset + 1];

                if (type == FLAGS_AD_TYPE) {
                        *flags = data[offset + 2];
                        return 0;
                }

                offset += 1 + len;
        }

        return -ENOENT;
}


static int check_report_filter(uint8_t procedure, le_advertising_info *info)
{
        uint8_t flags;

        /* If no discovery procedure is set, all reports are treat as valid */
        if (procedure == 0)
                return 1;

        /* Read flags AD type value from the advertising report if it exists */
        if (read_flags(&flags, info->data, info->length))
                return 0;

        switch (procedure) {
        case 'l': /* Limited Discovery Procedure */
                if (flags & FLAGS_LIMITED_MODE_BIT)
                        return 1;
                break;
        case 'g': /* General Discovery Procedure */
                if (flags & (FLAGS_LIMITED_MODE_BIT | FLAGS_GENERAL_MODE_BIT))
                        return 1;
                break;
        default:
                fprintf(stderr, "Unknown discovery procedure\n");
        }

        return 0;
}


int hci_get_route(bdaddr_t *bdaddr)
{
        int dev_id;

        dev_id = hci_for_each_dev(HCI_UP, __other_bdaddr, (long) (bdaddr ? bdaddr : BDADDR_ANY));
        if (dev_id < 0)
                dev_id = hci_for_each_dev(HCI_UP, __same_bdaddr, (long) (bdaddr ? bdaddr : BDADDR_ANY));

        return dev_id;
}

void bt_callback(int8_t coachid, int8_t rssi)
{
	printf ("App: Coach Id %d, RSSI: %d\n", coachid, rssi);

}

void bt_start()
{
	pthread_t th;
	
	int dd, error;
	//if (dd < 0)
	     dd = hci_get_route(NULL);
	
	error = hci_open_dev(dd);
	
	if (error < 0)
		printf ("Could not open device\n");
	start_lescan(dd, bt_callback);
	//capture_data();
	
}

/* Open HCI device.
 * Returns device descriptor (dd). */
int hci_open_dev(int dev_id)
{
	struct sockaddr_hci a;
	int dd, err;

	/* Check for valid device id */
	if (dev_id < 0) {
		errno = ENODEV;
		return -1;
	}

	/* Create HCI socket */
	dd = socket(AF_BLUETOOTH, SOCK_RAW | SOCK_CLOEXEC, BTPROTO_HCI);
	if (dd < 0)
		return dd;

	/* Bind socket to the HCI device */
	memset(&a, 0, sizeof(a));
	a.hci_family = AF_BLUETOOTH;
	a.hci_dev = dev_id;
	if (bind(dd, (struct sockaddr *) &a, sizeof(a)) < 0)
		goto failed;

	return dd;

failed:
	err = errno;
	close(dd);
	errno = err;

	return -1;
}

int hci_close_dev(int dd)
{
	return close(dd);
}


int hci_le_set_scan_enable(int dd, uint8_t enable, uint8_t filter_dup, int to)
{
	struct hci_request rq;
	le_set_scan_enable_cp scan_cp;
	uint8_t status;

	memset(&scan_cp, 0, sizeof(scan_cp));
	scan_cp.enable = enable;
	scan_cp.filter_dup = filter_dup;

	memset(&rq, 0, sizeof(rq));
	rq.ogf = OGF_LE_CTL;
	rq.ocf = OCF_LE_SET_SCAN_ENABLE;
	rq.cparam = &scan_cp;
	rq.clen = LE_SET_SCAN_ENABLE_CP_SIZE;
	rq.rparam = &status;
	rq.rlen = 1;

	if (hci_send_req(dd, &rq, to) < 0)
		return -1;

	if (status) {
		errno = EIO;
		return -1;
	}

	return 0;
}

int hci_le_set_scan_parameters(int dd, uint8_t type, uint16_t interval, uint16_t window, uint8_t own_type, uint8_t filter, int to)
{
	struct hci_request rq;
	le_set_scan_parameters_cp param_cp;
	uint8_t status;

	memset(&param_cp, 0, sizeof(param_cp));
	param_cp.type = type;
	param_cp.interval = interval;
	param_cp.window = window;
	param_cp.own_bdaddr_type = own_type;
	param_cp.filter = filter;

	memset(&rq, 0, sizeof(rq));
	rq.ogf = OGF_LE_CTL;
	rq.ocf = OCF_LE_SET_SCAN_PARAMETERS;
	rq.cparam = &param_cp;
	rq.clen = LE_SET_SCAN_PARAMETERS_CP_SIZE;
	rq.rparam = &status;
	rq.rlen = 1;

	if (hci_send_req(dd, &rq, to) < 0)
		return -1;

	if (status) {
		errno = EIO;
		return -1;
	}

	return 0;
}

/* HCI functions that require open device
 * dd - Device descriptor returned by hci_open_dev. */

int hci_send_cmd(int dd, uint16_t ogf, uint16_t ocf, uint8_t plen, void *param)
{
	uint8_t type = HCI_COMMAND_PKT;
	hci_command_hdr hc;
	struct iovec iv[3];
	int ivn;

	hc.opcode = htobs(cmd_opcode_pack(ogf, ocf));
	hc.plen= plen;

	iv[0].iov_base = &type;
	iv[0].iov_len  = 1;
	iv[1].iov_base = &hc;
	iv[1].iov_len  = HCI_COMMAND_HDR_SIZE;
	ivn = 2;

	if (plen) {
		iv[2].iov_base = param;
		iv[2].iov_len  = plen;
		ivn = 3;
	}

	while (writev(dd, iv, ivn) < 0) {
		if (errno == EAGAIN || errno == EINTR)
			continue;
		return -1;
	}
	return 0;
}

int hci_send_req(int dd, struct hci_request *r, int to)
{
	unsigned char buf[HCI_MAX_EVENT_SIZE], *ptr;
	uint16_t opcode = htobs(cmd_opcode_pack(r->ogf, r->ocf));
	struct hci_filter nf, of;
	socklen_t olen;
	hci_event_hdr *hdr;
	int err, try;

	olen = sizeof(of);
	if (getsockopt(dd, SOL_HCI, HCI_FILTER, &of, &olen) < 0)
		return -1;

	hci_filter_clear(&nf);
	hci_filter_set_ptype(HCI_EVENT_PKT,  &nf);
	hci_filter_set_event(EVT_CMD_STATUS, &nf);
	hci_filter_set_event(EVT_CMD_COMPLETE, &nf);
	hci_filter_set_event(EVT_LE_META_EVENT, &nf);
	hci_filter_set_event(r->event, &nf);
	hci_filter_set_opcode(opcode, &nf);
	if (setsockopt(dd, SOL_HCI, HCI_FILTER, &nf, sizeof(nf)) < 0)
		return -1;

	if (hci_send_cmd(dd, r->ogf, r->ocf, r->clen, r->cparam) < 0)
		goto failed;

	try = 10;
	while (try--) {
		evt_cmd_complete *cc;
		evt_cmd_status *cs;
		evt_remote_name_req_complete *rn;
		evt_le_meta_event *me;
		remote_name_req_cp *cp;
		int len;

		if (to) {
			struct pollfd p;
			int n;

			p.fd = dd; p.events = POLLIN;
			while ((n = poll(&p, 1, to)) < 0) {
				if (errno == EAGAIN || errno == EINTR)
					continue;
				goto failed;
			}

			if (!n) {
				errno = ETIMEDOUT;
				goto failed;
			}

			to -= 10;
			if (to < 0)
				to = 0;

		}

		while ((len = read(dd, buf, sizeof(buf))) < 0) {
			if (errno == EAGAIN || errno == EINTR)
				continue;
			goto failed;
		}

		hdr = (void *) (buf + 1);
		ptr = buf + (1 + HCI_EVENT_HDR_SIZE);
		len -= (1 + HCI_EVENT_HDR_SIZE);

		switch (hdr->evt) {
		case EVT_CMD_STATUS:
			cs = (void *) ptr;

			if (cs->opcode != opcode)
				continue;

			if (r->event != EVT_CMD_STATUS) {
				if (cs->status) {
					errno = EIO;
					goto failed;
				}
				break;
			}

			r->rlen = MIN(len, r->rlen);
			memcpy(r->rparam, ptr, r->rlen);
			goto done;

		case EVT_CMD_COMPLETE:
			cc = (void *) ptr;

			if (cc->opcode != opcode)
				continue;

			ptr += EVT_CMD_COMPLETE_SIZE;
			len -= EVT_CMD_COMPLETE_SIZE;

			r->rlen = MIN(len, r->rlen);
			memcpy(r->rparam, ptr, r->rlen);
			goto done;

		case EVT_REMOTE_NAME_REQ_COMPLETE:
			if (hdr->evt != r->event)
				break;

			rn = (void *) ptr;
			cp = r->cparam;

			if (bacmp(&rn->bdaddr, &cp->bdaddr))
				continue;

			r->rlen = MIN(len, r->rlen);
			memcpy(r->rparam, ptr, r->rlen);
			goto done;

		case EVT_LE_META_EVENT:
			me = (void *) ptr;

			if (me->subevent != r->event)
				continue;

			len -= 1;
			r->rlen = MIN(len, r->rlen);
			memcpy(r->rparam, me->data, r->rlen);
			goto done;

		default:
			if (hdr->evt != r->event)
				break;

			r->rlen = MIN(len, r->rlen);
			memcpy(r->rparam, ptr, r->rlen);
			goto done;
		}
	}
	errno = ETIMEDOUT;

failed:
	err = errno;
	setsockopt(dd, SOL_HCI, HCI_FILTER, &of, sizeof(of));
	errno = err;
	return -1;

done:
	setsockopt(dd, SOL_HCI, HCI_FILTER, &of, sizeof(of));
	return 0;
}

/*
static void sigint_handler(int sig)
{
        signal_received = sig;
	exit(0);
}
*/

static uint8_t get_coach_number(uint8_t *eir, size_t eir_len)
{
	size_t offset;

	offset = 0;
	while (offset < eir_len) {
		uint8_t field_len = eir[0];
		size_t name_len;

		/* Check for the end of EIR */
		if (field_len == 0)
			break;

		if (offset + field_len > eir_len)
			goto failed;

		switch (eir[1]) {
		case EIR_NAME_SHORT:
		case EIR_NAME_COMPLETE:
			return eir[2];
		
		}

		offset += field_len + 1;
		eir += field_len + 1;
	}

failed:
	return 0;
	//snprintf(buf, buf_len, "(unknown)");
}


static uint8_t parse_coach_uuid(uint8_t *eir, size_t eir_len)
{
	size_t offset;

	offset = 0;
	while (offset < eir_len) {
		uint8_t field_len = eir[0];
		size_t name_len;

		/* Check for the end of EIR */
		if (field_len == 0)
			break;

		if (offset + field_len > eir_len)
			goto failed;
		switch (eir[1]) {
		
		case EIR_UUID16_ALL:
			if (eir[2] == 0x55 && eir[3] == 0x11){
				return 1;
			}
			
		}

		offset += field_len + 1;
		eir += field_len + 1;
	}

failed:
	return 0;
}




static int print_advertising_devices(int dd, uint8_t filter_type, BTInfo cb)
{
	unsigned char buf[HCI_MAX_EVENT_SIZE], *ptr;
	struct hci_filter nf, of;
	socklen_t olen;
	int len,i;
	uint8_t coach_num;

	olen = sizeof(of);
	if (getsockopt(dd, SOL_HCI, HCI_FILTER, &of, &olen) < 0) {
		printf("Could not get socket options\n");
		return -1;
	}

	hci_filter_clear(&nf);
	hci_filter_set_ptype(HCI_EVENT_PKT, &nf);
	hci_filter_set_event(EVT_LE_META_EVENT, &nf);

	if (setsockopt(dd, SOL_HCI, HCI_FILTER, &nf, sizeof(nf)) < 0) {
		printf("Could not set socket options\n");
		return -1;
	}

	while (!quitFlag) {
		evt_le_meta_event *meta;
		le_advertising_info *info;
		char addr[18];

		while ((len = read(dd, buf, sizeof(buf))) < 0) {

			if (errno == EAGAIN || errno == EINTR)
				continue;
			goto done;
		}

		ptr = buf + (1 + HCI_EVENT_HDR_SIZE);

		len -= (1 + HCI_EVENT_HDR_SIZE);

		meta = (void *) ptr;

		if (meta->subevent != 0x02)
			goto done;

		/* Ignoring multiple reports */
		info = (le_advertising_info *) (meta->data + 1);
			
		//if (check_report_filter(filter_type, info)) {
			char name[30];

			memset(name, 0, sizeof(name));

			ba2str(&info->bdaddr, addr);
			if (eir_parse_uuid(info->data, info->length) ) {
				
				eir_parse_name (info->data, info->length,name, sizeof(name)-1);
				uint8_t DevId = eir_parse_DevId(info->data, info->length);
				RSSI_val[DevId - 1] = *((int8_t *)&ptr[len - 1]);
				if(DevId == 3) {
                        		//printf ("name : %s addr: %s RSSI %d, DevID:%02x \n\n",name,addr,*((int8_t *)&ptr[len - 1]),DevId);
					ble_cloud_send();
				}
			}
		//printf("RSSI : %d %d %d\n", RSSI_val[0], RSSI_val[1], RSSI_val[2]);	
		//usleep(9000);	
	}

done:
	setsockopt(dd, SOL_HCI, HCI_FILTER, &of, sizeof(of));

	if (len < 0)
		return -1;

	return 0;
}



void start_lescan(int dev_id, BTInfo cb)
{
	int err, opt, dd;
	uint8_t own_type = LE_PUBLIC_ADDRESS;
	uint8_t scan_type = 0x01;
	uint8_t filter_type = 0;
	uint8_t filter_policy = 0x00;
	uint16_t interval = htobs(0x0040);
	uint16_t window = htobs(0x0020);
	uint8_t filter_dup = 0x00;

	
	if (dev_id < 0)
		dev_id = hci_get_route(NULL);

	dd = hci_open_dev(dev_id);
	if (dd < 0) {
		perror("Could not open device");
		exit(1);
	}

	err = hci_le_set_scan_parameters(dd, scan_type, interval, window, own_type, filter_policy, 10000);
	if (err < 0) {
		perror("Set scan parameters failed");
		exit(1);
	}

	err = hci_le_set_scan_enable(dd, 0x01, filter_dup, 10000);
	if (err < 0) {
		perror("Enable scan failed");
		exit(1);
	}

	printf("LE Scan ...\n");

	err = print_advertising_devices(dd, filter_type, cb);
	if (err < 0) {
		perror("Could not receive advertising events");
		exit(1);
	}

	err = hci_le_set_scan_enable(dd, 0x00, filter_dup, 10000);
	if (err < 0) {
		perror("Disable scan failed");
		exit(1);
	}

	hci_close_dev(dd);
}
