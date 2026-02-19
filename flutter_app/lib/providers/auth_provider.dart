import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../services/supabase_service.dart';

final authProvider = StateNotifierProvider<AuthController, User?>((ref) {
  final controller = AuthController();
  ref.onDispose(controller.dispose);
  return controller;
});

class AuthController extends StateNotifier<User?> {
  AuthController() : super(supabase.auth.currentUser) {
    _subscription = supabase.auth.onAuthStateChange.listen((event) {
      state = event.session?.user;
    });
  }

  late final StreamSubscription<AuthState> _subscription;

  Future<void> signInWithEmail(String email, String password) async {
    await supabase.auth.signInWithPassword(email: email, password: password);
    state = supabase.auth.currentUser;
  }

  Future<void> signUpWithEmail(String email, String password) async {
    await supabase.auth.signUp(email: email, password: password);
    state = supabase.auth.currentUser;
  }

  Future<void> signOut() async {
    await supabase.auth.signOut();
    state = null;
  }

  Future<void> signInWithGoogle() async {
    final google = GoogleSignIn(scopes: ['email']);
    final account = await google.signIn();
    if (account == null) return;
    final auth = await account.authentication;
    final idToken = auth.idToken;
    if (idToken == null) throw Exception('Google did not return an ID token');

    await supabase.auth.signInWithIdToken(
      provider: OAuthProvider.google,
      idToken: idToken,
      accessToken: auth.accessToken,
    );
  }

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}
