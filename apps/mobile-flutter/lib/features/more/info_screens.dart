import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import '../../core/theme/weret_tokens.dart';
import '../../shared/widgets/ui/section_surface.dart';
import '../../shared/widgets/ui/stagger_entrance.dart';
import '../../shared/widgets/weret_logo.dart';

const _pad = 16.0;
const _xs = 8.0;
const _sm = 12.0;
const _md = 16.0;
const _lg = 24.0;

class _Faq {
  final String question;
  final String answer;
  const _Faq(this.question, this.answer);
}

const _faqs = [
  _Faq('How do I request a ride?', 'Tap once for pickup, again for destination, then Request ride. Nearby drivers appear on the map before you book.'),
  _Faq('Why does my ride stay pending?', 'A driver must be online and accept your trip. Pull to refresh and ensure location permission is enabled.'),
  _Faq('How do ratings work?', 'After a trip ends you can rate your driver once. Fair ratings help everyone.'),
  _Faq('How do I cancel a ride?', 'Go to your active ride, tap Cancel, and select a reason. Cancellation fees may apply.'),
  _Faq('How do I contact support?', 'Use the Dispute button on your ride history or email support@weret.com.'),
];

class HelpCenterScreen extends StatefulWidget {
  const HelpCenterScreen({super.key});
  @override
  State<HelpCenterScreen> createState() => _HelpCenterScreenState();
}

class _HelpCenterScreenState extends State<HelpCenterScreen> {
  final _searchCtrl = TextEditingController();
  String _query = '';

  List<_Faq> get _filtered {
    if (_query.isEmpty) return _faqs;
    final q = _query.toLowerCase();
    return _faqs.where((f) {
      return f.question.toLowerCase().contains(q) || f.answer.toLowerCase().contains(q);
    }).toList();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filtered;

    return Scaffold(
      backgroundColor: WeretTokens.bg,
      appBar: AppBar(
        title: Text('featureHelp'.tr()),
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: WeretTokens.textPrimary),
          onPressed: () => Navigator.maybePop(context),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(_pad),
        children: [
          _SearchField(
            controller: _searchCtrl,
            onChanged: (v) => setState(() => _query = v.trim()),
          ),
          const SizedBox(height: _lg),

          StaggerEntrance(
            spacing: _sm,
            children: [
              _ContactCard(
                icon: Icons.chat_bubble_outline_rounded,
                title: 'Live Chat',
                subtitle: 'Chat with our support team in real time',
                onTap: () {},
              ),
              _ContactCard(
                icon: Icons.email_outlined,
                title: 'Email Support',
                subtitle: 'Send us an email and we\'ll get back to you',
                onTap: () {},
              ),
            ],
          ),
          const SizedBox(height: _lg),

          Text(
            'Frequently Asked Questions',
            style: const TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 18,
              color: WeretTokens.textPrimary,
            ),
          ),
          const SizedBox(height: _sm),

          if (filtered.isEmpty)
            _EmptySearch(query: _query)
          else
            ...List.generate(filtered.length, (i) {
              return Padding(
                padding: const EdgeInsets.only(bottom: _sm),
                child: _FaqTile(faq: filtered[i]),
              );
            }),

          const SizedBox(height: _lg),
        ],
      ),
    );
  }
}

class _SearchField extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  const _SearchField({required this.controller, required this.onChanged});

  static final _border = OutlineInputBorder(
    borderRadius: BorderRadius.circular(12),
    borderSide: const BorderSide(color: WeretTokens.borderSubtle),
  );
  static final _focusedBorder = OutlineInputBorder(
    borderRadius: BorderRadius.circular(12),
    borderSide: const BorderSide(color: WeretTokens.brand, width: 1.5),
  );

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 50,
      child: TextField(
        controller: controller,
        onChanged: onChanged,
        keyboardType: TextInputType.text,
        textInputAction: TextInputAction.search,
        style: const TextStyle(fontSize: 14, color: WeretTokens.textPrimary),
        decoration: InputDecoration(
          hintText: 'Search questions…',
          hintStyle: const TextStyle(color: WeretTokens.textMuted, fontSize: 14),
          filled: true,
          fillColor: WeretTokens.inputFill,
          prefixIcon: const Icon(Icons.search, size: 20, color: WeretTokens.textMuted),
          suffixIcon: ValueListenableBuilder<TextEditingValue>(
            valueListenable: controller,
            builder: (_, value, __) {
              if (value.text.isEmpty) return const SizedBox.shrink();
              return IconButton(
                icon: const Icon(Icons.close, size: 18, color: WeretTokens.textMuted),
                padding: const EdgeInsets.only(right: 4),
                constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                onPressed: () {
                  controller.clear();
                  onChanged('');
                },
              );
            },
          ),
          border: _border,
          enabledBorder: _border,
          focusedBorder: _focusedBorder,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
      ),
    );
  }
}

