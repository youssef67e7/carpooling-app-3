import 'dart:async';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/providers/auth_provider.dart';
import 'core/providers/ui_provider.dart';
import 'core/router/app_router.dart';
import 'core/services/fcm_service.dart';
import 'core/services/token_manager.dart';
import 'core/sync/api_sync_bridge.dart';
import 'core/theme/weret_theme.dart';

class WeretApp extends ConsumerStatefulWidget {
  const WeretApp({super.key});

  @override
  ConsumerState<WeretApp> createState() => _WeretAppState();
}

class _WeretAppState extends ConsumerState<WeretApp> {
  @override
  void initState() {
    super.initState();
    TokenManager.onForceLogout = () {
      ref.read(authProvider.notifier).clearLocalSession();
    };
    unawaited(FcmService.initialize());
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(authHydrateProvider);
    ref.watch(apiSyncBridgeProvider);
    final themeMode = ref.watch(themeModeProvider);
    final router = ref.watch(appRouterProvider);

    return MaterialApp.router(
      title: 'WERET',
      debugShowCheckedModeBanner: false,
      localizationsDelegates: context.localizationDelegates,
      supportedLocales: context.supportedLocales,
      locale: context.locale,
      theme: WeretTheme.light,
      darkTheme: WeretTheme.dark,
      themeMode: themeMode,
      routerConfig: router,
    );
  }
}
