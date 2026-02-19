import 'package:flutter_riverpod/flutter_riverpod.dart';

class UiState {
  const UiState({
    this.activeNoteId,
    this.search = '',
    this.selectedTagId,
  });

  final String? activeNoteId;
  final String search;
  final String? selectedTagId;

  UiState copyWith({
    String? activeNoteId,
    String? search,
    String? selectedTagId,
    bool clearActiveNote = false,
    bool clearSelectedTag = false,
  }) {
    return UiState(
      activeNoteId: clearActiveNote ? null : (activeNoteId ?? this.activeNoteId),
      search: search ?? this.search,
      selectedTagId: clearSelectedTag ? null : (selectedTagId ?? this.selectedTagId),
    );
  }
}

final uiProvider = StateProvider<UiState>((_) => const UiState());
