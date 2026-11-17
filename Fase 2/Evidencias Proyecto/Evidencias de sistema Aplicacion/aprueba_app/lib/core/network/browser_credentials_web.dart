import 'package:dio/dio.dart';
import 'package:dio/browser.dart';

void configureBrowserCredentials(Dio client) {
  client.httpClientAdapter = BrowserHttpClientAdapter(withCredentials: true);
}
