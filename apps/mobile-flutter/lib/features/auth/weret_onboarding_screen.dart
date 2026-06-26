import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/theme/app_assets.dart';
import '../../core/theme/weret_tokens.dart';
import '../../core/theme/app_styles.dart';
import '../../shared/widgets/weret_logo.dart';

const _onboardingKey = 'weret_onboarding_done_v1';

class WeretOnboardingScreen extends ConsumerStatefulWidget {
  const WeretOnboardingScreen({super.key});
  @override
  ConsumerState<WeretOnboardingScreen> createState() => _WeretOnboardingScreenState();
}

class _WeretOnboardingScreenState extends ConsumerState<WeretOnboardingScreen> {
  final _page = PageController();
  int _pageIndex = 0;
  bool _splashDone = false;

  @override
  void initState() {
    super.initState();
    _start();
  }

  Future<void> _start() async {
    final prefs = await SharedPreferences.getInstance();
    final done = prefs.getString(_onboardingKey) == '1';
    if (done) {
      await Future.delayed(const Duration(seconds: 2));
      if (mounted) context.go('/login');
      return;
    }
    await Future.delayed(const Duration(seconds: 2));
    if (mounted) setState(() => _splashDone = true);
  }

  Future<void> _finish() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_onboardingKey, '1');
    if (mounted) context.go('/login');
  }

  @override
  void dispose() {
    _page.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!_splashDone) {
      return Scaffold(
        backgroundColor: WeretTokens.brand,
        body: Center(
          child: Stack(
            children: [
              Text(
                'WERET',
                style: TextStyle(
                  fontSize: 36,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 6,
                  foreground: Paint()
                    ..style = PaintingStyle.stroke
                    ..strokeWidth = 3
                    ..color = Colors.black,
                ),
              ),
              const Text(
                'WERET',
                style: TextStyle(
                  fontSize: 36,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 6,
                  color: Colors.white,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: WeretTokens.bg,
      body: SafeArea(
        child: Column(
          children: [
            if (_pageIndex > 0)
              Align(
                alignment: Alignment.topRight,
                child: TextButton(
                  onPressed: _finish,
                  child: Text('Skip', style: TextStyle(color: WeretTokens.textMuted, fontSize: 14, fontWeight: FontWeight.w500)),
                ),
              ),
            Expanded(
              child: PageView(
                controller: _page,
                onPageChanged: (i) => setState(() => _pageIndex = i),
                children: [
                  _carPage1(),
                  _carPage2(),
                ],
              ),
            ),
            if (_pageIndex == 0 || _pageIndex == 1)
              Padding(
                padding: const EdgeInsets.only(bottom: 32),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(
                    2,
                    (i) => Container(
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: _pageIndex == i ? WeretTokens.brand : WeretTokens.borderSubtle,
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _carPage1() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          const SizedBox(height: 32),
          const WeretLogo.wordmark(fontSize: 24),
          const SizedBox(height: 4),
          Text('PREMIUM CARS', style: AppStyles.sectionLabel),
          const SizedBox(height: 24),
          Expanded(
            child: Container(
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(20),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(20),
                child: Image.asset(AppAssets.carTopview, fit: BoxFit.cover),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _carPage2() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 32),
          const WeretLogo.wordmark(fontSize: 24),
          const SizedBox(height: 32),
          SizedBox(
            width: MediaQuery.of(context).size.width * 0.4,
            height: 180,
            child: Container(
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(20),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(20),
                child: Image.asset(AppAssets.carFrontSuv, fit: BoxFit.cover),
              ),
            ),
          ),
          const Spacer(),
          Text('Premium cars. to destination.', style: AppStyles.headlineLarge),
          const SizedBox(height: 8),
          Text(
            'Premium and prestige car daily trip. pay lower price',
            style: AppStyles.bodyRegular,
          ),
          const SizedBox(height: 32),
          Align(
            alignment: Alignment.centerRight,
            child: GestureDetector(
              onTap: _finish,
              child: Container(
                width: 48,
                height: 48,
                decoration: const BoxDecoration(
                  color: WeretTokens.brand,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.arrow_forward, color: Colors.white, size: 20),
              ),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
