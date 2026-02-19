import 'dart:convert';

import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;

import '../models/note.dart';

class ApiService {
  ApiService(this.accessToken);

  final String accessToken;

  String get _baseUrl => dotenv.env['APP_API_BASE_URL'] ?? 'http://localhost:8787';

  Map<String, String> get _headers => {
        'Authorization': 'Bearer $accessToken',
        'Content-Type': 'application/json',
      };

  Future<List<ApiKeyRecord>> listKeys() async {
    final response = await http.get(Uri.parse('$_baseUrl/v1/keys'), headers: _headers);
    if (response.statusCode != 200) {
      throw Exception('Failed to load keys: ${response.statusCode}');
    }
    final list = jsonDecode(response.body) as List<dynamic>;
    return list
        .map((item) => ApiKeyRecord.fromJson(Map<String, dynamic>.from(item)))
        .toList();
  }

  Future<String> createKey({String? name}) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/v1/keys'),
      headers: _headers,
      body: jsonEncode({'name': name ?? 'Flutter Key'}),
    );
    if (response.statusCode != 200 && response.statusCode != 201) {
      throw Exception('Failed to create key: ${response.statusCode}');
    }
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    return body['apiKey'] as String;
  }

  Future<void> revokeKey(String id) async {
    final response = await http.delete(Uri.parse('$_baseUrl/v1/keys/$id'), headers: _headers);
    if (response.statusCode != 204) {
      throw Exception('Failed to revoke key: ${response.statusCode}');
    }
  }
}
