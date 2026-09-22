import { MapsProvider, MapLocation, RoutePolyline } from '../maps.interface';
import { calculateHaversineDistanceKm, formatDistanceString } from '../../../utils/geo';
import { logger } from '../../../utils/logger';

export class GoogleMapsProvider implements MapsProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getRoutePolyline(origin: MapLocation, destination: MapLocation): Promise<RoutePolyline> {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${this.apiKey}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Google Maps API error: ${res.status}`);
      }
      const data = (await res.json()) as {
        routes?: Array<{
          legs?: Array<{
            distance?: { text?: string; value?: number };
            duration?: { text?: string; value?: number };
          }>;
        }>;
      };

      const leg = data.routes?.[0]?.legs?.[0];
      const distanceKm = leg?.distance?.value ? leg.distance.value / 1000 : calculateHaversineDistanceKm(origin.latitude, origin.longitude, destination.latitude, destination.longitude);
      const durationString = leg?.duration?.text || `${Math.round(distanceKm * 4)} mins`;

      return {
        origin,
        destination,
        waypoints: [],
        distanceKm,
        durationString,
      };
    } catch (err) {
      logger.warn('Google Maps API failed, fallback to calculated distance:', err);
      const dist = calculateHaversineDistanceKm(origin.latitude, origin.longitude, destination.latitude, destination.longitude);
      return {
        origin,
        destination,
        waypoints: [],
        distanceKm: dist,
        durationString: `${Math.round(dist * 4)} mins`,
      };
    }
  }

  async getEstimatedTimeArrival(origin: MapLocation, destination: MapLocation): Promise<string> {
    const route = await this.getRoutePolyline(origin, destination);
    return `${route.durationString} (${formatDistanceString(route.distanceKm)})`;
  }
}
