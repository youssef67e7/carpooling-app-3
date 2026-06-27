import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import '../../core/theme/weret_tokens.dart';

class VerifyDriverScreen extends StatelessWidget {
  const VerifyDriverScreen({
    super.key,
    required this.driverName,
    required this.driverPhoto,
    required this.vehicleModel,
    required this.vehicleColor,
    required this.plateNumber,
    required this.rating,
    this.ridesCount,
  });
  final String driverName;
  final String driverPhoto;
  final String vehicleModel;
  final String vehicleColor;
  final String plateNumber;
  final double rating;
  final int? ridesCount;
  static const routePath = '/safety/verify-driver';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WeretTokens.bg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text('verifyDriverTitle'.tr(), style: const TextStyle(fontWeight: FontWeight.w700)),
        actions: [IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.of(context).pop())],
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const SizedBox(height: 20),
            CircleAvatar(
              radius: 48,
              backgroundImage: driverPhoto.isNotEmpty ? NetworkImage(driverPhoto) : null,
              child: driverPhoto.isEmpty ? Text(driverName.isNotEmpty ? driverName[0].toUpperCase() : '?', style: const TextStyle(fontSize: 32)) : null,
            ),
            const SizedBox(height: 16),
            Text(driverName, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.star_rounded, color: Colors.amber, size: 20),
                const SizedBox(width: 4),
                Text(rating.toStringAsFixed(1), style: const TextStyle(fontWeight: FontWeight.w600)),
                if (ridesCount != null) ...[
                  const SizedBox(width: 4),
                  Text('($ridesCount rides)', style: TextStyle(color: WeretTokens.textMuted, fontSize: 13)),
                ],
              ],
            ),
            const SizedBox(height: 32),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: WeretTokens.inputFill,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: WeretTokens.borderSubtle),
              ),
              child: Column(
                children: [
                  _row(Icons.directions_car, 'verifyVehicleModel'.tr(), vehicleModel),
                  const Divider(height: 24),
                  _row(Icons.color_lens_outlined, 'verifyVehicleColor'.tr(), vehicleColor),
                  const Divider(height: 24),
                  _row(Icons.confirmation_number_outlined, 'verifyPlateNumber'.tr(), plateNumber),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: WeretTokens.successSoft,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const Icon(Icons.check_circle, color: WeretTokens.success, size: 20),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text('verifyDriverHint'.tr(), style: TextStyle(color: WeretTokens.onSuccess, fontSize: 13, height: 1.35)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _row(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 20, color: WeretTokens.textSecondary),
        const SizedBox(width: 12),
        Text(label, style: TextStyle(color: WeretTokens.textSecondary, fontSize: 14)),
        const Spacer(),
        Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
      ],
    );
  }
}
