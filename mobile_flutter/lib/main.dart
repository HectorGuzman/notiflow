import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

const String apiBase = 'https://notiflow-backend-flbzy2xxza-uc.a.run.app';
const Color kPrimary = Color(0xFF0F766E);
const Color kSecondary = Color(0xFF0B1220);
const Color kAccent = Color(0xFFEAF3FF);

void main() {
  runApp(const NotiflowApp());
}

class NotiflowApp extends StatelessWidget {
  const NotiflowApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Notiflow',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: kPrimary),
        useMaterial3: true,
        scaffoldBackgroundColor: Colors.white,
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: kSecondary,
          elevation: 0,
        ),
      ),
      home: const SplashScreen(),
    );
  }
}

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('authToken');
    if (!mounted) return;
    if (token != null && token.isNotEmpty) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => HomeShell(token: token)),
      );
    } else {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const LoginPage()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: CircularProgressIndicator(color: kPrimary)),
    );
  }
}

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _email = TextEditingController();
  final TextEditingController _password = TextEditingController();
  bool _loading = false;
  String? _error;

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await http.post(
        Uri.parse('$apiBase/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': _email.text.trim(), 'password': _password.text}),
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final token = data['token'] as String?;
        if (token == null) throw Exception('Token faltante');
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('authToken', token);
        if (!mounted) return;
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => HomeShell(token: token)),
        );
      } else {
        final msg = jsonDecode(res.body)['message'] ?? 'Credenciales inválidas';
        throw Exception(msg);
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kAccent,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Center(
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Icon(Icons.notifications_active, size: 72, color: kPrimary),
                  const SizedBox(height: 12),
                  const Text('Notiflow',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: kSecondary)),
                  const SizedBox(height: 8),
                  const Text('Mensajería escolar unificada',
                      textAlign: TextAlign.center, style: TextStyle(color: Colors.black54)),
                  const SizedBox(height: 24),
                  if (_error != null)
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(_error!, style: const TextStyle(color: Colors.red)),
                    ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.05),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        children: [
                          TextFormField(
                            controller: _email,
                            keyboardType: TextInputType.emailAddress,
                            decoration: const InputDecoration(
                              labelText: 'Correo',
                              prefixIcon: Icon(Icons.email_outlined),
                            ),
                            validator: (v) {
                              if (v == null || v.trim().isEmpty) return 'Ingresa tu correo';
                              final emailRegex = RegExp(r'^[^@]+@[^@]+\.[^@]+$');
                              if (!emailRegex.hasMatch(v.trim())) return 'Correo inválido';
                              return null;
                            },
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _password,
                            obscureText: true,
                            decoration: const InputDecoration(
                              labelText: 'Contraseña',
                              prefixIcon: Icon(Icons.lock_outline),
                            ),
                            validator: (v) => (v == null || v.isEmpty) ? 'Ingresa tu contraseña' : null,
                          ),
                          const SizedBox(height: 20),
                          ElevatedButton.icon(
                            icon: const Icon(Icons.login),
                            onPressed: _loading ? null : _login,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: kPrimary,
                              foregroundColor: Colors.white,
                              minimumSize: const Size.fromHeight(48),
                            ),
                            label: _loading
                                ? const SizedBox(
                                    width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                : const Text('Ingresar'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class HomeShell extends StatefulWidget {
  final String token;
  const HomeShell({super.key, required this.token});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  void _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('authToken');
    if (!mounted) return;
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const LoginPage()),
      (_) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      MuroPage(token: widget.token),
      CalendarioPage(token: widget.token),
      MessagesPage(token: widget.token),
    ];
    final titles = ['Muro', 'Calendario', 'Mensajes'];
    final icons = [Icons.campaign_outlined, Icons.event, Icons.message_outlined];

    return Scaffold(
      appBar: AppBar(
        title: Text(titles[_index]),
        actions: [
          IconButton(onPressed: _logout, icon: const Icon(Icons.logout)),
        ],
      ),
      body: pages[_index],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: [
          NavigationDestination(icon: Icon(icons[0]), label: titles[0]),
          NavigationDestination(icon: Icon(icons[1]), label: titles[1]),
          NavigationDestination(icon: Icon(icons[2]), label: titles[2]),
        ],
      ),
    );
  }
}

class MuroPage extends StatelessWidget {
  final String token;
  const MuroPage({super.key, required this.token});

  @override
  Widget build(BuildContext context) {
    final muro = [
      {'title': 'Bienvenida año escolar', 'body': 'Iniciamos el año con nuevas actividades para toda la comunidad.'},
      {'title': 'Reunión general', 'body': 'Este viernes 18:00 hrs, salón principal.'},
      {'title': 'Campaña solidaria', 'body': 'Trae útiles y alimentos no perecibles durante esta semana.'},
    ];
    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: muro.length,
      itemBuilder: (context, index) {
        final item = muro[index];
        return Card(
          elevation: 0,
          color: kAccent,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          child: ListTile(
            leading: const Icon(Icons.campaign, color: kPrimary),
            title: Text(item['title'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700)),
            subtitle: Text(item['body'] ?? ''),
          ),
        );
      },
    );
  }
}

class CalendarioPage extends StatelessWidget {
  final String token;
  const CalendarioPage({super.key, required this.token});

  @override
  Widget build(BuildContext context) {
    final eventos = [
      {'fecha': 'Ene 15', 'nombre': 'Taller de padres', 'detalle': '17:00 hrs, aula magna'},
      {'fecha': 'Ene 20', 'nombre': 'Simulacro', 'detalle': '11:00 hrs, patio central'},
      {'fecha': 'Ene 28', 'nombre': 'Feria de ciencias', 'detalle': '09:00 hrs, gimnasio'},
    ];
    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: eventos.length,
      itemBuilder: (context, index) {
        final e = eventos[index];
        return Card(
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: kPrimary,
              child: Text(e['fecha'] ?? '', style: const TextStyle(color: Colors.white, fontSize: 12)),
            ),
            title: Text(e['nombre'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700)),
            subtitle: Text(e['detalle'] ?? ''),
          ),
        );
      },
    );
  }
}

class MessagesPage extends StatefulWidget {
  final String token;
  const MessagesPage({super.key, required this.token});

  @override
  State<MessagesPage> createState() => _MessagesPageState();
}

class _MessagesPageState extends State<MessagesPage> {
  List<dynamic> _messages = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadMessages();
  }

  Future<void> _loadMessages() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await http.get(
        Uri.parse('$apiBase/messages'),
        headers: {'Authorization': 'Bearer ${widget.token}'},
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        setState(() => _messages = data as List<dynamic>);
      } else {
        final msg = jsonDecode(res.body)['message'] ?? 'Error al cargar mensajes';
        throw Exception(msg);
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return _loading
        ? const Center(child: CircularProgressIndicator())
        : _error != null
            ? Center(child: Text(_error!))
            : RefreshIndicator(
                onRefresh: _loadMessages,
                child: ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: _messages.length,
                  itemBuilder: (context, index) {
                    final m = _messages[index];
                    return Card(
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      child: ListTile(
                        leading: const Icon(Icons.mark_chat_read_outlined, color: kPrimary),
                        title: Text(m['content'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700)),
                        subtitle: Text('De: ${m['senderName'] ?? ''}'),
                        trailing: Text(
                          (m['status'] ?? '').toString(),
                          style: const TextStyle(color: kSecondary, fontWeight: FontWeight.w600),
                        ),
                      ),
                    );
                  },
                ),
              );
  }
}
