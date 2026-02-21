// TODO(supabase-restore): Restore full Supabase + Google auth when re-enabling backend.
// Original implementation used AuthController extends StateNotifier<User?> with
// supabase.auth.onAuthStateChange subscription, signInWithPassword, signUp,
// signInWithIdToken (Google), and signOut. See git history for the full version.

import 'package:flutter_riverpod/flutter_riverpod.dart';

// TODO(supabase-restore): Change back to StateNotifierProvider<AuthController, User?>
// and import supabase_flutter + google_sign_in.
final authProvider = StateNotifierProvider<AuthController, String?>((ref) {
  return AuthController();
});

class AuthController extends StateNotifier<String?> {
  // TODO(supabase-restore): Replace with real Supabase user; restore auth listener.
  AuthController() : super('local-dev-user');

  // TODO(supabase-restore): Restore real implementations of these auth methods.
  Future<void> signInWithEmail(String email, String password) async {}
  Future<void> signUpWithEmail(String email, String password) async {}
  Future<void> signInWithGoogle() async {}

  Future<void> signOut() async {
    // TODO(supabase-restore): Call supabase.auth.signOut().
    state = null;
  }
}
