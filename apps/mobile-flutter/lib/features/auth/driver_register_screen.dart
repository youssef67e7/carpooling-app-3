import 'package:flutter/material.dart';

import 'driver_onboarding_screen.dart';

/// Driver signup — application steps first, account creation last.
class DriverRegisterScreen extends StatelessWidget {
  const DriverRegisterScreen({super.key});

  @override
  Widget build(BuildContext context) => const DriverOnboardingScreen(fromSignup: true);
}
