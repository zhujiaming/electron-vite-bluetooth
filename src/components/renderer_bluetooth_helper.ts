import { ipcRenderer } from "electron";
import { Utils } from "./utils";

console.log(`ipcRenderer: ${ipcRenderer}`);
type TypeFuncDeviceList = (deviceInfos: Array<any>) => void;
type TypeFuncDeviceSelect = (device: any) => void;
type TypeFuncOnBluetoothReceive = (event: any) => void;

/**
 * 渲染进程的BLE控制帮助类
 */
export class RendererBluetoothHelper {
  _continueReceive = true;

  deviceInfos = new Map();
  selectId: string | null | undefined;
  selectDevice: string | null | undefined;
  selectServer: string | null | undefined;
  selectCharacteristics: string | null | undefined;
  selectServers: string | null | undefined;

  characteristicsForSend: any;
  characteristicsForListen: any;

  _onDeviceListChanged: TypeFuncDeviceList | undefined;
  _onDeviceConnect: TypeFuncDeviceSelect | undefined;
  _onBluetoothReceive: TypeFuncOnBluetoothReceive | undefined;

  /**
   * 重置连接参数
   */
  reset() {
    this.deviceInfos = new Map();
    this.selectId = null;
    this.selectDevice = null;
    this.selectServer = null;
    this.selectCharacteristics = null;
    this.selectServers = null;
    this.characteristicsForSend = null;
    this.characteristicsForListen = null;
    this._onDeviceListChanged = undefined;
    this._onBluetoothReceive = undefined;
  }

  /**
   * 初始化BLE连接监听等
   */
  init() {
    this.reset();
    ipcRenderer.on("receivedDeviceList", (_, deviceList) => {
      if (!this._continueReceive) {
        return;
      }
      if (deviceList && deviceList.length > 0) {
        this._getDeviceListChanagedLisenter()([]);
        let deviceInfo;
        for (let i = 0; i < deviceList.length; i++) {
          deviceInfo = deviceList[i];
          if (!!deviceInfo) {
            const did = deviceInfo.deviceId;
            if (
              !this.deviceInfos.has(did) &&
              deviceInfo.deviceName.indexOf("未知或不支持的设备") < 0
            ) {
              this.deviceInfos.set(did, deviceInfo);
            }
          }
        }
        this._getDeviceListChanagedLisenter()(
          Array.from(this.deviceInfos!.values())
        );
      }
    });
  }

  /**
   * 请求刷新附近BLE列表
   * @param suuid 条件过滤BLE列表里的optionalServices
   * @param namePrefix 条件过滤BLE列表里的namePrefix，即标识名称前缀
   * @returns
   */
  async requestDevices(suuid: string, namePrefix: string) {
    this._continueReceive = true;
    setTimeout(() => {
      this._continueReceive = false;
    }, 5 * 1000);
    let filters = [];
    if (namePrefix) {
      filters.push({ namePrefix: namePrefix });
    } else {
      filters.push({ acceptAllDevices: true });
    }

    let config = {};

    if (suuid) {
      config = {
        filters,
        optionalServices: [suuid],
      };
    } else {
      config = { filters };
    }
    // config = { acceptAllDevices: true };
    console.log("start requestDevice,config:", config);
    // @ts-ignore
    const device = await navigator.bluetooth.requestDevice(config);
    this.selectDevice = device;
    this._onDeviceConnect!(this.selectDevice);
    if (this.selectDevice) {
      try {
        console.log("try connect service");
        // @ts-ignore
        this.selectDevice.gatt.connect();
      } catch (e) {
        console.error("connect error", e);
        this._onDeviceConnect!(null);
      }
    }
    setTimeout(() => {
      this._connectService();
    }, 2000);
    return this.selectDevice;
  }

