"use client";

import L from "leaflet";

export function statusDivIcon(online: boolean): L.DivIcon {
  return L.divIcon({
    className: online ? "mdm-pin mdm-pin-online" : "mdm-pin mdm-pin-offline",
    html: '<span class="mdm-pin-dot" aria-hidden="true"></span>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
}
