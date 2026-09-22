export interface MapLocation {
  latitude: number;
  longitude: number;
  addressName: string;
}

export interface RoutePolyline {
  origin: MapLocation;
  destination: MapLocation;
  waypoints: MapLocation[];
  distanceKm: number;
  durationString: string;
}

export interface MapsProvider {
  getRoutePolyline(origin: MapLocation, destination: MapLocation): Promise<RoutePolyline>;
  getEstimatedTimeArrival(origin: MapLocation, destination: MapLocation): Promise<string>;
}
