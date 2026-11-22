import 'package:flutter/widgets.dart';

import '../l10n/l10n.dart';

const appBuildVersion = String.fromEnvironment('APP_VERSION');
String appVersionLabel(BuildContext context) => appBuildVersion.isEmpty
    ? tr(context, 'Compilación de desarrollo', 'Development build')
    : 'Aprueba $appBuildVersion';
