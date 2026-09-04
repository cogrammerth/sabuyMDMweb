export interface Device {
  id: string;
  device_id: string;
  device_name: string | null;
  model: string | null;
  android_version: string | null;
  battery_level: number | null;
  storage_free_mb: number | null;
  is_device_owner: boolean;
  is_online: boolean;
  last_heartbeat: string | null;
  current_app_version_code: number | null;
  /** SHA-256 hex of the device bearer; never expose on fleet JSON. */
  device_token_hash: string | null;
  device_token_issued_at: string | null;
  created_at: string;
}

export interface Policy {
  device_id: string;
  disable_camera: boolean;
  disable_factory_reset: boolean;
  disable_safe_boot: boolean;
  disable_usb_debugging: boolean;
  kiosk_mode: boolean;
  kiosk_package: string;
  hidden_apps: string[];
  suspended_apps: string[];
  updated_at: string;
}

export interface HeartbeatPayload {
  deviceId: string;
  model: string;
  androidVersion: string;
  batteryLevel: number;
  storageFreeMb: number;
  latitude?: number;
  longitude?: number;
  currentAppVersionCode?: number;
}

export interface LocationLog {
  id: string;
  device_id: string;
  latitude: number;
  longitude: number;
  recorded_at: string;
}

/** CamelCase breadcrumb point for map polylines. */
export interface DeviceLocationPoint {
  id: string;
  latitude: number;
  longitude: number;
  recordedAt: string;
}

/** Latest GPS + fleet metadata for the fleet map pin. */
export interface DeviceLatestLocation {
  deviceId: string;
  deviceName: string | null;
  model: string | null;
  batteryLevel: number | null;
  isOnline: boolean;
  lastHeartbeat: string | null;
  latitude: number;
  longitude: number;
  recordedAt: string;
}

/** Default enterprise policy returned / auto-created when no policy row exists. */
export interface PolicyResponse {
  disableCamera: boolean;
  disableFactoryReset: boolean;
  disableSafeBoot: boolean;
  disableUsbDebugging: boolean;
  kioskMode: boolean;
  kioskPackage: string;
  hiddenApps: string[];
  suspendedApps: string[];
}

export interface VersionInfo {
  versionCode: number;
  versionName: string;
  apkUrl: string;
  isMandatory: boolean;
  updateAvailable?: boolean;
}

export interface HeartbeatResponse {
  success: true;
  timestamp: number;
  updateAvailable: boolean;
  latestVersionCode: number;
}

/** Operator-facing APK release row (camelCase HTTP boundary). */
export interface AppVersionRecord {
  id: string;
  versionCode: number;
  versionName: string;
  apkUrl: string;
  isMandatory: boolean;
  isActive: boolean;
  releasedAt: string;
  packageName?: string | null;
  fileSizeBytes?: number | null;
  sha256?: string | null;
  storagePath?: string | null;
}

/** Operator publish body for PUT /api/admin/app-version. */
export interface AppVersionWriteInput {
  versionCode: number;
  versionName: string;
  apkUrl: string;
  isMandatory?: boolean;
  packageName?: string | null;
  fileSizeBytes?: number | null;
  sha256?: string | null;
  storagePath?: string | null;
}

/** Operator device rename body for PATCH /api/admin/devices/:deviceId. */
export interface DeviceNameWriteInput {
  deviceName?: string | null;
}

/** CamelCase fleet row at the HTTP / UI boundary. `isOnline` is computed. */
export interface FleetDevice {
  deviceId: string;
  deviceName: string | null;
  model: string | null;
  androidVersion: string | null;
  batteryLevel: number | null;
  storageFreeMb: number | null;
  isDeviceOwner: boolean;
  isOnline: boolean;
  lastHeartbeat: string | null;
  currentAppVersionCode: number | null;
  createdAt: string;
}

export interface FleetSummary {
  total: number;
  online: number;
  offline: number;
  lowBattery: number;
}

/** Operator policy save body (camelCase). */
export interface PolicyWriteInput {
  disableCamera?: boolean;
  disableFactoryReset?: boolean;
  disableSafeBoot?: boolean;
  disableUsbDebugging?: boolean;
  kioskMode?: boolean;
  kioskPackage?: string;
  hiddenApps?: string[];
  suspendedApps?: string[];
}

/** Android Enterprise Zero-Touch extras encoded into the provisioning QR. */
export interface ProvisioningExtras {
  "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME": string;
  "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_NAME": string;
  "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION": string;
  /** SHA-256 of the APK signing certificate (DER), URL-safe Base64, no padding. */
  "android.app.extra.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM": string;
  "android.app.extra.PROVISIONING_LEAVE_ALL_SYSTEM_APPS_ENABLED": boolean;
  "android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE": {
    serverUrl: string;
    deviceId: string;
    /** Present when deviceId was set at QR generation; DPC stores and sends as X-Device-Token. */
    deviceToken?: string;
  };
}

