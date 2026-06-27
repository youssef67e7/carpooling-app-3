import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/theme/app_assets.dart';
import '../../core/theme/weret_tokens.dart';
import '../../core/theme/app_styles.dart';
import '../../shared/widgets/weret_logo.dart';

// ── Config ───────────────────────────────────────────────────────────
const _onboardingKey = 'weret_onboarding_done_v1';
const _splashTotalMs = 2600;
const _fadeMs = 500;
const _dotCount = 2;
const _dotSize = 8.0;
const _dotActiveWidth = 24.0;
const _dotGap = 4.0;
const _ctaSize = 48.0;

class WeretOnboardingScreen extends ConsumerStatefulWidget {
  const WeretOnboardingScreen({super.key});

  @override
  ConsumerState<WeretOnboardingScreen> createState() =>
      _WeretOnboardingScreenState();
}

class _WeretOnboardingScreenState extends ConsumerState<WeretOnboardingScreen>
    with TickerProviderStateMixin {
  // ── Splash animation ──────────────────────────────────────────────
  // Timeline (0–1 over _splashTotalMs):
  //   0.00–0.20  fade in
  //   0.20–0.70  hold
  //   0.70–1.00  fade out
  late final AnimationController _splashCtrl;
  late final Animation<double> _splashIn;
  late final Animation<double> _splashOut;

  // ── Page state ────────────────────────────────────────────────────
  final _pageCtrl = PageController();
  int _pageIndex = 0;
  bool _showOnboarding = false;

  @override
  void initState() {
    super.initState();
    _splashCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: _splashTotalMs),
    );
    _splashIn = Tween(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _splashCtrl, curve: const Interval(0.0, 0.20, curve: Curves.easeOut)),
    );
    _splashOut = Tween(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(parent: _splashCtrl, curve: const Interval(0.70, 1.0, curve: Curves.easeIn)),
    );
    _splashCtrl.forward().then((_) {
      if (!mounted) return;
      _checkAndProceed();
    });
  }

  Future<void> _checkAndProceed() async {
    final prefs = await SharedPreferences.getInstance();
    if (prefs.getString(_onboardingKey) == '1') {
      if (mounted) context.go('/login');
      return;
    }
    if (mounted) setState(() => _showOnboarding = true);
  }

  Future<void> _finish() async {
    HapticFeedback.mediumImpact();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_onboardingKey, '1');
    if (mounted) context.go('/login');
  }

  void _nextPage() {
    if (_pageIndex < _dotCount - 1) {
      _pageCtrl.nextPage(
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeOutCubic,
      );
    } else {
      _finish();
    }
  }

  @override
  void dispose() {
    _splashCtrl.dispose();
    _pageCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _showOnboarding ? WeretTokens.bg : WeretTokens.brand,
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: _fadeMs),
        child: _showOnboarding
            ? KeyedSubtree(
                key: const ValueKey('onboarding'),
                child: _OnboardingView(
                  pageController: _pageCtrl,
                  pageIndex: _pageIndex,
                  onPageChanged: (i) => setState(() => _pageIndex = i),
                  onNext: _nextPage,
                  onSkip: _finish,
                ),
              )
            : KeyedSubtree(
                key: const ValueKey('splash'),
                child: _SplashView(fadeIn: _splashIn, fadeOut: _splashOut),
              ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Splash
// ═══════════════════════════════════════════════════════════════════════

class _SplashView extends StatelessWidget {
  final Animation<double> fadeIn;
  final Animation<double> fadeOut;
  const _SplashView({required this.fadeIn, required this.fadeOut});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: fadeIn,
      builder: (context, child) => Opacity(
        opacity: (fadeIn.value * fadeOut.value).clamp(0.0, 1.0),
        child: child,
      ),
      child: ColoredBox(
        color: WeretTokens.brand,
        child: Center(
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
              Text(
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
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Onboarding shell
// ═══════════════════════════════════════════════════════════════════════

class _OnboardingView extends StatelessWidget {
  final PageController pageController;
  final int pageIndex;
  final ValueChanged<int> onPageChanged;
  final VoidCallback onNext;
  final VoidCallback onSkip;

  const _OnboardingView({
    required this.pageController,
    required this.pageIndex,
    required this.onPageChanged,
    required this.onNext,
    required this.onSkip,
  });

  bool get _isLast => pageIndex == _dotCount - 1;
  bool get _showSkip => pageIndex > 0 && !_isLast;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        children: [
          AnimatedOpacity(
            duration: const Duration(milliseconds: 200),
            opacity: _showSkip ? 1.0 : 0.0,
            child: Align(
              alignment: Alignment.topRight,
              child: _SkipButton(onPressed: onSkip),
            ),
          ),

          Expanded(
            child: PageView(
              controller: pageController,
              onPageChanged: onPageChanged,
              children: const [
                _HeroImagePage(),
                _ContentPage(),
              ],
            ),
          ),

          Padding(
            padding: const EdgeInsets.only(bottom: 32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _PageIndicator(count: _dotCount, activeIndex: pageIndex),
                const SizedBox(height: 24),
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 250),
                  child: _isLast
                      ? _GetStartedButton(onPressed: onNext)
                      : _NextArrowButton(onPressed: onNext),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Pages
// ═══════════════════════════════════════════════════════════════════════

class _HeroImagePage extends StatelessWidget {
  const _HeroImagePage();

  @override
  Widget build(BuildContext context) {
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
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: Image.asset(
                AppAssets.carTopview,
                fit: BoxFit.cover,
                width: double.infinity,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ContentPage extends StatelessWidget {
  const _ContentPage();

  @override
  Widget build(BuildContext context) {
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
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: Image.asset(
                AppAssets.carFrontSuv,
                fit: BoxFit.cover,
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
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Shared chrome widgets
// ═══════════════════════════════════════════════════════════════════════

class _PageIndicator extends StatelessWidget {
  final int count;
  final int activeIndex;
  const _PageIndicator({required this.count, required this.activeIndex});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(count, (i) {
        final active = i == activeIndex;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOutCubic,
          margin: const EdgeInsets.symmetric(horizontal: _dotGap),
          width: active ? _dotActiveWidth : _dotSize,
          height: _dotSize,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(_dotSize / 2),
            color: active ? WeretTokens.brand : WeretTokens.borderSubtle,
          ),
        );
      }),
    );
  }
}

class _NextArrowButton extends StatelessWidget {
  final VoidCallback onPressed;
  const _NextArrowButton({required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: _ctaSize,
      height: _ctaSize,
      child: FilledButton(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: WeretTokens.brand,
          foregroundColor: Colors.white,
          shape: const CircleBorder(),
          padding: EdgeInsets.zero,
        ),
        child: const Icon(Icons.arrow_forward, size: 20),
      ),
    );
  }
}

class _GetStartedButton extends StatelessWidget {
  final VoidCallback onPressed;
  const _GetStartedButton({required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 50,
      child: FilledButton(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: WeretTokens.brand,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          textStyle: const TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: 16,
          ),
        ),
        child: const Text('Get Started'),
      ),
    );
  }
}

class _SkipButton extends StatelessWidget {
  final VoidCallback onPressed;
  const _SkipButton({required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: onPressed,
      child: const Text(
        'Skip',
        style: TextStyle(
          color: WeretTokens.textMuted,
          fontSize: 14,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}
