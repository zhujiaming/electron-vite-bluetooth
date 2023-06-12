<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RendererBluetoothHelper } from "./renderer_bluetooth_helper";
import { Utils } from "./utils";

const renderBluetoothHelper = new RendererBluetoothHelper();

const selectedDeviceId = ref("");
const connectDeviceInfo = ref("");

const devicesRefs = ref<any[]>([]);

const textSuuid = ref("0000fff0-0000-1000-8000-00805f9b34fb");
const textNamePrefix = ref("FR201");
const toSendData = ref("DBF0A8010B464C534D20465232303000DFDE");

const receiveData = ref("");

/**
 * vue刷新设备
 */
function refreshDevice() {
  console.log("refreshDevice:");
  renderBluetoothHelper.requestDevices(textSuuid.value, textNamePrefix.value);
}

/**
 * vue连接设备
 */
function connectDevice() {
  console.log("selectedDeviceId", selectedDeviceId.value);
  if (selectedDeviceId.value === "") return;
  renderBluetoothHelper.connectDevice(selectedDeviceId.value);
}

function disconnectDevice() {
  console.log("disconnectDevice", selectedDeviceId.value);
  if (connectDeviceInfo.value === "") return;
  renderBluetoothHelper.disconnectDevice();
  connectDeviceInfo.value = "";
}

/**
 * vue发送数据
 */
function sendData() {
  receiveData.value =
    receiveData.value +
    `${Utils.getFormatDateTime()}  发送：${toSendData.value}\n`;

  console.log("sendData", toSendData.value);
  if (toSendData.value === "") return;
  renderBluetoothHelper.sendData(toSendData.value);
}

// vue初始化完毕
onMounted(() => {
  //@ts-ignore
  window.bleHelper = renderBluetoothHelper
  renderBluetoothHelper.init();
  renderBluetoothHelper.setCallbacks(
    (devices: Array<any>) => {
      // console.log("===>devices", devices);
      devicesRefs.value = devices;
    },
    (device: any) => {
      if (device == null || typeof device == "undefined") {
        connectDeviceInfo.value = "";
      } else {
        connectDeviceInfo.value = `已连接：${device.name}`;
      }
      console.log("deviceConnect", device);
    },
    (data: any) => {
      console.log("receve data:", data);
      receiveData.value = `${
        receiveData.value
      }${Utils.getFormatDateTime()} 接收：${data}\n`;
    }
  );
});
</script>

<template>
  <input v-model="textSuuid" placeholder="server uuid" />-
  <input v-model="textNamePrefix" placeholder="name prefix" />-
  <input v-model="toSendData" placeholder="send data" /><br /><br />
  <button @click="refreshDevice">刷新设备</button>&nbsp;&nbsp;
  <button @click="connectDevice">连接设备</button>&nbsp;&nbsp;
  <button @click="sendData" v-show="connectDeviceInfo !== ''">发送数据</button
  >&nbsp;&nbsp;
  <button @click="disconnectDevice" v-show="connectDeviceInfo !== ''">
    断开连接
  </button>
  <br />
  <div>{{ connectDeviceInfo }}</div>
  <br />
  <div class="scrollable-div">{{ receiveData }}</div>
  <br />
  <h4>设备列表</h4>
  <div v-for="deviceInfo in devicesRefs" :key="deviceInfo.deviceId">
    <input
      type="radio"
      :id="deviceInfo.deviceId"
      :value="deviceInfo.deviceId"
      v-model="selectedDeviceId"
    />
    <label :for="deviceInfo.deviceId">{{ deviceInfo.deviceName }}</label>
  </div>
  <br />

  <br />
  <!-- 样式绑定也支持对象和数组 -->
</template>

<style>
.red {
  color: red;
}
.scrollable-div {
  width: 400px;
  height: 100px;
  overflow-y: auto;
  text-align: left;
  font-size: 10px;
  border: 1px solid #ccc;
  white-space: pre-wrap;
}
</style>
