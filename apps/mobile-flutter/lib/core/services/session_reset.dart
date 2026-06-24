import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/admin_provider.dart';
import '../providers/ride_provider.dart';
import '../providers/wallet_provider.dart';

void resetSessionProviders(Ref ref) {
  ref.read(rideProvider.notifier).resetSession();
  ref.read(walletProvider.notifier).resetSession();
  ref.invalidate(adminProvider);
}
