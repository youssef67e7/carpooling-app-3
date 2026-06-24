import 'package:flutter/material.dart';
import '../../core/theme/auth_flow.dart';
import '../../core/theme/weret_tokens.dart';
import 'connection_status_banner.dart';
import 'weret_ambient_background.dart';
import 'weret_brand_header.dart';

class WeretAuthScaffold extends StatelessWidget {
  const WeretAuthScaffold({
    super.key,
    this.title,
    this.subtitle,
    this.showBack = false,
    this.showBrand = true,
    this.showLanguage = true,
    this.showConnection = true,
    this.centerBrand = false,
    this.flow = AuthFlow.neutral,
    this.stepLabel,
    this.onBack,
    required this.child,
  });

  final String? title;
  final String? subtitle;
  final bool showBack;
  final bool showBrand;
  final bool showLanguage;
  final bool showConnection;
  final bool centerBrand;
  final AuthFlow flow;
  final String? stepLabel;
  final VoidCallback? onBack;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WeretTokens.bg,
      body: WeretAmbientBackground(
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (title != null || showBack)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  child: Row(
                    children: [
                      if (showBack)
                        IconButton(
                          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: WeretTokens.textPrimary),
                          onPressed: onBack ?? () => Navigator.maybePop(context),
                        )
                      else
                        const SizedBox(width: 48),
                      Expanded(
                        child: title != null
                            ? Text(title!, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16, color: WeretTokens.textPrimary))
                            : const SizedBox.shrink(),
                      ),
                      if (stepLabel != null)
                        Padding(
                          padding: const EdgeInsets.only(right: 12),
                          child: Text(stepLabel!, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: WeretTokens.textMuted)),
                        )
                      else
                        const SizedBox(width: 48),
                    ],
                  ),
                ),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: WeretTokens.hPad),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (flow.showBadge) ...[
                        const SizedBox(height: 8),
                        Align(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: flow.accentSurface,
                              borderRadius: BorderRadius.circular(999),
                              border: Border.all(color: flow.accent.withValues(alpha: 0.15)),
                            ),
                            child: Text(
                              flow.badgeLabel,
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: flow.accent, letterSpacing: 0.3),
                            ),
                          ),
                        ),
                      ],
                      if (showBrand) ...[
                        SizedBox(height: centerBrand ? 32 : 12),
                        WeretBrandHeader(subtitle: subtitle, showLanguage: showLanguage),
                        const SizedBox(height: 24),
                      ],
                      if (showConnection) ...[
                        const Align(
                          alignment: AlignmentDirectional.centerStart,
                          child: ConnectionStatusBanner(compact: true),
                        ),
                        const SizedBox(height: 16),
                      ],
                      DecoratedBox(
                        decoration: BoxDecoration(
                          color: WeretTokens.surface,
                          borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
                          border: Border.all(color: WeretTokens.border),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.06),
                              blurRadius: 20,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
                          child: child,
                        ),
                      ),
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