class _ContactCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  const _ContactCard({required this.icon, required this.title, required this.subtitle, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return SectionSurface(
      padding: const EdgeInsets.symmetric(horizontal: _md, vertical: 14),
      onTap: onTap,
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: WeretTokens.brand.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 20, color: WeretTokens.brand),
          ),
          const SizedBox(width: _md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: WeretTokens.textPrimary)),
                const SizedBox(height: 2),
                Text(subtitle, style: const TextStyle(fontSize: 12, color: WeretTokens.textMuted, height: 1.35)),
              ],
            ),
          ),
          const Icon(Icons.chevron_right, size: 20, color: WeretTokens.textMuted),
        ],
      ),
    );
  }
}

class _FaqTile extends StatefulWidget {
  final _Faq faq;
  const _FaqTile({required this.faq});
  @override
  State<_FaqTile> createState() => _FaqTileState();
}

class _FaqTileState extends State<_FaqTile> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _rotate;
  bool _expanded = false;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(duration: const Duration(milliseconds: 200), vsync: this);
    _rotate = Tween(begin: 0.0, end: 0.5).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.easeOutCubic),
    );
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  void _toggle() {
    setState(() => _expanded = !_expanded);
    _expanded ? _ctrl.forward() : _ctrl.reverse();
  }

  @override
  Widget build(BuildContext context) {
    return SectionSurface(
      padding: EdgeInsets.zero,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          InkWell(
            borderRadius: BorderRadius.circular(WeretTokens.cardRadius),
            onTap: _toggle,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: _md, vertical: 14),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      widget.faq.question,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: WeretTokens.textPrimary, height: 1.35),
                    ),
                  ),
                  RotationTransition(
                    turns: _rotate,
                    child: const Icon(Icons.expand_more, size: 20, color: WeretTokens.textMuted),
                  ),
                ],
              ),
            ),
          ),
          AnimatedSize(
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeOutCubic,
            alignment: Alignment.topCenter,
            child: _expanded
                ? Padding(
                    padding: const EdgeInsets.fromLTRB(_md, 0, _md, _md),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Divider(height: 1),
                        const SizedBox(height: _md),
                        Text(
                          widget.faq.answer,
                          style: const TextStyle(color: WeretTokens.textSecondary, fontSize: 13, height: 1.5),
                        ),
                      ],
                    ),
                  )
                : const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }
}

class _EmptySearch extends StatelessWidget {
  final String query;
  const _EmptySearch({required this.query});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: _lg),
      child: Column(
        children: [
          Icon(Icons.search_off_rounded, size: 48, color: WeretTokens.textMuted.withValues(alpha: 0.5)),
          const SizedBox(height: _sm),
          const Text(
            'No results found',
            style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15, color: WeretTokens.textPrimary),
          ),
          const SizedBox(height: _xs),
          Text(
            'No questions match "$query". Try different keywords.',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 13, color: WeretTokens.textMuted, height: 1.4),
          ),
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
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: WeretTokens.textPrimary),
          onPressed: () => Navigator.maybePop(context),
        ),
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
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: WeretTokens.textPrimary),
          onPressed: () => Navigator.maybePop(context),
        ),
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
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: WeretTokens.textPrimary),
          onPressed: () => Navigator.maybePop(context),
        ),
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


