class Benefit {
  final String id;
  final String name;
  final String description;
  final String sponsorName;
  final int costPlatinum;
  final String icon;
  final bool unlocked;
  final bool inStock;

  const Benefit({
    required this.id,
    required this.name,
    required this.description,
    required this.sponsorName,
    required this.costPlatinum,
    required this.icon,
    required this.unlocked,
    required this.inStock,
  });

  /// Si el backend trae un emoji lo usamos; si no, un ícono genérico.
  String get emoji =>
      (icon.isNotEmpty && icon.runes.length <= 2) ? icon : '🏷️';

  factory Benefit.fromJson(Map<String, dynamic> j) => Benefit(
    id: j['id'].toString(),
    name: (j['name'] ?? '').toString(),
    description: (j['description'] ?? '').toString(),
    sponsorName: (j['sponsor'] ?? '').toString(),
    costPlatinum: (j['costPlatinum'] as num?)?.toInt() ?? 5,
    icon: (j['icon'] ?? '').toString(),
    unlocked: j['unlocked'] == true,
    inStock: j['inStock'] != false,
  );
}

class Redemption {
  final String redemptionId;
  final String benefit;
  final String couponCode;
  final int platinumSpent;

  const Redemption({
    required this.redemptionId,
    required this.benefit,
    required this.couponCode,
    required this.platinumSpent,
  });

  factory Redemption.fromJson(Map<String, dynamic> j) => Redemption(
    redemptionId: (j['redemptionId'] ?? '').toString(),
    benefit: (j['benefit'] ?? '').toString(),
    couponCode: (j['couponCode'] ?? '').toString(),
    platinumSpent: (j['platinumSpent'] as num?)?.toInt() ?? 5,
  );
}
