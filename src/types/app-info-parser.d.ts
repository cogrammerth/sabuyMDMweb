declare module "app-info-parser" {
  export default class AppInfoParser {
    constructor(file: string);
    parse(): Promise<{
      versionCode?: number | string;
      versionName?: string;
      package?: string;
      [key: string]: unknown;
    }>;
  }
}
