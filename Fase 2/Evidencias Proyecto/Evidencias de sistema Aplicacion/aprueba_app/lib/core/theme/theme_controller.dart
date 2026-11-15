import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ThemePreferenceStore {
  static const _storage = FlutterSecureStorage();
  static Future<ThemeMode> read() async {
    try {
      return await _storage.read(key: 'aprueba_theme') == 'dark'
          ? ThemeMode.dark
          : ThemeMode.light;
    } catch (_) {
      return ThemeMode.light;
    }
  }

  static Future<void> write(ThemeMode mode) async {
    try {
      await _storage.write(
        key: 'aprueba_theme',
        value: mode == ThemeMode.dark ? 'dark' : 'light',
      );
    } catch (_) {
      /* La preferencia remota sigue siendo válida si falla la caché local. */
    }
  }
}

class ThemeModeNotifier extends Notifier<ThemeMode> {
  ThemeModeNotifier({
    this.initialMode = ThemeMode.light,
    Future<void> Function(ThemeMode)? cache,
  }) : _cache = cache ?? ThemePreferenceStore.write;
  final ThemeMode initialMode;
  final Future<void> Function(ThemeMode) _cache;
  bool _saving = false;
  @override
  ThemeMode build() => initialMode;

  void set(ThemeMode mode) => state = mode;

  void applySaved(ThemeMode mode) {
    if (_saving || state == mode) return;
    state = mode;
    _cache(mode);
  }

  Future<void> save(ThemeMode mode, Future<void> Function() persist) async {
    if (_saving) return;
    final previous = state;
    _saving = true;
    state = mode;
    try {
      await persist();
      await _cache(mode);
    } catch (_) {
      state = previous;
      rethrow;
    } finally {
      _saving = false;
    }
  }
}

final themeModeProvider = NotifierProvider<ThemeModeNotifier, ThemeMode>(
  ThemeModeNotifier.new,
);
