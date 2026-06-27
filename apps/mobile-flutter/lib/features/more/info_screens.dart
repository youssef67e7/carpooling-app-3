import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import '../../core/theme/weret_tokens.dart';
import '../../shared/widgets/ui/section_surface.dart';
import '../../shared/widgets/ui/stagger_entrance.dart';
import '../../shared/widgets/weret_logo.dart';

class HelpCenterScreen extends StatelessWidget {
  const HelpCenterScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('featureHelp'.tr())),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('helpIntro'.tr(), style: const TextStyle(height: 1.5)),
          const SizedBox(height: 16),
          ExpansionTile(title: Text('helpQ1'.tr()), children: [Padding(padding: const EdgeInsets.all(12), child: Text('helpA1'.tr()))]),
          ExpansionTile(title: Text('helpQ2'.tr()), children: [Padding(padding: const EdgeInsets.all(12), child: Text('helpA2'.tr()))]),
          ExpansionTile(title: Text('helpQ3'.tr()), children: [Padding(padding: const EdgeInsets.all(12), child: Text('helpA3'.tr()))]),
        ],
      ),
    );
  }
}

class SafetyTipsScreen extends StatelessWidget {
  const SafetyTipsScreen({super.key});

  static const _listPad = 16.0;
  static const _gap = 16.0;
  static const _tipGap = 12.0;

  static const _tips = [
    _Tip(Icons.location_on_outlined, 'safetyPoint1'),
    _Tip(Icons.share_outlined, 'safetyPoint2'),
    _Tip(Icons.verified_user_outlined, 'safetyPoint3'),
    _Tip(Icons.report_problem_outlined, 'safetyPoint4'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WeretTokens.bg,
      appBar: AppBar(
        title: Text('featureSafety'.tr()),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
      ),
      body: ListView(
        padding: const EdgeInsets.all(_listPad),
        children: [
          _IntroBanner(),
          const SizedBox(height: _gap + 4),
          StaggerEntrance(
            spacing: _tipGap,
            children: [
              for (final tip in _tips)
                _TipCard(index: _tips.indexOf(tip), tip: tip),
            ],
          ),
          const SizedBox(height: _gap),
        ],
      ),
    );
  }
}

class _Tip {
  final IconData icon;
  final String key;
  const _Tip(this.icon, this.key);
}

class _IntroBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
      decoration: BoxDecoration(
        color: WeretTokens.infoSoft,
        borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.only(top: 1),
            child: Icon(Icons.shield_outlined, color: WeretTokens.onInfo, size: 28),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Text('safetyIntro'.tr(), style: const TextStyle(color: WeretTokens.onInfo, fontSize: 15, height: 1.45)),
          ),
        ],
      ),
    );
  }
}

class _TipCard extends StatelessWidget {
  final int index;
  final _Tip tip;
  const _TipCard({required this.index, required this.tip});

  @override
  Widget build(BuildContext context) {
    return SectionSurface(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: WeretTokens.brand.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(tip.icon, color: WeretTokens.brand, size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: RichText(
              text: TextSpan(
                style: const TextStyle(color: WeretTokens.textPrimary, fontSize: 15, height: 1.45),
                children: [
                  TextSpan(
                    text: '${index + 1}. ',
                    style: const TextStyle(color: WeretTokens.brand, fontWeight: FontWeight.w700),
                  ),
                  TextSpan(text: tip.key.tr()),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class AboutWeretScreen extends StatelessWidget {
  const AboutWeretScreen({super.key});

  static const _pad = 24.0;
  static const _sm = 8.0;
  static const _md = 16.0;
  static const _lg = 24.0;
  static const _xl = 32.0;
  static const _version = '1.0.0';
  static const _logoSize = 80.0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WeretTokens.bg,
      appBar: AppBar(
        title: Text('featureAbout'.tr()),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: _pad),
        children: [
          const SizedBox(height: _lg),

          StaggerEntrance(
            spacing: _sm,
            children: [
              const Center(child: WeretLogo(height: _logoSize)),
              Center(
                child: Text(
                  'appName'.tr(),
                  style: const TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1,
                    color: WeretTokens.textPrimary,
                  ),
                ),
              ),
              Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Text(
                    'aboutTagline'.tr(),
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 15,
                      color: WeretTokens.textSecondary,
                      height: 1.5,
                    ),
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: _xl),

          SectionSurface(
            padding: const EdgeInsets.all(20),
            child: Text(
              'aboutBody'.tr(),
              style: const TextStyle(
                fontSize: 15,
                height: 1.6,
                color: WeretTokens.textSecondary,
              ),
            ),
          ),

          const SizedBox(height: _md),

          const _VersionLabel(version: _version),

          const SizedBox(height: _xl),
        ],
      ),
    );
  }
}

class _VersionLabel extends StatelessWidget {
  final String version;
  const _VersionLabel({required this.version});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text(
        'aboutVersion'.tr(namedArgs: {'version': version}),
        style: const TextStyle(
          color: WeretTokens.textMuted,
          fontSize: 13,
          letterSpacing: 0.2,
        ),
      ),
    );
  }
}

class RideTipsScreen extends StatelessWidget {
  const RideTipsScreen({super.key});

  static const _listPad = 16.0;
  static const _gap = 16.0;
  static const _tipGap = 12.0;
  static const _tips = [
    'rideTip1',
    'rideTip2',
    'rideTip3',
    'rideTip4',
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WeretTokens.bg,
      appBar: AppBar(
        title: Text('featureRideTips'.tr()),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
      ),
      body: ListView(
        padding: const EdgeInsets.all(_listPad),
        children: [
          _RideIntroBanner(),
          const SizedBox(height: _gap + 4),
          StaggerEntrance(
            spacing: _tipGap,
            children: [
              for (final key in _tips)
                _RideTipCard(index: _tips.indexOf(key), translationKey: key),
            ],
          ),
          const SizedBox(height: _gap),
        ],
      ),
    );
  }
}

class _RideIntroBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
      decoration: BoxDecoration(
        color: WeretTokens.brandSurface,
        borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.only(top: 1),
            child: Icon(Icons.lightbulb_outline_rounded, color: WeretTokens.brand, size: 26),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Text('rideTipsIntro'.tr(), style: const TextStyle(fontSize: 15, height: 1.45, color: WeretTokens.textPrimary)),
          ),
        ],
      ),
    );
  }
}

class _RideTipCard extends StatelessWidget {
  final int index;
  final String translationKey;
  const _RideTipCard({required this.index, required this.translationKey});

  @override
  Widget build(BuildContext context) {
    return SectionSurface(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _StepBadge(number: index + 1),
          const SizedBox(width: 14),
          Expanded(
            child: Text(translationKey.tr(), style: const TextStyle(fontSize: 15, height: 1.45, color: WeretTokens.textPrimary)),
          ),
        ],
      ),
    );
  }
}

class _StepBadge extends StatelessWidget {
  final int number;
  const _StepBadge({required this.number});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        color: WeretTokens.brand,
        borderRadius: BorderRadius.circular(10),
      ),
      alignment: Alignment.center,
      child: Text('$number', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14, height: 1)),
    );
  }
}


