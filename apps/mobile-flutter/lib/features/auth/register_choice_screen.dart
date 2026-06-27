import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/auth_flow.dart';
import '../../shared/widgets/auth_role_path_card.dart';
import '../../shared/widgets/custom_button.dart';
import '../../shared/widgets/ui/stagger_entrance.dart';
import '../../shared/widgets/weret_auth_scaffold.dart';

const _loginRoute = '/login';
const _passengerRoute = '/register/passenger';
const _driverRoute = '/register/driver';
const _cardGap = 16.0;
const _bottomGap = 24.0;

class RegisterChoiceScreen extends StatelessWidget {
  const RegisterChoiceScreen({super.key});

  void _goPassenger(BuildContext context) {
    HapticFeedback.selectionClick();
    context.push(_passengerRoute);
  }

  void _goDriver(BuildContext context) {
    HapticFeedback.selectionClick();
    context.push(_driverRoute);
  }

  void _goLogin(BuildContext context) {
    HapticFeedback.selectionClick();
    context.go(_loginRoute);
  }

  @override
  Widget build(BuildContext context) {
    return WeretAuthScaffold(
      title: 'register'.tr(),
      showBack: true,
      onBack: () => context.pop(),
      subtitle: 'registerRoleHint'.tr(),
      child: StaggerEntrance(
        spacing: _cardGap,
        children: [
          AuthRolePathCard(
            flow: AuthFlow.passenger,
            icon: Icons.person_outline_rounded,
            title: 'registerContinuePassenger'.tr(),
            subtitle: 'registerPassengerPathBody'.tr(),
            onEmailRegister: () => _goPassenger(context),
          ),
          AuthRolePathCard(
            flow: AuthFlow.driver,
            icon: Icons.local_taxi_outlined,
            title: 'registerBecomeDriver'.tr(),
            subtitle: 'registerDriverPathBody'.tr(),
            onEmailRegister: () => _goDriver(context),
          ),
          Padding(
            padding: const EdgeInsets.only(top: _bottomGap - _cardGap),
            child: CustomButton(
              title: 'login'.tr(),
              variant: 'outline',
              onPressed: () => _goLogin(context),
            ),
          ),
        ],
      ),
    );
  }
}
