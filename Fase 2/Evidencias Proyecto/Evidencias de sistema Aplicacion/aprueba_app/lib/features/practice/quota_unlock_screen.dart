import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/l10n/l10n.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/wf_colors.dart';
import '../../core/utils/validators.dart';
import '../../core/widgets/address_form.dart';
import '../../core/widgets/wf_widgets.dart';
import '../auth/auth_providers.dart';
import 'practice_providers.dart';
import 'practice_repository.dart';

import 'package:flutter/services.dart';

class QuotaUnlockScreen extends ConsumerStatefulWidget {
  const QuotaUnlockScreen({super.key, required this.step});

  /// school | address
  final String step;

  @override
  ConsumerState<QuotaUnlockScreen> createState() => _QuotaUnlockScreenState();
}

class _QuotaUnlockScreenState extends ConsumerState<QuotaUnlockScreen> {
  final _schoolKey = GlobalKey<FormState>();
  final _school = TextEditingController();
  final _age = TextEditingController();
  final _addr = AddressFormController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _school.dispose();
    _age.dispose();
    _addr.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final isSchool = widget.step == 'school';
    if (isSchool) {
      if (!(_schoolKey.currentState?.validate() ?? false)) return;
    } else if (!_addr.validate()) {
      return;
    }

    final repo = ref.read(practiceRepositoryProvider);
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      if (isSchool) {
        await repo.unlockSchool(
          _school.text.trim(),
          int.parse(_age.text.trim()),
        );
      } else {
        await repo.unlockAddress(_addr.build());
      }
      await ref.read(profileProvider.notifier).refresh();
      if (mounted) context.go('/practice');
    } on PracticeException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context);
    final tt = Theme.of(context).textTheme;
    final isSchool = widget.step == 'school';

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 32, 16, 24),
          children: [
            Center(
              child: Text(
                isSchool ? '🎉' : '🏠',
                style: const TextStyle(fontSize: 38),
              ),
            ),
            const SizedBox(height: 8),
            Center(
              child: Text(
                isSchool
                    ? tr(context, '¡Vas muy bien!', "You're doing great!")
                    : tr(context, '¡Casi llegas!', 'Almost there!'),
                style: tt.headlineSmall,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              isSchool
                  ? tr(
                      context,
                      'Llegaste a tu cuota base. Desbloquea 5 preguntas más.',
                      'You reached your base quota. Unlock 5 more questions.',
                    )
                  : tr(
                      context,
                      'Desbloquea las últimas 5 preguntas con los datos de tu domicilio.',
                      'Unlock the last 5 questions with your home address.',
                    ),
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                fontSize: 13,
                color: c.muted,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(13),
              decoration: BoxDecoration(
                color: c.brand.withValues(alpha: 0.07),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: c.brand, width: 1.5),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        tr(context, 'Cuota diaria', 'Daily quota'),
                        style: GoogleFonts.inter(fontSize: 11, color: c.muted),
                      ),
                      const Spacer(),
                      const WfTag(
                        text: '+5',
                        bg: Color(0x2110B981),
                        fg: Color(0xFF059669),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  WfBar(value: isSchool ? 0.5 : 0.75),
                ],
              ),
            ),
            const SizedBox(height: 16),
            if (isSchool)
              Form(
                key: _schoolKey,
                autovalidateMode: AutovalidateMode.onUserInteraction,
                child: Column(
                  children: [
                    TextFormField(
                      controller: _school,
                      inputFormatters: [schoolFormatter],
                      textInputAction: TextInputAction.next,
                      decoration: InputDecoration(
                        hintText: tr(context, 'Colegio / Liceo', 'School'),
                      ),
                      validator: (v) => vSchool(context, v),
                    ),
                    const SizedBox(height: 10),
                    TextFormField(
                      controller: _age,
                      keyboardType: TextInputType.number,
                      inputFormatters: [
                        digitsFormatter,
                        LengthLimitingTextInputFormatter(2),
                      ],
                      decoration: InputDecoration(
                        hintText: tr(context, 'Edad', 'Age'),
                      ),
                      validator: (v) => vAge(context, v),
                    ),
                  ],
                ),
              )
            else
              AddressForm(controller: _addr),
            if (_error != null) ...[
              const SizedBox(height: 10),
              Text(_error!, style: TextStyle(color: c.danger)),
            ],
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _loading ? null : _submit,
              child: _loading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppColors.azul,
                      ),
                    )
                  : Text(
                      tr(
                        context,
                        'Desbloquear +5 preguntas',
                        'Unlock +5 questions',
                      ),
                    ),
            ),
            TextButton(
              onPressed: () => context.go('/home'),
              child: Text(tr(context, 'Más tarde', 'Later')),
            ),
          ],
        ),
      ),
    );
  }
}
