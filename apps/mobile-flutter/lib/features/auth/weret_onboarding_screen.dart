import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/theme/weret_tokens.dart';
import '../../shared/widgets/custom_button.dart';
import '../../shared/widgets/weret_ambient_background.dart';
import '../../shared/widgets/weret_brand_header.dart';

const _onboardingKey = 'weret_onboarding_done_v1';

class WeretOnboardingScreen extends ConsumerStatefulWidget {
  const WeretOnboardingScreen({super.key});
  @override
  ConsumerState<WeretOnboardingScreen> createState() => _WeretOnboardingScreenState();
}

class _WeretOnboardingScreenState extends ConsumerState<WeretOnboardingScreen> {
  final _page = PageController();
  int _index = 0;

  @override
  void initState() {
    super.initState();
    _checkDone();
  }

  Future<void> _checkDone() async {
    final prefs = await SharedPreferences.getInstance();
    if (prefs.getString(_onboardingKey) == '1' && mounted) context.go('/login');
  }

  Future<void> _finish() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_onboardingKey, '1');
    if (mounted) context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: WeretAmbientBackground(
        child: SafeArea(
          child: Column(
            children: [
              Expanded(
                child: PageView(
                  controller: _page,
                  onPageChanged: (i) => setState(() => _index = i),
                  children: [
                    _slide('weretOnboardHeroPremium'.tr(), 'weretOnboardHeroCars'.tr()),
                    _slide('weretOnboardStoryTitle'.tr(), 'weretOnboardStoryBody'.tr()),
                  ],
                ),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                  2,
                  (i) => Container(
                    margin: const EdgeInsets.all(4),
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _index == i ? WeretTokens.brand : WeretTokens.textMuted,
                    ),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(24),
                child: CustomButton(
                  title: _index == 1 ? 'weretOnboardGetStarted'.tr() : 'weretOnboardingNext'.tr(),
                  onPressed: () {
                    if (_index == 1) {
                      _finish();
                    } else {
                      _page.nextPage(duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
                    }
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _slide(String title, String body) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const WeretBrandHeader(showLanguage: true),
          const SizedBox(height: 32),
          Text(title, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 22)),
          const SizedBox(height: 12),
          Text(body, textAlign: TextAlign.center, style: const TextStyle(height: 1.5)),
        ],
      ),
    );
  }
}
