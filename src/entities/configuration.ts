export interface IConfiguration {
  key: string;
  value?: string;
}

export class Configuration {
  private key: string;
  private value: string;

  public constructor(value, key) {
    this.key = key;
    this.value = value;
  }

  public values(): IConfiguration {
    return {
      key: this.key,
      value: this.value
    };
  }
}
