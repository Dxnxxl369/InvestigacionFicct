import 'package:flutter/material.dart';
import '../../services/biblioteca_api.dart';
import '../moodle/widgets/visor_documento_screen.dart';

class BibliotecaScreen extends StatefulWidget {
  const BibliotecaScreen({super.key});

  @override
  State<BibliotecaScreen> createState() => _BibliotecaScreenState();
}

class _BibliotecaScreenState extends State<BibliotecaScreen> {
  final _texto = TextEditingController();
  List<Map<String, dynamic>> _categorias = [];
  List<Map<String, dynamic>> _documentos = [];
  List<Map<String, dynamic>> _recomendaciones = [];
  List<String> _areas = [];
  List<String> _niveles = [];
  String? _categoria;
  String? _area;
  String? _nivel;
  String? _error;
  bool _cargando = true;

  @override
  void initState() { super.initState(); _cargar(); }

  @override
  void dispose() { _texto.dispose(); super.dispose(); }

  Future<void> _cargar() async {
    setState(() { _cargando = true; _error = null; });
    try {
      final resultados = await Future.wait<dynamic>([
        BibliotecaApi.categorias(), BibliotecaApi.filtros(), BibliotecaApi.recomendaciones(),
        BibliotecaApi.documentos(texto: _texto.text, categoriaId: _categoria, area: _area, nivel: _nivel),
      ]);
      if (!mounted) return;
      final filtros = resultados[1] as Map<String, dynamic>;
      setState(() {
        _categorias = resultados[0] as List<Map<String, dynamic>>;
        _areas = (filtros['areas'] as List).cast<String>();
        _niveles = (filtros['niveles'] as List).cast<String>();
        _recomendaciones = resultados[2] as List<Map<String, dynamic>>;
        _documentos = resultados[3] as List<Map<String, dynamic>>;
        _cargando = false;
      });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString().replaceFirst('Exception: ', ''); _cargando = false; });
    }
  }

  Future<void> _buscar() async {
    try {
      final docs = await BibliotecaApi.documentos(texto: _texto.text, categoriaId: _categoria,
          area: _area, nivel: _nivel);
      if (mounted) setState(() { _documentos = docs; _error = null; });
    } catch (e) {
      if (mounted) setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    }
  }

  void _abrir(Map<String, dynamic> documento) {
    VisorDocumentoScreen.abrir(context,
      titulo: '${documento['titulo']}.pdf',
      url: BibliotecaApi.archivoUrl(documento['id'] as int));
  }

  Widget _tarjeta(Map<String, dynamic> doc, {String? motivo}) => Card(
    child: ListTile(
      leading: SizedBox(width: 48, height: 64, child: doc['tienePortada'] == true
        ? FutureBuilder<Map<String, String>>(
            future: BibliotecaApi.portadaHeaders(),
            builder: (context, snapshot) => snapshot.hasData
              ? Image.network(BibliotecaApi.portadaUrl(doc['id'] as int),
                  headers: snapshot.data, fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const Icon(Icons.menu_book_outlined))
              : const Icon(Icons.menu_book_outlined),
          )
        : const Icon(Icons.menu_book_outlined)),
      title: Text(doc['titulo']?.toString() ?? 'Documento'),
      subtitle: Text([doc['categoria'], doc['area'], doc['nivel'], motivo]
          .where((v) => v != null && v.toString().isNotEmpty).join(' · ')),
      trailing: const Icon(Icons.chevron_right),
      onTap: () => _abrir(doc),
    ),
  );

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Biblioteca virtual')),
    body: RefreshIndicator(
      onRefresh: _cargar,
      child: ListView(padding: const EdgeInsets.all(16), children: [
        Text('Encuentra materiales para tu proyecto', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 12),
        TextField(controller: _texto, decoration: InputDecoration(
          labelText: 'Buscar en títulos y PDF', prefixIcon: const Icon(Icons.search),
          suffixIcon: IconButton(icon: const Icon(Icons.arrow_forward), onPressed: _buscar)),
          onSubmitted: (_) => _buscar()),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(value: _categoria, decoration: const InputDecoration(labelText: 'Categoría'),
          items: [const DropdownMenuItem(value: '', child: Text('Todas')),
            const DropdownMenuItem(value: '-1', child: Text('Sin categoría')),
            ..._categorias.map((c) => DropdownMenuItem(value: '${c['id']}', child: Text('${c['nombre']}')))],
          onChanged: (v) { setState(() => _categoria = v); _buscar(); }),
        DropdownButtonFormField<String>(value: _area, decoration: const InputDecoration(labelText: 'Área'),
          items: [const DropdownMenuItem(value: '', child: Text('Todas')),
            ..._areas.map((a) => DropdownMenuItem(value: a, child: Text(a)))],
          onChanged: (v) { setState(() => _area = v); _buscar(); }),
        DropdownButtonFormField<String>(value: _nivel, decoration: const InputDecoration(labelText: 'Nivel'),
          items: [const DropdownMenuItem(value: '', child: Text('Todos')),
            ..._niveles.map((n) => DropdownMenuItem(value: n, child: Text(n)))],
          onChanged: (v) { setState(() => _nivel = v); _buscar(); }),
        if (_error != null) Padding(padding: const EdgeInsets.symmetric(vertical: 12),
          child: Text(_error!, style: const TextStyle(color: Colors.red))),
        if (_cargando) const Padding(padding: EdgeInsets.all(32), child: Center(child: CircularProgressIndicator())),
        if (!_cargando) ...[
          const SizedBox(height: 22),
          Text('Lecturas recomendadas', style: Theme.of(context).textTheme.titleMedium),
          if (_recomendaciones.isEmpty) const Padding(padding: EdgeInsets.symmetric(vertical: 8),
            child: Text('Aún no hay datos suficientes para sugerir lecturas. Puedes explorar el catálogo.')),
          ..._recomendaciones.take(6).map((r) => _tarjeta(
            (r['documento'] as Map).cast<String, dynamic>(), motivo: r['motivo']?.toString())),
          const SizedBox(height: 22),
          Text('Documentos (${_documentos.length})', style: Theme.of(context).textTheme.titleMedium),
          if (_documentos.isEmpty) const Padding(padding: EdgeInsets.symmetric(vertical: 8),
            child: Text('No se encontraron documentos con estos filtros.')),
          ..._documentos.map((doc) => _tarjeta(doc)),
        ],
        const SizedBox(height: 70),
      ]),
    ),
  );
}
