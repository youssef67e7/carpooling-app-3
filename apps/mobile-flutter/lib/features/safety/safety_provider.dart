import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';

class TrustedContact {
  final String id;
  final String name;
  final String phone;
  final String? relation;
  final DateTime? createdAt;

  TrustedContact({required this.id, required this.name, required this.phone, this.relation, this.createdAt});

  factory TrustedContact.fromJson(Map<String, dynamic> json) => TrustedContact(
        id: '${json['_id'] ?? json['id'] ?? ''}',
        name: '${json['name'] ?? ''}',
        phone: '${json['phone'] ?? ''}',
        relation: json['relation']?.toString(),
        createdAt: json['createdAt'] != null ? DateTime.tryParse('${json['createdAt']}') : null,
      );
}

class BlockedUser {
  final String userId;
  final DateTime? blockedAt;
  final Map<String, dynamic>? user;

  BlockedUser({required this.userId, this.blockedAt, this.user});

  factory BlockedUser.fromJson(Map<String, dynamic> json) => BlockedUser(
        userId: '${json['userId'] ?? ''}',
        blockedAt: json['blockedAt'] != null ? DateTime.tryParse('${json['blockedAt']}') : null,
        user: json['user'] as Map<String, dynamic>?,
      );
}

class SafetyService {
  SafetyService(this._ref);
  final Ref _ref;

  Future<ApiClient> get _api async => _ref.read(apiClientProvider.future);

  Future<String> triggerSos({String? rideId, Map<String, dynamic>? location, String? message}) async {
    final api = await _api;
    final data = await api.postJson(ApiEndpoints.safetyEmergency, {
      if (rideId != null) 'rideId': rideId,
      if (location != null) 'location': location,
      if (message != null) 'message': message,
    });
    return '${data['data']['eventId'] ?? ''}';
  }

  Future<void> resolveSos(String eventId) async {
    final api = await _api;
    await api.postJson(ApiEndpoints.safetyEmergencyResolve(eventId));
  }

  Future<List<TrustedContact>> getTrustedContacts() async {
    try {
      final api = await _api;
      final data = await api.getJson(ApiEndpoints.safetyTrustedContacts);
      final list = data['data'] as List<dynamic>? ?? [];
      return list.map((e) => TrustedContact.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  Future<TrustedContact> addTrustedContact({required String name, required String phone, String? relation}) async {
    final api = await _api;
    final data = await api.postJson(ApiEndpoints.safetyTrustedContacts, {
      'name': name,
      'phone': phone,
      if (relation != null) 'relation': relation,
    });
    return TrustedContact.fromJson(data['data'] as Map<String, dynamic>);
  }

  Future<void> removeTrustedContact(String contactId) async {
    final api = await _api;
    await api.delete(ApiEndpoints.safetyTrustedContact(contactId));
  }

  Future<List<BlockedUser>> getBlockedUsers() async {
    try {
      final api = await _api;
      final data = await api.getJson(ApiEndpoints.safetyBlocked);
      final list = data['data'] as List<dynamic>? ?? [];
      return list.map((e) => BlockedUser.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> blockUser(String userId) async {
    final api = await _api;
    await api.postJson(ApiEndpoints.safetyBlock(userId));
  }

  Future<void> unblockUser(String userId) async {
    final api = await _api;
    await api.delete(ApiEndpoints.safetyBlock(userId));
  }

  Future<String> shareTrip(String rideId) async {
    final api = await _api;
    final data = await api.postJson(ApiEndpoints.safetyShareTrip(rideId));
    return '${data['data']['link'] ?? ''}';
  }
}

final safetyServiceProvider = Provider<SafetyService>((ref) => SafetyService(ref));
