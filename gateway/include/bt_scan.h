#ifndef _BT_SCAN_H_
#define _BT_SCAN_H_

#define LE_LINK         0x80

#define FLAGS_AD_TYPE 0x01
#define FLAGS_LIMITED_MODE_BIT 0x01
#define FLAGS_GENERAL_MODE_BIT 0x02


#define EVT_LE_ADVERTISING_REPORT       0x02

#define LE_EV_NUM 5
static char *ev_le_meta_str[LE_EV_NUM + 1] = {
        "Unknown",
        "LE Connection Complete",
        "LE Advertising Report",
        "LE Connection Update Complete",
        "LE Read Remote Used Features Complete",
        "LE Long Term Key Request",
};

#define EIR_FLAGS                   0x01  /* flags */
#define EIR_UUID16_SOME             0x02  /* 16-bit UUID, more available */
#define EIR_UUID16_ALL              0x03  /* 16-bit UUID, all listed */
#define EIR_UUID32_SOME             0x04  /* 32-bit UUID, more available */
#define EIR_UUID32_ALL              0x05  /* 32-bit UUID, all listed */
#define EIR_UUID128_SOME            0x06  /* 128-bit UUID, more available */
#define EIR_UUID128_ALL             0x07  /* 128-bit UUID, all listed */
#define EIR_NAME_SHORT              0x08  /* shortened local name */
#define EIR_NAME_COMPLETE           0x09  /* complete local name */
#define EIR_TX_POWER                0x0A  /* transmit power level */
#define EIR_DEVICE_ID               0x10  /* device ID */

typedef void (* BTInfo) (int8_t coachid, int8_t rssi);

void start_lescan(int dev_id, BTInfo cb);

void bt_start(void);
#endif
