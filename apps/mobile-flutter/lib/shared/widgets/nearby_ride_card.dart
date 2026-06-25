import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

class NearbyRideCard extends StatelessWidget {
  const NearbyRideCard({
    super.key,
    required this.driverName,
    required this.rating,
    required this.rideCount,
    required this.price,
    required this.departureTime,
    required this.arrivalTime,
    required this.fromLocation,
    required this.toLocation,
    required this.seatsLeft,
  });

  final String driverName;
  final double rating;
  final int rideCount;
  final double price;
  final String departureTime;
  final String arrivalTime;
  final String fromLocation;
  final String toLocation;
  final int seatsLeft;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            spreadRadius: 0,
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(driverName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16, color: Colors.black)),
                ),
                Row(
                  children: [
                    const Icon(Icons.star, color: AppColors.accent, size: 16),
                    const SizedBox(width: 4),
                    Text(
                      '$rating ($rideCount rides)',
                      style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text('EGP ${price.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20, color: Colors.black)),
                const SizedBox(width: 4),
                Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: Text('PER SEAT', style: TextStyle(fontSize: 10, color: AppColors.textMuted, letterSpacing: 0.5)),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Text(departureTime, style: const TextStyle(fontSize: 12, color: Colors.black)),
                const Text(' / ', style: TextStyle(fontSize: 12, color: Colors.black)),
                Text(arrivalTime, style: const TextStyle(fontSize: 12, color: Colors.black)),
              ],
            ),
            const SizedBox(height: 8),
            _locationRow(fromLocation),
            const SizedBox(height: 4),
            _locationRow(toLocation),
            const SizedBox(height: 16),
            Row(
              children: [
                Container(
                  height: 40,
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    color: Colors.black,
                    borderRadius: BorderRadius.circular(9999),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('−', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600)),
                      Padding(
                        padding: EdgeInsets.symmetric(horizontal: 12),
                        child: Text('1', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600)),
                      ),
                      Text('+', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
                const Spacer(),
                Text('$seatsLeft seats left', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: FilledButton(
                onPressed: () {},
                style: FilledButton.styleFrom(
                  backgroundColor: Colors.black,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                ),
                child: const Text('Book Ride'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _locationRow(String label) {
    return Row(
      children: [
        Container(
          width: 20,
          height: 20,
          decoration: const BoxDecoration(
            color: AppColors.accent,
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.location_on, color: Colors.white, size: 14),
        ),
        const SizedBox(width: 8),
        Text(label, style: const TextStyle(fontSize: 14, color: Colors.black)),
      ],
    );
  }
}
