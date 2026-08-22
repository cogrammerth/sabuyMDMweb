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
}

export interface LocationLog {
  id: string;
  device_id: string;
  latitude: number;
  longitude: number;
  recorded_at: string;
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
}

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
