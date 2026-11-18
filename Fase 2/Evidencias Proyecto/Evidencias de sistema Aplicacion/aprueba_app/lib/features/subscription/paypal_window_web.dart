import '../../core/network/api_client.dart';

import 'dart:js_interop';

@JS('apruebaCheckout.prepare')
external JSBoolean _prepare(JSString locale);
@JS('apruebaCheckout.navigate')
external JSBoolean _navigate(JSString url);
@JS('apruebaCheckout.open')
external JSBoolean _open(JSString url);
@JS('apruebaCheckout.close')
external void _close();

bool prepare() {
  try {
    return _prepare(ApiClient.languageCode.toJS).toDart;
  } catch (_) {
    return false;
  }
}

bool navigate(String url) {
  try {
    return _navigate(url.toJS).toDart;
  } catch (_) {
    return false;
  }
}

bool open(String url) {
  try {
    return _open(url.toJS).toDart;
  } catch (_) {
    return false;
  }
}

void close() {
  try {
    _close();
  } catch (_) {}
}
