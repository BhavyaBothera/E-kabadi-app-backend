import { MapsProvider, MapLocation, RoutePolyline } from '../maps.interface';
import { calculateHaversineDistanceKm, formatDistanceString } from '../../../utils/geo';

export class MockMapsProvider implements MapsProvider {
  async getRoutePolyline(origin: MapLocation, destination: MapLocation): Promise<RoutePolyline> {
    const distanceKm = calculateHaversineDistanceKm(
      origin.latitude,
      origin.longitude,
      destination.latitude,
      destination.longitude,
    );

    const etaMins = Math.max(3, Math.round(distanceKm * 4));

    return {
      origin,
      destination,
      waypoints: [
        {
          latitude: origin.latitude + 0.0011,
          longitude: origin.longitude + 0.001,
          addressName: 'Waypoint 1',
        },
        {
          latitude: origin.latitude + 0.0031,
          longitude: origin.longitude + 0.003,
          addressName: 'Waypoint 2',
        },
      ],
      distanceKm,
      durationString: `${etaMins} mins (${formatDistanceString(distanceKm)})`,
    };
  }

  async getEstimatedTimeArrival(origin: MapLocation, destination: MapLocation): Promise<string> {
    const distanceKm = calculateHaversineDistanceKm(
      origin.latitude,
      origin.longitude,
      destination.latitude,
      destination.longitude,
    );
    const etaMins = Math.max(3, Math.round(distanceKm * 4));
    return `${etaMins} mins (${formatDistanceString(distanceKm)})`;
  }
}
