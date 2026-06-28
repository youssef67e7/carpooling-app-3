import 'package:flutter/material.dart';
import '../../core/theme/app_styles.dart';
import '../../core/theme/weret_tokens.dart';

class WalletActivityItem extends StatelessWidget {
  const WalletActivityItem({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.amount,
    this.isCredit = false,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final String amount;
  final bool isCredit;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: WeretTokens.sp16),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: WeretTokens.borderSubtle, width: 1)),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: const BoxDecoration(
              color: WeretTokens.brand,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: WeretTokens.surface, size: 20),
          ),
          const SizedBox(width: WeretTokens.sp12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: AppStyles.bodySemiBold),
                const SizedBox(height: 2),
                Text(subtitle, style: AppStyles.caption),
              ],
            ),
          ),
          Text(
            amount,
            style: AppStyles.priceSmall.copyWith(
              color: isCredit ? WeretTokens.success : WeretTokens.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}
