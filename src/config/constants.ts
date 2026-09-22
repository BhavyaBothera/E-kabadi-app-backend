export const APP_CONSTANTS = {
  // Citizen Eco Points rules (from Flutter RewardRules)
  CITIZEN_MIN_BILL_FOR_POINTS: 500.0,
  REWARD_RATE: 0.10, // 10%

  // Default values
  DEFAULT_LATITUDE: 28.6139,
  DEFAULT_LONGITUDE: 77.2090,
  DEFAULT_CITY: 'Noida',
  DEFAULT_STATE: 'Uttar Pradesh',

  // Valid status list
  PICKUP_STATUSES: [
    'pending',
    'matching',
    'accepted',
    'onTheWay',
    'arrived',
    'verified',
    'completed',
    'cancelled',
  ] as const,

  USER_ROLES: ['citizen', 'collector', 'recycler', 'admin'] as const,

  // Matching algorithm weights
  MATCHING_WEIGHTS: {
    DISTANCE: 0.40,
    AVAILABILITY: 0.25,
    QUEUE_LOAD: 0.20,
    RATING: 0.15,
  },
} as const;

export type PickupStatus = (typeof APP_CONSTANTS.PICKUP_STATUSES)[number];
export type AppRole = (typeof APP_CONSTANTS.USER_ROLES)[number];
