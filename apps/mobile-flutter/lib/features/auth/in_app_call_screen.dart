import 'package:flutter/material.dart';
import '../../../shared/widgets/weret_screen_scaffold.dart';

class InAppCallScreen extends StatelessWidget {
  const InAppCallScreen({super.key, required this.rideId});
  final String rideId;

  @override
  Widget build(BuildContext context) {
    return WeretScreenScaffold(
      title: 'In-app Call',
      rnSource: 'screens/InAppCallScreen.js',
      child: Center(child: Text('WebRTC call for ride $rideId')),
    );
  }
}
