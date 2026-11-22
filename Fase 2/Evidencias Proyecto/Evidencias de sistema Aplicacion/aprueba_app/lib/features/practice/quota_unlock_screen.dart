import '../../core/widgets/aprueba_symbols.dart';
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
  final _region = TextEditingController();
  final _addr = AddressFormController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _school.dispose();
    _age.dispose();
    _region.dispose();
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
          _region.text.trim(),
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
      appBar: AppBar(
        title: Text(tr(context, 'Amplía tu práctica', 'Extend your practice')),
        leading: BackButton(onPressed: () => context.go('/home')),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 32, 16, 24),
          children: [
            Center(
              child: Icon(
                isSchool ? ApruebaSymbols.spark : ApruebaSymbols.home,
                size: 38,
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
                      controller: _region,
                      decoration: InputDecoration(
                        labelText: tr(context, 'Región', 'Region'),
                      ),
                      validator: (value) => (value?.trim().isEmpty ?? true)
                          ? tr(
                              context,
                              'Ingresa tu región',
                              'Enter your region',
                            )
                          : null,
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
              onPressed: _loading
                  ? null
                  : () async {
                      final skip = await showDialog<bool>(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          title: Text(
                            tr(context, '¿Omitir por ahora?', 'Skip for now?'),
                          ),
                          content: SingleChildScrollView(
                            child: Text(
                              tr(
                                context,
                                isSchool
                                    ? 'Conservas tus 10 preguntas diarias base. Puedes sumar 5 al completar colegio, edad y región, y otras 5 con tu dirección. Puedes hacerlo después desde tu perfil.'
                                    : 'Conservas tus 15 preguntas diarias. Puedes sumar las últimas 5 al completar tu dirección, ahora o después desde tu perfil.',
                                isSchool
                                    ? 'You keep your 10 base daily questions. Add 5 with school, age and region, and another 5 with your address. You can do this later in your profile.'
                                    : 'You keep your 15 daily questions. Add the final 5 by completing your address, now or later in your profile.',
                              ),
                            ),
                          ),
                          actionsPadding: const EdgeInsets.fromLTRB(
                            24,
                            0,
                            24,
                            24,
                          ),
                          actions: [
                            OutlinedButton(
                              onPressed: () => Navigator.pop(ctx, false),
                              child: Text(
                                tr(
                                  context,
                                  'Completar mis datos',
                                  'Complete my details',
                                ),
                              ),
                            ),
                            FilledButton(
                              onPressed: () => Navigator.pop(ctx, true),
                              child: Text(
                                tr(context, 'Omitir por ahora', 'Skip for now'),
                              ),
                            ),
                          ],
                        ),
                      );
                      if (skip == true && context.mounted) context.go('/home');
                    },
              child: Text(tr(context, 'Más tarde', 'Later')),
            ),
          ],
        ),
      ),
    );
  }
}
