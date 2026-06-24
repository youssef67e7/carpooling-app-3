import 'package:easy_localization/easy_localization.dart';

String walletTypeLabel(String type) {
  final key = 'walletType_$type';
  final t = key.tr();
  return t == key ? type : t;
}

String walletTxTypeLabel(String type) {
  final key = 'walletTxType_$type';
  final t = key.tr();
  return t == key ? type : t;
}

String walletAccountId(Map<String, dynamic> a) => '${a['_id'] ?? a['id']}';