  /**
   * 请求连接BLE设备
   * @param selectId BLE设备的mac地址
   */
  async connectDevice(selectId: string) {
    console.log("selectId:", selectId);
    this.selectId = selectId;
    if (selectId) ipcRenderer.send("select-bluetooth-request", selectId);
  }

  /**
   * 断开连接设备
   */
  async disconnectDevice() {
    if (this.selectDevice) {
      console.log("try disconnect");
      try {
        //@ts-ignore
        this.selectDevice.gatt.disconnect();
      } catch (e) {
        console.error("disconnect error", e);
      }
    }
    ipcRenderer.send("cancel-bluetooth-request");
  }

  /**
   * 发送数据到BLE设备
   * @param hexString 16进制数据字符串
   */
  async sendData(hexString: string) {
    if (this.characteristicsForSend) {
      console.log("chaacteristis sendData");
      //   const hexString = "DBF0A8010B464C534D20465232303000DFDE";
      const bytes = atob(hexString)
        .split("")
        .map((byte) => byte.charCodeAt(0));
      await this.characteristicsForSend.writeValueWithoutResponse(
        // @ts-ignore
        // new Uint8Array(hexString)
        new Uint8Array(bytes)
      );
      console.log("sendData finish");
    } else {
      console.log("characteristicsForSend is null");
    }
  }

  /**
   * 设置相关状态监听，用于刷新View
   * @param callbackDeviceListChanged 附近的BLE设备列表数据回调
   * @param callbackOndeviceConnect BLE设备被选中连接回调
   * @param callbackBluetoothReceive BLE设备返回数据回调
   */
  setCallbacks(
    callbackDeviceListChanged: TypeFuncDeviceList,
    callbackOndeviceConnect: TypeFuncDeviceSelect,
    callbackBluetoothReceive: TypeFuncOnBluetoothReceive
  ) {
    this._onDeviceListChanged = callbackDeviceListChanged;
    this._onDeviceConnect = callbackOndeviceConnect;
    this._onBluetoothReceive = callbackBluetoothReceive;
  }

  _getDeviceListChanagedLisenter() {
    return this._onDeviceListChanged ?? function () {};
  }

  _removeDeviceListChanagedLisenter() {
    this._onDeviceListChanged = undefined;
  }

  async _connectService() {
    if (this.selectDevice) {
      try {
        // @ts-ignore
        this.selectServers = await this.selectDevice.gatt.getPrimaryServices();
        console.log("==> getPrimaryServices", this.selectServer);
        if (this.selectServers && this.selectServers[0]) {
          this.selectCharacteristics =
            // @ts-ignore
            await this.selectServers[0].getCharacteristics();
          console.log("==> getCharacteristics", this.selectCharacteristics);
        }
        this._addEventListener();
      } catch (e) {
        console.error("_connectService error", e);
        this._onDeviceConnect!(null);
      }
    } else {
      this._onDeviceConnect!(null);
    }
  }

  //发送是用这个服务下的第一个特征值发送。接收是通过监听这个服务的第二个特征值
  _addEventListener() {
    if (this.selectCharacteristics) {
      this.characteristicsForSend = this.selectCharacteristics[0];
      this.characteristicsForListen = this.selectCharacteristics[1];
      // console.log("chaacteristis", selectCharacteristics);
      if (this.characteristicsForListen) {
        console.log("characteristicsForListen addEventListener");
        this.characteristicsForListen.addEventListener(
          "characteristicvaluechanged",
          (event: any) => {
            console.log(
              "characteristicvaluechanged=>",
              event,
              event.target,
              event.target.value
            );
            if (event.target.value) {
              try {
                const hexRet = Utils.arrayBufferToHexString(
                  event.target.value.buffer
                );
                console.log("===>ret hexRet:", hexRet);
                if (this._onBluetoothReceive) {
                  this._onBluetoothReceive(hexRet);
                }
              } catch (e) {
                console.error("format error");
              }
            }
          }
        );
        this.characteristicsForListen.startNotifications();
      }
    }
  }
}
