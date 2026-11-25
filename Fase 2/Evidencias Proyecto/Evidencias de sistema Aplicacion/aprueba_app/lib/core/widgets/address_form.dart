import 'chile_locations.dart';
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
  final region = TextEditingController();
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
    region.dispose();
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
          ValueListenableBuilder<TextEditingValue>(
            valueListenable: ctl.region,
            builder: (context, region, _) {
              final communes=chileLocations[region.text] ?? <String>[];
              final old=ctl.commune.text;
              return Column(children:[
                DropdownButtonFormField<String>(isExpanded:true,initialValue:region.text.isEmpty?null:region.text,
                  decoration:InputDecoration(labelText:tr(context,'Región','Region')),
                  items: { ...chileLocations.keys, if(region.text.isNotEmpty) region.text }.map((r)=>DropdownMenuItem(value:r,child:Text(r))).toList(),
                  validator:(v)=>v==null?tr(context,'Selecciona tu región','Select your region'):null,
                  onChanged:(v){if(v!=null && v!=region.text){ctl.commune.clear();ctl.region.text=v;}}),
                const SizedBox(height:14),
                DropdownButtonFormField<String>(key:ValueKey(region.text),isExpanded:true,initialValue:old.isEmpty?null:old,
                  decoration:InputDecoration(labelText:tr(context,'Comuna','Commune')),
                  items:{...communes,if(old.isNotEmpty) old}.map((v)=>DropdownMenuItem(value:v,child:Text(v))).toList(),
                  validator:(v)=>v==null?tr(context,'Selecciona tu comuna','Select your commune'):null,
                  onChanged:communes.isEmpty?null:(v)=>ctl.commune.text=v??''),
              ]);
            }),
          const SizedBox(height:14),
          _label(tr(context, 'Dirección', 'Address'), c),
          TextFormField(
            controller: ctl.street,
            autofillHints: const [AutofillHints.fullStreetAddress],
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
