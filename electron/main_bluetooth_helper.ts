import { BrowserWindow, ipcMain } from "electron";

const TAG = "MainBlueToothHelper";

/**
 * 主进程的BLE控制帮助类
 */
export class MainBlueToothHelper {
  win: BrowserWindow | undefined;
  selectedId: string | undefined;
  selectBluetoothCallback: Function | undefined;

  /**
   * 初始化BLE设备监听相关
   * @param _win 关联的BrowserWindow
   */
  init(_win: BrowserWindow): void {
    this.win = _win;
    this.win.webContents.on(
      "select-bluetooth-device",
      (event, deviceList, callback) => {
        event.preventDefault();
        console.log("==>select-bluetooth-device call", deviceList.length);
        let result;
        if (this.selectedId) {
          result = deviceList.find((device) => {
            return device.deviceId === this.selectedId;
          });
        }
        if (result) {
          console.log(
            "==>select-bluetooth-device call run ->",
            result.deviceName
          );
          callback(result.deviceId);
        } else {
          this.selectBluetoothCallback = callback;
          this._sendToRenderer("receivedDeviceList", deviceList);
        }
      }
    );

    ipcMain.on("select-bluetooth-request", (_, deviceId) => {
      try {
        this.selectedId = deviceId;
        if (this.selectBluetoothCallback) {
          const ret = this.selectBluetoothCallback(deviceId);
          console.log("==>select ble device:", deviceId, ret);
        }
      } catch (e) {
        console.error(e);
      }
    });

    ipcMain.on("cancel-bluetooth-request", (_) => {
      if (this.selectBluetoothCallback) {
        this.selectBluetoothCallback("");
        this.selectBluetoothCallback = undefined;
      }
    });

    console.log(`${TAG} init`);
  }

  /**
   * 销毁连接资源
   */
  destroy(): void {
    if (this.selectBluetoothCallback) {
      this.selectBluetoothCallback("");
      this.selectBluetoothCallback = undefined;
    }
    if (this.win) {
      this.win.removeAllListeners();
    }
    this.win = undefined;
    console.log(`${TAG} destroy`);
  }

  /**
   * 发送数据到渲染进程
   * @param channel
   * @param args
   */
  _sendToRenderer(channel: string, args: any) {
    if (this.win && !this.win.isDestroyed()) {
      this.win.webContents.send(channel, args);
    }
  }
}
