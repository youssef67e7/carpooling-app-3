import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/auth_flow.dart';
import '../../shared/widgets/custom_button.dart';
import '../../shared/widgets/weret_auth_scaffold.dart';
import '../../shared/widgets/auth_role_path_card.dart';

class RegisterChoiceScreen extends StatelessWidget {
  const RegisterChoiceScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return WeretAuthScaffold(
      title: 'register'.tr(),
      showBack: true,
      onBack: () => context.pop(),
      subtitle: 'registerRoleHint'.tr(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AuthRolePathCard(
            flow: AuthFlow.passenger,
            icon: Icons.person_outline_rounded,
            title: 'registerContinuePassenger'.tr(),
            subtitle: 'registerPassengerPathBody'.tr(),
            onEmailRegister: () => context.push('/register/passenger'),
            onPhoneRegister: () => context.push('/register/passenger/phone'),
          ),
          const SizedBox(height: 16),
          AuthRolePathCard(
            flow: AuthFlow.driver,
            icon: Icons.local_taxi_outlined,
            title: 'registerBecomeDriver'.tr(),
            subtitle: 'registerDriverPathBody'.tr(),
            onEmailRegister: () => context.push('/register/driver'),
            onPhoneRegister: () => context.push('/register/driver/phone'),
          ),
          const SizedBox(height: 20),
          CustomButton(title: 'login'.tr(), variant: 'outline', onPressed: () => context.go('/login')),
        ],
      ),
    );
  }
}
