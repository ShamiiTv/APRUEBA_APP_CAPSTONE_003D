import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../data/user_profile.dart';
import '../l10n/l10n.dart';
import '../theme/wf_colors.dart';
import '../utils/validators.dart';

const kCountries = [
  'Chile',
  'Argentina',
  'Bolivia',
  'Brasil',
  'Colombia',
  'Ecuador',
  'España',
  'México',
  'Perú',
  'Uruguay',
  'Venezuela',
  'Otro',
];

const kHousingTypes = ['casa', 'departamento', 'condominio', 'otro'];

String housingLabel(BuildContext c, String type) {
  switch (type) {
    case 'departamento':
      return tr(c, 'Departamento', 'Apartment');
    case 'condominio':
      return tr(c, 'Condominio', 'Gated community');
    case 'otro':
      return tr(c, 'Otro', 'Other');
    default:
      return tr(c, 'Casa', 'House');
  }
}

class AddressFormController {
  final formKey = GlobalKey<FormState>();
  final commune = TextEditingController();
  final street = TextEditingController();
  final unit = TextEditingController();
  final otherCountry = TextEditingController();
  final ValueNotifier<String> country = ValueNotifier<String>('Chile');
  final ValueNotifier<String> housing = ValueNotifier<String>('casa');

  void load(Address? a) {
    if (a == null) return;
    if (a.country.isNotEmpty) {
      if (kCountries.contains(a.country) && a.country != 'Otro') {
        country.value = a.country;
      } else {
        country.value = 'Otro';
        otherCountry.text = a.country;
      }
    }
    commune.text = a.commune;
    street.text = a.street;
    unit.text = a.unit ?? '';
    housing.value = kHousingTypes.contains(a.housingType)
        ? a.housingType
        : 'casa';
  }

  bool validate() => formKey.currentState?.validate() ?? false;

  Address build() {
    final withUnit =
        housing.value == 'departamento' || housing.value == 'condominio';
    return Address(
      country: country.value == 'Otro'
          ? otherCountry.text.trim()
          : country.value,
      commune: commune.text.trim(),
      street: street.text.trim(),
      housingType: housing.value,
      unit: withUnit && unit.text.trim().isNotEmpty ? unit.text.trim() : null,
    );
  }

  void dispose() {
    commune.dispose();
    street.dispose();
    unit.dispose();
    otherCountry.dispose();
    country.dispose();
    housing.dispose();
  }
}

class AddressForm extends StatelessWidget {
  const AddressForm({super.key, required this.controller});

  final AddressFormController controller;

  Widget _label(String text, WfColors c) => Padding(
    padding: const EdgeInsets.only(bottom: 6),
    child: Text(
      text.toUpperCase(),
      style: GoogleFonts.montserrat(
        fontSize: 10,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.8,
        color: c.muted,
      ),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final c = WfColors.of(context);
    final ctl = controller;

    return Form(
      key: ctl.formKey,
      autovalidateMode: AutovalidateMode.onUserInteraction,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _label(tr(context, 'País', 'Country'), c),
          ValueListenableBuilder<String>(
            valueListenable: ctl.country,
            builder: (context, country, _) => Column(
              children: [
                InputDecorator(
                  decoration: const InputDecoration(),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: country,
                      isExpanded: true,
                      items: [
                        for (final k in kCountries)
                          DropdownMenuItem(
                            value: k,
                            child: Text(
                              k == 'Otro' ? tr(context, 'Otro', 'Other') : k,
                            ),
                          ),
                      ],
                      onChanged: (v) {
                        if (v != null) ctl.country.value = v;
                      },
                    ),
                  ),
                ),
                if (country == 'Otro') ...[
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: ctl.otherCountry,
                    inputFormatters: [lettersFormatter],
                    decoration: InputDecoration(
                      hintText: tr(
                        context,
                        'Escribe tu país',
                        'Type your country',
                      ),
                    ),
                    validator: (v) =>
                        vLetters(context, v, es: 'tu país', en: 'your country'),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 14),
          _label(tr(context, 'Comuna', 'City / district'), c),
          TextFormField(
            controller: ctl.commune,
            inputFormatters: [lettersFormatter],
            decoration: InputDecoration(
              hintText: tr(context, 'Ej: Ñuñoa', 'e.g. Ñuñoa'),
            ),
            validator: (v) => vLetters(
              context,
              v,
              es: 'tu comuna',
              en: 'your city or district',
            ),
          ),
          const SizedBox(height: 14),
          _label(tr(context, 'Dirección', 'Address'), c),
          TextFormField(
            controller: ctl.street,
            inputFormatters: [streetFormatter],
            decoration: InputDecoration(
              hintText: tr(context, 'Calle y número', 'Street and number'),
            ),
            validator: (v) => vStreet(context, v),
          ),
          const SizedBox(height: 14),
          _label(tr(context, 'Tipo de vivienda', 'Type of home'), c),
          ValueListenableBuilder<String>(
            valueListenable: ctl.housing,
            builder: (context, housing, _) {
              final withUnit =
                  housing == 'departamento' || housing == 'condominio';
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final t in kHousingTypes)
                        ChoiceChip(
                          label: Text(housingLabel(context, t)),
                          selected: housing == t,
                          showCheckmark: false,
                          onSelected: (_) => ctl.housing.value = t,
                        ),
                    ],
                  ),
                  if (withUnit) ...[
                    const SizedBox(height: 10),
                    TextFormField(
                      controller: ctl.unit,
                      inputFormatters: [unitFormatter],
                      decoration: InputDecoration(
                        hintText: housing == 'departamento'
                            ? tr(
                                context,
                                'N° de departamento (ej: 402)',
                                'Apartment number (e.g. 402)',
                              )
                            : tr(
                                context,
                                'N° de casa o parcela (opcional)',
                                'House or lot number (optional)',
                              ),
                      ),
                      validator: (v) => vUnit(
                        context,
                        v,
                        required: housing == 'departamento',
                      ),
                    ),
                  ],
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}
