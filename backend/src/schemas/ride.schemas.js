import { z } from "zod";

export const createRideSchema = z.object({
  passengerId: z.string().min(1, "Passenger ID is required"),
  pickup: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    address: z.string().optional(),
  }),
  dropoff: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    address: z.string().optional(),
  }),
  vehicleType: z.string().min(1, "Vehicle type is required"),
});

export const acceptRideSchema = z.object({
  driverId: z.string().min(1, "Driver ID is required"),
});

export const offerFareSchema = z.object({
  fare: z.number().positive("Fare must be positive"),
});

export const respondOfferSchema = z.object({
  accept: z.boolean(),
});

export const cancelRideSchema = z.object({
  reason: z.string().min(1, "Cancellation reason is required").max(500),
});

export const rateRideSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export const joinPoolSchema = z.object({
  seats: z.number().int().min(1).max(4),
});

export const poolMatchesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  destination: z
    .object({
      address: z.string(),
      coordinates: z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      }),
    })
    .optional(),
});

export const nearbyDriversSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().positive().max(50000).optional(),
});

export const routePreviewSchema = z.object({
  fromLat: z.coerce.number().min(-90).max(90),
  fromLng: z.coerce.number().min(-180).max(180),
  toLat: z.coerce.number().min(-90).max(90),
  toLng: z.coerce.number().min(-180).max(180),
});

export const rideHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  status: z.string().optional(),
});

export const chatMessageSchema = z.object({
  content: z.string().min(1, "Message content is required").max(2000),
  type: z.enum(["text", "image", "system"]).optional().default("text"),
});

export const chatQuerySchema = z.object({
  before: z.string().optional(),
  limit: z.coerce.number().int().positive().max(50).optional().default(30),
});
