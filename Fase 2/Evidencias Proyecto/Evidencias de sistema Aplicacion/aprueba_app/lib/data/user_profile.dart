class Address {
  final String country;
  final String commune;
  final String street;
  final String housingType; // casa | departamento | condominio | otro
  final String? unit;

  const Address({
    required this.country,
    required this.commune,
    required this.street,
    required this.housingType,
    required this.unit,
  });

  static Address? from(dynamic v) {
    if (v is Map) {
      final m = Map<String, dynamic>.from(v);
      final u = m['unit']?.toString().trim();
      return Address(
        country: (m['country'] ?? '').toString(),
        commune: (m['commune'] ?? '').toString(),
        street: (m['street'] ?? '').toString(),
        housingType: (m['housingType'] ?? 'casa').toString(),
        unit: (u == null || u.isEmpty) ? null : u,
      );
    }
    // Compatibilidad con direcciones guardadas antes como texto simple.
    if (v is String && v.trim().isNotEmpty) {
      return Address(
        country: '',
        commune: '',
        street: v.trim(),
        housingType: 'casa',
        unit: null,
      );
    }
    return null;
  }

  Map<String, dynamic> toJson() => {
    'country': country,
    'commune': commune,
    'street': street,
    'housingType': housingType,
    if (unit != null && unit!.isNotEmpty) 'unit': unit,
  };

  String get summary {
    final first = unit == null ? street : '$street, $unit';
    return [
      first,
      commune,
      country,
    ].where((p) => p.trim().isNotEmpty).join(', ');
  }
}

class UserProfile {
  final String uid;
  final bool onboardingCompleted;
  final String name;
  final String email;
  final String? phone;
  final int? age;
  final String? school;
  final Address? address;
  final String locale;
  final bool dailyReminder;
  final String reminderTime; // HH:mm
  final String plan;
  final int streak;
  final int quotaUsed;
  final int quotaMax;
  final bool unlimited;
  final Map<String, int> medals;
  final List<String> selectedTests;
  final String theme; // light | dark
  final String difficulty; // d1..d4
  final String format; // random | facsim

  const UserProfile({
    required this.uid,
    this.onboardingCompleted = false,
    required this.name,
    required this.email,
    required this.phone,
    required this.age,
    required this.school,
    required this.address,
    required this.locale,
    required this.dailyReminder,
    required this.reminderTime,
    required this.plan,
    required this.streak,
    required this.quotaUsed,
    required this.quotaMax,
    required this.unlimited,
    required this.medals,
    required this.selectedTests,
    required this.theme,
    required this.difficulty,
    required this.format,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    final quota = (json['quota'] as Map?) ?? {};
    final medals = (json['medals'] as Map?) ?? {};
    final tests = (json['selectedTests'] as List?) ?? const [];
    const tiers = ['bronze', 'silver', 'gold', 'diamond', 'platinum'];

    String? text(dynamic v) {
      final s = v?.toString().trim();
      return (s == null || s.isEmpty) ? null : s;
    }

    return UserProfile(
      uid: (json['uid'] ?? json['id'] ?? '').toString(),
      onboardingCompleted: json['onboardingCompleted'] == true,
      name: (json['name'] ?? json['email'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      phone: text(json['phone']),
      age: (json['age'] as num?)?.toInt(),
      school: text(json['school']),
      address: Address.from(json['address']),
      locale: (json['locale'] ?? 'es').toString() == 'en' ? 'en' : 'es',
      dailyReminder: json['dailyReminder'] != false,
      reminderTime: text(json['reminderTime']) ?? '20:00',
      plan: (json['plan'] ?? 'free').toString(),
      streak: ((json['streak'] ?? 0) as num).toInt(),
      quotaUsed: ((quota['used'] ?? 0) as num).toInt(),
      quotaMax: ((quota['max'] ?? 20) as num).toInt(),
      unlimited: quota['unlimited'] == true,
      medals: {for (final t in tiers) t: ((medals[t] ?? 0) as num).toInt()},
      selectedTests: tests.map((e) => e.toString()).toList(),
      theme: (json['theme'] ?? 'light').toString() == 'dark' ? 'dark' : 'light',
      difficulty: (json['difficulty'] ?? 'd2').toString(),
      format: (json['practiceFormat'] ?? json['format'] ?? 'random').toString(),
    );
  }
}
