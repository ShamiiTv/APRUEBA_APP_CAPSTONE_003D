import 'dart:js_interop';

@JS('apruebaLinkProvider')
external JSPromise<JSString> _link(JSString session, JSString provider);
Future<void> linkSocial(String session, String provider) async {
  await _link(session.toJS, provider.toJS).toDart;
}
