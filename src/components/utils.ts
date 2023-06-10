export class Utils {
  /**
   * 获取格式化后的时间字符串
   * @returns
   */
  static getFormatDateTime(): string {
    const date = new Date();
    const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}-${date
      .getHours()
      .toString()
      .padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date
      .getSeconds()
      .toString()
      .padStart(2, "0")}`;
    return formattedDate;
  }

  /**
   * buffer转16进制字符串
   * @param buffer 
   * @returns 
   */
  static arrayBufferToHexString(buffer: ArrayBuffer) {
    const uint8Array = new Uint8Array(buffer);
    const hexString = Array.from(uint8Array)
      .map((b) => ("00" + b.toString(16)).slice(-2))
      .join(" ");
    return hexString;
  }
}
