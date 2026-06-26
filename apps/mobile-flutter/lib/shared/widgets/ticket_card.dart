import 'package:flutter/material.dart';
import '../../core/theme/weret_tokens.dart';

class TicketCard extends StatelessWidget {
  final Widget child;
  final Color? backgroundColor;
  final double notchRadius;

  const TicketCard({
    super.key,
    required this.child,
    this.backgroundColor,
    this.notchRadius = 12,
  });

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _TicketPainter(notchRadius: notchRadius, color: backgroundColor ?? WeretTokens.bg),
      child: Padding(
        padding: EdgeInsets.symmetric(horizontal: notchRadius + 4, vertical: 20),
        child: child,
      ),
    );
  }
}

class _TicketPainter extends CustomPainter {
  final double notchRadius;
  final Color color;

  _TicketPainter({required this.notchRadius, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    final path = Path();

    path.moveTo(0, notchRadius);
    path.quadraticBezierTo(0, 0, notchRadius, 0);
    path.lineTo(size.width - notchRadius, 0);
    path.quadraticBezierTo(size.width, 0, size.width, notchRadius);

    path.lineTo(size.width, size.height - notchRadius);
    path.quadraticBezierTo(size.width, size.height, size.width - notchRadius, size.height);

    path.lineTo(size.width * 0.75 + notchRadius, size.height);
    path.arcToPoint(
      Offset(size.width * 0.75 - notchRadius, size.height),
      radius: Radius.circular(notchRadius),
    );

    path.lineTo(size.width * 0.25 + notchRadius, size.height);
    path.arcToPoint(
      Offset(size.width * 0.25 - notchRadius, size.height),
      radius: Radius.circular(notchRadius),
    );

    path.lineTo(notchRadius, size.height);
    path.quadraticBezierTo(0, size.height, 0, size.height - notchRadius);

    path.close();
    canvas.drawPath(path, paint);

    for (final x in [size.width * 0.25, size.width * 0.75]) {
      canvas.drawCircle(
        Offset(x, size.height),
        notchRadius * 0.35,
        Paint()..color = Colors.grey.shade300,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _TicketPainter old) => old.notchRadius != notchRadius || old.color != color;
}
