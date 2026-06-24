import 'package:equatable/equatable.dart';
import 'package:intl/intl.dart';

class WeretUser extends Equatable {
  const WeretUser({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.activeRole,
    this.phone = '',
    this.isOnline = false,
    this.isVerified = true,
    this.profileImageUrl = '',
    this.vehicleType = '',
    this.driverApplicationStatus = 'none',
    this.createdAt,
    this.googleSub,
  });

  factory WeretUser.fromJson(Map<String, dynamic> json) {
    return WeretUser(
      id: '${json['_id'] ?? json['id'] ?? ''}',
      name: '${json['name'] ?? ''}',
      email: '${json['email'] ?? ''}',
      role: '${json['role'] ?? 'passenger'}',
      activeRole: '${json['activeRole'] ?? json['active_role'] ?? json['role'] ?? 'passenger'}',
      phone: '${json['phone'] ?? ''}',
      isOnline: json['isOnline'] == true || json['is_online'] == true,
      isVerified: json['isVerified'] != false && json['is_verified'] != false,
      profileImageUrl: '${json['profileImageUrl'] ?? json['profile_image_url'] ?? ''}',
      vehicleType: '${json['vehicleType'] ?? json['vehicle_type'] ?? ''}',
      driverApplicationStatus: '${json['driverApplicationStatus'] ?? json['driver_application_status'] ?? 'none'}',
      createdAt: json['createdAt'] ?? json['created_at'],
      googleSub: json['googleSub'] ?? json['google_sub'],
    );
  }

  final String id;
  final String name;
  final String email;
  final String role;
  final String? activeRole;
  final String phone;
  final bool isOnline;
  final bool isVerified;
  final String profileImageUrl;
  final String vehicleType;
  final String driverApplicationStatus;
  final dynamic createdAt;
  final dynamic googleSub;

  String get effectiveRole => activeRole ?? role;

  bool get isDriverApproved => driverApplicationStatus == 'approved';

  String get memberSinceLabel {
    if (createdAt == null) return '';
    final d = DateTime.tryParse('$createdAt');
    if (d == null) return '';
    return DateFormat.yMMMM().format(d);
  }

  Map<String, dynamic> toJson() => {
        '_id': id,
        'name': name,
        'email': email,
        'role': role,
        'activeRole': effectiveRole,
        'phone': phone,
        'isOnline': isOnline,
        'isVerified': isVerified,
        'profileImageUrl': profileImageUrl,
        'vehicleType': vehicleType,
        'driverApplicationStatus': driverApplicationStatus,
        'driver_application_status': driverApplicationStatus,
        if (createdAt != null) 'createdAt': createdAt,
        'googleSub': googleSub,
      };

  WeretUser copyWith({
    String? name,
    String? phone,
    bool? isOnline,
    String? activeRole,
    String? driverApplicationStatus,
    String? profileImageUrl,
  }) {
    return WeretUser(
      id: id,
      name: name ?? this.name,
      email: email,
      role: role,
      activeRole: activeRole ?? this.activeRole,
      phone: phone ?? this.phone,
      isOnline: isOnline ?? this.isOnline,
      isVerified: isVerified,
      profileImageUrl: profileImageUrl ?? this.profileImageUrl,
      vehicleType: vehicleType,
      driverApplicationStatus: driverApplicationStatus ?? this.driverApplicationStatus,
      createdAt: createdAt,
      googleSub: googleSub,
    );
  }

  @override
  List<Object?> get props => [id, email, role, effectiveRole];
}
