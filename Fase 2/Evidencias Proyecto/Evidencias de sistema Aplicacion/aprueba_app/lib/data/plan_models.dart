import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';

/// 9900 -> $9.900
String formatClp(int value) {
  final s = value.abs().toString();
  final buf = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) buf.write('.');
    buf.write(s[i]);
  }
  return '\$${buf.toString()}';
}

Color _parseColor(String? hex) {
  if (hex == null) return AppColors.azul;
  final h = hex.replaceFirst('#', '');
  if (h.length != 6) return AppColors.azul;
  final v = int.tryParse('FF$h', radix: 16);
  return v == null ? AppColors.azul : Color(v);
}

class Plan {
  final String id;
  final String name;
  final int monthly;
  final int yearly;
  final Color color;
  final bool popular;
  final int order;
  final List<String> features;

  const Plan({
    required this.id,
    required this.name,
    required this.monthly,
    required this.yearly,
    required this.color,
    required this.popular,
    required this.order,
    required this.features,
  });

  bool get isFree => monthly == 0 && yearly == 0;

  int priceFor(String cycle) => cycle == 'yearly' ? yearly : monthly;

  String priceLabel(String cycle) => cycle == 'yearly'
      ? '${formatClp(yearly)}/año'
      : '${formatClp(monthly)}/mes';

  factory Plan.fromJson(Map<String, dynamic> j) {
    final price = (j['price'] as Map?) ?? const {};
    // La API devuelve los nombres de las características en `features`.
    final details =
        (j['features'] as List?) ?? (j['featureDetails'] as List?) ?? const [];
    return Plan(
      id: j['id'].toString(),
      name: (j['name'] ?? j['id']).toString(),
      monthly: (price['monthly'] as num?)?.toInt() ?? 0,
      yearly: (price['yearly'] as num?)?.toInt() ?? 0,
      color: _parseColor(j['color']?.toString()),
      popular: j['popular'] == true,
      order: (j['order'] as num?)?.toInt() ?? 0,
      features: details
          .map((f) => (f is Map ? f['name'] : f).toString())
          .toList(),
    );
  }
}

/// Suscripción vigente del alumno (GET /me/subscription).
class SubscriptionInfo {
  final String? id;
  final String plan;
  final String? billingCycle;
  final String status; // none | active | past_due | canceled
  final String? currentPeriodEnd; // YYYY-MM-DD
  final bool cancelAtPeriodEnd;
  final String? cardBrand;
  final String? cardLast4;

  const SubscriptionInfo({
    required this.id,
    required this.plan,
    required this.billingCycle,
    required this.status,
    required this.currentPeriodEnd,
    required this.cancelAtPeriodEnd,
    required this.cardBrand,
    required this.cardLast4,
  });

  bool get isActive =>
      id != null && (status == 'active' || status == 'past_due');

  factory SubscriptionInfo.fromJson(Map<String, dynamic> j) {
    final pm = (j['paymentMethod'] is Map)
        ? Map<String, dynamic>.from(j['paymentMethod'] as Map)
        : <String, dynamic>{};
    return SubscriptionInfo(
      id: j['id']?.toString(),
      plan: (j['plan'] ?? 'free').toString(),
      billingCycle: j['billingCycle']?.toString(),
      status: (j['status'] ?? 'none').toString(),
      currentPeriodEnd: j['currentPeriodEnd']?.toString(),
      cancelAtPeriodEnd: j['cancelAtPeriodEnd'] == true,
      cardBrand: pm['brand']?.toString(),
      cardLast4: pm['last4']?.toString(),
    );
  }
}

class Invoice {
  final String id;
  final int amount;
  final String currency;
  final String status;
  final String? paidAt;

  const Invoice({
    required this.id,
    required this.amount,
    required this.currency,
    required this.status,
    required this.paidAt,
  });

  factory Invoice.fromJson(Map<String, dynamic> j) => Invoice(
    id: j['id'].toString(),
    amount: (j['amount'] as num?)?.toInt() ?? 0,
    currency: (j['currency'] ?? 'CLP').toString(),
    status: (j['status'] ?? 'paid').toString(),
    paidAt: j['paidAt']?.toString(),
  );
}