export type ProvisioningChecksumSource =
  | "local-file"
  | "remote-apk"
  | "env-override";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type DeviceInsert = {
  id?: string;
  device_id: string;
  device_name?: string | null;
  model?: string | null;
  android_version?: string | null;
  battery_level?: number | null;
  storage_free_mb?: number | null;
  is_device_owner?: boolean;
  is_online?: boolean;
  last_heartbeat?: string | null;
  current_app_version_code?: number | null;
  device_token_hash?: string | null;
  device_token_issued_at?: string | null;
  created_at?: string;
};

type DeviceUpdate = {
  id?: string;
  device_id?: string;
  device_name?: string | null;
  model?: string | null;
  android_version?: string | null;
  battery_level?: number | null;
  storage_free_mb?: number | null;
  is_device_owner?: boolean;
  is_online?: boolean;
  last_heartbeat?: string | null;
  current_app_version_code?: number | null;
  device_token_hash?: string | null;
  device_token_issued_at?: string | null;
  created_at?: string;
};

type PolicyInsert = {
  device_id: string;
  disable_camera?: boolean;
  disable_factory_reset?: boolean;
  disable_safe_boot?: boolean;
  disable_usb_debugging?: boolean;
  kiosk_mode?: boolean;
  kiosk_package?: string;
  hidden_apps?: string[];
  suspended_apps?: string[];
  updated_at?: string;
};

type PolicyUpdate = {
  device_id?: string;
  disable_camera?: boolean;
  disable_factory_reset?: boolean;
  disable_safe_boot?: boolean;
  disable_usb_debugging?: boolean;
  kiosk_mode?: boolean;
  kiosk_package?: string;
  hidden_apps?: string[];
  suspended_apps?: string[];
  updated_at?: string;
};

type LocationLogInsert = {
  id?: string;
  device_id: string;
  latitude: number;
  longitude: number;
  recorded_at?: string;
};

type LocationLogUpdate = {
  id?: string;
  device_id?: string;
  latitude?: number;
  longitude?: number;
  recorded_at?: string;
};

type AppVersionInsert = {
  id?: string;
  version_code: number;
  version_name: string;
  apk_url: string;
  is_mandatory?: boolean;
  is_active?: boolean;
  released_at?: string;
  package_name?: string | null;
  file_size_bytes?: number | null;
  sha256?: string | null;
  storage_path?: string | null;
};

type AppVersionUpdate = {
  id?: string;
  version_code?: number;
  version_name?: string;
  apk_url?: string;
  is_mandatory?: boolean;
  is_active?: boolean;
  released_at?: string;
  package_name?: string | null;
  file_size_bytes?: number | null;
  sha256?: string | null;
  storage_path?: string | null;
};

/**
 * Supabase Database schema.
 * Uses structural type aliases (not interfaces) so rows satisfy
 * `Record<string, unknown>` required by @supabase/postgrest-js.
 */
export type Database = {
  public: {
    Tables: {
      devices: {
        Row: {
          id: string;
          device_id: string;
          device_name: string | null;
          model: string | null;
          android_version: string | null;
          battery_level: number | null;
          storage_free_mb: number | null;
          is_device_owner: boolean;
          is_online: boolean;
          last_heartbeat: string | null;
          current_app_version_code: number | null;
          device_token_hash: string | null;
          device_token_issued_at: string | null;
          created_at: string;
        };
        Insert: DeviceInsert;
        Update: DeviceUpdate;
        Relationships: [];
      };
      policies: {
        Row: {
          device_id: string;
          disable_camera: boolean;
          disable_factory_reset: boolean;
          disable_safe_boot: boolean;
          disable_usb_debugging: boolean;
          kiosk_mode: boolean;
          kiosk_package: string;
          hidden_apps: string[];
          suspended_apps: string[];
          updated_at: string;
        };
        Insert: PolicyInsert;
        Update: PolicyUpdate;
        Relationships: [];
      };
      location_logs: {
        Row: {
          id: string;
          device_id: string;
          latitude: number;
          longitude: number;
          recorded_at: string;
        };
        Insert: LocationLogInsert;
        Update: LocationLogUpdate;
        Relationships: [];
      };
      app_versions: {
        Row: {
          id: string;
          version_code: number;
          version_name: string;
          apk_url: string;
          is_mandatory: boolean;
          is_active: boolean;
          released_at: string;
          package_name: string | null;
          file_size_bytes: number | null;
          sha256: string | null;
          storage_path: string | null;
        };
        Insert: AppVersionInsert;
        Update: AppVersionUpdate;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
